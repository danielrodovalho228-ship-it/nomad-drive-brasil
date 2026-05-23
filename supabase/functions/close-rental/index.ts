// ====================================================================
// Nomade Drive Brasil — Edge Function: close-rental (Fase 22a)
// --------------------------------------------------------------------
// Quando o proprietário aprova um check-out, fecha o ciclo da locação:
//   1) Cancela a subscription mensal (Stripe) se existir
//   2) Libera a caução autorizada (cancela o PaymentIntent → estorno
//      automático no cartão do cliente em até 5 dias úteis)
//   3) Atualiza a tabela payments (caução vira "liberado")
//   4) Envia e-mail "Locação encerrada — caução liberada" ao cliente
//
// É chamada pela UI do proprietário logo após `rental_inspections.update`
// com status='aprovado' e kind='checkout'.
//
// Cada passo é best-effort: erro num NÃO impede os outros. Retorna o
// detalhe de cada ação.
//
// SECRETS: STRIPE_SECRET_KEY, RESEND_API_KEY (opcional), EMAIL_FROM (opcional)
// Verify JWT: LIGADO. Quem pode fechar:
//   - dono do veículo (owner_id da booking)
//   - super-admin (dtrodovalho40@gmail.com)
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";
const SUPER_ADMIN_EMAIL = "dtrodovalho40@gmail.com";

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

// ----- helpers de e-mail (inline; mesmo padrão das outras funções) -----
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fmtBRL(amount: number | null | undefined): string {
  const v = amount == null ? 0 : amount;
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
async function sendEmail(to: string, subject: string, html: string, text: string, replyTo?: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { ok: false, error: "RESEND_API_KEY ausente ou destinatário vazio" };
  const from = Deno.env.get("EMAIL_FROM") || "Nomade Drive Brasil <onboarding@resend.dev>";
  const reply_to = replyTo || "pagamentos@nomadedrive.com.br";
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

function emailLocacaoEncerrada(d: { valor: string; veiculo: string; caucaoLiberada: boolean }) {
  const caucaoText = d.caucaoLiberada
    ? "A caução de R$ " + d.valor + " foi <strong>liberada</strong> no seu cartão. O estorno aparece na sua fatura em até 5 dias úteis (alguns bancos podem demorar mais)."
    : "A locação foi encerrada sem cobrança adicional.";
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Locação encerrada</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">Sua locação foi encerrada. Caução liberada no cartão.</div>'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Locação encerrada</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;">Tudo certo — locação encerrada</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">A devolução do veículo foi aprovada pelo proprietário. ' + caucaoText + '</p>'
    + '<table cellpadding="8" cellspacing="0" style="background:#f4f7f5;border-radius:10px;margin:14px 0 18px;width:100%;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:140px;">Reserva</td><td style="color:#14201b;">' + escapeHtml(d.veiculo) + '</td></tr>'
    + (d.caucaoLiberada ? '<tr><td style="font-weight:600;color:#5b6b63;">Caução liberada</td><td style="color:#14201b;">R$ ' + d.valor + '</td></tr>' : '')
    + '<tr><td style="font-weight:600;color:#5b6b63;">Cobrança recorrente</td><td style="color:#14201b;">Encerrada</td></tr>'
    + '</table>'
    + '<p style="margin:14px 0;font-size:14px;line-height:1.55;color:#3a4945;">Obrigado por escolher a Nomade Drive Brasil. Esperamos te ver de volta numa próxima viagem.</p>'
    + '<p style="margin:24px 0 0;"><a href="' + SITE + '/dashboard-cliente.html" style="display:inline-block;background:#1a7a4f;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">Acessar meu painel</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#f4f7f5;padding:18px 28px;border-top:1px solid #e3e9e5;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · Mensagem automática — em caso de dúvida, responda a este e-mail.<br>'
    + '<span style="color:#8a9591;">Valores, disponibilidade e condições são confirmados individualmente por contrato.</span>'
    + '</td></tr></table></td></tr></table></body></html>';
  const text =
    "Locação encerrada — Nomade Drive Brasil\n\n"
    + "A devolução do veículo foi aprovada pelo proprietário.\n"
    + (d.caucaoLiberada
      ? "A caução de R$ " + d.valor + " foi LIBERADA no seu cartão.\nO estorno aparece em até 5 dias úteis.\n\n"
      : "A locação foi encerrada sem cobrança adicional.\n\n")
    + "Reserva: " + d.veiculo + "\n\n"
    + "Acesse seu painel: " + SITE + "/dashboard-cliente.html\n\n"
    + "Obrigado por escolher a Nomade Drive Brasil.";
  return {
    subject: "Locação encerrada — Nomade Drive Brasil",
    html, text,
    replyTo: "pagamentos@nomadedrive.com.br",
  };
}

// ============================ HANDLER ===============================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const actions = {
    subscription_canceled: false,
    caucao_released: false,
    email_sent: false,
    errors: [] as string[],
  };

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
    if (!bookingId) return json({ error: "booking_id ausente." }, 400);

    const { data: booking } = await admin.from("bookings")
      .select("id, client_id, owner_id, monthly_price, stripe_subscription_id, vehicles(make,model,year_model)")
      .eq("id", bookingId).maybeSingle();
    if (!booking) return json({ error: "Reserva não encontrada." }, 404);

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    const isOwner = booking.owner_id === user.id;
    if (!isOwner && !isSuperAdmin) {
      return json({ error: "Apenas o proprietário ou admin pode encerrar." }, 403);
    }

    // 1) Cancelar subscription
    if (booking.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(booking.stripe_subscription_id);
        await admin.from("bookings")
          .update({ stripe_subscription_id: null })
          .eq("id", bookingId);
        actions.subscription_canceled = true;
      } catch (e) {
        actions.errors.push("subscription: " + (e as Error)?.message);
      }
    }

    // 2) Liberar caução (cancelar payment_intent autorizado)
    const { data: caucao } = await admin.from("payments")
      .select("id, stripe_payment_intent_id, amount")
      .eq("booking_id", bookingId)
      .eq("kind", "caucao")
      .eq("status", "autorizado")
      .maybeSingle();
    let caucaoAmount = 0;
    if (caucao && caucao.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(caucao.stripe_payment_intent_id);
        await admin.from("payments")
          .update({ status: "liberado" })
          .eq("id", caucao.id);
        caucaoAmount = Number(caucao.amount) || 0;
        actions.caucao_released = true;
      } catch (e) {
        actions.errors.push("caucao: " + (e as Error)?.message);
      }
    }

    // 3) Enviar e-mail "Locação encerrada"
    let cliEmail = "";
    try {
      const { data: u } = await admin.auth.admin.getUserById(booking.client_id);
      cliEmail = u?.user?.email ?? "";
    } catch { /* ignora */ }
    if (cliEmail) {
      const v: any = (booking as any).vehicles;
      let veh = "Reserva Nomade Drive";
      if (v) {
        veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
        if (v.year_model) veh += " (" + v.year_model + ")";
      }
      const tpl = emailLocacaoEncerrada({
        valor: fmtBRL(caucaoAmount),
        veiculo: veh,
        caucaoLiberada: actions.caucao_released,
      });
      const r = await sendEmail(cliEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo);
      if (r.ok) actions.email_sent = true;
      else actions.errors.push("email: " + (r.error ?? ""));
    } else {
      actions.errors.push("email: cliente sem e-mail conhecido");
    }

    return json({ ok: true, actions });
  } catch (e) {
    actions.errors.push("geral: " + ((e as Error)?.message ?? String(e)));
    return json({ ok: false, actions, error: (e as Error)?.message }, 500);
  }
});
