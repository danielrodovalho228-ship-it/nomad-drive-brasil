// ====================================================================
// Nomade Drive Brasil — Edge Function: cron-vistoria-reminder
// --------------------------------------------------------------------
// P4 (briefing). Disparada por pg_cron diariamente as 10h. Procura
// bookings em status 'em_uso' / 'retirada' onde:
//   - start_date <= hoje - X horas
//   - client_pickup_inspection_at IS NULL
//   - client_pickup_reminder_sent_at IS NULL
// Envia o template 'client_pickup_reminder' e marca timestamp.
//
// Variavel HOURS_BEFORE_REMINDER controla o threshold (default 6h).
// Tom gentil, NUNCA bloqueia uso.
//
// verify_jwt: false (chamada por pg_cron via service_role)
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderTemplate, getReplyTo } from "../_shared/template-catalog.ts";
import { sendEmail } from "../_shared/email.ts";

const HOURS_BEFORE_REMINDER = parseInt(Deno.env.get("VISTORIA_REMINDER_HOURS") || "6", 10);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !serviceKey) {
      return json({ error: "SUPABASE_URL / SERVICE_ROLE_KEY ausentes." }, 500);
    }
    const admin = createClient(url, serviceKey);

    // Threshold: bookings cuja start_date eh anterior a (agora - N horas)
    const threshold = new Date(Date.now() - HOURS_BEFORE_REMINDER * 3600 * 1000).toISOString();

    const { data: pendentes, error } = await admin
      .from("bookings")
      .select("id, client_id, protocol_number, start_date, profiles!client_id(full_name, email)")
      .lte("start_date", threshold.split("T")[0])
      .is("client_pickup_inspection_at", null)
      .is("client_pickup_reminder_sent_at", null)
      .in("status", ["em_uso", "retirada", "ativa", "confirmada"]);

    if (error) {
      console.error("Erro buscando bookings:", error);
      return json({ error: error.message }, 500);
    }

    const sent: string[] = [];
    const skipped: string[] = [];

    for (const b of pendentes || []) {
      // @ts-ignore: profiles vem como objeto (FK)
      const profile = b.profiles;
      const email = profile?.email;
      const fullName = profile?.full_name || "";
      if (!email) { skipped.push(b.id + " (sem email)"); continue; }

      const tpl = renderTemplate("client_pickup_reminder", {
        full_name: fullName,
        protocol_number: b.protocol_number || ""
      });
      if (!tpl) { skipped.push(b.id + " (template ausente)"); continue; }

      const r = await sendEmail(
        email,
        tpl.subject,
        tpl.html,
        tpl.text,
        getReplyTo("client_pickup_reminder")
      );
      if (r.ok) {
        await admin
          .from("bookings")
          .update({ client_pickup_reminder_sent_at: new Date().toISOString() })
          .eq("id", b.id);
        sent.push(b.id);
      } else {
        skipped.push(b.id + " (envio falhou: " + (r.error || "?") + ")");
      }
    }

    return json({
      ok: true,
      threshold_iso: threshold,
      hours_before: HOURS_BEFORE_REMINDER,
      candidates: pendentes?.length || 0,
      sent: sent.length,
      sent_ids: sent,
      skipped: skipped.length,
      skipped_details: skipped,
    });
  } catch (e) {
    console.error("cron-vistoria-reminder exceção:", e);
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
