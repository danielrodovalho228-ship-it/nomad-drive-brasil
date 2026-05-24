// ====================================================================
// Nomade Drive Brasil — Edge Function: liberar-saque-parcial
// Sprint 2 (Fase 32) — REFATORADA Sprint 2.6 (BR fix)
// --------------------------------------------------------------------
// FLUXO (BR — Separate Charges + Transfers):
//   1. Recebe withdrawal_id no body
//   2. Autoriza: dono do withdrawal (owner_id) OU super-admin
//   3. Valida: withdrawal.status='available' + Connected Account ativa
//   4. Chama stripe.transfers.create() do saldo da plataforma PRA
//      Connected Account do proprietário (R$ 1.125, valor já líquido
//      = 90% da metade da mensalidade)
//   5. Atualiza withdrawals: status='paid', stripe_payout_id=transfer.id, paid_at
//   6. Dispara e-mail "Saque liberado" pro proprietário
//   7. Stripe BR processa automatic payout (1-2 dias úteis) da Connected
//      Account pro banco do proprietário (a gente não controla esse passo)
//
// MUDANÇA vs versão anterior: trocou stripe.payouts.create() (que exigia
// manual schedule — proibido em BR) por stripe.transfers.create().
//
// SECRETS: STRIPE_SECRET_KEY, RESEND_API_KEY (opcional), EMAIL_FROM (opcional)
// Verify JWT: LIGADO
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";
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

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fmtBRL(amount: number | null | undefined): string {
  const v = amount == null ? 0 : amount;
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function sendEmail(to: string, subject: string, html: string, text: string, replyTo?: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { ok: false, error: "RESEND_API_KEY ausente ou destinatário vazio" };
  const from = Deno.env.get("EMAIL_FROM") || "Nomade Drive Brasil <onboarding@resend.dev>";
  const reply_to = replyTo || "pagamentos@nomadedrive.com.br";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text, reply_to }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      return { ok: false, error: "Resend " + resp.status + ": " + detail.slice(0, 200) };
    }
    const body = await resp.json();
    return { ok: true, id: body?.id };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}

function emailSaqueLiberado(d: {
  full_name: string;
  veiculo: string;
  valor: string;
  payout_id: string;
  estimated_arrival: string;
  milestone_num: number;
  total_milestones: number;
}) {
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#0f5132 0%,#198754 55%,#2da473 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Saque liberado</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;">💰 Saque liberado pra sua conta</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">Olá ' + escapeHtml(d.full_name || "") + ',</p>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">Acabamos de liberar o saque parcial do veículo <strong>' + escapeHtml(d.veiculo) + '</strong>. O valor cai na sua conta bancária cadastrada no Stripe.</p>'
    + '<div style="text-align:center;margin:24px 0;">'
    + '<div style="font-size:14px;color:#5b6b63;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Valor liberado</div>'
    + '<div style="font-size:42px;font-weight:800;color:#0f5132;letter-spacing:-1px;margin-top:6px;">R$ ' + d.valor + '</div>'
    + '<div style="font-size:13px;color:#6b7670;margin-top:4px;">Marco ' + d.milestone_num + ' de ' + d.total_milestones + '</div>'
    + '</div>'
    + '<table cellpadding="8" cellspacing="0" style="background:#f4f7f5;border-radius:10px;margin:14px 0 18px;width:100%;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:140px;">Veículo</td><td>' + escapeHtml(d.veiculo) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Previsão de depósito</td><td>' + escapeHtml(d.estimated_arrival) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">ID Stripe</td><td><code style="font-size:11px;color:#6b7670;">' + escapeHtml(d.payout_id) + '</code></td></tr>'
    + '</table>'
    + '<p style="margin:0 0 14px;font-size:13.5px;line-height:1.55;color:#5b6b63;font-style:italic;">O Stripe processa o depósito em 1-2 dias úteis. Acompanhe pelo seu painel ou pelo Stripe Express Dashboard.</p>'
    + '<p style="margin:24px 0 0;"><a href="' + SITE + '/dashboard-proprietario.html#financeiro" style="display:inline-block;background:#0f5132;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">Ver no meu painel</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#f9fafb;padding:18px 28px;border-top:1px solid #e3e9e5;font-size:12px;color:#5b6b63;">'
    + '<strong>Nomade Drive Brasil</strong> · Uberlândia/MG · <a href="' + SITE + '" style="color:#0f5132;text-decoration:none;">nomadedrive.com.br</a><br>'
    + 'Dúvidas sobre saques? Responda este e-mail.'
    + '</td></tr></table></td></tr></table></body></html>';

  const text = "Olá " + (d.full_name || "") + ",\n\n"
    + "💰 Saque liberado: R$ " + d.valor + "\n"
    + "Veículo: " + d.veiculo + "\n"
    + "Marco: " + d.milestone_num + "/" + d.total_milestones + "\n"
    + "Previsão de depósito: " + d.estimated_arrival + "\n"
    + "Stripe ID: " + d.payout_id + "\n\n"
    + "Acompanhe pelo painel: " + SITE + "/dashboard-proprietario.html#financeiro";

  return {
    subject: "💰 Saque liberado — R$ " + d.valor + " — Nomade Drive Brasil",
    html, text,
    replyTo: "pagamentos@nomadedrive.com.br",
  };
}

// ============================ HANDLER ===============================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const actions = {
    payout_created: false,
    payout_id: "" as string,
    amount: 0,
    db_updated: false,
    email_sent: false,
    errors: [] as string[],
  };

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
    const withdrawalId: string | undefined = payload.withdrawal_id;
    if (!withdrawalId) return json({ error: "withdrawal_id ausente." }, 400);

    // 1) Lê o withdrawal completo
    const { data: w, error: wErr } = await admin
      .from("withdrawals")
      .select("*, bookings(id, vehicle_id, vehicles(make, model, year_model))")
      .eq("id", withdrawalId)
      .maybeSingle();
    if (wErr || !w) return json({ error: "Saque não encontrado." }, 404);

    // 2) Autorização: owner OU super-admin
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin && w.owner_id !== user.id) {
      return json({ error: "Apenas o proprietário do saque pode liberar." }, 403);
    }

    // 3) Validações
    if (w.status !== "available") {
      return json({
        error: "Saque não disponível pra liberação",
        current_status: w.status,
        hint: w.status === "pending"
          ? "Marco ainda não venceu (data futura)"
          : w.status === "paid"
            ? "Saque já foi pago"
            : "Status inválido"
      }, 400);
    }

    // 4) Pega a Connected Account do proprietário
    //    Sprint 2.6 (BR): payouts_enabled não é mais bloqueante (transfer
    //    sempre rola pra account válida); só precisa ter conta criada e
    //    charges/details OK. Stripe BR libera payout automático depois.
    const { data: payoutAcct } = await admin
      .from("payout_accounts")
      .select("stripe_account_id, payouts_enabled, charges_enabled, details_submitted, status")
      .eq("user_id", w.owner_id)
      .maybeSingle();

    if (!payoutAcct?.stripe_account_id) {
      return json({
        error: "Proprietário ainda não conectou conta Stripe",
        hint: "O proprietário precisa completar o onboarding em /dashboard-proprietario.html#recebimentos"
      }, 400);
    }
    if (!payoutAcct.details_submitted) {
      return json({
        error: "Conta Stripe do proprietário com onboarding incompleto",
        hint: "Status: " + payoutAcct.status + ". O proprietário precisa terminar o cadastro na Stripe Express."
      }, 400);
    }

    // 5) Pega perfil do proprietário (pro email)
    const { data: ownerProf } = await admin
      .from("profiles").select("full_name, email")
      .eq("id", w.owner_id).maybeSingle();

    // 6) Conta marcos totais (pra mensagem "Marco N de M")
    const { count: totalMilestones } = await admin
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", w.booking_id);

    // 7) Sprint 2.6 (BR) — Cria TRANSFER do saldo da plataforma pra
    //    Connected Account do proprietário. NÃO usa stripe.payouts.create
    //    (proibido em BR — Connected Accounts brasileiras devem estar em
    //    modo automatic schedule). Stripe BR vai processar o payout
    //    automático da Connected Account pro banco em 1-2 dias úteis.
    const amountCents = Math.round(Number(w.amount_net) * 100);
    let transfer: Stripe.Transfer;
    try {
      transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: "brl",
        destination: payoutAcct.stripe_account_id,
        description: "Nomade Drive — Saque parcial marco " + w.milestone_number,
        metadata: {
          withdrawal_id: withdrawalId,
          booking_id: String(w.booking_id),
          milestone_number: String(w.milestone_number),
          owner_id: String(w.owner_id),
        },
      });
      actions.payout_created = true;
      actions.payout_id = transfer.id; // sufixo "po_" antes, agora "tr_"
      actions.amount = amountCents / 100;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      actions.errors.push("stripe_transfers_create: " + msg);
      return json({
        ok: false, actions,
        error: "Falha ao criar transfer no Stripe: " + msg,
        hint: msg.indexOf("insufficient") !== -1
          ? "Plataforma sem saldo. Cliente precisa ter pago a mensalidade antes (R$ entra no saldo)."
          : undefined
      }, 500);
    }

    // 8) Atualiza DB (stripe_payout_id agora guarda o transfer.id "tr_xxx")
    try {
      await admin.from("withdrawals").update({
        status: "paid",
        stripe_payout_id: transfer.id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawalId);
      actions.db_updated = true;
    } catch (e) {
      actions.errors.push("db_update: " + (e as Error)?.message);
    }

    // 9) E-mail pro proprietário
    if (ownerProf?.email) {
      const v: any = (w as any).bookings?.vehicles;
      let vehStr = "Reserva Nomade Drive";
      if (v) {
        vehStr = [v.make, v.model].filter(Boolean).join(" ") || vehStr;
        if (v.year_model) vehStr += " (" + v.year_model + ")";
      }
      // Transfer é síncrono — não tem arrival_date. Stripe BR vai criar
      // payout automático na Connected Account em 1-2 dias úteis.
      const arrivalDate = "1-2 dias úteis (depósito automático Stripe BR)";

      const tpl = emailSaqueLiberado({
        full_name: ownerProf.full_name || "",
        veiculo: vehStr,
        valor: fmtBRL(Number(w.amount_net)),
        payout_id: transfer.id,
        estimated_arrival: arrivalDate,
        milestone_num: w.milestone_number,
        total_milestones: totalMilestones || 1,
      });
      const r = await sendEmail(ownerProf.email, tpl.subject, tpl.html, tpl.text, tpl.replyTo);
      if (r.ok) {
        actions.email_sent = true;
      } else {
        actions.errors.push("email: " + (r.error ?? ""));
      }
    } else {
      actions.errors.push("email: proprietário sem e-mail conhecido");
    }

    return json({
      ok: true,
      actions,
      payout: {
        id: transfer.id,            // mantém nome "payout" no JSON pra compat
        amount: amountCents / 100,
        arrival_date: null,         // transfer não tem arrival_date
        status: "transfer_created", // Stripe BR processa payout automático depois
        type: "transfer",           // marca que foi via Transfer API
      },
    });
  } catch (e) {
    actions.errors.push("geral: " + ((e as Error)?.message ?? String(e)));
    return json({ ok: false, actions, error: (e as Error)?.message }, 500);
  }
});
