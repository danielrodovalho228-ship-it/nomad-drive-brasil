// ====================================================================
// Nomade Drive Brasil — Edge Function: setup-manual-payouts
// --------------------------------------------------------------------
// Helper de admin pra configurar uma Connected Account (Express) em
// modo MANUAL payouts. Necessário porque:
//   - Express accounts criadas via API vêm com schedule "daily" default
//   - O Dashboard do Stripe NÃO permite mudar via UI pra Express
//     (só Standard pode ser editada via Dashboard)
//   - Só dá pra mudar via API: stripe.accounts.update(...)
//
// USO:
//   POST /functions/v1/setup-manual-payouts
//   body: { email: "qa-proprietario@nomadedrive.com.br" }
//   OU
//   body: { user_id: "uuid-aqui" }
//   OU
//   body: { all: true }  ← processa TODAS as contas conectadas
//
// AUTH: super-admin OU usuário dono da própria conta (auto-setup)
//
// SECRETS: STRIPE_SECRET_KEY
// Verify JWT: LIGADO
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function configureAccount(stripe: Stripe, accountId: string) {
  try {
    const updated = await stripe.accounts.update(accountId, {
      settings: {
        payouts: {
          schedule: { interval: "manual" },
        },
      },
    });
    return {
      ok: true,
      account_id: accountId,
      schedule: updated.settings?.payouts?.schedule?.interval ?? null,
      payouts_enabled: updated.payouts_enabled,
    };
  } catch (e) {
    return {
      ok: false,
      account_id: accountId,
      error: (e as Error)?.message ?? String(e),
    };
  }
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
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

    // ---- Modo "all" (super-admin) ----
    if (payload.all === true) {
      if (!isSuperAdmin) return json({ error: "Apenas super-admin pode processar all." }, 403);
      const { data: accounts } = await admin
        .from("payout_accounts")
        .select("user_id, stripe_account_id");
      const results = [];
      for (const acc of accounts || []) {
        if (!acc.stripe_account_id) continue;
        const r = await configureAccount(stripe, acc.stripe_account_id);
        results.push({ user_id: acc.user_id, ...r });
      }
      return json({ ok: true, processed: results.length, results });
    }

    // ---- Modo single (por email ou user_id) ----
    let targetUserId: string | null = null;
    if (payload.email) {
      const { data: prof } = await admin
        .from("profiles").select("id").eq("email", payload.email).maybeSingle();
      targetUserId = prof?.id || null;
    } else if (payload.user_id) {
      targetUserId = payload.user_id;
    } else {
      // Sem alvo → trata como self-setup (usuário configurando própria conta)
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return json({ error: "Não foi possível resolver o usuário alvo." }, 400);
    }

    // Auth: super-admin pode fazer pra qualquer um; outros só pra si mesmos
    if (targetUserId !== user.id && !isSuperAdmin) {
      return json({ error: "Apenas super-admin pode configurar outra conta." }, 403);
    }

    const { data: payAcct } = await admin
      .from("payout_accounts")
      .select("stripe_account_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!payAcct?.stripe_account_id) {
      return json({
        error: "Usuário não tem Connected Account no Stripe.",
        hint: "Completar onboarding em /dashboard-proprietario.html#recebimentos primeiro."
      }, 404);
    }

    const result = await configureAccount(stripe, payAcct.stripe_account_id);
    if (!result.ok) {
      return json({ ok: false, error: result.error, account_id: result.account_id }, 500);
    }
    return json({
      ok: true,
      message: "Conta configurada pra MANUAL payouts.",
      account_id: result.account_id,
      schedule: result.schedule,
      payouts_enabled: result.payouts_enabled,
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error)?.message ?? String(e) }, 500);
  }
});
