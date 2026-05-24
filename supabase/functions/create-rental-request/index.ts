// ====================================================================
// Nomade Drive Brasil — Edge Function: create-rental-request
// --------------------------------------------------------------------
// Cria uma rental_request quando o cliente clica "Quero alugar este
// carro" na página do veículo (car.html). Dispara 2 e-mails:
//   1. Pro proprietário (se vehicle_id mapeado) OU pro staff
//      (contato@nomadedrive.com.br) se for um modelo do catálogo sem
//      veículo correspondente cadastrado
//   2. Pro cliente — confirmação de recebimento
//
// PRÉ-REQUISITOS:
//   - Cliente autenticado
//   - verification_status = 'aprovado'
//
// BODY:
//   {
//     vehicle_id?: uuid,              -- opcional (catálogo nem sempre tem match)
//     catalog_id?: string,            -- ex.: "hb20-comfort" (do CAR_CATALOG)
//     catalog_name?: string,          -- ex.: "Hyundai HB20 Comfort"
//     desired_start_date?: string,    -- "YYYY-MM-DD"
//     desired_months?: number,        -- 1, 2, 3, 4, 6
//     city?: string,
//     reason?: string                 -- texto livre adicional
//   }
//
// Verify JWT: LIGADO
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";
const STAFF_EMAIL = "contato@nomadedrive.com.br";

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
// E-mail PRO PROPRIETÁRIO / STAFF — novo interesse de locação
// ============================================================
function emailNewRequestOwner(d: {
  toOwner: boolean;
  vehicleName: string;
  clientName: string;
  clientCity?: string | null;
  desiredStart?: string | null;
  desiredMonths?: number | null;
  reason?: string | null;
  rentalRequestId: string;
}) {
  const greeting = d.toOwner
    ? "Você tem um novo interesse na locação do seu veículo!"
    : "Há um novo interesse de locação que precisa de atenção comercial.";

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Novo interesse de locação</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Novo interesse</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#14201b;">' + escapeHtml(greeting) + '</h1>'
    + '<p style="margin:0 0 18px;font-size:14.5px;line-height:1.6;color:#3a4945;">'
    + 'Recebemos uma nova solicitação pela plataforma. Os detalhes estão abaixo:</p>'
    + '<table cellpadding="10" cellspacing="0" style="background:#f0f7f3;border-radius:10px;margin:8px 0 18px;width:100%;font-size:14px;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:160px;">Veículo</td><td style="color:#14201b;">' + escapeHtml(d.vehicleName) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Cliente</td><td style="color:#14201b;">' + escapeHtml(d.clientName) + '</td></tr>'
    + (d.clientCity ? '<tr><td style="font-weight:600;color:#5b6b63;">Cidade do cliente</td><td style="color:#14201b;">' + escapeHtml(d.clientCity) + '</td></tr>' : "")
    + (d.desiredStart ? '<tr><td style="font-weight:600;color:#5b6b63;">Retirada pretendida</td><td style="color:#14201b;">' + escapeHtml(fmtDateBR(d.desiredStart)) + '</td></tr>' : "")
    + (d.desiredMonths ? '<tr><td style="font-weight:600;color:#5b6b63;">Duração</td><td style="color:#14201b;">' + d.desiredMonths + (d.desiredMonths === 1 ? " mês" : " meses") + '</td></tr>' : "")
    + '</table>'
    + (d.reason ? '<p style="margin:14px 0;padding:12px;background:#fffbe6;border-left:3px solid #d4af37;font-size:14px;line-height:1.55;color:#3a4945;">'
        + '<strong>Observação do cliente:</strong><br>' + escapeHtml(d.reason) + '</p>' : "")
    + '<p style="margin:24px 0 12px;font-size:14px;line-height:1.55;color:#3a4945;"><strong>Próximo passo:</strong> '
    + (d.toOwner
        ? 'acesse seu painel de proprietário pra responder ao interesse e aprovar a reserva.'
        : 'a equipe deve avaliar a solicitação e encaminhar pro proprietário correspondente.')
    + '</p>'
    + '<p style="margin:20px 0 0;"><a href="' + SITE + (d.toOwner ? '/dashboard-proprietario.html' : '/admin.html')
    + '" style="display:inline-block;background:#145f3e;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">Abrir painel</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#f0f7f3;padding:18px 28px;border-top:1px solid #cde0d4;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · Dúvidas: responda este e-mail.<br>'
    + '<span style="color:#5b6b63;font-family:monospace;font-size:11.5px;">📋 Referência: <strong>' + escapeHtml(d.rentalRequestId.slice(0, 8)) + '</strong></span>'
    + '</td></tr></table></td></tr></table></body></html>';

  const text =
    "Novo interesse de locação — Nomade Drive Brasil\n\n"
    + greeting + "\n\n"
    + "Veículo: " + d.vehicleName + "\n"
    + "Cliente: " + d.clientName + "\n"
    + (d.clientCity ? "Cidade: " + d.clientCity + "\n" : "")
    + (d.desiredStart ? "Retirada: " + fmtDateBR(d.desiredStart) + "\n" : "")
    + (d.desiredMonths ? "Duração: " + d.desiredMonths + " meses\n" : "")
    + (d.reason ? "\nObservação: " + d.reason + "\n" : "")
    + "\nAbrir painel: " + SITE + (d.toOwner ? "/dashboard-proprietario.html" : "/admin.html") + "\n\n"
    + "Referência: " + d.rentalRequestId.slice(0, 8);

  return {
    subject: (d.toOwner ? "Novo interesse no seu " : "Novo interesse — ") + d.vehicleName,
    html, text, replyTo: "comercial@nomadedrive.com.br",
  };
}

// ============================================================
// E-mail PRO CLIENTE — confirmação de recebimento
// ============================================================
function emailNewRequestClient(d: {
  clientName: string;
  vehicleName: string;
  desiredStart?: string | null;
  desiredMonths?: number | null;
  rentalRequestId: string;
}) {
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Solicitação recebida</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Solicitação recebida</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;">Recebemos sua solicitação, ' + escapeHtml(d.clientName.split(" ")[0]) + '!</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">Sua solicitação de locação foi registrada com sucesso. Aqui está o resumo:</p>'
    + '<table cellpadding="10" cellspacing="0" style="background:#f0f7f3;border-radius:10px;margin:8px 0 18px;width:100%;font-size:14px;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:160px;">Veículo de interesse</td><td style="color:#14201b;">' + escapeHtml(d.vehicleName) + '</td></tr>'
    + (d.desiredStart ? '<tr><td style="font-weight:600;color:#5b6b63;">Retirada pretendida</td><td style="color:#14201b;">' + escapeHtml(fmtDateBR(d.desiredStart)) + '</td></tr>' : "")
    + (d.desiredMonths ? '<tr><td style="font-weight:600;color:#5b6b63;">Duração</td><td style="color:#14201b;">' + d.desiredMonths + (d.desiredMonths === 1 ? " mês" : " meses") + '</td></tr>' : "")
    + '</table>'
    + '<p style="margin:14px 0;font-size:14px;line-height:1.55;color:#3a4945;"><strong>Próximos passos:</strong></p>'
    + '<ol style="margin:0 0 14px;padding-left:18px;color:#3a4945;line-height:1.7;font-size:14px;">'
    + '<li>O proprietário (ou nossa equipe comercial) vai avaliar a disponibilidade.</li>'
    + '<li>Você recebe um retorno por e-mail em até <strong>24 horas</strong>.</li>'
    + '<li>Se aprovado, abrimos a reserva no seu painel pra você confirmar e pagar.</li>'
    + '</ol>'
    + '<p style="margin:24px 0 0;"><a href="' + SITE + '/dashboard-cliente.html" style="display:inline-block;background:#145f3e;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">Ver no meu painel</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#f0f7f3;padding:18px 28px;border-top:1px solid #cde0d4;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · Dúvidas: responda este e-mail.<br>'
    + '<span style="color:#5b6b63;font-family:monospace;font-size:11.5px;">📋 Referência: <strong>' + escapeHtml(d.rentalRequestId.slice(0, 8)) + '</strong></span>'
    + '</td></tr></table></td></tr></table></body></html>';

  const text =
    "Solicitação recebida — Nomade Drive Brasil\n\n"
    + "Olá " + d.clientName + ",\n\n"
    + "Recebemos sua solicitação de locação. Aqui está o resumo:\n\n"
    + "Veículo: " + d.vehicleName + "\n"
    + (d.desiredStart ? "Retirada: " + fmtDateBR(d.desiredStart) + "\n" : "")
    + (d.desiredMonths ? "Duração: " + d.desiredMonths + " meses\n" : "")
    + "\nO proprietário (ou nossa equipe) responde em até 24h.\n"
    + "\nVer no painel: " + SITE + "/dashboard-cliente.html\n\n"
    + "Referência: " + d.rentalRequestId.slice(0, 8);

  return {
    subject: "Solicitação recebida — " + d.vehicleName + " — Nomade Drive Brasil",
    html, text, replyTo: "contato@nomadedrive.com.br",
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

    // Auth do cliente
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado." }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const {
      vehicle_id,
      catalog_id,
      catalog_name,
      desired_start_date,
      desired_months,
      city,
      reason,
    } = body || {};

    // Service role pra ler profile + criar rental_request + ler vehicle
    const admin = createClient(url, serviceKey);

    // Valida cadastro do cliente
    const { data: cliProfile, error: cliErr } = await admin
      .from("profiles")
      .select("id, full_name, verification_status, city")
      .eq("id", userId)
      .maybeSingle();

    if (cliErr || !cliProfile) {
      return json({ error: "Perfil não encontrado.", detail: cliErr?.message }, 400);
    }

    if (cliProfile.verification_status !== "aprovado") {
      return json({
        error: "Cadastro pendente.",
        verification_status: cliProfile.verification_status,
        redirect: cliProfile.verification_status === "rascunho"
          ? "/onboarding-cliente.html"
          : "/status-cadastro.html",
      }, 403);
    }

    const clientEmail = userData.user.email || "";

    // Resolve dados do veículo
    let vehicleOwnerId: string | null = null;
    let vehicleName = catalog_name || "Veículo não especificado";
    let resolvedVehicleId: string | null = vehicle_id || null;

    if (resolvedVehicleId) {
      const { data: veh } = await admin
        .from("vehicles")
        .select("id, owner_id, make, model, year_model")
        .eq("id", resolvedVehicleId)
        .maybeSingle();
      if (veh) {
        vehicleOwnerId = veh.owner_id;
        vehicleName = [veh.make, veh.model, veh.year_model].filter(Boolean).join(" ");
      }
    }

    // Cria rental_request
    const reasonText = [
      catalog_name ? `Modelo de interesse: ${catalog_name}` : null,
      catalog_id ? `(catalog_id: ${catalog_id})` : null,
      reason ? `Obs: ${reason}` : null,
    ].filter(Boolean).join(" — ");

    const { data: rrInserted, error: insErr } = await admin
      .from("rental_requests")
      .insert({
        client_id: userId,
        vehicle_id: resolvedVehicleId,
        desired_start_date: desired_start_date || null,
        desired_months: desired_months || null,
        reason: reasonText.slice(0, 1000),
        city: city || cliProfile.city || null,
        status: "em_analise",
      })
      .select("id")
      .single();

    if (insErr || !rrInserted) {
      return json({ error: "Falha ao criar solicitação.", detail: insErr?.message }, 500);
    }

    const rrId: string = rrInserted.id;

    // E-mail pro owner / staff
    let ownerEmailTarget = STAFF_EMAIL;
    let isOwnerEmail = false;
    if (vehicleOwnerId) {
      const { data: ownerProfile } = await admin
        .from("profiles")
        .select("id, full_name")
        .eq("id", vehicleOwnerId)
        .maybeSingle();
      if (ownerProfile) {
        // Pega email do auth.users via service role
        const { data: ownerAuth } = await admin.auth.admin.getUserById(vehicleOwnerId);
        if (ownerAuth?.user?.email) {
          ownerEmailTarget = ownerAuth.user.email;
          isOwnerEmail = true;
        }
      }
    }

    const tplOwner = emailNewRequestOwner({
      toOwner: isOwnerEmail,
      vehicleName,
      clientName: cliProfile.full_name || "Cliente",
      clientCity: cliProfile.city,
      desiredStart: desired_start_date,
      desiredMonths: desired_months,
      reason,
      rentalRequestId: rrId,
    });

    const ownerSend = await sendEmail(
      ownerEmailTarget, tplOwner.subject, tplOwner.html, tplOwner.text, tplOwner.replyTo,
    );

    // E-mail pro cliente (confirmação)
    let clientSend: { ok: boolean; error?: string; id?: string } = { ok: false, error: "sem email do cliente" };
    if (clientEmail) {
      const tplClient = emailNewRequestClient({
        clientName: cliProfile.full_name || "Cliente",
        vehicleName,
        desiredStart: desired_start_date,
        desiredMonths: desired_months,
        rentalRequestId: rrId,
      });
      clientSend = await sendEmail(
        clientEmail, tplClient.subject, tplClient.html, tplClient.text, tplClient.replyTo,
      );
    }

    // Log de auditoria
    try {
      await admin.from("admin_audit_logs").insert({
        admin_id: userId,
        action: "rental_request_created",
        target_type: "rental_requests",
        target_id: rrId,
        metadata_json: {
          source: "car.html",
          catalog_id,
          catalog_name,
          vehicle_id: resolvedVehicleId,
          owner_email_target: ownerEmailTarget,
          owner_email_ok: ownerSend.ok,
          client_email_ok: clientSend.ok,
        },
      });
    } catch { /* ok */ }

    return json({
      ok: true,
      rental_request_id: rrId,
      vehicle_name: vehicleName,
      emails: {
        owner: { sent: ownerSend.ok, target: isOwnerEmail ? "owner" : "staff", error: ownerSend.error },
        client: { sent: clientSend.ok, error: clientSend.error },
      },
    });

  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Erro desconhecido." }, 500);
  }
});
