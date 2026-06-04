// ====================================================================
// Nomade Drive Brasil — Edge Function: send-template
// --------------------------------------------------------------------
// Despacha um dos 24 templates v3 (mensal_* / team_*) pra um destinatário.
//
// Entrada POST JSON:
//   {
//     template_key: "mensal_pagamento_confirmado",  // obrigatório
//     vars: { first_name: "João", price_total_brl: "R$ 3.999", ... },
//     to: "joao@email.com",        // OU
//     to_user_id: "uuid",          // (resolve via auth.admin)
//     team_recipients: ["danilo@nomadedrive.com.br"]  // override pra team_*
//   }
//
// Diferenças vs send-email:
//   - send-email recebe html/subject prontos
//   - send-template recebe só (key, vars) e renderiza aqui
//
// SECRETS necessários: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
//                      SUPABASE_URL, SUPABASE_ANON_KEY
// Opcional:            EMAIL_FROM, EMAIL_REPLY_TO,
//                      TEAM_EMAIL_RECIPIENTS (CSV, default pra templates team_*)
//
// verify_jwt: true (qualquer usuário logado pode disparar; service_role
//             do server-side bypassa).
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderTemplate, getReplyTo, TEMPLATES_V3 } from "../_shared/template-catalog.ts";
import { sendEmail } from "../_shared/email.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado." }, 401);

    const { template_key, vars, to, to_user_id, team_recipients } = await req.json();

    if (!template_key) return json({ error: "template_key obrigatório." }, 400);
    const tpl = TEMPLATES_V3[template_key];
    if (!tpl) {
      return json({
        error: "template_key não reconhecido.",
        valid_keys: Object.keys(TEMPLATES_V3)
      }, 400);
    }

    // ---- Resolve destinatário ----
    let resolvedTo: string | string[] = to;

    // 1. Templates team_* — vai pros e-mails da equipe (override > env > fallback)
    if (tpl.profile === "admin" && !to) {
      const fromCaller = Array.isArray(team_recipients) ? team_recipients : null;
      const fromEnv = (Deno.env.get("TEAM_EMAIL_RECIPIENTS") ?? "")
        .split(",").map(s => s.trim()).filter(Boolean);
      const list = fromCaller?.length ? fromCaller : fromEnv;
      if (!list.length) {
        return json({
          error: "Template de equipe sem destinatário.",
          hint: "Passe team_recipients no body OU configure secret TEAM_EMAIL_RECIPIENTS (CSV)."
        }, 400);
      }
      resolvedTo = list;
    }
    // 2. Templates mensal_* — to direto OU resolve via to_user_id
    else if (!resolvedTo && to_user_id) {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) return json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente." }, 500);
      const admin = createClient(url, serviceKey);
      const { data: u, error: authErr } = await admin.auth.admin.getUserById(to_user_id);
      if (authErr || !u?.user?.email) {
        return json({ error: "Usuário não encontrado.", detail: authErr?.message, to_user_id }, 404);
      }
      resolvedTo = u.user.email;

      // Auto-popula first_name se ausente nas vars
      if (vars && !vars.first_name) {
        const fn = (u.user.user_metadata?.full_name || u.user.email || "").split(/\s+/)[0];
        vars.first_name = fn;
      }
    }
    else if (!resolvedTo) {
      return json({ error: "Forneça 'to', 'to_user_id' ou 'team_recipients'." }, 400);
    }

    // ---- Renderiza ----
    const rendered = renderTemplate(template_key, vars || {});
    if (!rendered) return json({ error: "Falha ao renderizar template." }, 500);

    // ---- Envia ----
    const replyTo = getReplyTo(template_key);
    const result = await sendEmail(
      resolvedTo,
      rendered.subject,
      rendered.html,
      rendered.text,
      replyTo
    );

    if (!result.ok) {
      return json({
        error: "Falha no envio.",
        detail: result.error,
        template_key,
        resolved_to: resolvedTo
      }, 502);
    }

    return json({
      ok: true,
      template_key,
      resend_id: result.id,
      resolved_to: resolvedTo,
      profile: tpl.profile,
      priority: tpl.priority
    });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
