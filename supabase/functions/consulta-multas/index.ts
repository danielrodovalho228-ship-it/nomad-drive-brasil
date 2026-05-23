// ====================================================================
// Nomade Drive Brasil — Edge Function: consulta-multas (C6 / Fase 30)
// --------------------------------------------------------------------
// Consulta multas Senatran via Infosimples e salva em vehicle_fines.
//
// Chamado por:
//   - close-rental (check-out aprovado, automático)
//   - Botão admin manual em /admin#multas
//
// SECRETS necessárias:
//   - INFOSIMPLES_TOKEN: API token (cadastrar no Supabase secrets)
//   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (já existem)
//
// Verify JWT: LIGADO. Quem pode chamar:
//   - Admin (manual)
//   - close-rental (system call interno, autorizado pelo próprio JWT)
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const INFOSIMPLES_URL = "https://api.infosimples.com/api/v2/consultas/senatran/infracoes";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const token = Deno.env.get("INFOSIMPLES_TOKEN");
    if (!token) {
      return json({
        error: "INFOSIMPLES_TOKEN não configurado.",
        hint: "Crie conta em infosimples.com, gere o token e cadastre como secret no Supabase Dashboard."
      }, 500);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado." }, 401);
    const admin = createClient(url, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const { vehicle_id, booking_id } = payload;
    if (!vehicle_id) return json({ error: "vehicle_id ausente." }, 400);

    // Lê dados do veículo
    const { data: vehicle } = await admin.from("vehicles")
      .select("id, license_plate, renavam, owner_id")
      .eq("id", vehicle_id).maybeSingle();
    if (!vehicle) return json({ error: "Veículo não encontrado." }, 404);
    if (!vehicle.license_plate || !vehicle.renavam) {
      return json({
        error: "missing_data",
        message: "Veículo sem placa ou renavam cadastrado. Edite o veículo antes de consultar multas."
      }, 400);
    }

    // Lê client_id do booking se fornecido (pra ligar a cobrança ao cliente)
    let clientId: string | null = null;
    if (booking_id) {
      const { data: bk } = await admin.from("bookings")
        .select("client_id").eq("id", booking_id).maybeSingle();
      clientId = bk?.client_id || null;
    }

    // Chama Infosimples
    const body = new URLSearchParams({
      token,
      timeout: "300",
      placa: vehicle.license_plate.replace(/-/g, "").toUpperCase(),
      renavam: vehicle.renavam,
    });

    const resp = await fetch(INFOSIMPLES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return json({
        error: "infosimples_http_error",
        status: resp.status,
        detail: detail.slice(0, 300),
      }, 502);
    }

    const data = await resp.json();
    // Infosimples retorna code 200 quando OK
    if (data.code !== 200) {
      return json({
        error: "infosimples_error",
        code: data.code,
        message: data.code_message || "Erro na consulta.",
        raw: data,
      }, 502);
    }

    // data.data[].infracoes — lista de multas encontradas
    const infracoes: any[] = (data.data?.[0]?.infracoes) || [];
    let inserted = 0;
    let skipped_duplicate = 0;
    const errors: string[] = [];

    for (const inf of infracoes) {
      // Cada infração tem: ait, data_infracao, hora_infracao, local,
      // descricao, valor (string "R$ 195,23"), pontuacao, etc.
      const valor = parseValor(inf.valor || "");
      const dataInf = parseDate(inf.data_infracao || "");

      const { error: insErr } = await admin.from("vehicle_fines").insert({
        booking_id: booking_id || null,
        vehicle_id,
        client_id: clientId,
        ait: inf.ait || null,
        data_infracao: dataInf,
        hora_infracao: inf.hora_infracao || null,
        local: inf.local || null,
        descricao: inf.descricao || null,
        valor,
        pontos: inf.pontuacao ? Number(inf.pontuacao) : null,
        source: "infosimples",
        raw_data: inf,
      });
      if (insErr) {
        // Conflict no AIT unique → multa já registrada antes
        if (String(insErr.message).indexOf("vehicle_fines_ait_unique") !== -1) {
          skipped_duplicate++;
        } else {
          errors.push(insErr.message);
        }
      } else {
        inserted++;
      }
    }

    return json({
      ok: true,
      total_found: infracoes.length,
      inserted,
      skipped_duplicate,
      errors,
    });
  } catch (e) {
    console.error("consulta-multas erro:", (e as Error)?.message);
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});

function parseValor(s: string): number | null {
  if (!s) return null;
  const m = String(s).replace(/[^0-9,]/g, "").replace(",", ".");
  const n = parseFloat(m);
  return isNaN(n) ? null : n;
}

function parseDate(s: string): string | null {
  if (!s) return null;
  // formato típico: "23/05/2026" → "2026-05-23"
  const p = s.split("/");
  if (p.length === 3) return p[2] + "-" + p[1].padStart(2,"0") + "-" + p[0].padStart(2,"0");
  return null;
}
