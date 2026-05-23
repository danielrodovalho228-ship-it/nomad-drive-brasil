// ====================================================================
// Nomade Drive Brasil — Edge Function: stripe-billing-portal (B1)
// --------------------------------------------------------------------
// Cria uma sessão do Stripe Billing Portal para o cliente trocar o
// cartão da assinatura, ver histórico de cobranças e gerenciar a
// subscription.
//
// É tudo hospedado pelo Stripe — os dados do cartão não passam pela
// Nomade Drive nem ficam no nosso código.
//
// Fluxo:
//   1. Front (reserva-detalhe.html) clica "Atualizar cartão"
//   2. Invoca esta função
//   3. Lê profiles.stripe_customer_id do usuário logado
//   4. Se não existir: retorna 404 com aviso "faça um pagamento antes"
//      (o customer só é criado quando o usuário paga a 1ª mensalidade)
//   5. stripe.billingPortal.sessions.create({ customer, return_url })
//   6. Retorna { url } — front abre na MESMA aba (Stripe espera isso)
//
// SECRETS: STRIPE_SECRET_KEY
// Verify JWT: LIGADO. Qualquer usuário autenticado pode chamar (só
// vê o próprio customer).
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe não configurado." }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado." }, 401);
    const admin = createClient(url, serviceKey);

    // Pega o customer.id da Stripe do perfil
    const { data: prof } = await admin.from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id).maybeSingle();
    let customerId = prof?.stripe_customer_id || null;

    // Fallback: se ainda não tem stripe_customer_id no perfil, tenta
    // descobrir via payments existentes (caso o cliente já tenha pago
    // antes do schema ganhar a coluna). Se achar, salva pra próxima.
    if (!customerId) {
      const { data: anyPay } = await admin.from("payments")
        .select("stripe_payment_intent_id")
        .eq("client_id", user.id)
        .not("stripe_payment_intent_id", "is", null)
        .limit(1).maybeSingle();
      if (anyPay?.stripe_payment_intent_id) {
        try {
          const pi = await stripe.paymentIntents.retrieve(anyPay.stripe_payment_intent_id);
          const c = pi.customer;
          customerId = typeof c === "string" ? c : (c?.id ?? null);
          if (customerId) {
            await admin.from("profiles")
              .update({ stripe_customer_id: customerId })
              .eq("id", user.id);
          }
        } catch (e) {
          console.error("billing-portal: fallback PI retrieve falhou:", (e as Error)?.message);
        }
      }
    }

    if (!customerId) {
      return json({
        error: "customer_not_found",
        message: "Você ainda não tem cobranças no histórico. Para gerenciar pagamentos, faça pelo menos uma mensalidade ou autorização de caução primeiro."
      }, 404);
    }

    // Cria a sessão do portal
    const return_url = SITE + "/dashboard-cliente.html#financeiro";
    let session: Stripe.BillingPortal.Session;
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url
      });
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      console.error("billing-portal: falha ao criar sessão:", msg);
      // Erro comum: Billing Portal não está configurado no Dashboard
      if (msg.includes("No configuration provided") ||
          msg.includes("default configuration")) {
        return json({
          error: "billing_portal_not_configured",
          message: "O Billing Portal precisa ser ativado no Stripe Dashboard → Settings → Billing → Customer portal."
        }, 500);
      }
      return json({ error: "stripe_error", message: msg }, 500);
    }

    return json({ ok: true, url: session.url });
  } catch (e) {
    console.error("billing-portal: erro geral:", (e as Error)?.message);
    return json({ error: (e as Error)?.message }, 500);
  }
});
