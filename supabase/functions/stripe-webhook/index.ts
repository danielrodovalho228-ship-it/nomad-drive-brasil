// ====================================================================
// Nomade Drive Brasil — Edge Function: stripe-webhook
// --------------------------------------------------------------------
// Recebe os eventos da Stripe, valida a assinatura, garante idempotência
// e atualiza a tabela payments. Modo de teste.
//
// SECRETS necessários (Edge Functions > Secrets):
//   STRIPE_SECRET_KEY      — chave secreta sk_test_... da Stripe
//   STRIPE_WEBHOOK_SECRET  — "Signing secret" do endpoint de webhook
//                            (whsec_...), gerado ao criar o webhook na Stripe
// Já existem por padrão:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️ DEPLOY: nesta função, DESLIGUE "Verify JWT" — a Stripe não envia
// token do Supabase; a segurança aqui é a ASSINATURA do webhook.
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, emailMensalidade, emailCaucao, fmtBRL } from "../_shared/email.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido.", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe não configurado.", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? "", webhookSecret);
  } catch {
    return new Response("Assinatura inválida.", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // idempotência: se o evento já foi registrado, não processa de novo
  const dup = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup.error) return new Response("ok (evento duplicado)", { status: 200 });

  function patchBySession(sessionId: string, patch: Record<string, unknown>) {
    return admin.from("payments").update(patch).eq("stripe_checkout_session_id", sessionId);
  }
  function patchByIntent(intentId: string, patch: Record<string, unknown>) {
    return admin.from("payments").update(patch).eq("stripe_payment_intent_id", intentId);
  }

  // descobre o veículo da reserva (best-effort) para enriquecer o e-mail
  async function fetchVehLabel(bookingId: string | undefined): Promise<string> {
    if (!bookingId) return "Reserva Nomade Drive";
    try {
      const { data } = await admin.from("bookings")
        .select("vehicles(make,model,year_model)")
        .eq("id", bookingId).maybeSingle();
      const v: any = data?.vehicles;
      if (!v) return "Reserva Nomade Drive";
      let label = [v.make, v.model].filter(Boolean).join(" ") || "Veículo da reserva";
      if (v.year_model) label += " (" + v.year_model + ")";
      return label;
    } catch { return "Reserva Nomade Drive"; }
  }

  async function notifyCheckoutCompleted(s: Stripe.Checkout.Session) {
    const to = s.customer_details?.email || s.customer_email;
    if (!to) return;
    const veh = await fetchVehLabel(s.metadata?.booking_id ?? undefined);
    const valor = fmtBRL(s.amount_total ?? null, true);
    const isDeposit = s.metadata?.kind === "caucao";
    const tpl = isDeposit
      ? emailCaucao({ valor, veiculo: veh })
      : emailMensalidade({ valor, veiculo: veh });
    const result = await sendEmail(to, tpl.subject, tpl.html, tpl.text);
    if (!result.ok) console.error("Falha ao enviar e-mail (webhook):", result.error);
    else console.log("E-mail enviado (webhook):", result.id);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const pi = typeof s.payment_intent === "string"
          ? s.payment_intent
          : s.payment_intent?.id ?? null;
        const isDeposit = s.metadata?.kind === "caucao";
        const newStatus = isDeposit ? "autorizado" : "pago";
        // Update SÓ se ainda estiver 'pendente' — assim apenas o primeiro
        // (webhook ou confirm) que processar dispara o e-mail. Sem
        // duplicidade quando ambos rodam.
        const { data: changed } = await admin.from("payments")
          .update({ status: newStatus, stripe_payment_intent_id: pi })
          .eq("stripe_checkout_session_id", s.id)
          .eq("status", "pendente")
          .select("id");
        if (changed && changed.length > 0) {
          await notifyCheckoutCompleted(s);
        }
        break;
      }
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        await patchBySession(s.id, { status: "expirado" });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await patchByIntent(pi.id, { status: "falhou" });
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        // caução cancelada antes da captura = valor liberado
        await patchByIntent(pi.id, { status: "liberado" });
        break;
      }
      case "charge.captured": {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : null;
        if (pi) await patchByIntent(pi, { status: "capturado" });
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : null;
        if (pi) await patchByIntent(pi, { status: "estornado" });
        break;
      }
      case "account.updated": {
        // Stripe Connect — status da conta conectada (recebimento)
        const acct = event.data.object as Stripe.Account;
        const status = acct.payouts_enabled && acct.details_submitted
          ? "ativo"
          : acct.requirements?.disabled_reason
            ? "restrito"
            : acct.details_submitted
              ? "em_analise"
              : "pendente";
        await admin.from("payout_accounts").update({
          status,
          charges_enabled: !!acct.charges_enabled,
          payouts_enabled: !!acct.payouts_enabled,
          details_submitted: !!acct.details_submitted,
        }).eq("stripe_account_id", acct.id);
        break;
      }
      default:
        // eventos não tratados são apenas registrados (em stripe_events)
        break;
    }
  } catch {
    return new Response("Erro ao processar o evento.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
