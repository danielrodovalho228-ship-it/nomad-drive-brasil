// ====================================================================
// Nomade Drive Brasil — Edge Function: tracker-webhook
// --------------------------------------------------------------------
// P6 (briefing). PLACEHOLDER ESTRUTURAL. Hoje NAO esta ativo —
// o rastreamento real vem do hardware da empresa contratada (FASE 2).
//
// Quando ativar:
//   1. Configurar webhook URL nos providers (positron/suntech/sascar/etc)
//   2. Definir TRACKER_WEBHOOK_SECRET pra validar assinatura
//   3. Empresa de rastreamento POST aqui:
//      Headers: X-Tracker-Provider, X-Tracker-Signature
//      Body:    { vehicle_plate, event_type, event_payload, timestamp }
//   4. Esta funcao salva em tracker_events e notifica operador
//      (push notification, email ou WhatsApp dependendo do tipo)
//
// Tipos de evento esperados:
//   - ignition_on / ignition_off
//   - movement_start / movement_stop
//   - geofence_enter / geofence_exit
//   - low_battery
//   - tampered
//
// SECRETS:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   TRACKER_WEBHOOK_SECRET (FASE 2)
//
// verify_jwt: false (callback externo, valida via HMAC)
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tracker-signature, x-tracker-provider",
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

    // FASE 2: valida HMAC-SHA256 com TRACKER_WEBHOOK_SECRET
    // const sig = req.headers.get("X-Tracker-Signature");
    // const secret = Deno.env.get("TRACKER_WEBHOOK_SECRET");
    // if (!validateHmac(rawBody, sig, secret)) return json({ error: "Invalid signature" }, 401);

    const provider = req.headers.get("X-Tracker-Provider") || "unknown";
    const body = await req.json().catch(() => ({}));
    const eventType = String(body.event_type || "").trim();
    const vehiclePlate = String(body.vehicle_plate || body.plate || "").trim().toUpperCase();
    const payload = body.event_payload || body;

    if (!eventType) {
      return json({ error: "event_type obrigatório." }, 400);
    }

    // Resolve vehicle_id pela placa (se fornecida)
    let vehicleId: string | null = null;
    let bookingId: string | null = null;
    if (vehiclePlate) {
      const { data: veh } = await admin
        .from("vehicles")
        .select("id")
        .ilike("plate", vehiclePlate)
        .maybeSingle();
      vehicleId = veh?.id || null;

      // Tenta resolver booking ativo nesse veiculo (start <= hoje <= end, status em_uso)
      if (vehicleId) {
        const today = new Date().toISOString().split("T")[0];
        const { data: bk } = await admin
          .from("bookings")
          .select("id")
          .eq("vehicle_id", vehicleId)
          .lte("start_date", today)
          .gte("end_date", today)
          .in("status", ["em_uso", "ativa", "retirada", "confirmada"])
          .maybeSingle();
        bookingId = bk?.id || null;
      }
    }

    const { data: inserted, error } = await admin
      .from("tracker_events")
      .insert({
        vehicle_id: vehicleId,
        booking_id: bookingId,
        event_type: eventType,
        event_payload: payload,
        provider: provider,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Erro insert tracker_event:", error);
      return json({ error: error.message }, 500);
    }

    // FASE 2: notificar operador conforme o tipo de evento
    // - tampered, low_battery, geofence_exit -> push/whatsapp urgente
    // - ignition_on/off, movement -> log silencioso
    // Por ora so guarda o evento.

    return json({
      ok: true,
      event_id: inserted?.id,
      event_type: eventType,
      vehicle_id: vehicleId,
      booking_id: bookingId,
      provider,
      notice: "PLACEHOLDER estrutural. Operador será notificado quando integração for ativada (FASE 2).",
    });
  } catch (e) {
    console.error("tracker-webhook exceção:", e);
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
