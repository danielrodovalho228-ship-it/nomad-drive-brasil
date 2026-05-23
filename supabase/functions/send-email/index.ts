// ====================================================================
// Nomade Drive Brasil — Edge Function: send-email
// --------------------------------------------------------------------
// Função genérica de envio de e-mail via Resend (resend.com).
// Pode ser chamada por outros lugares do app (admin aprova KYC →
// dispara e-mail; reserva confirmada → dispara e-mail; etc.) e também
// é usada pela própria stripe-webhook como utilitário.
//
// SECRETS necessários:
//   RESEND_API_KEY    — chave do Resend (re_...)
// Opcional:
//   EMAIL_FROM        — remetente padrão. Default usa o domínio de
//                       teste do Resend (onboarding@resend.dev), que
//                       só envia para o email da própria conta Resend.
//                       Para enviar para qualquer destinatário, verifique
//                       seu domínio no Resend e configure
//                       EMAIL_FROM = "Nomade Drive Brasil <noreply@nomadedrive.com.br>"
//
// "Verify JWT": LIGADO (só usuários logados / admin podem disparar).
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return json({
        error: "RESEND_API_KEY não configurado.",
        hint: "Crie conta em resend.com, gere uma chave e cadastre como secret no Supabase.",
      }, 500);
    }
    const from = Deno.env.get("EMAIL_FROM") ||
      "Nomade Drive Brasil <onboarding@resend.dev>";

    // valida usuário (qualquer usuário logado pode disparar; restrições
    // mais finas podem ser adicionadas depois)
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado." }, 401);

    const { to, subject, html, text, reply_to } = await req.json();
    if (!to || !subject || (!html && !text)) {
      return json({ error: "Parâmetros: to, subject, html ou text." }, 400);
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return json({ error: "Resend respondeu erro.", detail: err }, resp.status);
    }

    const body = await resp.json();
    return json({ ok: true, id: body?.id ?? null });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
