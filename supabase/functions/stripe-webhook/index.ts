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

  // -------- e-mail via Resend (silencioso em erro / sem chave) ---------
  async function sendEmail(to: string, subject: string, html: string, text: string) {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey || !to) return;
    const from = Deno.env.get("EMAIL_FROM") ||
      "Nomade Drive Brasil <onboarding@resend.dev>";
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html, text }),
      });
    } catch {
      /* não falha o webhook por causa de e-mail */
    }
  }
  function fmtBRL(cents: number | null | undefined): string {
    const v = (cents ?? 0) / 100;
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }
  function emailMensalidade(valor: string, veiculo: string): { html: string; text: string } {
    const html =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
      '<body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#14201b;">' +
      '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;"><tr><td align="center">' +
      '<table cellpadding="0" cellspacing="0" width="560" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;">' +
      '<tr><td style="background:linear-gradient(135deg,#145f3e,#2da473);padding:24px;color:#fff;">' +
      '<h1 style="margin:0;font-size:22px;">Mensalidade confirmada</h1>' +
      '<p style="margin:6px 0 0;opacity:0.92;font-size:14px;">Nomade Drive Brasil</p>' +
      '</td></tr>' +
      '<tr><td style="padding:24px;font-size:14.5px;line-height:1.6;">' +
      '<p>Olá!</p><p>Recebemos o pagamento da sua mensalidade. Tudo confirmado.</p>' +
      '<table cellpadding="8" cellspacing="0" style="background:#f4f7f5;border-radius:8px;margin:14px 0;width:100%;">' +
      '<tr><td style="font-weight:600;width:90px;">Valor</td><td>R$ ' + valor + '</td></tr>' +
      '<tr><td style="font-weight:600;">Reserva</td><td>' + veiculo + '</td></tr>' +
      '</table>' +
      '<p><a href="https://nomadedrive.com.br/dashboard-cliente.html" style="display:inline-block;background:#1a7a4f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Acessar meu painel</a></p>' +
      '<p style="color:#5b6b63;font-size:12.5px;margin-top:20px;">Mensagem automática — em caso de dúvida, fale com nossa equipe pelo site.</p>' +
      '</td></tr></table></td></tr></table></body></html>';
    const text =
      "Mensalidade confirmada — Nomade Drive Brasil\n\n" +
      "Recebemos o pagamento da sua mensalidade.\n\n" +
      "Valor:   R$ " + valor + "\n" +
      "Reserva: " + veiculo + "\n\n" +
      "Acesse seu painel: https://nomadedrive.com.br/dashboard-cliente.html\n\n" +
      "Mensagem automática.";
    return { html, text };
  }
  function emailCaucao(valor: string, veiculo: string): { html: string; text: string } {
    const html =
      '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
      '<body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#14201b;">' +
      '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 0;"><tr><td align="center">' +
      '<table cellpadding="0" cellspacing="0" width="560" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;">' +
      '<tr><td style="background:linear-gradient(135deg,#0d4a2f,#4ba37e);padding:24px;color:#fff;">' +
      '<h1 style="margin:0;font-size:22px;">Caução autorizada</h1>' +
      '<p style="margin:6px 0 0;opacity:0.92;font-size:14px;">Nomade Drive Brasil</p>' +
      '</td></tr>' +
      '<tr><td style="padding:24px;font-size:14.5px;line-height:1.6;">' +
      '<p>Olá!</p>' +
      '<p>A caução da sua locação foi <strong>autorizada</strong> no seu cartão — o valor fica reservado, sem cobrança imediata. Só é capturado em caso de dano, multa ou outro custo previsto em contrato.</p>' +
      '<table cellpadding="8" cellspacing="0" style="background:#f4f7f5;border-radius:8px;margin:14px 0;width:100%;">' +
      '<tr><td style="font-weight:600;width:90px;">Caução</td><td>R$ ' + valor + '</td></tr>' +
      '<tr><td style="font-weight:600;">Reserva</td><td>' + veiculo + '</td></tr>' +
      '</table>' +
      '<p><a href="https://nomadedrive.com.br/dashboard-cliente.html" style="display:inline-block;background:#1a7a4f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Acessar meu painel</a></p>' +
      '<p style="color:#5b6b63;font-size:12.5px;margin-top:20px;">Mensagem automática.</p>' +
      '</td></tr></table></td></tr></table></body></html>';
    const text =
      "Caução autorizada — Nomade Drive Brasil\n\n" +
      "A caução da sua locação foi autorizada no cartão. Valor reservado, sem cobrança imediata.\n\n" +
      "Valor:   R$ " + valor + "\n" +
      "Reserva: " + veiculo + "\n\n" +
      "Acesse seu painel: https://nomadedrive.com.br/dashboard-cliente.html";
    return { html, text };
  }

  async function notifyCheckoutCompleted(s: Stripe.Checkout.Session) {
    const email = s.customer_details?.email || s.customer_email;
    if (!email) return;
    // descobre veículo da reserva (best-effort)
    let veh = "Reserva Nomade Drive";
    try {
      const bookingId = s.metadata?.booking_id;
      if (bookingId) {
        const { data } = await admin.from("bookings")
          .select("vehicles(make,model,year_model)")
          .eq("id", bookingId)
          .maybeSingle();
        const v: any = data?.vehicles;
        if (v) {
          veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
          if (v.year_model) veh += " (" + v.year_model + ")";
        }
      }
    } catch { /* mantém veh padrão */ }
    const valor = fmtBRL(s.amount_total ?? null);
    const isDeposit = s.metadata?.kind === "caucao";
    const t = isDeposit ? emailCaucao(valor, veh) : emailMensalidade(valor, veh);
    const subject = isDeposit
      ? "Caução autorizada — Nomade Drive Brasil"
      : "Mensalidade confirmada — Nomade Drive Brasil";
    await sendEmail(email, subject, t.html, t.text);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const pi = typeof s.payment_intent === "string"
          ? s.payment_intent
          : s.payment_intent?.id ?? null;
        // caução usa captura manual -> "autorizado"; mensalidade -> "pago"
        const isDeposit = s.metadata?.kind === "caucao";
        await patchBySession(s.id, {
          status: isDeposit ? "autorizado" : "pago",
          stripe_payment_intent_id: pi,
        });
        // notifica o cliente por e-mail (best-effort, não bloqueia o webhook)
        await notifyCheckoutCompleted(s);
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
