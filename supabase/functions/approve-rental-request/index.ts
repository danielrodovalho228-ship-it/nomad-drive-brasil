// ====================================================================
// Nomade Drive Brasil — Edge Function: approve-rental-request
// --------------------------------------------------------------------
// Owner aprova uma rental_request → sistema CRIA booking automatica-
// mente (com desconto tier-aware do cliente) e dispara e-mail pro
// cliente com link de pagamento.
//
// FLUXO:
//   1. Owner clica "Aprovar" no dashboard-proprietario
//   2. Valida: owner é dono do veículo OU é super_admin
//   3. Valida: rental_request status='em_analise'
//   4. Pega tier do cliente → calcula preço/caução com desconto
//   5. Cria booking (status='aprovado')
//   6. Marca rental_request status='aprovado'
//   7. Envia e-mail pro cliente: "Reserva aprovada! Pague pra confirmar"
//      com link pra dashboard-cliente (lá ele clica "Pagar")
//   8. Loga audit
//
// BODY:
//   {
//     rental_request_id: uuid,
//     monthly_price?: number,       // opcional — default = valor de mercado
//     deposit_amount?: number,      // opcional — default = R$ 1000
//     duration_months?: number      // 1, 2, 3, 4, 6 (default = pedido do cliente)
//   }
//
// Verify JWT: LIGADO (owner logado)
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";

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
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtBRL(n: number | null | undefined): string {
  const v = n == null ? 0 : Number(n);
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateBR(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

async function sendEmail(
  to: string, subject: string, html: string, text: string, replyTo?: string,
) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { ok: false, error: "RESEND_API_KEY ausente ou destinatário vazio" };
  const from = Deno.env.get("EMAIL_FROM") || "Nomade Drive Brasil <onboarding@resend.dev>";
  const reply_to = replyTo || "contato@nomadedrive.com.br";
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

// ============================================================
// Template e-mail: "Reserva aprovada! Pague pra confirmar"
// ============================================================
function emailRentalApproved(d: {
  clientName: string;
  vehicleName: string;
  startDate: string;
  endDate: string;
  monthlyPrice: number;
  depositAmount: number;
  discountPct: number;
  tier: string;
  bookingId: string;
}) {
  const firstName = (d.clientName || "Cliente").split(" ")[0];
  const tierBadge = d.tier !== "bronze"
    ? ' · <span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">' +
      (d.tier === "silver" ? "🥈 Silver" : d.tier === "gold" ? "🥇 Gold" : "💎 Platinum") + '</span>'
    : "";

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Reserva aprovada!</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'

    // Header verde celebrativo
    + '<tr><td style="background:linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%);padding:30px 28px 24px;text-align:center;">'
    + '<img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:inline-block;background:#fff;border-radius:6px;padding:4px 8px;margin-bottom:14px;">'
    + '<div style="font-size:48px;line-height:1;margin:8px 0;">🎉</div>'
    + '<div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.95;">Reserva aprovada</div>'
    + '<div style="color:#fff;font-size:26px;font-weight:800;line-height:1.2;margin-top:6px;">Tá quase lá, ' + escapeHtml(firstName) + '!</div>'
    + '</td></tr>'

    // Body
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">O proprietário <strong>aprovou</strong> sua solicitação! '
    + 'Agora falta só você confirmar a reserva pagando a primeira mensalidade.</p>'

    + '<div style="background:#f0f7f3;border-left:4px solid #145f3e;border-radius:8px;padding:18px 20px;margin:18px 0;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#145f3e;margin-bottom:10px;">Resumo da reserva' + tierBadge + '</div>'
    + '<table cellpadding="6" cellspacing="0" width="100%" style="font-size:14px;">'
    + '<tr><td style="color:#5b6b63;width:140px;">Veículo</td><td style="color:#14201b;"><strong>' + escapeHtml(d.vehicleName) + '</strong></td></tr>'
    + '<tr><td style="color:#5b6b63;">Retirada</td><td style="color:#14201b;">' + escapeHtml(fmtDateBR(d.startDate)) + '</td></tr>'
    + '<tr><td style="color:#5b6b63;">Devolução</td><td style="color:#14201b;">' + escapeHtml(fmtDateBR(d.endDate)) + '</td></tr>'
    + '<tr><td style="color:#5b6b63;">Mensalidade</td><td style="color:#14201b;"><strong>R$ ' + fmtBRL(d.monthlyPrice) + '/mês</strong>'
    + (d.discountPct > 5 ? ' <small style="color:#0f5132;">(' + d.discountPct + '% off ' + d.tier + ')</small>' : '')
    + '</td></tr>'
    + '<tr><td style="color:#5b6b63;">Caução (pré-auth)</td><td style="color:#14201b;">R$ ' + fmtBRL(d.depositAmount) + '</td></tr>'
    + '</table></div>'

    + '<p style="margin:14px 0 6px;font-size:14px;color:#3a4945;line-height:1.55;"><strong>Próximos passos:</strong></p>'
    + '<ol style="margin:0 0 14px;padding-left:18px;color:#5b6b63;line-height:1.8;font-size:14px;">'
    + '<li>Clica no botão abaixo pra acessar seu painel</li>'
    + '<li>Confirma o pagamento da 1ª mensalidade (cartão de crédito)</li>'
    + '<li>A caução fica pré-autorizada no seu cartão (não cobrada) e é liberada no check-out aprovado</li>'
    + '<li>Combinamos a retirada do veículo direto com você</li>'
    + '</ol>'

    + '<p style="margin:24px 0 0;text-align:center;">'
    + '<a href="' + SITE + '/dashboard-cliente.html" '
    + 'style="display:inline-block;background:linear-gradient(135deg,#145f3e 0%,#1a7a4f 100%);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">'
    + '💳 Pagar e confirmar reserva</a></p>'

    + '<p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8a948e;">'
    + '⏰ A reserva expira em <strong>48 horas</strong> se não for confirmada. Garante já!</p>'
    + '</td></tr>'

    // Footer
    + '<tr><td style="background:#f0f7f3;padding:18px 28px;border-top:1px solid #cde0d4;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · Dúvidas: responda este e-mail.<br>'
    + '<span style="color:#8a9591;font-size:11px;">📋 Reserva: ' + d.bookingId.slice(0, 8) + '</span>'
    + '</td></tr>'

    + '</table></td></tr></table></body></html>';

  const text =
    "🎉 Reserva aprovada! — Nomade Drive Brasil\n\n"
    + "Olá " + firstName + ",\n\n"
    + "O proprietário aprovou sua solicitação. Pra confirmar, pague a 1ª mensalidade:\n\n"
    + "Veículo: " + d.vehicleName + "\n"
    + "Retirada: " + fmtDateBR(d.startDate) + "\n"
    + "Devolução: " + fmtDateBR(d.endDate) + "\n"
    + "Mensalidade: R$ " + fmtBRL(d.monthlyPrice) + (d.discountPct > 5 ? " (" + d.discountPct + "% off " + d.tier + ")" : "") + "\n"
    + "Caução pré-auth: R$ " + fmtBRL(d.depositAmount) + "\n\n"
    + "💳 Pague em: " + SITE + "/dashboard-cliente.html\n\n"
    + "⏰ A reserva expira em 48h se não for confirmada.\n\n"
    + "Reserva: " + d.bookingId.slice(0, 8);

  return {
    subject: "🎉 Sua reserva foi aprovada — pague pra confirmar (48h)",
    html, text, replyTo: "pagamentos@nomadedrive.com.br",
  };
}

// ============================================================
// HANDLER
// ============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth do owner
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado." }, 401);
    const ownerId = userData.user.id;

    const body = await req.json();
    const {
      rental_request_id,
      monthly_price,
      deposit_amount,
      duration_months,
    } = body || {};

    if (!rental_request_id) {
      return json({ error: "rental_request_id obrigatório." }, 400);
    }

    const admin = createClient(url, serviceKey);

    // Busca rental_request + vehicle
    const { data: rr, error: rrErr } = await admin
      .from("rental_requests")
      .select("id, client_id, vehicle_id, desired_start_date, desired_months, reason, status")
      .eq("id", rental_request_id)
      .maybeSingle();

    if (rrErr || !rr) {
      return json({ error: "Solicitação não encontrada.", detail: rrErr?.message }, 404);
    }

    if (rr.status !== "em_analise") {
      return json({ error: "Solicitação não está mais pendente (status: " + rr.status + ")." }, 409);
    }

    // Valida que o owner logado é dono do veículo (ou super_admin)
    let isAuthorized = false;
    if (rr.vehicle_id) {
      const { data: veh } = await admin
        .from("vehicles")
        .select("id, owner_id, make, model, year_model, fipe_value, category")
        .eq("id", rr.vehicle_id)
        .maybeSingle();
      if (veh && veh.owner_id === ownerId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      // Checa se é super_admin
      const { data: role } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", ownerId)
        .in("role", ["super_admin", "admin"])
        .eq("status", "aprovado")
        .limit(1);
      if (Array.isArray(role) && role.length > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      return json({ error: "Você não é o proprietário deste veículo." }, 403);
    }

    // Fase 45: VALIDA que o owner tem Stripe Connect ATIVA antes de aprovar.
    // Sem isso, cliente paga mas dinheiro fica preso na plataforma — owner
    // não consegue receber por transfer automático.
    // Super_admin pode aprovar mesmo sem Connect (caso de teste/manual).
    const { data: superAdminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", ownerId)
      .eq("role", "super_admin")
      .eq("status", "aprovado")
      .limit(1);
    const isSuperAdmin = Array.isArray(superAdminRole) && superAdminRole.length > 0;

    if (!isSuperAdmin) {
      // Pega o vehicle_owner_id pra checar a conta de pagamento DELE
      // (caso o admin esteja aprovando em nome do owner)
      let realOwnerId = ownerId;
      if (rr.vehicle_id) {
        const { data: vehOwner } = await admin
          .from("vehicles")
          .select("owner_id")
          .eq("id", rr.vehicle_id)
          .maybeSingle();
        if (vehOwner?.owner_id) realOwnerId = vehOwner.owner_id;
      }

      const { data: payoutAcc } = await admin
        .from("payout_accounts")
        .select("status, payouts_enabled")
        .eq("user_id", realOwnerId)
        .maybeSingle();

      const connectAtiva = payoutAcc?.status === "ativo" && payoutAcc?.payouts_enabled === true;
      if (!connectAtiva) {
        return json({
          error: "Configure sua conta bancária antes de aprovar reservas. Vá em 'Recebimentos' no seu dashboard pra conectar via Stripe (leva 5min).",
          code: "connect_not_ready",
          payout_status: payoutAcc?.status || "pendente"
        }, 409);
      }
    }

    // Pega dados do veículo (se vehicle_id existe)
    let vehicleName = "Veículo";
    let vehicleOwnerId = ownerId;
    let suggestedMonthly = 1800;
    let suggestedDeposit = 1500;

    if (rr.vehicle_id) {
      const { data: veh } = await admin
        .from("vehicles")
        .select("id, owner_id, make, model, year_model, fipe_value, category")
        .eq("id", rr.vehicle_id)
        .maybeSingle();
      if (veh) {
        vehicleName = [veh.make, veh.model, veh.year_model].filter(Boolean).join(" ");
        vehicleOwnerId = veh.owner_id;
        // Sugestão de preço: ~4.5% do FIPE (B-tier default)
        if (veh.fipe_value) {
          suggestedMonthly = Math.round(veh.fipe_value * 0.045);
          suggestedDeposit = Math.max(1000, Math.round(suggestedMonthly * 0.8));
        }
      }
    }

    // Pega tier do cliente pra aplicar desconto
    const { data: loyaltyRows } = await admin
      .rpc("get_client_loyalty_tier", { p_client_id: rr.client_id });
    const loyalty = (Array.isArray(loyaltyRows) && loyaltyRows.length > 0) ? loyaltyRows[0] : null;
    const discountPct = loyalty?.renewal_discount_pct ?? 5;
    const depositReductionPct = loyalty?.deposit_reduction_pct ?? 0;
    const tier = loyalty?.tier ?? "bronze";

    // Preço final (com desconto)
    const basePrice = monthly_price ? Number(monthly_price) : suggestedMonthly;
    const baseDeposit = deposit_amount ? Number(deposit_amount) : suggestedDeposit;
    const finalPrice = Math.round(basePrice * (1 - discountPct / 100) * 100) / 100;
    const finalDeposit = Math.round(baseDeposit * (1 - depositReductionPct / 100) * 100) / 100;
    const platformFee = Math.round(finalPrice * 0.10 * 100) / 100;
    const ownerEstimated = finalPrice - platformFee;

    // Datas
    const months = duration_months || rr.desired_months || 1;
    const startDate = rr.desired_start_date || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const endDate = (() => {
      const d = new Date(startDate + "T12:00:00");
      d.setDate(d.getDate() + months * 30);
      return d.toISOString().slice(0, 10);
    })();

    // Cria a booking
    const { data: bookingIns, error: bookErr } = await admin
      .from("bookings")
      .insert({
        client_id: rr.client_id,
        owner_id: vehicleOwnerId,
        vehicle_id: rr.vehicle_id,
        start_date: startDate,
        end_date: endDate,
        monthly_price: finalPrice,
        platform_fee: platformFee,
        owner_estimated_amount: ownerEstimated,
        deposit_amount: finalDeposit,
        status: "aprovado",
        billing_mode: "monthly",
      })
      .select("id, protocol_number")
      .single();

    if (bookErr || !bookingIns) {
      return json({ error: "Falha ao criar booking.", detail: bookErr?.message }, 500);
    }

    const bookingId = bookingIns.id;

    // Atualiza rental_request
    await admin
      .from("rental_requests")
      .update({ status: "aprovado" })
      .eq("id", rental_request_id);

    // Pega dados do cliente
    const { data: cliProfile } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", rr.client_id)
      .maybeSingle();

    const { data: cliAuth } = await admin.auth.admin.getUserById(rr.client_id);
    const clientEmail = cliAuth?.user?.email;

    let emailSent = false;
    let emailError: string | undefined;
    if (clientEmail) {
      const tpl = emailRentalApproved({
        clientName: cliProfile?.full_name || "Cliente",
        vehicleName,
        startDate,
        endDate,
        monthlyPrice: finalPrice,
        depositAmount: finalDeposit,
        discountPct,
        tier,
        bookingId,
      });
      const r = await sendEmail(clientEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo);
      emailSent = r.ok;
      emailError = r.error;
    }

    // Audit log
    await admin.from("admin_audit_logs").insert({
      admin_id: ownerId,
      action: "rental_request_approved",
      target_type: "rental_requests",
      target_id: rental_request_id,
      metadata_json: {
        booking_id: bookingId,
        client_id: rr.client_id,
        vehicle_id: rr.vehicle_id,
        monthly_price: finalPrice,
        deposit_amount: finalDeposit,
        discount_pct: discountPct,
        tier,
        email_sent: emailSent,
        email_error: emailError,
      },
    });

    return json({
      ok: true,
      booking_id: bookingId,
      protocol_number: bookingIns.protocol_number,
      monthly_price: finalPrice,
      deposit_amount: finalDeposit,
      discount_pct: discountPct,
      tier,
      email_sent: emailSent,
      message: "Reserva criada com sucesso. Cliente recebeu e-mail pra pagar.",
    });

  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Erro desconhecido." }, 500);
  }
});
