// ====================================================================
// Nomade Drive Brasil — Edge Function: stripe-checkout
// --------------------------------------------------------------------
// Cria uma sessão do Stripe Checkout para a MENSALIDADE ou a CAUÇÃO de
// uma reserva e devolve a URL de pagamento. A tela de cartão é hospedada
// pela Stripe — nenhum dado de cartão passa por este código.
//
// Modo de teste. Deploy: Supabase Dashboard > Edge Functions.
//
// SECRETS necessários (Edge Functions > Secrets):
//   STRIPE_SECRET_KEY          — chave secreta sk_test_... da Stripe
// Já existem por padrão no projeto Supabase:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// "Verify JWT": MANTENHA LIGADO nesta função (o cliente chama logado).
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
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe não configurado no servidor." }, 500);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // contexto do usuário logado (respeita o RLS)
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado." }, 401);

    const payload = await req.json().catch(() => ({}));
    const bookingId = payload.booking_id;
    const kind = payload.kind;
    if (!bookingId || (kind !== "mensalidade" && kind !== "caucao")) {
      return json({ error: "Parâmetros inválidos." }, 400);
    }

    // a reserva — o RLS garante que o usuário só enxerga as próprias
    const { data: booking } = await userClient
      .from("bookings")
      .select("id, client_id, owner_id, monthly_price, deposit_amount, platform_fee")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return json({ error: "Reserva não encontrada." }, 404);
    if (booking.client_id !== user.id) {
      return json({ error: "Esta reserva não é da sua conta." }, 403);
    }

    const monthly = Number(booking.monthly_price) || 0;
    const deposit = booking.deposit_amount != null
      ? Number(booking.deposit_amount)
      : monthly; // caução padrão = 1 mensalidade (ajuste por contrato)

    const isDeposit = kind === "caucao";
    const amount = isDeposit ? deposit : monthly;
    if (!(amount > 0)) return json({ error: "Valor da reserva ainda não definido." }, 400);
    const amountCents = Math.round(amount * 100);

    const label = isDeposit
      ? "Caução da locação — Nomade Drive Brasil"
      : "Mensalidade da locação — Nomade Drive Brasil";

    // service role: lê payout_accounts e registra o pagamento
    const admin = createClient(url, serviceKey);

    // ---- Fase B — split do pagamento ----
    // A MENSALIDADE é dividida: parte vai ao proprietário (conta conectada)
    // e a taxa fica com a plataforma. A CAUÇÃO não é dividida (fica retida).
    const piData: Record<string, unknown> = {};
    if (isDeposit) {
      piData.capture_method = "manual"; // autoriza sem capturar
    } else {
      const { data: ownerAcct } = await admin
        .from("payout_accounts")
        .select("stripe_account_id, status, payouts_enabled")
        .eq("user_id", booking.owner_id)
        .maybeSingle();
      const ownerReady = !!(ownerAcct && ownerAcct.stripe_account_id &&
        (ownerAcct.status === "ativo" || ownerAcct.payouts_enabled === true));
      if (ownerReady) {
        // taxa da plataforma: 10% de todo aluguel
        const PLATFORM_FEE_PCT = 0.10;
        const feeCents = Math.round(amountCents * PLATFORM_FEE_PCT);
        // a taxa nunca é negativa nem maior/igual ao total
        piData.application_fee_amount = Math.min(Math.max(feeCents, 0), amountCents - 1);
        piData.transfer_data = { destination: ownerAcct.stripe_account_id };
      }
      // se o proprietário ainda não tiver conta de recebimento ativa, a
      // cobrança ocorre sem split — o repasse é acertado depois.
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: amountCents,
          product_data: { name: label },
        },
      }],
      payment_intent_data: Object.keys(piData).length ? piData : undefined,
      success_url: `${SITE}/reserva-detalhe.html?id=${bookingId}&pagamento=ok`,
      cancel_url: `${SITE}/reserva-detalhe.html?id=${bookingId}&pagamento=cancelado`,
      client_reference_id: bookingId,
      metadata: { booking_id: bookingId, kind, client_id: user.id },
    });

    await admin.from("payments").insert({
      booking_id: bookingId,
      client_id: user.id,
      kind,
      amount,
      currency: "brl",
      status: "pendente",
      stripe_checkout_session_id: session.id,
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
