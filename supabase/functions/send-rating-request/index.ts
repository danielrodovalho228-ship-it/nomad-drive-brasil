// ====================================================================
// Nomade Drive Brasil — Edge Function: send-rating-request
// --------------------------------------------------------------------
// Cron diário → busca bookings que viraram 'encerrada' há ~24h e
// que ainda NÃO foram avaliadas pelo cliente. Envia e-mail
// "Como foi sua experiência?" com link pro dashboard.
//
// Anti-spam: anota em admin_audit_logs e não envia 2x.
//
// Verify JWT: DESLIGADO (chamada via pg_cron, sem usuário)
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

function emailRatingRequest(d: {
  clientName: string;
  vehicleName: string;
  bookingId: string;
}) {
  const firstName = (d.clientName || "Cliente").split(" ")[0];

  // Link com query param pra pré-selecionar estrelas no dashboard
  const rateUrl = (stars: number) =>
    SITE + "/dashboard-cliente.html?rate_booking=" + d.bookingId + "&stars=" + stars;

  const starBtn = (stars: number, label: string) =>
    '<a href="' + rateUrl(stars) + '" '
    + 'style="display:inline-block;background:#fff;border:2px solid #d97706;color:#7c2d12;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:4px;">'
    + label + '</a>';

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'

    // Header
    + '<tr><td style="background:linear-gradient(135deg,#d4af37 0%,#fbbf24 100%);padding:30px 28px;text-align:center;color:#7c2d12;">'
    + '<div style="font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">⭐ Avalie sua experiência</div>'
    + '<div style="font-size:48px;line-height:1;margin:10px 0;">⭐⭐⭐⭐⭐</div>'
    + '<div style="font-size:24px;font-weight:800;line-height:1.2;">Sua opinião conta, ' + escapeHtml(firstName) + '!</div>'
    + '</td></tr>'

    // Body
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3a4945;">Esperamos que sua experiência com o <strong>' + escapeHtml(d.vehicleName) + '</strong> tenha sido excelente!</p>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">Sua avaliação ajuda muito:</p>'
    + '<ul style="margin:0 0 18px;padding-left:20px;color:#3a4945;font-size:14px;line-height:1.7;">'
    + '<li>🚗 Outros clientes a escolherem o veículo certo</li>'
    + '<li>👤 O proprietário a saber que fez um bom trabalho</li>'
    + '<li>⭐ A plataforma a melhorar o serviço</li>'
    + '</ul>'

    // CTAs com estrelas
    + '<div style="background:#fef9c3;border-radius:10px;padding:18px 16px;margin:18px 0;text-align:center;">'
    + '<div style="font-size:13px;font-weight:700;color:#7c2d12;margin-bottom:12px;">Clica numa nota pra avaliar (leva 30 segundos):</div>'
    + '<div>'
    +   starBtn(5, '⭐⭐⭐⭐⭐ Ótimo')
    +   starBtn(4, '⭐⭐⭐⭐ Bom')
    +   starBtn(3, '⭐⭐⭐ Regular')
    + '</div>'
    + '<div style="margin-top:8px;">'
    +   starBtn(2, '⭐⭐ Ruim')
    +   starBtn(1, '⭐ Péssimo')
    + '</div>'
    + '</div>'

    + '<p style="margin:18px 0 0;font-size:12.5px;color:#8a948e;text-align:center;">Não quer avaliar? Sem problema — você pode fazer mais tarde no seu painel.</p>'
    + '</td></tr>'

    // Footer
    + '<tr><td style="background:#f0f7f3;padding:18px 28px;border-top:1px solid #cde0d4;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG · '
    + '<a href="' + SITE + '" style="color:#145f3e;">nomadedrive.com.br</a><br>'
    + 'Dúvidas? Responda este e-mail.'
    + '</td></tr></table></td></tr></table></body></html>';

  const text =
    "⭐ Como foi sua experiência?\n\n" +
    "Olá " + firstName + ",\n\n" +
    "Esperamos que sua experiência com o " + d.vehicleName + " tenha sido excelente!\n\n" +
    "Sua avaliação ajuda outros clientes a escolherem bem.\n\n" +
    "Avalie em: " + SITE + "/dashboard-cliente.html\n\n" +
    "Nomade Drive Brasil";

  return {
    subject: "⭐ Como foi sua experiência com o " + d.vehicleName + "?",
    html, text, replyTo: "contato@nomadedrive.com.br",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // FIX CRÍTICO 2026-05-24: aceitava GET — qualquer um com anon key
  // podia invocar repetidamente (custo Supabase + Resend escalando).
  // Agora: SÓ POST + valida shared secret no body OU header.
  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  // Anti-abuse: exige CRON_SECRET (env var) no body OU header
  // Sem isso, cron precisa ser atualizado pra mandar o secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const headerSecret = req.headers.get("x-cron-secret");
    let bodySecret: string | null = null;
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      bodySecret = body?.cron_secret ?? null;
    } catch {}
    if (headerSecret !== cronSecret && bodySecret !== cronSecret) {
      return json({ error: "unauthorized" }, 403);
    }
  }
  // Se CRON_SECRET não estiver setado, função aceita (modo dev — log warning)
  if (!cronSecret) {
    console.warn("CRON_SECRET não configurado — função aberta. Configura em Secrets pra produção.");
  }

  const result = { checked: 0, sent: 0, skipped: 0, failed: 0, details: [] as any[] };

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // 1) Busca bookings encerradas há ~24h SEM avaliação do cliente
    //    (status='encerrada' + updated_at entre 18h-30h atrás)
    const { data: bookings } = await admin
      .from("bookings")
      .select("id, client_id, owner_id, vehicle_id, updated_at, vehicles(make,model,year_model)")
      .eq("status", "encerrada")
      .gte("updated_at", new Date(Date.now() - 30 * 3600 * 1000).toISOString())
      .lte("updated_at", new Date(Date.now() - 18 * 3600 * 1000).toISOString());

    if (!bookings || bookings.length === 0) {
      return json({ ok: true, message: "Nenhuma booking elegível no momento.", ...result });
    }

    for (const b of bookings) {
      result.checked++;

      // 2) Skip se cliente já avaliou
      // FIX 2026-05-24: tratar erro de query (RLS, indisponibilidade)
      // pra não reenviar e-mail acidentalmente quando DB engasga
      const { data: existingRating, error: ratingErr } = await admin
        .from("ratings")
        .select("id")
        .eq("booking_id", b.id)
        .eq("direction", "client_rates_owner")
        .limit(1);
      if (ratingErr) {
        console.error("ratings query failed:", ratingErr.message);
        result.failed++;
        continue;  // não envia em caso de dúvida
      }
      if (Array.isArray(existingRating) && existingRating.length > 0) {
        result.skipped++;
        continue;
      }

      // 3) Skip se já mandamos e-mail pra essa booking
      const { data: priorEmail, error: priorEmailErr } = await admin
        .from("admin_audit_logs")
        .select("id")
        .eq("action", "rating_request_email_sent")
        .eq("target_id", b.id)
        .limit(1);
      if (priorEmailErr) {
        console.error("audit logs query failed:", priorEmailErr.message);
        result.failed++;
        continue;  // não envia em caso de dúvida
      }
      if (Array.isArray(priorEmail) && priorEmail.length > 0) {
        result.skipped++;
        continue;
      }

      // 4) Pega e-mail + nome do cliente
      const { data: profile } = await admin
        .from("profiles").select("full_name").eq("id", b.client_id).maybeSingle();
      const { data: authUser } = await admin.auth.admin.getUserById(b.client_id);
      const userEmail = authUser?.user?.email;
      if (!userEmail) {
        result.skipped++;
        continue;
      }

      // 5) Envia e-mail
      const v = (b as any).vehicles || {};
      const vehName = [v.make, v.model, v.year_model].filter(Boolean).join(" ") || "Veículo";
      const tpl = emailRatingRequest({
        clientName: profile?.full_name || "Cliente",
        vehicleName: vehName,
        bookingId: b.id,
      });
      const sent = await sendEmail(userEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo);

      // 6) Log
      await admin.from("admin_audit_logs").insert({
        admin_id: null,
        action: "rating_request_email_sent",
        target_type: "bookings",
        target_id: b.id,
        metadata_json: {
          client_id: b.client_id,
          client_email: userEmail,
          vehicle_name: vehName,
          email_sent: sent.ok,
          email_error: sent.error,
        },
      });

      if (sent.ok) {
        result.sent++;
        result.details.push({ booking_id: b.id, client_email: userEmail, ok: true });
      } else {
        result.failed++;
        result.details.push({ booking_id: b.id, client_email: userEmail, ok: false, error: sent.error });
      }
    }

    return json({ ok: true, ...result });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Erro desconhecido.", ...result }, 500);
  }
});
