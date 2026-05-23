// ====================================================================
// Nomade Drive Brasil — Edge Function: stripe-webhook
// --------------------------------------------------------------------
// Recebe os eventos da Stripe, valida a assinatura, garante idempotência,
// atualiza a tabela payments e dispara e-mail de confirmação (Resend).
//
// SECRETS necessários (Edge Functions > Secrets):
//   STRIPE_SECRET_KEY      — chave secreta sk_test_... da Stripe
//   STRIPE_WEBHOOK_SECRET  — "Signing secret" do endpoint de webhook
//                            (whsec_...), gerado ao criar o webhook na Stripe
//   RESEND_API_KEY         — chave da Resend (re_...) — opcional; sem ela
//                            o e-mail é só pulado, não derruba o webhook
//   EMAIL_FROM             — opcional, default usa onboarding@resend.dev
// Já existem por padrão:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️ DEPLOY: nesta função, DESLIGUE "Verify JWT" — a Stripe não envia
// token do Supabase; a segurança aqui é a ASSINATURA do webhook.
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ====================================================================
// Bibliotecas inline de e-mail (mesma versão de _shared/email.ts —
// duplicada porque o Supabase Dashboard não suporta imports
// relativos a outras pastas quando deploy via web editor)
// ====================================================================
const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fmtBRL(amount: number | null | undefined, isCents = false): string {
  const v = amount == null ? 0 : (isCents ? amount / 100 : amount);
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// Endereços canônicos pra reply_to (categoria do e-mail).
// Quando o domínio nomadedrive.com.br for verificado no Resend,
// esses mesmos viram FROM também (via EMAIL_FROM).
const REPLY_PAGAMENTOS = "pagamentos@nomadedrive.com.br";
async function sendEmail(to: string | string[], subject: string, html: string, text: string, replyTo?: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { ok: false, error: "RESEND_API_KEY ausente ou destinatário vazio" };
  const from = Deno.env.get("EMAIL_FROM") || "Nomade Drive Brasil <onboarding@resend.dev>";
  const reply_to = replyTo || Deno.env.get("EMAIL_REPLY_TO") || "contato@nomadedrive.com.br";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text, reply_to }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Resend respondeu", resp.status, detail);
      return { ok: false, error: "Resend " + resp.status + ": " + detail.slice(0, 200) };
    }
    const body = await resp.json();
    return { ok: true, id: body?.id };
  } catch (e) {
    console.error("sendEmail exceção:", (e as Error)?.message);
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}
interface BaseOpts {
  preheader: string; badge: string; title: string; intro: string;
  rows?: Array<[string, string]>; body?: string;
  ctaLabel: string; ctaUrl: string; gradient?: string;
}
function baseTemplate(opts: BaseOpts): string {
  const gradient = opts.gradient || "linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%)";
  const rowsHtml = (opts.rows || []).map(([k, v]) =>
    '<tr><td style="padding:8px 12px;font-weight:600;color:#5b6b63;width:120px;border-bottom:1px solid #e3e9e5;">' + k + '</td>' +
    '<td style="padding:8px 12px;color:#14201b;border-bottom:1px solid #e3e9e5;">' + v + '</td></tr>'
  ).join("");
  const tableHtml = rowsHtml
    ? '<table cellpadding="0" cellspacing="0" style="background:#f4f7f5;border-radius:10px;margin:14px 0 18px;width:100%;border-collapse:separate;">' + rowsHtml + '</table>' : '';
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>' + escapeHtml(opts.title) + '</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;-webkit-font-smoothing:antialiased;">'
    + '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">' + escapeHtml(opts.preheader) + '</div>'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:' + gradient + ';padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle" style="vertical-align:middle;">'
    + '<img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;outline:none;text-decoration:none;background:#fff;border-radius:6px;padding:4px 8px;">'
    + '</td><td align="right" valign="middle" style="vertical-align:middle;color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">'
    + escapeHtml(opts.badge) + '</td></tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;line-height:1.25;">' + escapeHtml(opts.title) + '</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">' + opts.intro + '</p>'
    + tableHtml + (opts.body || '')
    + '<p style="margin:24px 0 0;"><a href="' + opts.ctaUrl + '" style="display:inline-block;background:#1a7a4f;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">' + escapeHtml(opts.ctaLabel) + '</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#f4f7f5;padding:18px 28px;border-top:1px solid #e3e9e5;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">' + SITE.replace("https://", "") + '</a> · '
    + 'Mensagem automática — não responda a este e-mail.<br>'
    + '<span style="color:#8a9591;">Valores, disponibilidade e condições são confirmados individualmente por contrato.</span>'
    + '</td></tr></table></td></tr></table></body></html>';
}
function emailMensalidade(d: { valor: string; veiculo: string }) {
  return {
    subject: "Mensalidade confirmada — Nomade Drive Brasil",
    html: baseTemplate({
      preheader: "Recebemos R$ " + d.valor + " da sua mensalidade. Tudo confirmado.",
      badge: "Pagamento confirmado", title: "Mensalidade confirmada",
      intro: "Recebemos o pagamento da sua mensalidade. Está tudo certo — você pode acompanhar todos os detalhes da sua locação no seu painel.",
      rows: [["Valor", "R$ " + d.valor], ["Reserva", d.veiculo]],
      ctaLabel: "Acessar meu painel",
      ctaUrl: SITE + "/dashboard-cliente.html",
    }),
    text: "Mensalidade confirmada — Nomade Drive Brasil\n\n"
      + "Recebemos o pagamento da sua mensalidade.\n\n"
      + "Valor:   R$ " + d.valor + "\nReserva: " + d.veiculo + "\n\n"
      + "Acesse seu painel: " + SITE + "/dashboard-cliente.html",
    replyTo: REPLY_PAGAMENTOS,
  };
}
function emailCaucao(d: { valor: string; veiculo: string }) {
  return {
    subject: "Caução autorizada — Nomade Drive Brasil",
    html: baseTemplate({
      preheader: "Caução R$ " + d.valor + " autorizada — valor reservado no cartão, sem cobrança imediata.",
      badge: "Caução autorizada", title: "Caução autorizada",
      intro: "A caução da sua locação foi <strong>autorizada</strong> no seu cartão — o valor fica reservado, sem cobrança imediata. Só é capturado em caso de dano, multa ou outro custo previsto em contrato.",
      rows: [["Caução", "R$ " + d.valor], ["Reserva", d.veiculo], ["Cobrança", "Apenas em caso de dano/multa"]],
      ctaLabel: "Acessar meu painel",
      ctaUrl: SITE + "/dashboard-cliente.html",
      gradient: "linear-gradient(135deg,#0d4a2f 0%,#1f7050 55%,#4ba37e 100%)",
    }),
    text: "Caução autorizada — Nomade Drive Brasil\n\n"
      + "A caução da sua locação foi AUTORIZADA no seu cartão.\n"
      + "O valor fica reservado, sem cobrança imediata — só é capturado\n"
      + "em caso de dano, multa ou outro custo previsto em contrato.\n\n"
      + "Caução:  R$ " + d.valor + "\nReserva: " + d.veiculo + "\n\n"
      + "Acesse seu painel: " + SITE + "/dashboard-cliente.html",
    replyTo: REPLY_PAGAMENTOS,
  };
}
function emailMensalidadeRecorrente(d: { valor: string; veiculo: string; numero: number }) {
  return {
    subject: "Mensalidade #" + d.numero + " cobrada — Nomade Drive Brasil",
    html: baseTemplate({
      preheader: "Mensalidade #" + d.numero + " (R$ " + d.valor + ") cobrada no seu cartão cadastrado.",
      badge: "Cobrança recorrente",
      title: "Mensalidade #" + d.numero + " cobrada",
      intro: "Sua mensalidade foi cobrada automaticamente no cartão cadastrado. Tudo certo — a locação segue ativa.",
      rows: [
        ["Valor", "R$ " + d.valor],
        ["Mensalidade", "#" + d.numero],
        ["Reserva", d.veiculo],
      ],
      ctaLabel: "Acessar meu painel",
      ctaUrl: SITE + "/dashboard-cliente.html",
    }),
    text: "Mensalidade #" + d.numero + " cobrada — Nomade Drive Brasil\n\n"
      + "Sua mensalidade foi cobrada automaticamente no cartão cadastrado.\n\n"
      + "Valor:       R$ " + d.valor + "\n"
      + "Mensalidade: #" + d.numero + "\n"
      + "Reserva:     " + d.veiculo + "\n\n"
      + "Acesse seu painel: " + SITE + "/dashboard-cliente.html",
    replyTo: REPLY_PAGAMENTOS,
  };
}
function emailPagamentoFalhou(d: { valor: string; veiculo: string; numero?: number }) {
  const ref = d.numero ? "Mensalidade #" + d.numero : "Mensalidade";
  return {
    subject: "Falha no pagamento da mensalidade — Nomade Drive Brasil",
    html: baseTemplate({
      preheader: "A cobrança da " + ref.toLowerCase() + " falhou — atualize o cartão no painel para evitar suspensão.",
      badge: "Pagamento recusado",
      title: "Falha no pagamento da " + ref.toLowerCase(),
      intro: "A operadora do seu cartão recusou a cobrança automática. Sem o pagamento em dia, a locação pode ser suspensa. Atualize o cartão no seu painel ou entre em contato com a equipe.",
      rows: [
        ["Valor tentado", "R$ " + d.valor],
        ["Reserva", d.veiculo],
        ["Próxima ação", "Atualizar cartão"],
      ],
      ctaLabel: "Atualizar cartão",
      ctaUrl: SITE + "/dashboard-cliente.html",
      gradient: "linear-gradient(135deg,#7a1f1f 0%,#a83838 55%,#d36161 100%)",
    }),
    text: "Falha no pagamento da " + ref.toLowerCase() + " — Nomade Drive Brasil\n\n"
      + "A operadora do seu cartão recusou a cobrança automática.\n"
      + "Atualize o cartão no painel para evitar suspensão da locação.\n\n"
      + "Valor:    R$ " + d.valor + "\nReserva:  " + d.veiculo + "\n\n"
      + "Acesse seu painel: " + SITE + "/dashboard-cliente.html",
    replyTo: REPLY_PAGAMENTOS,
  };
}

// ====================================================================
// Handler do webhook
// ====================================================================
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido.", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe não configurado.", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? "", webhookSecret);
  } catch {
    return new Response("Assinatura inválida.", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // idempotência: se o evento já foi registrado, não processa de novo
  const dup = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup.error) return new Response("ok (evento duplicado)", { status: 200 });

  function patchBySession(sessionId: string, patch: Record<string, unknown>) {
    return admin.from("payments").update(patch).eq("stripe_checkout_session_id", sessionId);
  }
  function patchByIntent(intentId: string, patch: Record<string, unknown>) {
    return admin.from("payments").update(patch).eq("stripe_payment_intent_id", intentId);
  }

  async function fetchVehLabel(bookingId: string | undefined): Promise<string> {
    if (!bookingId) return "Reserva Nomade Drive";
    try {
      const { data } = await admin.from("bookings")
        .select("vehicles(make,model,year_model)")
        .eq("id", bookingId).maybeSingle();
      const v: any = data?.vehicles;
      if (!v) return "Reserva Nomade Drive";
      let label = [v.make, v.model].filter(Boolean).join(" ") || "Veículo da reserva";
      if (v.year_model) label += " (" + v.year_model + ")";
      return label;
    } catch { return "Reserva Nomade Drive"; }
  }

  async function notifyCheckoutCompleted(s: Stripe.Checkout.Session) {
    const to = s.customer_details?.email || s.customer_email;
    if (!to) return;
    const veh = await fetchVehLabel(s.metadata?.booking_id ?? undefined);
    const valor = fmtBRL(s.amount_total ?? null, true);
    const isDeposit = s.metadata?.kind === "caucao";
    const tpl = isDeposit
      ? emailCaucao({ valor, veiculo: veh })
      : emailMensalidade({ valor, veiculo: veh });
    const result = await sendEmail(to, tpl.subject, tpl.html, tpl.text, (tpl as any).replyTo);
    if (!result.ok) console.error("Falha ao enviar e-mail (webhook):", result.error);
    else console.log("E-mail enviado (webhook):", result.id);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const pi = typeof s.payment_intent === "string"
          ? s.payment_intent
          : s.payment_intent?.id ?? null;
        const isDeposit = s.metadata?.kind === "caucao";
        const newStatus = isDeposit ? "autorizado" : "pago";
        // Update SÓ se ainda estiver 'pendente' — assim apenas o primeiro
        // (webhook ou confirm) que processar dispara o e-mail. Sem
        // duplicidade quando ambos rodam.
        const { data: changed } = await admin.from("payments")
          .update({ status: newStatus, stripe_payment_intent_id: pi })
          .eq("stripe_checkout_session_id", s.id)
          .eq("status", "pendente")
          .select("id");
        if (changed && changed.length > 0) {
          await notifyCheckoutCompleted(s);
        }
        break;
      }
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        await patchBySession(s.id, { status: "expirado" });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await patchByIntent(pi.id, { status: "falhou" });
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        // caução cancelada antes da captura = valor liberado
        await patchByIntent(pi.id, { status: "liberado" });
        break;
      }
      case "charge.captured": {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : null;
        if (pi) await patchByIntent(pi, { status: "capturado" });
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : null;
        if (pi) await patchByIntent(pi, { status: "estornado" });
        break;
      }
      // ============================================================
      // FASE 21 — assinatura mensal (subscription) recorrente
      // ============================================================
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const bookingId = sub.metadata?.booking_id;
        if (bookingId) {
          const patch: Record<string, unknown> = {
            stripe_subscription_id: sub.id,
          };
          if (sub.status === "canceled" || sub.status === "incomplete_expired") {
            patch.stripe_subscription_id = null;
          }
          await admin.from("bookings").update(patch).eq("id", bookingId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const bookingId = sub.metadata?.booking_id;
        if (bookingId) {
          await admin.from("bookings")
            .update({ stripe_subscription_id: null })
            .eq("id", bookingId);
        }
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = typeof (inv as any).subscription === "string"
          ? (inv as any).subscription : null;
        if (!subId) break;
        // descobre a booking via subscription_id
        const { data: bk } = await admin.from("bookings")
          .select("id, client_id, monthly_price, vehicles(make,model,year_model)")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();
        if (!bk) break;
        // descobre o número da mensalidade (próxima sequência)
        const { count: prev } = await admin.from("payments")
          .select("id", { count: "exact", head: true })
          .eq("booking_id", bk.id)
          .eq("kind", "mensalidade")
          .not("installment_number", "is", null);
        const numero = (prev || 0) + 1;
        // grava a linha de pagamento (idempotência via stripe_invoice_id unique)
        const valorCents = inv.amount_paid ?? inv.total ?? 0;
        await admin.from("payments").insert({
          booking_id: bk.id,
          client_id: bk.client_id,
          kind: "mensalidade",
          amount: valorCents / 100,
          currency: (inv.currency || "brl").toLowerCase(),
          status: "pago",
          stripe_invoice_id: inv.id,
          installment_number: numero,
        });
        // notifica o cliente
        const to = inv.customer_email || (inv as any).customer_address?.email;
        if (to) {
          const v: any = bk.vehicles;
          let veh = "Reserva Nomade Drive";
          if (v) {
            veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
            if (v.year_model) veh += " (" + v.year_model + ")";
          }
          const tpl = emailMensalidadeRecorrente({
            valor: fmtBRL(valorCents, true),
            veiculo: veh,
            numero,
          });
          const r = await sendEmail(to, tpl.subject, tpl.html, tpl.text, (tpl as any).replyTo);
          if (!r.ok) console.error("E-mail recorrente:", r.error);
          else console.log("E-mail recorrente enviado:", r.id, "mensalidade #", numero);
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = typeof (inv as any).subscription === "string"
          ? (inv as any).subscription : null;
        if (!subId) break;
        const { data: bk } = await admin.from("bookings")
          .select("id, client_id, vehicles(make,model,year_model)")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();
        if (!bk) break;
        const valorCents = inv.amount_due ?? inv.total ?? 0;
        const to = inv.customer_email || (inv as any).customer_address?.email;
        if (to) {
          const v: any = bk.vehicles;
          let veh = "Reserva Nomade Drive";
          if (v) {
            veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
            if (v.year_model) veh += " (" + v.year_model + ")";
          }
          const tpl = emailPagamentoFalhou({
            valor: fmtBRL(valorCents, true),
            veiculo: veh,
          });
          const r = await sendEmail(to, tpl.subject, tpl.html, tpl.text, (tpl as any).replyTo);
          if (!r.ok) console.error("E-mail falhou:", r.error);
          else console.log("E-mail falhou enviado:", r.id);
        }
        break;
      }
      case "account.updated": {
        // Stripe Connect — status da conta conectada (recebimento)
        const acct = event.data.object as Stripe.Account;
        const status = acct.payouts_enabled && acct.details_submitted
          ? "ativo"
          : acct.requirements?.disabled_reason
            ? "restrito"
            : acct.details_submitted
              ? "em_analise"
              : "pendente";
        await admin.from("payout_accounts").update({
          status,
          charges_enabled: !!acct.charges_enabled,
          payouts_enabled: !!acct.payouts_enabled,
          details_submitted: !!acct.details_submitted,
        }).eq("stripe_account_id", acct.id);
        break;
      }
      default:
        // eventos não tratados são apenas registrados (em stripe_events)
        break;
    }
  } catch {
    return new Response("Erro ao processar o evento.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
