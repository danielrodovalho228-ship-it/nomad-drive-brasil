// ====================================================================
// Nomade Drive Brasil — Edge Function: cofre-senha
// --------------------------------------------------------------------
// P3 (briefing remoto sem contato). AGORA: gera/revela senha manual
// pelo admin. FASE 2: integrar com API de fechadura inteligente.
//
// AGORA (modo manual):
//   POST /functions/v1/cofre-senha
//     { action: "generate", booking_id }   -> gera senha aleatoria 6 digitos
//     { action: "reveal",   booking_id }   -> registra cofre_senha_revealed_at
//     { action: "expire",   booking_id }   -> seta cofre_senha = null + expires_at
//
// FASE 2 (modo api_lockbox):
//   - Quando cofre_provider = 'api_lockbox', delegar pra API real
//     da fechadura inteligente (chamar endpoint deles, receber callback)
//   - Esta funcao ja tem o stub do branch (linhas 110+)
//
// SECRETS:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (admin SDK)
//
// verify_jwt: true — so admin/operador pode chamar
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

// Gera senha rotativa 6 digitos numericos, evita sequencias obvias (000000, 123456)
function generateRotativePassword(): string {
  const BANNED = new Set(["000000", "111111", "123456", "654321", "999999", "121212"]);
  for (let i = 0; i < 50; i++) {
    const n = Math.floor(100000 + Math.random() * 900000);
    const s = String(n);
    if (!BANNED.has(s) && !/^(\d)\1+$/.test(s)) return s;
  }
  // Fallback (improvavel)
  return String(Math.floor(100000 + Math.random() * 900000));
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

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const bookingId = String(body.booking_id || "").trim();

    if (!bookingId) return json({ error: "booking_id obrigatório." }, 400);

    // Carrega a booking pra verificar provider
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select("id, cofre_senha, cofre_provider, cofre_senha_generated_at, end_date")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return json({ error: "Reserva não encontrada." }, 404);
    }

    const provider = booking.cofre_provider || "manual";

    // ------------------------------------------------------------------
    // MODO MANUAL (AGORA) — gera/revela/expira na propria tabela
    // ------------------------------------------------------------------
    if (provider === "manual") {
      if (action === "generate") {
        const senha = generateRotativePassword();
        const expiresAt = booking.end_date
          ? new Date(new Date(booking.end_date).getTime() + 24 * 60 * 60 * 1000).toISOString()
          : null;
        const { error } = await admin
          .from("bookings")
          .update({
            cofre_senha: senha,
            cofre_senha_generated_at: new Date().toISOString(),
            cofre_senha_expires_at: expiresAt,
            cofre_provider: "manual",
          })
          .eq("id", bookingId);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, mode: "manual", senha, expires_at: expiresAt });
      }

      if (action === "reveal") {
        if (!booking.cofre_senha) {
          return json({ error: "Senha ainda não foi gerada." }, 400);
        }
        await admin
          .from("bookings")
          .update({ cofre_senha_revealed_at: new Date().toISOString() })
          .eq("id", bookingId);
        return json({ ok: true, mode: "manual", senha: booking.cofre_senha });
      }

      if (action === "expire") {
        await admin
          .from("bookings")
          .update({
            cofre_senha: null,
            cofre_senha_expires_at: new Date().toISOString(),
          })
          .eq("id", bookingId);
        return json({ ok: true, mode: "manual", expired: true });
      }

      return json({ error: "action inválido. Use: generate | reveal | expire." }, 400);
    }

    // ------------------------------------------------------------------
    // MODO API_LOCKBOX (FASE 2) — stub. Quando ativar:
    //   1. Tem chave de API do provedor de fechadura
    //   2. Endpoint POST -> gera/expira no provedor
    //   3. Callback do provedor atualiza esta tabela
    // ------------------------------------------------------------------
    if (provider === "api_lockbox") {
      // STUB: por enquanto retorna 501 (Not Implemented) com explicacao.
      return json({
        ok: false,
        mode: "api_lockbox",
        status: "not_implemented_yet",
        message: "Integração com API de fechadura inteligente é FASE 2. " +
                 "Configure cofre_provider = 'manual' por enquanto.",
      }, 501);
    }

    return json({ error: "cofre_provider desconhecido: " + provider }, 400);
  } catch (e) {
    console.error("cofre-senha exceção:", e);
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
