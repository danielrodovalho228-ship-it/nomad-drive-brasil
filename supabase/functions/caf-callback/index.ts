// ====================================================================
// Nomade Drive Brasil — Edge Function: caf-callback
// --------------------------------------------------------------------
// P5 (briefing). PLACEHOLDER: quando integrar com CAF (Confiabilidade
// Automática de Faces / Identidade), eles batem nesta URL com o
// resultado da verificacao.
//
// AGORA (FASE 1 manual):
//   - admin define caf_status na UI direto na tabela profiles
//   - este endpoint nao eh chamado (caf_provider = 'manual')
//
// FASE 2 (CAF real):
//   1. Site dispara verificacao -> recebe verification_id da CAF
//   2. CAF processa documento/selfie (offline ou demora)
//   3. CAF bate aqui com { verification_id, status, payload }
//   4. Esta funcao atualiza profiles.caf_status e dispara emails
//
// Headers esperados (FASE 2):
//   X-Caf-Signature: HMAC-SHA256 do body com secret compartilhado
//
// SECRETS:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   CAF_WEBHOOK_SECRET (FASE 2)
//
// verify_jwt: false (CAF nao manda JWT, e callback externo)
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-caf-signature",
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !serviceKey) {
      return json({ error: "SUPABASE_URL / SERVICE_ROLE_KEY ausentes." }, 500);
    }
    const admin = createClient(url, serviceKey);

    // FASE 2: valida assinatura HMAC-SHA256 quando integrar de verdade
    // const sig = req.headers.get("X-Caf-Signature");
    // const secret = Deno.env.get("CAF_WEBHOOK_SECRET");
    // ... validar sig com secret ...

    const body = await req.json().catch(() => ({}));
    const verificationId = String(body.verification_id || body.id || "").trim();
    const status = String(body.status || "").trim();
    const userId = String(body.user_id || body.subject_id || "").trim();
    const payload = body.payload || body;

    if (!verificationId && !userId) {
      return json({ error: "verification_id ou user_id obrigatório." }, 400);
    }

    // Mapeia status do CAF -> nosso enum interno
    const statusMap: Record<string, string> = {
      "APPROVED": "aprovado",
      "approved": "aprovado",
      "REJECTED": "recusado",
      "rejected": "recusado",
      "PENDING": "em_analise",
      "pending": "em_analise",
      "MANUAL_REVIEW": "em_analise",
    };
    const internalStatus = statusMap[status] || "em_analise";

    // Localiza o profile (por verification_id ou user_id)
    let profileQuery = admin.from("profiles").select("id, email, full_name");
    if (verificationId) profileQuery = profileQuery.eq("caf_verification_id", verificationId);
    else profileQuery = profileQuery.eq("id", userId);

    const { data: profile, error: profErr } = await profileQuery.maybeSingle();
    if (profErr || !profile) {
      return json({ error: "Profile não encontrado.", verification_id: verificationId, user_id: userId }, 404);
    }

    // Atualiza profile com o resultado
    const update: Record<string, unknown> = {
      caf_status: internalStatus,
      caf_result_payload: payload,
    };
    if (internalStatus === "aprovado" || internalStatus === "recusado") {
      update.caf_completed_at = new Date().toISOString();
    }

    const { error: upErr } = await admin
      .from("profiles")
      .update(update)
      .eq("id", profile.id);

    if (upErr) {
      console.error("Erro update profile:", upErr);
      return json({ error: upErr.message }, 500);
    }

    // FASE 2: aqui dispara email pro cliente avisando o resultado
    // (kyc_approved ou kyc_rejected baseado no internalStatus)

    return json({
      ok: true,
      profile_id: profile.id,
      caf_status: internalStatus,
      verification_id: verificationId,
    });
  } catch (e) {
    console.error("caf-callback exceção:", e);
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
