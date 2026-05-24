// ====================================================================
// Nomade Drive Brasil — Edge Function: reject-rental-request
// --------------------------------------------------------------------
// Owner recusa rental_request → marca como 'recusado' + e-mail amigável
// pro cliente com motivo (se fornecido).
//
// BODY:
//   { rental_request_id: uuid, reason?: string }
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

async function sendEmail(to: string, subject: string, html: string, text: string, replyTo?: string) {
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

function emailRentalRejected(d: {
  clientName: string;
  vehicleName: string;
  reason?: string;
}) {
  const firstName = (d.clientName || "Cliente").split(" ")[0];

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Solicitação não disponível</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#5b6b63 0%,#3a4945 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.88;">Solicitação não disponível</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:21px;font-weight:700;color:#14201b;">Olá, ' + escapeHtml(firstName) + '</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">'
    + 'Infelizmente o <strong>' + escapeHtml(d.vehicleName) + '</strong> não está disponível pra sua solicitação. '
    + 'Pode ser por agenda do proprietário, conflito com outras reservas, ou alguma outra razão operacional.</p>'
    + (d.reason
        ? '<div style="background:#fff5e8;border-left:3px solid #cf7a1c;padding:12px 16px;margin:14px 0;border-radius:6px;font-size:13.5px;color:#3a4945;">'
          + '<strong>Mensagem do proprietário:</strong><br>' + escapeHtml(d.reason) + '</div>'
        : '')
    + '<p style="margin:14px 0;font-size:14px;line-height:1.55;color:#3a4945;">'
    + 'Mas a frota é grande! Continua olhando — temos outros veículos que podem ter a disponibilidade que você precisa.</p>'
    + '<p style="margin:24px 0 0;text-align:center;">'
    + '<a href="' + SITE + '/#frota" style="display:inline-block;background:#145f3e;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">'
    + '🚗 Ver outros veículos</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#f0f7f3;padding:18px 28px;border-top:1px solid #cde0d4;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · Dúvidas: responda este e-mail.'
    + '</td></tr></table></td></tr></table></body></html>';

  const text =
    "Olá " + firstName + ",\n\n"
    + "Infelizmente o " + d.vehicleName + " não está disponível pra sua solicitação.\n\n"
    + (d.reason ? "Mensagem do proprietário: " + d.reason + "\n\n" : "")
    + "Mas temos outros veículos disponíveis! Veja em: " + SITE + "/#frota\n\n"
    + "— Equipe Nomade Drive Brasil";

  return {
    subject: "Sobre sua solicitação do " + d.vehicleName,
    html, text, replyTo: "contato@nomadedrive.com.br",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado." }, 401);
    const ownerId = userData.user.id;

    const { rental_request_id, reason } = await req.json();
    if (!rental_request_id) return json({ error: "rental_request_id obrigatório." }, 400);

    const admin = createClient(url, serviceKey);

    const { data: rr } = await admin
      .from("rental_requests")
      .select("id, client_id, vehicle_id, status")
      .eq("id", rental_request_id)
      .maybeSingle();

    if (!rr) return json({ error: "Solicitação não encontrada." }, 404);
    if (rr.status !== "em_analise") {
      return json({ error: "Solicitação não está mais pendente." }, 409);
    }

    // Autorização: owner do veículo OU super_admin
    let isAuthorized = false;
    let vehicleName = "Veículo";
    if (rr.vehicle_id) {
      const { data: veh } = await admin
        .from("vehicles")
        .select("owner_id, make, model, year_model")
        .eq("id", rr.vehicle_id)
        .maybeSingle();
      if (veh) {
        if (veh.owner_id === ownerId) isAuthorized = true;
        vehicleName = [veh.make, veh.model, veh.year_model].filter(Boolean).join(" ");
      }
    }
    if (!isAuthorized) {
      const { data: role } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", ownerId)
        .in("role", ["super_admin", "admin"])
        .eq("status", "aprovado")
        .limit(1);
      if (Array.isArray(role) && role.length > 0) isAuthorized = true;
    }
    if (!isAuthorized) return json({ error: "Sem permissão." }, 403);

    // Atualiza status
    await admin
      .from("rental_requests")
      .update({ status: "recusado" })
      .eq("id", rental_request_id);

    // E-mail pro cliente
    const { data: cliProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", rr.client_id)
      .maybeSingle();
    const { data: cliAuth } = await admin.auth.admin.getUserById(rr.client_id);
    const clientEmail = cliAuth?.user?.email;

    let emailSent = false;
    if (clientEmail) {
      const tpl = emailRentalRejected({
        clientName: cliProfile?.full_name || "Cliente",
        vehicleName,
        reason,
      });
      const r = await sendEmail(clientEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo);
      emailSent = r.ok;
    }

    await admin.from("admin_audit_logs").insert({
      admin_id: ownerId,
      action: "rental_request_rejected",
      target_type: "rental_requests",
      target_id: rental_request_id,
      metadata_json: {
        client_id: rr.client_id,
        vehicle_id: rr.vehicle_id,
        reason,
        email_sent: emailSent,
      },
    });

    return json({ ok: true, email_sent: emailSent });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Erro desconhecido." }, 500);
  }
});
