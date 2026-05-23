// ====================================================================
// Nomade Drive Brasil — Edge Function: stripe-subscription
// --------------------------------------------------------------------
// Operações na subscription mensal de uma reserva (Fase 21b):
//   action="cancel"          → cancela imediatamente
//   action="cancel_at_end"   → cancela no final do período atual
//   action="status"          → devolve status + próxima cobrança
//
// SECRETS: STRIPE_SECRET_KEY
// Verify JWT: LIGADO (cliente ou admin chamam logados).
// Autorização: dono da reserva (client_id == auth.uid()) OU super-admin
//   (e-mail dtrodovalho40@gmail.com).
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";

// ----- email helpers (inline; mesmo padrão das outras funções) -----
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
async function sendEmail(to: string, subject: string, html: string, text: string, replyTo?: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { ok: false, error: "RESEND_API_KEY ausente" };
  const from = Deno.env.get("EMAIL_FROM") || "Nomade Drive Brasil <onboarding@resend.dev>";
  const reply_to = replyTo || "pagamentos@nomadedrive.com.br";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text, reply_to }),
    });
    if (!resp.ok) return { ok: false, error: "Resend " + resp.status };
    const body = await resp.json();
    return { ok: true, id: body?.id };
  } catch (e) { return { ok: false, error: (e as Error)?.message }; }
}
function emailAssinaturaCancelada(d: { veiculo: string; atEndDate?: boolean; endDate?: string }) {
  const intro = d.atEndDate
    ? "Sua assinatura mensal foi marcada para encerrar em <strong>" + escapeHtml(d.endDate ?? "") + "</strong>. Até lá, as cobranças continuam normalmente. Depois dessa data, nenhuma cobrança automática é feita."
    : "Sua assinatura mensal foi <strong>cancelada</strong>. Não haverá novas cobranças automáticas. Se ainda houver período pago em aberto, você pode continuar usando o veículo até a data de devolução combinada com o proprietário.";
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Assinatura cancelada</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">Sua assinatura mensal foi cancelada. Sem novas cobranças automáticas.</div>'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#3a4945 0%,#5b6b63 55%,#8a9591 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Assinatura cancelada</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;">Assinatura mensal cancelada</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">' + intro + '</p>'
    + '<table cellpadding="8" cellspacing="0" style="background:#f4f7f5;border-radius:10px;margin:14px 0 18px;width:100%;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:160px;">Reserva</td><td style="color:#14201b;">' + escapeHtml(d.veiculo) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Cobranças automáticas</td><td style="color:#14201b;">Encerradas</td></tr>'
    + '</table>'
    + '<p style="margin:14px 0;font-size:14px;line-height:1.55;color:#3a4945;">Se foi sem querer, ou se quiser reativar a assinatura, fale com nossa equipe respondendo a este e-mail.</p>'
    + '<p style="margin:24px 0 0;"><a href="' + SITE + '/dashboard-cliente.html" style="display:inline-block;background:#1a7a4f;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">Acessar meu painel</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#f4f7f5;padding:18px 28px;border-top:1px solid #e3e9e5;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · Mensagem automática — em caso de dúvida, responda a este e-mail.<br>'
    + '<span style="color:#8a9591;">Valores, disponibilidade e condições são confirmados individualmente por contrato.</span>'
    + '</td></tr></table></td></tr></table></body></html>';
  const text =
    "Assinatura cancelada — Nomade Drive Brasil\n\n"
    + (d.atEndDate
      ? "Sua assinatura mensal foi marcada para encerrar em " + (d.endDate ?? "") + ".\n"
      + "Até lá, as cobranças continuam normalmente.\n\n"
      : "Sua assinatura mensal foi CANCELADA.\nNão haverá novas cobranças automáticas.\n\n")
    + "Reserva: " + d.veiculo + "\n\n"
    + "Acesse seu painel: " + SITE + "/dashboard-cliente.html";
  return {
    subject: "Assinatura cancelada — Nomade Drive Brasil",
    html, text,
    replyTo: "pagamentos@nomadedrive.com.br",
  };
}

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
const SUPER_ADMIN_EMAIL = "dtrodovalho40@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe não configurado." }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado." }, 401);
    const admin = createClient(url, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const bookingId: string | undefined = payload.booking_id;
    const action: string = payload.action || "status";
    if (!bookingId) return json({ error: "booking_id ausente." }, 400);

    const { data: booking } = await admin.from("bookings")
      .select("id, client_id, stripe_subscription_id, billing_mode, end_date, vehicles(make,model,year_model)")
      .eq("id", bookingId).maybeSingle();
    if (!booking) return json({ error: "Reserva não encontrada." }, 404);

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    const isOwnerOfBooking = booking.client_id === user.id;
    if (!isSuperAdmin && !isOwnerOfBooking) {
      return json({ error: "Sem permissão para esta reserva." }, 403);
    }
    if (!booking.stripe_subscription_id) {
      return json({ error: "Reserva não tem assinatura ativa." }, 404);
    }

    if (action === "status") {
      const sub = await stripe.subscriptions.retrieve(booking.stripe_subscription_id);
      return json({
        id: sub.id,
        status: sub.status,
        current_period_end: (sub as any).current_period_end ?? null,
        cancel_at: sub.cancel_at ?? null,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        canceled_at: sub.canceled_at ?? null,
      });
    }

    // helper: pega o email + label do veículo do cliente
    async function notifyCancel(atEnd: boolean): Promise<boolean> {
      let cliEmail = "";
      try {
        const { data: u } = await admin.auth.admin.getUserById(booking.client_id);
        cliEmail = u?.user?.email ?? "";
      } catch { /* ignora */ }
      if (!cliEmail) return false;
      const v: any = (booking as any).vehicles;
      let veh = "Reserva Nomade Drive";
      if (v) {
        veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
        if (v.year_model) veh += " (" + v.year_model + ")";
      }
      const tpl = emailAssinaturaCancelada({
        veiculo: veh,
        atEndDate: atEnd,
        endDate: booking.end_date ?? undefined,
      });
      const r = await sendEmail(cliEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo);
      return r.ok;
    }

    if (action === "cancel") {
      const sub = await stripe.subscriptions.cancel(booking.stripe_subscription_id);
      // Webhook customer.subscription.deleted vai zerar stripe_subscription_id
      // — mas também limpamos aqui pra resposta imediata na UI.
      await admin.from("bookings")
        .update({ stripe_subscription_id: null })
        .eq("id", bookingId);
      const emailed = await notifyCancel(false);
      return json({ ok: true, status: sub.status, canceled_at: sub.canceled_at, email_sent: emailed });
    }

    if (action === "cancel_at_end") {
      const sub = await stripe.subscriptions.update(booking.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      const emailed = await notifyCancel(true);
      return json({
        ok: true,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: (sub as any).current_period_end ?? null,
        email_sent: emailed,
      });
    }

    return json({ error: "Ação inválida. Use 'status', 'cancel' ou 'cancel_at_end'." }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
