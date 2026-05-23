// ====================================================================
// Nomade Drive Brasil — Edge Function: stripe-subscription
// --------------------------------------------------------------------
// Operações na subscription mensal de uma reserva (Fase 21b):
//   action="cancel"          → cancela imediatamente
//   action="cancel_at_end"   → cancela no final do período atual
//   action="status"          → devolve status + próxima cobrança
//
// SECRETS: STRIPE_SECRET_KEY
// Verify JWT: LIGADO (cliente ou admin chamam logados).
// Autorização: dono da reserva (client_id == auth.uid()) OU super-admin
//   (e-mail dtrodovalho40@gmail.com).
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
const SUPER_ADMIN_EMAIL = "dtrodovalho40@gmail.com";

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

    const payload = await req.json().catch(() => ({}));
    const bookingId: string | undefined = payload.booking_id;
    const action: string = payload.action || "status";
    if (!bookingId) return json({ error: "booking_id ausente." }, 400);

    const { data: booking } = await admin.from("bookings")
      .select("id, client_id, stripe_subscription_id, billing_mode, end_date")
      .eq("id", bookingId).maybeSingle();
    if (!booking) return json({ error: "Reserva não encontrada." }, 404);

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    const isOwnerOfBooking = booking.client_id === user.id;
    if (!isSuperAdmin && !isOwnerOfBooking) {
      return json({ error: "Sem permissão para esta reserva." }, 403);
    }
    if (!booking.stripe_subscription_id) {
      return json({ error: "Reserva não tem assinatura ativa." }, 404);
    }

    if (action === "status") {
      const sub = await stripe.subscriptions.retrieve(booking.stripe_subscription_id);
      return json({
        id: sub.id,
        status: sub.status,
        current_period_end: (sub as any).current_period_end ?? null,
        cancel_at: sub.cancel_at ?? null,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        canceled_at: sub.canceled_at ?? null,
      });
    }

    if (action === "cancel") {
      const sub = await stripe.subscriptions.cancel(booking.stripe_subscription_id);
      // Webhook customer.subscription.deleted vai zerar stripe_subscription_id
      // — mas também limpamos aqui pra resposta imediata na UI.
      await admin.from("bookings")
        .update({ stripe_subscription_id: null })
        .eq("id", bookingId);
      return json({ ok: true, status: sub.status, canceled_at: sub.canceled_at });
    }

    if (action === "cancel_at_end") {
      const sub = await stripe.subscriptions.update(booking.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      return json({
        ok: true,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: (sub as any).current_period_end ?? null,
      });
    }

    return json({ error: "Ação inválida. Use 'status', 'cancel' ou 'cancel_at_end'." }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
