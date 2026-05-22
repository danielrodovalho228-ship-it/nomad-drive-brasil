// ====================================================================
// Nomade Drive Brasil — Edge Function: connect-onboard
// --------------------------------------------------------------------
// Stripe Connect (Fase A). Cria/recupera a conta CONECTADA (Express) do
// usuário que recebe (proprietário, parceiro, oficina) e devolve o link
// de cadastro hospedado pela Stripe. Também consulta o status da conta.
//
// A Stripe cuida da verificação de identidade e dos dados bancários —
// a Nomade Drive não armazena esses dados.
//
// Modos (campo "action" do corpo):
//   "onboard" (padrão) -> cria a conta se não existir e devolve { url }
//   "status"           -> devolve { status } da conta conectada
//
// SECRETS: STRIPE_SECRET_KEY (já cadastrado). "Verify JWT": LIGADO.
// PRÉ-REQUISITO: ativar o Connect na Stripe (Test mode).
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const ALLOWED_RETURN = [
  "dashboard-proprietario.html",
  "dashboard-parceiro.html",
  "dashboard-oficina.html",
];

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

function computeStatus(acct: Stripe.Account): string {
  if (acct.payouts_enabled && acct.details_submitted) return "ativo";
  if (acct.requirements?.disabled_reason) return "restrito";
  if (acct.details_submitted) return "em_analise";
  return "pendente";
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

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado." }, 401);

    const admin = createClient(url, serviceKey);
    const payload = await req.json().catch(() => ({}));
    const action = payload.action === "status" ? "status" : "onboard";
    const returnPath = ALLOWED_RETURN.indexOf(payload.return_path) !== -1
      ? payload.return_path
      : "dashboard-proprietario.html";

    const { data: existing } = await admin
      .from("payout_accounts").select("*").eq("user_id", user.id).maybeSingle();
    let accountId: string | null = existing?.stripe_account_id ?? null;

    // ---- modo STATUS ----
    if (action === "status") {
      if (!accountId) return json({ status: "pendente" });
      const acct = await stripe.accounts.retrieve(accountId);
      const status = computeStatus(acct);
      await admin.from("payout_accounts").update({
        status,
        charges_enabled: !!acct.charges_enabled,
        payouts_enabled: !!acct.payouts_enabled,
        details_submitted: !!acct.details_submitted,
      }).eq("user_id", user.id);
      return json({ status, payouts_enabled: !!acct.payouts_enabled });
    }

    // ---- modo ONBOARD ----
    if (!accountId) {
      const { data: prof } = await admin
        .from("profiles").select("main_role").eq("id", user.id).maybeSingle();
      const acct = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: user.email ?? undefined,
        capabilities: { transfers: { requested: true } },
      });
      accountId = acct.id;
      await admin.from("payout_accounts").upsert({
        user_id: user.id,
        role: prof?.main_role ?? null,
        stripe_account_id: accountId,
        status: "pendente",
      }, { onConflict: "user_id" });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE}/${returnPath}?recebimentos=retry`,
      return_url: `${SITE}/${returnPath}?recebimentos=ok`,
      type: "account_onboarding",
    });
    return json({ url: link.url });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
