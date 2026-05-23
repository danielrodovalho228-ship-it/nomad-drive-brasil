// ====================================================================
// Nomade Drive Brasil — Edge Function: installation-checkout (Fase 28.3)
// --------------------------------------------------------------------
// Marketplace: proprietário escolhe oficina parceira e paga a
// instalação do rastreador GPS via Stripe Checkout. Split automático:
// 10% plataforma + 90% oficina via Stripe Connect.
//
// AÇÕES:
//   - create: cria installation_order + Stripe Checkout Session
//   - confirm: chamada após retorno do Checkout pra atualizar status
//
// Auth: proprietário do veículo OU admin
// Verify JWT: LIGADO
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const SUPER_ADMIN_EMAIL = "dtrodovalho40@gmail.com";

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

    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "create";
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

    // ============================================================
    // CREATE — cria installation_order + Stripe Checkout Session
    // ============================================================
    if (action === "create") {
      const { vehicle_id, workshop_id } = payload;
      if (!vehicle_id || !workshop_id) {
        return json({ error: "vehicle_id e workshop_id são obrigatórios." }, 400);
      }

      // 1. Valida que o caller é dono do veículo (ou admin)
      const { data: vehicle } = await admin.from("vehicles")
        .select("id, owner_id, make, model, year_model, tracker_installed")
        .eq("id", vehicle_id).maybeSingle();
      if (!vehicle) return json({ error: "Veículo não encontrado." }, 404);
      if (!isSuperAdmin && vehicle.owner_id !== user.id) {
        return json({ error: "Apenas o proprietário do veículo pode contratar instalação." }, 403);
      }
      if (vehicle.tracker_installed) {
        return json({ error: "Este veículo já tem rastreador instalado." }, 400);
      }

      // 2. Valida oficina
      const { data: workshop } = await admin.from("workshops")
        .select("id, user_id, business_name, status, offers_tracker_install, tracker_install_price")
        .eq("id", workshop_id).maybeSingle();
      if (!workshop) return json({ error: "Oficina não encontrada." }, 404);
      if (workshop.status !== "aprovado") {
        return json({ error: "Esta oficina não está aprovada." }, 400);
      }
      if (!workshop.offers_tracker_install) {
        return json({ error: "Esta oficina não oferece instalação de rastreador." }, 400);
      }
      const amount = Number(workshop.tracker_install_price);
      if (!(amount > 0)) {
        return json({ error: "Preço da instalação inválido." }, 400);
      }

      // 3. Verifica conta Stripe Connect da oficina
      const { data: ownerAcct } = await admin
        .from("payout_accounts")
        .select("stripe_account_id, status, payouts_enabled")
        .eq("user_id", workshop.user_id)
        .maybeSingle();
      const workshopReady = !!(ownerAcct && ownerAcct.stripe_account_id &&
        (ownerAcct.status === "ativo" || ownerAcct.payouts_enabled === true));

      // 4. Verifica/cria ordem existente (idempotência: 1 ordem aberta por veículo)
      const { data: existing } = await admin.from("installation_orders")
        .select("id, status, stripe_checkout_session_id")
        .eq("vehicle_id", vehicle_id)
        .in("status", ["pending_payment","aguardando_instalacao","em_instalacao","aguardando_validacao"])
        .maybeSingle();

      let orderId: string;
      if (existing) {
        orderId = existing.id;
      } else {
        const { data: newOrder, error: createErr } = await admin
          .from("installation_orders")
          .insert({
            vehicle_id,
            owner_id: vehicle.owner_id,
            workshop_id,
            amount,
            status: "pending_payment",
          })
          .select("id").maybeSingle();
        if (createErr || !newOrder) {
          return json({ error: "Não foi possível criar a ordem: " + (createErr?.message || "") }, 500);
        }
        orderId = newOrder.id;
      }

      // 5. Cria Stripe Checkout Session
      const amountCents = Math.round(amount * 100);
      const piData: Record<string, unknown> = {};
      if (workshopReady) {
        const PLATFORM_FEE_PCT = 0.10;
        const feeCents = Math.round(amountCents * PLATFORM_FEE_PCT);
        piData.application_fee_amount = Math.min(Math.max(feeCents, 0), amountCents - 1);
        piData.transfer_data = { destination: ownerAcct!.stripe_account_id };
      }
      // Se oficina não tem conta ativa, plataforma cobra tudo e admin
      // faz o repasse manual depois.

      const veiculoLabel = [vehicle.make, vehicle.model].filter(Boolean).join(" ") +
        (vehicle.year_model ? " (" + vehicle.year_model + ")" : "");

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card", "pix"],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: amountCents,
            product_data: {
              name: "Instalação de rastreador GPS — " + veiculoLabel,
              description: "Serviço prestado por " + (workshop.business_name || "oficina parceira") +
                " · Plataforma Nomade Drive Brasil"
            },
          },
        }],
        payment_intent_data: Object.keys(piData).length ? piData : undefined,
        success_url: `${SITE}/dashboard-proprietario.html?vehicle=${vehicle_id}&instalacao=ok&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE}/dashboard-proprietario.html?vehicle=${vehicle_id}&instalacao=cancelado`,
        client_reference_id: orderId,
        metadata: {
          order_id: orderId,
          vehicle_id,
          owner_id: vehicle.owner_id,
          workshop_id,
        },
      });

      // 6. Salva session_id na ordem
      await admin.from("installation_orders").update({
        stripe_checkout_session_id: session.id,
        amount,
      }).eq("id", orderId);

      return json({ ok: true, order_id: orderId, url: session.url });
    }

    // ============================================================
    // CONFIRM — chamada após retorno do Stripe Checkout
    // ============================================================
    if (action === "confirm") {
      const { session_id } = payload;
      if (!session_id) return json({ error: "session_id ausente." }, 400);

      const session = await stripe.checkout.sessions.retrieve(session_id);
      const orderId = session.metadata?.order_id;
      if (!orderId) return json({ error: "Sessão sem order_id." }, 400);

      const { data: order } = await admin.from("installation_orders")
        .select("id, status, owner_id, vehicle_id")
        .eq("id", orderId).maybeSingle();
      if (!order) return json({ error: "Ordem não encontrada." }, 404);

      // Idempotência: se já saiu de pending_payment, nada a fazer
      if (order.status !== "pending_payment") {
        return json({ ok: true, status: order.status, already_processed: true });
      }

      // Só processa se o pagamento foi confirmado
      if (session.payment_status === "paid" || session.status === "complete") {
        const pi = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
        await admin.from("installation_orders").update({
          status: "aguardando_instalacao",
          stripe_payment_intent_id: pi || null,
        }).eq("id", orderId);

        return json({ ok: true, status: "aguardando_instalacao", payment_intent: pi });
      }

      return json({ ok: true, status: order.status, pending: true });
    }

    return json({ error: "Ação inválida. Use create ou confirm." }, 400);
  } catch (e) {
    console.error("installation-checkout erro:", (e as Error)?.message);
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
