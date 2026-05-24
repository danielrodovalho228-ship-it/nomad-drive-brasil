// ====================================================================
// Nomade Drive Brasil — Edge Function: send-tier-promotion
// --------------------------------------------------------------------
// Disparada pelo trigger check_loyalty_promotion (via pg_net.http_post)
// quando um cliente sobe de tier. Manda e-mail comemorativo destacando
// novos benefícios.
//
// BODY:
//   { client_id, from_tier, to_tier, event_id, prev_months, new_months }
//
// Verify JWT: DESLIGADO (chamada server-side via pg_net, sem usuário).
// Validação: requer SERVICE_ROLE_KEY no header (anti-abuso).
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

// ============================================================
// Mapa de configuração por tier de destino
// ============================================================
type TierKey = "silver" | "gold" | "platinum";
const TIER_CONFIG: Record<TierKey, {
  emoji: string;
  name: string;
  gradient: string;
  bgColor: string;
  textColor: string;
  discount: number;
  depositReduction: number;
  benefits: string[];
  ctaText: string;
}> = {
  silver: {
    emoji: "🥈",
    name: "Silver",
    gradient: "linear-gradient(135deg,#475569 0%,#64748b 55%,#94a3b8 100%)",
    bgColor: "#e2e8f0",
    textColor: "#334155",
    discount: 7,
    depositReduction: 0,
    benefits: [
      "7% de desconto em todas as renovações",
      "Acesso prioritário a novos veículos da frota",
      "Continue acumulando meses pra subir pro Gold",
    ],
    ctaText: "Ver meus benefícios Silver",
  },
  gold: {
    emoji: "🥇",
    name: "Gold",
    gradient: "linear-gradient(135deg,#a16207 0%,#d4af37 55%,#fbbf24 100%)",
    bgColor: "#fef9c3",
    textColor: "#854d0e",
    discount: 10,
    depositReduction: 20,
    benefits: [
      "<strong>10% de desconto</strong> em todas as renovações",
      "Caução <strong>20% menor</strong> nas próximas reservas",
      "Acesso antecipado a categorias premium da frota",
      "Mais 6 meses como cliente e você vira <strong>Platinum</strong>",
    ],
    ctaText: "Aproveitar benefícios Gold",
  },
  platinum: {
    emoji: "💎",
    name: "Platinum",
    gradient: "linear-gradient(135deg,#312e81 0%,#6366f1 55%,#818cf8 100%)",
    bgColor: "#e0e7ff",
    textColor: "#312e81",
    discount: 15,
    depositReduction: 40,
    benefits: [
      "<strong>15% de desconto</strong> em todas as renovações",
      "Caução <strong>40% menor</strong> — economia significativa",
      "Atendimento prioritário com nossa equipe",
      "Convites exclusivos pra novos lançamentos da frota",
      "Status máximo — você está no topo do programa Nomade Gold",
    ],
    ctaText: "Acessar área Platinum",
  },
};

// ============================================================
// Template e-mail
// ============================================================
function emailTierPromotion(d: {
  clientName: string;
  toTier: TierKey;
  fromTier: string;
  newMonths: number;
}) {
  const t = TIER_CONFIG[d.toTier];
  const firstName = (d.clientName || "Cliente").split(" ")[0];

  const benefitsList = t.benefits.map(b =>
    '<li style="margin:6px 0;padding-left:6px;">✨ ' + b + '</li>'
  ).join("");

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Parabéns! Você é ' + t.name + '</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">'
    + 'Você subiu de tier no Nomade Gold! Confira seus novos benefícios.</div>'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'

    // Header com gradient do tier
    + '<tr><td style="background:' + t.gradient + ';padding:28px 28px 22px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" '
    + 'style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.95;">'
    + '🏆 Nomade Gold</td>'
    + '</tr></table>'
    + '<div style="text-align:center;padding:14px 0 4px;">'
    + '<div style="font-size:48px;line-height:1;margin-bottom:6px;">' + t.emoji + '</div>'
    + '<div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.92;">Você subiu de tier</div>'
    + '<div style="color:#fff;font-size:30px;font-weight:800;line-height:1.1;margin-top:6px;">Bem-vindo ao ' + t.name + '!</div>'
    + '</div></td></tr>'

    // Body
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h2 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#14201b;">'
    + 'Parabéns, ' + escapeHtml(firstName) + '! 🎉</h2>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">'
    + 'Você acaba de completar <strong>' + d.newMonths + ' ' + (d.newMonths === 1 ? "mês" : "meses") + '</strong> como cliente Nomade Drive — '
    + 'e isso te coloca no nível <strong>' + t.emoji + ' ' + t.name + '</strong> do nosso programa de fidelidade.</p>'

    // Card de benefícios
    + '<div style="background:' + t.bgColor + ';border-left:4px solid ' + t.textColor + ';border-radius:8px;padding:18px 20px;margin:18px 0;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:' + t.textColor + ';margin-bottom:10px;">'
    + 'Seus novos benefícios</div>'
    + '<ul style="margin:0;padding:0 0 0 20px;color:#14201b;font-size:14px;line-height:1.7;list-style:none;">'
    + benefitsList
    + '</ul></div>'

    // CTA
    + '<p style="margin:24px 0 0;text-align:center;">'
    + '<a href="' + SITE + '/dashboard-cliente.html" '
    + 'style="display:inline-block;background:' + t.gradient + ';color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">'
    + '🏆 ' + t.ctaText + '</a></p>'

    + '<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#5b6b63;text-align:center;">'
    + 'Continue alugando com a gente pra desbloquear ainda mais vantagens. '
    + 'Quanto mais você anda, melhor fica.</p>'

    + '</td></tr>'

    // Footer
    + '<tr><td style="background:#f0f7f3;padding:18px 28px;border-top:1px solid #cde0d4;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · '
    + 'Dúvidas sobre seu nível? Responda este e-mail.<br>'
    + '<span style="color:#8a9591;font-size:11px;">Este benefício é vitalício enquanto o cadastro estiver ativo.</span>'
    + '</td></tr>'

    + '</table></td></tr></table></body></html>';

  const text =
    "Você subiu de tier no Nomade Gold! 🎉\n\n"
    + "Olá " + firstName + ",\n\n"
    + "Parabéns! Você acaba de completar " + d.newMonths + " meses como cliente da Nomade Drive Brasil "
    + "e isso te coloca no nível " + t.name + " do nosso programa de fidelidade.\n\n"
    + "Seus novos benefícios:\n"
    + t.benefits.map(b => "  • " + b.replace(/<\/?strong>/g, "")).join("\n") + "\n\n"
    + "Acesse seu painel: " + SITE + "/dashboard-cliente.html\n\n"
    + "Continue alugando com a gente pra desbloquear ainda mais vantagens.\n\n"
    + "— Equipe Nomade Drive Brasil";

  return {
    subject: t.emoji + " Parabéns! Você é Cliente " + t.name + " — Nomade Drive Brasil",
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !serviceKey) {
      return json({ error: "SUPABASE_URL ou SERVICE_ROLE_KEY não configurados." }, 500);
    }

    // Authorization header obrigatório (qualquer Bearer válido — anon ou service).
    // A validação REAL anti-abuso vem depois: exigimos que event_id exista em
    // public.loyalty_events com client_id + to_tier batendo. Como RLS bloqueia
    // INSERT em loyalty_events pra non-admin, atacante não consegue forjar
    // event_id válido → não consegue spam de e-mails.
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.includes("Bearer ")) {
      return json({ error: "Authorization header obrigatório." }, 401);
    }

    const body = await req.json();
    const { client_id, from_tier, to_tier, event_id, prev_months, new_months } = body || {};

    if (!client_id || !to_tier) {
      return json({ error: "client_id e to_tier obrigatórios." }, 400);
    }

    // Só envia pra tiers reais (silver, gold, platinum). Bronze não merece e-mail.
    if (!["silver", "gold", "platinum"].includes(to_tier)) {
      return json({ ok: true, skipped: true, reason: "Tier " + to_tier + " não envia e-mail." });
    }

    const admin = createClient(url, serviceKey);

    // ⚠️ ANTI-ABUSE: event_id é OBRIGATÓRIO e deve existir em loyalty_events com
    //    client_id + to_tier batendo. Sem isso, qualquer um com a anon key
    //    pública poderia disparar e-mails arbitrários em massa.
    if (!event_id) {
      return json({ error: "event_id obrigatório (anti-abuso)." }, 400);
    }
    const { data: evt, error: evtErr } = await admin
      .from("loyalty_events")
      .select("id, client_id, to_tier, event")
      .eq("id", event_id)
      .maybeSingle();
    if (evtErr || !evt) {
      return json({ error: "event_id inválido ou não encontrado." }, 403);
    }
    if (evt.client_id !== client_id) {
      return json({ error: "event_id não bate com client_id." }, 403);
    }
    if (evt.to_tier !== to_tier) {
      return json({ error: "event_id não bate com to_tier." }, 403);
    }
    if (evt.event !== "tier_promoted") {
      return json({ error: "event_id não é de promoção." }, 403);
    }

    // Idempotência: se já mandamos e-mail pra esse event_id, skip
    const { data: prevLog } = await admin
      .from("admin_audit_logs")
      .select("id")
      .eq("action", "tier_promotion_email_sent")
      .eq("target_id", event_id)
      .limit(1);
    if (Array.isArray(prevLog) && prevLog.length > 0) {
      return json({ ok: true, skipped: true, reason: "Já enviado pra event_id=" + event_id });
    }

    // Busca profile + email
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", client_id)
      .maybeSingle();

    if (!profile) {
      return json({ error: "Profile não encontrado pra client_id " + client_id }, 404);
    }

    const { data: authUser } = await admin.auth.admin.getUserById(client_id);
    const userEmail = authUser?.user?.email;
    if (!userEmail) {
      return json({ error: "Email não encontrado em auth.users pra " + client_id }, 404);
    }

    // Renderiza + envia
    const tpl = emailTierPromotion({
      clientName: profile.full_name || "Cliente",
      toTier: to_tier as TierKey,
      fromTier: from_tier || "bronze",
      newMonths: new_months || 0,
    });

    const sent = await sendEmail(
      userEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo,
    );

    // Log audit
    await admin.from("admin_audit_logs").insert({
      admin_id: null,
      action: "tier_promotion_email_sent",
      target_type: "loyalty_events",
      target_id: event_id || null,
      metadata_json: {
        client_id,
        client_email: userEmail,
        from_tier,
        to_tier,
        prev_months,
        new_months,
        email_sent: sent.ok,
        email_error: sent.error,
      },
    });

    return json({
      ok: sent.ok,
      email_id: sent.id,
      error: sent.error,
      client_id,
      to_tier,
    });

  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Erro desconhecido." }, 500);
  }
});
