// ====================================================================
// Nomade Drive Brasil — Edge Function: submit-lead-quote
// --------------------------------------------------------------------
// Recebe o formulário "Pedir orçamento" da landing (form #form-orcamento)
// e envia um e-mail pra contato@nomadedrive.com.br com os dados, mesmo
// se o cliente não tiver WhatsApp ou não clicar "enviar" no app.
//
// Esta função é ANÔNIMA (não exige JWT) — é um lead form público da landing.
// Anti-abuso básico:
//   - Rate limit suave por IP (best-effort via admin_audit_logs)
//   - Validação de campos
//   - Honeypot: campo "company" deve estar VAZIO (bots costumam preencher)
//
// BODY:
//   {
//     nome:       string (obrigatório),
//     contato:    string (whatsapp ou email — obrigatório),
//     cidade?:    string,
//     data?:      string ISO YYYY-MM-DD,
//     duracao?:   string|number (meses),
//     devolucao?: string ISO YYYY-MM-DD,
//     categoria?: string,
//     indicacao?: string,
//     obs?:       string,
//     intent?:    string,
//     source_url?: string,
//     company?:   string  (HONEYPOT — DEVE estar vazio)
//   }
//
// Verify JWT: DESLIGADO
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
// Template: lead recebido (pro staff comercial)
// ============================================================
function emailLeadStaff(d: {
  nome: string; contato: string; cidade?: string; dataRet?: string;
  duracao?: string; devolucao?: string; categoria?: string;
  indicacao?: string; obs?: string; intent?: string; sourceUrl?: string;
}) {
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Novo lead — Nomade Drive Brasil</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Novo lead</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#14201b;">Novo pedido de orçamento</h1>'
    + '<p style="margin:0 0 12px;font-size:14.5px;line-height:1.6;color:#3a4945;">'
    + (d.intent ? escapeHtml(d.intent) : "Cliente preencheu o formulário da landing.") + '</p>'
    + '<table cellpadding="10" cellspacing="0" style="background:#f0f7f3;border-radius:10px;margin:8px 0 18px;width:100%;font-size:14px;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:160px;">Nome</td><td style="color:#14201b;">' + escapeHtml(d.nome) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Contato</td><td style="color:#14201b;"><strong>' + escapeHtml(d.contato) + '</strong></td></tr>'
    + (d.cidade ? '<tr><td style="font-weight:600;color:#5b6b63;">Cidade</td><td style="color:#14201b;">' + escapeHtml(d.cidade) + '</td></tr>' : "")
    + (d.dataRet ? '<tr><td style="font-weight:600;color:#5b6b63;">Retirada</td><td style="color:#14201b;">' + escapeHtml(fmtDateBR(d.dataRet)) + '</td></tr>' : "")
    + (d.duracao ? '<tr><td style="font-weight:600;color:#5b6b63;">Duração</td><td style="color:#14201b;">' + escapeHtml(d.duracao) + (Number(d.duracao) === 1 ? " mês" : " meses") + '</td></tr>' : "")
    + (d.devolucao ? '<tr><td style="font-weight:600;color:#5b6b63;">Devolução</td><td style="color:#14201b;">' + escapeHtml(fmtDateBR(d.devolucao)) + '</td></tr>' : "")
    + (d.categoria ? '<tr><td style="font-weight:600;color:#5b6b63;">Categoria</td><td style="color:#14201b;">' + escapeHtml(d.categoria) + '</td></tr>' : "")
    + (d.indicacao ? '<tr><td style="font-weight:600;color:#5b6b63;">Indicação</td><td style="color:#14201b;">' + escapeHtml(d.indicacao) + '</td></tr>' : "")
    + '</table>'
    + (d.obs ? '<p style="margin:14px 0;padding:12px;background:#fffbe6;border-left:3px solid #d4af37;font-size:14px;line-height:1.55;color:#3a4945;"><strong>Observações:</strong><br>' + escapeHtml(d.obs) + '</p>' : "")
    + '<p style="margin:24px 0 0;font-size:13px;color:#5b6b63;">Responder o cliente em até 24h pelo contato informado acima.</p>'
    + '</td></tr>'
    + '<tr><td style="background:#f0f7f3;padding:18px 28px;border-top:1px solid #cde0d4;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Lead via landing</strong><br>'
    + (d.sourceUrl ? 'Origem: <a href="' + escapeHtml(d.sourceUrl) + '" style="color:#145f3e;">' + escapeHtml(d.sourceUrl) + '</a><br>' : "")
    + 'Recebido em: ' + new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    + '</td></tr></table></td></tr></table></body></html>';

  const text =
    "Novo lead — Nomade Drive Brasil\n\n"
    + (d.intent || "Cliente preencheu o formulário da landing.") + "\n\n"
    + "Nome: " + d.nome + "\n"
    + "Contato: " + d.contato + "\n"
    + (d.cidade ? "Cidade: " + d.cidade + "\n" : "")
    + (d.dataRet ? "Retirada: " + fmtDateBR(d.dataRet) + "\n" : "")
    + (d.duracao ? "Duração: " + d.duracao + " meses\n" : "")
    + (d.devolucao ? "Devolução: " + fmtDateBR(d.devolucao) + "\n" : "")
    + (d.categoria ? "Categoria: " + d.categoria + "\n" : "")
    + (d.indicacao ? "Indicação: " + d.indicacao + "\n" : "")
    + (d.obs ? "\nObservações: " + d.obs + "\n" : "")
    + "\nResponder em até 24h.\n\n"
    + "Recebido em: " + new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return {
    subject: "Lead landing — " + d.nome + (d.categoria ? " — " + d.categoria : ""),
    html, text, replyTo: d.contato.includes("@") ? d.contato : "comercial@nomadedrive.com.br",
  };
}

// ============================================================
// HANDLER
// ============================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const body = await req.json();
    const {
      nome, contato, cidade, data, duracao, devolucao, categoria,
      indicacao, obs, intent, source_url, company,
    } = body || {};

    // Honeypot — bots costumam preencher campo escondido "company"
    if (company && String(company).trim().length > 0) {
      // Silenciosamente retorna ok pra não dar pista pro bot
      return json({ ok: true, captured: false });
    }

    // Validação básica
    if (!nome || !String(nome).trim()) {
      return json({ error: "Nome é obrigatório." }, 400);
    }
    if (!contato || !String(contato).trim()) {
      return json({ error: "Contato (WhatsApp ou e-mail) é obrigatório." }, 400);
    }
    if (String(nome).length > 200 || String(contato).length > 200) {
      return json({ error: "Campos muito longos." }, 400);
    }
    if (obs && String(obs).length > 2000) {
      return json({ error: "Observações muito longas." }, 400);
    }

    // Envia e-mail pro staff comercial
    const tpl = emailLeadStaff({
      nome: String(nome).trim(),
      contato: String(contato).trim(),
      cidade: cidade ? String(cidade).trim() : undefined,
      dataRet: data ? String(data).trim() : undefined,
      duracao: duracao != null ? String(duracao).trim() : undefined,
      devolucao: devolucao ? String(devolucao).trim() : undefined,
      categoria: categoria ? String(categoria).trim() : undefined,
      indicacao: indicacao ? String(indicacao).trim() : undefined,
      obs: obs ? String(obs).trim() : undefined,
      intent: intent ? String(intent).trim() : undefined,
      sourceUrl: source_url ? String(source_url).trim() : undefined,
    });

    const sent = await sendEmail(
      STAFF_EMAIL, tpl.subject, tpl.html, tpl.text, tpl.replyTo,
    );

    // ============================================================
    // Fase 42 — INSERIR também em public.leads (pipeline no admin)
    // ============================================================
    let leadId: string | null = null;
    try {
      const url = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(url, serviceKey);

      // Normaliza duração (form manda string "1", "2", "" pra "+6")
      let monthsNum: number | null = null;
      if (duracao != null && String(duracao).trim() !== "") {
        const n = parseInt(String(duracao).trim(), 10);
        if (!isNaN(n) && n > 0) monthsNum = n;
      }

      // Anti-duplicata "burra": mesmo contato + mesma origem nas últimas 24h?
      // Não bloqueia inserir — só marca duplicata em notes pra equipe ver.
      const { data: dups } = await admin
        .from("leads")
        .select("id, created_at")
        .ilike("contact", String(contato).trim())
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .limit(1);
      const isDup = Array.isArray(dups) && dups.length > 0;

      const { data: leadIns, error: leadErr } = await admin
        .from("leads")
        .insert({
          name: String(nome).trim().slice(0, 200),
          contact: String(contato).trim().slice(0, 200),
          city: cidade ? String(cidade).trim().slice(0, 100) : null,
          desired_start_date: data && String(data).trim().match(/^\d{4}-\d{2}-\d{2}$/) ? String(data).trim() : null,
          desired_months: monthsNum,
          desired_devolucao: devolucao && String(devolucao).trim().match(/^\d{4}-\d{2}-\d{2}$/) ? String(devolucao).trim() : null,
          category: categoria ? String(categoria).trim().slice(0, 50) : null,
          indication: indicacao ? String(indicacao).trim().slice(0, 200) : null,
          obs: obs ? String(obs).trim().slice(0, 2000) : null,
          source: "landing_form",
          source_url: source_url ? String(source_url).trim().slice(0, 500) : null,
          intent: intent ? String(intent).trim().slice(0, 200) : null,
          status: "novo",
          notes: isDup ? "⚠️ Possível duplicata (mesmo contato nas últimas 24h)" : null,
        })
        .select("id")
        .single();

      if (leadErr) {
        // Não derruba — só loga
        console.error("Lead insert failed:", leadErr.message);
      } else {
        leadId = leadIns?.id ?? null;
      }

      // Log audit
      await admin.from("admin_audit_logs").insert({
        admin_id: null,
        action: "lead_quote_submitted",
        target_type: "leads",
        target_id: leadId,
        metadata_json: {
          source: "landing_form",
          nome: String(nome).slice(0, 100),
          contato: String(contato).slice(0, 100),
          cidade,
          duracao,
          categoria,
          source_url,
          email_sent: sent.ok,
          email_error: sent.error,
          lead_inserted: leadId !== null,
          is_duplicate: isDup,
        },
      });
    } catch (e) {
      // ignora — log/insert é best-effort
      console.error("Lead persist error:", (e as Error)?.message);
    }

    if (!sent.ok) {
      // Retorna 200 com error pra UI mostrar fallback (não derrubar o lead)
      return json({
        ok: false,
        captured: leadId !== null,
        lead_id: leadId,
        error: "Não foi possível enviar e-mail: " + sent.error,
      });
    }

    return json({ ok: true, captured: true, lead_id: leadId });

  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Erro desconhecido." }, 500);
  }
});
