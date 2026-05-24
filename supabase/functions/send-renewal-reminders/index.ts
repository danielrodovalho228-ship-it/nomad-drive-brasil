// ====================================================================
// Nomade Drive Brasil — Edge Function: send-renewal-reminders
// --------------------------------------------------------------------
// Fase 41b: Cron diário que detecta clientes a 7 dias (ou menos) do
// fim da locação e envia e-mail "Renove com 5% off".
//
// CHAMADO POR:
//   - pg_cron diário 9h UTC
//   - Manualmente (admin) via Functions UI / SDK
//
// FLUXO:
//   1. Lê view renewal_opportunities (já filtra elegibilidade)
//   2. Pra cada oportunidade com days_remaining IN (7, 3, 1) — 3 lembretes
//   3. Verifica se já mandou hoje (anti-spam via metadata em audit_logs)
//   4. Dispara e-mail via Resend
//   5. Loga em admin_audit_logs (action=renewal_reminder_sent)
//
// SECRETS: RESEND_API_KEY, EMAIL_FROM (opcional)
// AUTH: Verify JWT LIGADO mas aceita anon pra cron rodar.
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
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { ok: false, error: "RESEND_API_KEY ou destinatário vazio" };
  const from = Deno.env.get("EMAIL_FROM") || "Nomade Drive Brasil <onboarding@resend.dev>";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text,
        reply_to: "contato@nomadedrive.com.br" }),
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

function emailRenewalReminder(d: {
  client_name: string;
  vehicle: string;
  days_remaining: number;
  price_old: number;
  price_new: number;
  discount: number;
  protocolo: string;
  booking_id: string;
}): { subject: string; html: string; text: string } {
  const urgency = d.days_remaining <= 3
    ? '🚨 Últimos dias'
    : '⏰ Sua locação termina em breve';
  const urgencyColor = d.days_remaining <= 3 ? '#b00020' : '#cf7a1c';

  const subject = '🔄 Renove sua locação com 5% off — ' + d.days_remaining + (d.days_remaining === 1 ? ' dia restante' : ' dias restantes');

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">' +
    '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">' +
    '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">' +
    '<tr><td style="background:linear-gradient(135deg,#ffc107 0%,#ffb300 100%);padding:24px 28px;">' +
    '<table cellpadding="0" cellspacing="0" width="100%"><tr>' +
    '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>' +
    '<td align="right" valign="middle" style="color:#14201b;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">' + urgency + '</td>' +
    '</tr></table></td></tr>' +
    '<tr><td style="padding:30px 28px 24px;">' +
    '<h1 style="margin:0 0 14px;font-size:24px;font-weight:800;color:#14201b;font-family:Sora,sans-serif;">⏰ Faltam ' + d.days_remaining + ' dia' + (d.days_remaining === 1 ? '' : 's') + '</h1>' +
    '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">Olá ' + escapeHtml(d.client_name) + ',</p>' +
    '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">Sua locação do <strong>' + escapeHtml(d.vehicle) + '</strong> está chegando ao fim. Quer continuar com o veículo?</p>' +

    // Oferta destacada
    '<div style="background:linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%);border:2px solid #ffc107;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">' +
    '<div style="background:#198754;color:#fff;display:inline-block;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:10px;">5% OFF NA RENOVAÇÃO</div>' +
    '<div style="font-size:13px;color:#5b6b63;margin-bottom:4px;">De <span style="text-decoration:line-through;">R$ ' + fmtBRL(d.price_old) + '</span> por</div>' +
    '<div style="font-size:34px;font-weight:800;color:#0f5132;font-family:Sora,sans-serif;line-height:1;">R$ ' + fmtBRL(d.price_new) + '<span style="font-size:14px;font-weight:500;">/mês</span></div>' +
    '<div style="font-size:12px;color:#5b6b63;margin-top:6px;">Economize <strong>R$ ' + fmtBRL(d.discount) + '</strong> no 1º mês da renovação</div>' +
    '</div>' +

    '<p style="margin:14px 0 6px;font-size:14px;color:#3a4945;line-height:1.55;"><strong>Como funciona:</strong></p>' +
    '<ol style="margin:0 0 14px;padding-left:18px;color:#5b6b63;line-height:1.8;font-size:14px;">' +
    '<li>Você clica no botão abaixo</li>' +
    '<li>Escolhe duração: <strong>1, 2 ou 3 meses</strong></li>' +
    '<li>Confirma pagamento da próxima mensalidade (com 5% off)</li>' +
    '<li>Continua usando o mesmo veículo, sem precisar passar por verificação de novo</li>' +
    '</ol>' +

    '<p style="margin:24px 0 0;text-align:center;"><a href="' + SITE + '/reserva-detalhe.html?id=' + escapeHtml(d.booking_id) + '" style="display:inline-block;background:#0f5132;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">🔄 Renovar com 5% off</a></p>' +

    '<p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8a948e;">Não quer renovar? Sem problema — devolva o veículo na data combinada e nada muda.</p>' +
    '</td></tr>' +
    '<tr><td style="background:#f4f7f5;padding:18px 28px;border-top:1px solid #e3e9e5;font-size:12px;color:#5b6b63;line-height:1.55;">' +
    '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>' +
    '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · Dúvidas? Responda este e-mail.<br>' +
    (d.protocolo ? '<span style="color:#5b6b63;font-family:monospace;font-size:11.5px;">📋 Protocolo: <strong>' + escapeHtml(d.protocolo) + '</strong></span>' : '') +
    '</td></tr></table></td></tr></table></body></html>';

  const text = 'Olá ' + d.client_name + ',\n\n' +
    'Sua locação do ' + d.vehicle + ' termina em ' + d.days_remaining + ' dia(s).\n\n' +
    'Renove com 5% off! De R$ ' + fmtBRL(d.price_old) + ' por R$ ' + fmtBRL(d.price_new) + '/mês.\n' +
    'Economize R$ ' + fmtBRL(d.discount) + ' no 1º mês.\n\n' +
    'Renovar: ' + SITE + '/reserva-detalhe.html?id=' + d.booking_id + '\n\n' +
    'Não quer renovar? Devolva normalmente na data combinada.\n\n' +
    'Nomade Drive Brasil';

  return { subject, html, text };
}

// ============================ HANDLER ===============================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Método não permitido." }, 405);
  }

  const actions = {
    eligible_count: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [] as any[]
  };

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // 1. Busca oportunidades de renovação (D-7 ou menos)
    const { data: opportunities, error: oppErr } = await admin
      .from("renewal_opportunities")
      .select("*")
      .lte("days_remaining", 7)
      .gte("days_remaining", 0)
      .eq("has_pending_damage", false)
      .eq("already_renewed", false);

    if (oppErr) {
      return json({ error: "Falha ao buscar oportunidades: " + oppErr.message }, 500);
    }

    actions.eligible_count = (opportunities || []).length;

    // 2. Filtra: só envia em days_remaining IN (7, 3, 1) — 3 toques
    const trigger_days = [7, 3, 1];
    const toSend = (opportunities || []).filter(o => trigger_days.includes(o.days_remaining));

    // 3. Pra cada um, verifica se já mandou HOJE (anti-spam)
    for (const op of toSend) {
      try {
        const { data: alreadySent } = await admin
          .from("admin_audit_logs")
          .select("id")
          .eq("action", "renewal_reminder_sent")
          .eq("target_id", op.booking_id)
          .gte("created_at", new Date().toISOString().slice(0, 10) + "T00:00:00Z")
          .limit(1);

        if (alreadySent && alreadySent.length > 0) {
          actions.skipped++;
          actions.details.push({ booking_id: op.booking_id, status: "already_sent_today" });
          continue;
        }

        // 4. Monta e envia e-mail
        const vehName = [op.make, op.model, op.year_model].filter(Boolean).join(" ");
        const tpl = emailRenewalReminder({
          client_name: op.client_name || "Cliente",
          vehicle: vehName,
          days_remaining: op.days_remaining,
          price_old: Number(op.monthly_price),
          price_new: Number(op.discounted_price),
          discount: Number(op.discount_amount),
          protocolo: op.protocol_number || "",
          booking_id: op.booking_id
        });

        const r = await sendEmail(op.client_email, tpl.subject, tpl.html, tpl.text);

        if (r.ok) {
          actions.sent++;
          actions.details.push({
            booking_id: op.booking_id,
            client: op.client_name,
            days: op.days_remaining,
            email_id: r.id
          });

          // Loga
          await admin.from("admin_audit_logs").insert({
            action: "renewal_reminder_sent",
            target_type: "booking",
            target_id: op.booking_id,
            metadata_json: {
              days_remaining: op.days_remaining,
              email_to: op.client_email,
              resend_id: r.id
            }
          });
        } else {
          actions.failed++;
          actions.details.push({
            booking_id: op.booking_id,
            error: r.error
          });
        }
      } catch (e) {
        actions.failed++;
        actions.details.push({ booking_id: op.booking_id, error: (e as Error).message });
      }
    }

    return json({
      ok: true,
      ...actions,
      message: `Processadas ${actions.eligible_count} oportunidades. Enviados ${actions.sent}, pulados ${actions.skipped}, falhos ${actions.failed}.`
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message ?? String(e) }, 500);
  }
});
