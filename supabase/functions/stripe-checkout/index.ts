// ====================================================================
// Nomade Drive Brasil — Edge Function: stripe-checkout
// --------------------------------------------------------------------
// Cria uma sessão do Stripe Checkout para a MENSALIDADE ou a CAUÇÃO de
// uma reserva e devolve a URL de pagamento. A tela de cartão é hospedada
// pela Stripe — nenhum dado de cartão passa por este código.
//
// Modo de teste. Deploy: Supabase Dashboard > Edge Functions.
//
// SECRETS necessários (Edge Functions > Secrets):
//   STRIPE_SECRET_KEY          — chave secreta sk_test_... da Stripe
// Já existem por padrão no projeto Supabase:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// "Verify JWT": MANTENHA LIGADO nesta função (o cliente chama logado).
//
// AÇÕES (campo "action" do corpo):
//   "checkout" (padrão) -> cria/reaproveita a sessão e devolve { url }
//   "confirm"           -> reconcilia o pagamento no retorno da Stripe,
//                          sem depender do webhook. Devolve { status }.
//
// SEM DUPLICIDADE: a função reaproveita a linha "pendente" existente em
// payments (1 por booking_id+kind) em vez de inserir uma nova a cada
// clique. O índice único parcial uniq_payments_pending_booking_kind
// (ver supabase-fase19.sql) garante isso também no banco.
// ====================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";

// ====================================================================
// Bibliotecas inline de e-mail (mesma versão de _shared/email.ts —
// duplicada porque o Supabase Dashboard não suporta imports relativos
// a outras pastas quando deploy via web editor)
// ====================================================================
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fmtBRL(amount: number | null | undefined, isCents = false): string {
  const v = amount == null ? 0 : (isCents ? amount / 100 : amount);
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// Endereços canônicos por categoria. Pagamento usa pagamentos@.
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe não configurado no servidor." }, 500);

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // contexto do usuário logado (respeita o RLS)
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado." }, 401);

    // service role: lê payout_accounts e registra o pagamento
    const admin = createClient(url, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const action = payload.action === "confirm" ? "confirm" : "checkout";

    // ================================================================
    // AÇÃO "confirm" — reconciliação no retorno (não depende do webhook)
    // ================================================================
    if (action === "confirm") {
      const sessionId = payload.session_id;
      if (!sessionId || typeof sessionId !== "string") {
        return json({ error: "session_id ausente." }, 400);
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // a sessão precisa ser deste usuário
      if (!session || session.metadata?.client_id !== user.id) {
        return json({ error: "Sessão de pagamento não reconhecida." }, 403);
      }

      const kind = session.metadata?.kind;
      const isDeposit = kind === "caucao";

      // mensalidade: pago quando payment_status === "paid"
      // caução: autorizado (capture manual) quando status === "complete"
      let newStatus: string | null = null;
      if (isDeposit) {
        if (session.status === "complete") newStatus = "autorizado";
        else if (session.status === "expired") newStatus = "expirado";
      } else {
        if (session.payment_status === "paid") newStatus = "pago";
        else if (session.status === "expired") newStatus = "expirado";
      }

      if (!newStatus) {
        // ainda não concluído — não altera o registro
        return json({ status: "pendente", reconciled: false });
      }

      const patch: Record<string, unknown> = { status: newStatus };
      const pi = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
      if (pi) patch.stripe_payment_intent_id = pi;

      // Lê o status ATUAL antes de atualizar — assim sabemos se a
      // transição "pendente → pago/autorizado" foi feita aqui ou
      // se o webhook já tinha resolvido antes. Só envia e-mail uma vez.
      const { data: before } = await admin.from("payments")
        .select("id, status")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();
      const wasPendente = !!(before && before.status === "pendente");

      // 1ª tentativa: casa a linha exatamente pela sessão da Stripe
      let { data: updated } = await admin
        .from("payments")
        .update(patch)
        .eq("stripe_checkout_session_id", sessionId)
        .select("id, kind, status");

      // fallback: a linha pendente pode ter sido reaproveitada por uma
      // sessão mais nova (clique duplo). Casa pela reserva + tipo ainda
      // pendente — assim o pagamento concluído nunca fica preso pendente.
      let wasPendenteFallback = false;
      if ((!updated || !updated.length) && session.metadata?.booking_id) {
        patch.stripe_checkout_session_id = sessionId;
        const r2 = await admin
          .from("payments")
          .update(patch)
          .eq("booking_id", session.metadata.booking_id)
          .eq("kind", kind)
          .eq("status", "pendente")
          .select("id, kind, status");
        updated = r2.data;
        wasPendenteFallback = !!(updated && updated.length);
      }

      const row = updated && updated[0];
      if (!row) {
        // atualização silenciosa de 0 linhas — registra para auditoria
        console.error("stripe-checkout confirm — 0 linhas atualizadas",
          JSON.stringify({
            session_id: sessionId,
            payment_intent: pi,
            booking_id: session.metadata?.booking_id,
            kind,
          }));
      }

      // E-mail: dispara só quando ESTA chamada foi a que transicionou
      // o status (pendente → pago/autorizado). Dedup com o webhook.
      const transicionou = (wasPendente && row) || wasPendenteFallback;
      if (transicionou) {
        const to = session.customer_details?.email || session.customer_email;
        if (to) {
          let veh = "Reserva Nomade Drive";
          try {
            const bId = session.metadata?.booking_id;
            if (bId) {
              const { data: bk } = await admin.from("bookings")
                .select("vehicles(make,model,year_model)")
                .eq("id", bId).maybeSingle();
              const v: any = bk?.vehicles;
              if (v) {
                veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
                if (v.year_model) veh += " (" + v.year_model + ")";
              }
            }
          } catch { /* keep default */ }
          const valor = fmtBRL(session.amount_total ?? null, true);
          const tpl = isDeposit
            ? emailCaucao({ valor, veiculo: veh })
            : emailMensalidade({ valor, veiculo: veh });
          const r = await sendEmail(to, tpl.subject, tpl.html, tpl.text, (tpl as any).replyTo);
          if (!r.ok) console.error("E-mail confirm:", r.error);
          else console.log("E-mail confirm enviado:", r.id);
        }
      }

      return json({
        status: row ? row.status : newStatus,
        kind: (row && row.kind) || kind || null,
        reconciled: !!row,
      });
    }

    // ================================================================
    // AÇÃO "checkout" — cria/reaproveita a sessão de pagamento
    // ================================================================
    const bookingId = payload.booking_id;
    const kind = payload.kind;
    if (!bookingId || (kind !== "mensalidade" && kind !== "caucao")) {
      return json({ error: "Parâmetros inválidos." }, 400);
    }

    // a reserva — o RLS garante que o usuário só enxerga as próprias
    const { data: booking } = await userClient
      .from("bookings")
      .select("id, client_id, owner_id, monthly_price, deposit_amount, platform_fee, billing_mode, stripe_subscription_id, end_date")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return json({ error: "Reserva não encontrada." }, 404);
    if (booking.client_id !== user.id) {
      return json({ error: "Esta reserva não é da sua conta." }, 403);
    }

    // ---- já tem assinatura ativa para mensalidade? ----
    if (kind === "mensalidade" && booking.billing_mode === "monthly" && booking.stripe_subscription_id) {
      return json({
        error: "Assinatura mensal já está ativa para esta reserva.",
        subscription_id: booking.stripe_subscription_id,
      }, 409);
    }

    // ---- já está pago/autorizado? não cria nova sessão ----
    const { data: already } = await admin
      .from("payments")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("kind", kind)
      .in("status", ["pago", "autorizado", "capturado", "liberado"])
      .maybeSingle();
    if (already) {
      return json({ error: "Este pagamento já foi concluído.", status: already.status }, 409);
    }

    const monthly = Number(booking.monthly_price) || 0;
    const deposit = booking.deposit_amount != null
      ? Number(booking.deposit_amount)
      : monthly; // caução padrão = 1 mensalidade (ajuste por contrato)

    const isDeposit = kind === "caucao";
    const amount = isDeposit ? deposit : monthly;
    if (!(amount > 0)) return json({ error: "Valor da reserva ainda não definido." }, 400);
    const amountCents = Math.round(amount * 100);

    const label = isDeposit
      ? "Caução da locação — Nomade Drive Brasil"
      : "Mensalidade da locação — Nomade Drive Brasil";

    // ---- Fase B — split do pagamento ----
    // A MENSALIDADE é dividida: parte vai ao proprietário (conta conectada)
    // e a taxa fica com a plataforma. A CAUÇÃO não é dividida (fica retida).
    const piData: Record<string, unknown> = {};
    if (isDeposit) {
      piData.capture_method = "manual"; // autoriza sem capturar
    } else {
      const { data: ownerAcct } = await admin
        .from("payout_accounts")
        .select("stripe_account_id, status, payouts_enabled")
        .eq("user_id", booking.owner_id)
        .maybeSingle();
      const ownerReady = !!(ownerAcct && ownerAcct.stripe_account_id &&
        (ownerAcct.status === "ativo" || ownerAcct.payouts_enabled === true));
      if (ownerReady) {
        // taxa da plataforma: 10% de todo aluguel
        const PLATFORM_FEE_PCT = 0.10;
        const feeCents = Math.round(amountCents * PLATFORM_FEE_PCT);
        // a taxa nunca é negativa nem maior/igual ao total
        piData.application_fee_amount = Math.min(Math.max(feeCents, 0), amountCents - 1);
        piData.transfer_data = { destination: ownerAcct.stripe_account_id };
      }
      // se o proprietário ainda não tiver conta de recebimento ativa, a
      // cobrança ocorre sem split — o repasse é acertado depois.
    }

    // ---- decide modo de cobrança ---------------------------------
    // mensalidade + booking.billing_mode='monthly' → subscription
    // (cobrança mensal automática via Stripe Subscriptions)
    // Caução continua sempre one-off (capture manual).
    const useSubscription = !isDeposit && booking.billing_mode === "monthly";

    let session: Stripe.Checkout.Session;

    if (useSubscription) {
      // garante Stripe customer pro usuário
      const { data: prof } = await admin
        .from("profiles")
        .select("stripe_customer_id, full_name")
        .eq("id", user.id)
        .maybeSingle();
      let customerId = prof?.stripe_customer_id || null;
      if (!customerId) {
        const c = await stripe.customers.create({
          email: user.email ?? undefined,
          name: prof?.full_name ?? undefined,
          metadata: { user_id: user.id },
        });
        customerId = c.id;
        await admin.from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }

      // dados de subscription: split via application_fee_percent.
      // NÃO setamos cancel_at aqui — não é parâmetro válido em
      // subscription_data do Checkout Session. Em vez disso, passamos
      // end_date via metadata; o webhook customer.subscription.created
      // chama subscriptions.update({ cancel_at: ... }) depois (onde é válido).
      const subData: Record<string, unknown> = {
        metadata: {
          booking_id: bookingId,
          kind,
          client_id: user.id,
          end_date: booking.end_date || "",
        },
      };
      // só inclui transfer/split se o proprietário já tem conta conectada
      const { data: ownerAcct2 } = await admin
        .from("payout_accounts")
        .select("stripe_account_id, status, payouts_enabled")
        .eq("user_id", booking.owner_id)
        .maybeSingle();
      const ownerReady2 = !!(ownerAcct2 && ownerAcct2.stripe_account_id &&
        (ownerAcct2.status === "ativo" || ownerAcct2.payouts_enabled === true));
      if (ownerReady2) {
        subData.application_fee_percent = 10;
        subData.transfer_data = { destination: ownerAcct2.stripe_account_id };
      }

      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId!,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: amountCents,
            recurring: { interval: "month" },
            product_data: { name: label },
          },
        }],
        subscription_data: subData,
        success_url: `${SITE}/reserva-detalhe.html?id=${bookingId}&pagamento=ok&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE}/reserva-detalhe.html?id=${bookingId}&pagamento=cancelado`,
        client_reference_id: bookingId,
        metadata: { booking_id: bookingId, kind, client_id: user.id, billing_mode: "monthly" },
      });
    } else {
      // ---- modo one-off (padrão atual: payment com app_fee_amount) ----
      //
      // B2 (Fase 28): PIX como método alternativo
      // - Caução: SÓ cartão (precisa de pré-autorização — PIX não suporta)
      // - Mensalidade one-off: cartão OU PIX (cliente escolhe na Stripe)
      // - PIX expira em 30 min por padrão; o webhook trata o paid quando vier.
      const paymentMethods = isDeposit
        ? ["card"]
        : ["card", "pix"];

      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: paymentMethods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: amountCents,
            product_data: { name: label },
          },
        }],
        payment_intent_data: Object.keys(piData).length ? piData : undefined,
        success_url: `${SITE}/reserva-detalhe.html?id=${bookingId}&pagamento=ok&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${SITE}/reserva-detalhe.html?id=${bookingId}&pagamento=cancelado`,
        client_reference_id: bookingId,
        metadata: { booking_id: bookingId, kind, client_id: user.id },
      });
    }

    // ---- registra o pagamento SEM DUPLICAR ----
    // Reaproveita a linha "pendente" existente (1 por booking_id+kind):
    // a cada clique a sessão muda, mas a linha é a mesma.
    const { data: pending } = await admin
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("kind", kind)
      .eq("status", "pendente")
      .maybeSingle();

    if (pending) {
      await admin
        .from("payments")
        .update({
          amount,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: null,
        })
        .eq("id", pending.id);
    } else {
      await admin.from("payments").insert({
        booking_id: bookingId,
        client_id: user.id,
        kind,
        amount,
        currency: "brl",
        status: "pendente",
        stripe_checkout_session_id: session.id,
      });
    }

    return json({ url: session.url });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
