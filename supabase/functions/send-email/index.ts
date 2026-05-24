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

    const { to, to_user_id, subject, html, text, reply_to } = await req.json();
    if (!subject || (!html && !text)) {
      return json({ error: "Parâmetros obrigatórios: subject + (html ou text)." }, 400);
    }
    if (!to && !to_user_id) {
      return json({ error: "Parâmetro 'to' (email) ou 'to_user_id' (uuid) é obrigatório." }, 400);
    }

    // ============================================================
    // Fase 32 (Caminho A) — Resolução server-side via to_user_id
    // ============================================================
    // Quando o caller (browser) não tem permissão RLS pra ler o
    // profiles do destinatário (caso "equipe → usuário": Proteção,
    // suporte, admin notificando alguém que não é parte da reserva),
    // ele passa to_user_id em vez de email. Aqui usamos a SERVICE
    // ROLE pra resolver o e-mail sem RLS.
    // ============================================================
    let resolvedTo: string | string[] = to;
    let resolvedName: string | null = null;
    if (!to && to_user_id) {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) {
        return json({
          error: "SUPABASE_SERVICE_ROLE_KEY não configurado.",
          hint: "Necessário pra resolver to_user_id sem RLS."
        }, 500);
      }
      const admin = createClient(url, serviceKey);
      const { data: profile, error: pErr } = await admin
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", to_user_id)
        .maybeSingle();
      if (pErr) {
        return json({ error: "Falha ao resolver to_user_id.", detail: pErr.message }, 500);
      }
      if (!profile || !profile.email) {
        // Fallback: tenta auth.admin (caso profile não tenha email cacheado)
        try {
          const { data: u } = await admin.auth.admin.getUserById(to_user_id);
          const authEmail = u?.user?.email;
          if (authEmail) {
            resolvedTo = authEmail;
            resolvedName = u?.user?.user_metadata?.full_name ?? null;
          } else {
            return json({ error: "email_not_found", to_user_id }, 404);
          }
        } catch (e) {
          return json({
            error: "email_not_found",
            to_user_id,
            detail: (e as Error)?.message ?? String(e)
          }, 404);
        }
      } else {
        resolvedTo = profile.email;
        resolvedName = profile.full_name;
      }
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(resolvedTo) ? resolvedTo : [resolvedTo],
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
    return json({
      ok: true,
      id: body?.id ?? null,
      resolved_to: to_user_id ? resolvedTo : undefined,
      resolved_name: resolvedName ?? undefined
    });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
