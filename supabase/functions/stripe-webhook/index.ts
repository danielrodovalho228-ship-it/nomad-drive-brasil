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
      default:
        // eventos não tratados são apenas registrados (em stripe_events)
        break;
    }
  } catch {
    return new Response("Erro ao processar o evento.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
