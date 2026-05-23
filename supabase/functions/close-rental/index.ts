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

/* Fase 22c.2 — template alternativo: locação encerrada, mas caução
   fica retida porque há avaria(s) em análise pela Proteção. */
function emailLocacaoEncerradaAvaria(d: { valor: string; veiculo: string }) {
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Locação encerrada — avarias em análise</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">Sua locação foi encerrada. Caução retida até a análise das avarias reportadas.</div>'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#a8580e 0%,#cf7a1c 55%,#e89c3f 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Avaria em análise</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;">Devolução recebida — avaria reportada</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">O proprietário aprovou a devolução do veículo, mas <strong>reportou avaria(s)</strong> que serão analisadas pela equipe de Proteção da Nomade Drive.</p>'
    + '<table cellpadding="8" cellspacing="0" style="background:#fff5e8;border-radius:10px;margin:14px 0 18px;width:100%;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:140px;">Reserva</td><td style="color:#14201b;">' + escapeHtml(d.veiculo) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Caução</td><td style="color:#14201b;"><strong>Retida — R$ ' + d.valor + '</strong></td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Cobrança recorrente</td><td style="color:#14201b;">Encerrada</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Próximo passo</td><td style="color:#14201b;">Análise pela equipe Proteção (até 3 dias úteis)</td></tr>'
    + '</table>'
    + '<p style="margin:14px 0;font-size:14px;line-height:1.55;color:#3a4945;"><strong>O que acontece agora:</strong></p>'
    + '<ol style="margin:0 0 14px;padding-left:18px;color:#3a4945;line-height:1.7;font-size:14px;">'
    + '<li>A equipe de Proteção avalia as fotos e a descrição da avaria.</li>'
    + '<li>Você recebe um novo e-mail com a decisão e o valor final.</li>'
    + '<li>Se houver cobrança, apenas o valor da avaria é debitado da caução — o restante é liberado.</li>'
    + '<li>Você tem <strong>5 dias úteis</strong> para contestar a decisão pelo painel.</li>'
    + '</ol>'
    + '<p style="margin:24px 0 0;"><a href="' + SITE + '/dashboard-cliente.html" style="display:inline-block;background:#a8580e;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">Ver no meu painel</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#fff5e8;padding:18px 28px;border-top:1px solid #f0d9b8;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#a8580e;text-decoration:none;">nomadedrive.com.br</a> · Para tirar dúvidas, responda a este e-mail.<br>'
    + '<span style="color:#8a9591;">Cobranças e contestações seguem o contrato vigente.</span>'
    + '</td></tr></table></td></tr></table></body></html>';
  const text =
    "Locação encerrada — avaria em análise — Nomade Drive Brasil\n\n"
    + "O proprietário aprovou a devolução do veículo, mas reportou avaria(s).\n"
    + "Caução retida: R$ " + d.valor + "\n\n"
    + "A equipe de Proteção avalia em até 3 dias úteis e envia novo e-mail com\n"
    + "a decisão. Se houver cobrança, apenas o valor da avaria é debitado.\n"
    + "Você tem 5 dias úteis para contestar pelo painel.\n\n"
    + "Reserva: " + d.veiculo + "\n\n"
    + "Acesse seu painel: " + SITE + "/dashboard-cliente.html";
  return {
    subject: "Devolução recebida — avaria em análise — Nomade Drive Brasil",
    html, text,
    replyTo: "suporte@nomadedrive.com.br",
  };
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
    caucao_held: false,             // Fase 22c.2: caução retida por avaria em análise
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

    // Fase 22c.2: front pode sinalizar que reportou avaria. Mesmo se
    // não sinalizar, conferimos no banco — defesa em profundidade.
    const flaggedDamages = payload.has_damages === true;

    const { data: booking } = await admin.from("bookings")
      .select("id, client_id, owner_id, monthly_price, stripe_subscription_id, vehicles(make,model,year_model)")
      .eq("id", bookingId).maybeSingle();
    if (!booking) return json({ error: "Reserva não encontrada." }, 404);

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    const isOwner = booking.owner_id === user.id;
    if (!isOwner && !isSuperAdmin) {
      return json({ error: "Apenas o proprietário ou admin pode encerrar." }, 403);
    }

    // Capturamos o customer.id da Stripe ao longo do caminho — é o jeito
    // mais confiável de descobrir o e-mail do cliente (admin.auth.admin
    // .getUserById falha silenciosamente no runtime Deno).
    let stripeCustomerId: string | null = null;

    // 1) Cancelar subscription
    if (booking.stripe_subscription_id) {
      try {
        const canceled = await stripe.subscriptions.cancel(booking.stripe_subscription_id);
        const cust = canceled.customer;
        stripeCustomerId = typeof cust === "string" ? cust : (cust?.id ?? null);
        await admin.from("bookings")
          .update({ stripe_subscription_id: null })
          .eq("id", bookingId);
        actions.subscription_canceled = true;
      } catch (e) {
        actions.errors.push("subscription: " + (e as Error)?.message);
      }
    }

    // 2a) Verifica se há avarias em análise pra esta reserva.
    //     Se houver → mantém a caução autorizada pra captura parcial
    //     poder rodar quando a Proteção decidir.
    let hasPendingDamages = flaggedDamages;
    try {
      const { count } = await admin.from("damages")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", bookingId)
        .in("status", ["pendente_revisao", "em_contestacao", "aprovado_captura"]);
      if ((count || 0) > 0) hasPendingDamages = true;
    } catch (e) {
      console.error("close-rental: lookup de damages falhou:", (e as Error)?.message);
      // se a tabela ainda não existir (Fase 22c.1 não rodada), respeita só o flag do front
    }

    // 2b) Liberar caução (só se NÃO houver avaria pendente)
    const { data: caucao } = await admin.from("payments")
      .select("id, stripe_payment_intent_id, amount")
      .eq("booking_id", bookingId)
      .eq("kind", "caucao")
      .eq("status", "autorizado")
      .maybeSingle();
    let caucaoAmount = 0;
    if (caucao && caucao.stripe_payment_intent_id) {
      if (hasPendingDamages) {
        // Mantém a caução autorizada — a Proteção captura parcial via
        // damage-capture quando decidir. Só captura o customer.id pra
        // poder mandar e-mail explicando que a caução fica retida.
        try {
          const pi = await stripe.paymentIntents.retrieve(caucao.stripe_payment_intent_id);
          if (!stripeCustomerId) {
            const pcust = pi.customer;
            stripeCustomerId = typeof pcust === "string" ? pcust : (pcust?.id ?? null);
          }
          caucaoAmount = Number(caucao.amount) || 0;
          actions.caucao_held = true;
        } catch (e) {
          actions.errors.push("caucao_retrieve: " + (e as Error)?.message);
        }
      } else {
        try {
          const pi = await stripe.paymentIntents.cancel(caucao.stripe_payment_intent_id);
          if (!stripeCustomerId) {
            const pcust = pi.customer;
            stripeCustomerId = typeof pcust === "string" ? pcust : (pcust?.id ?? null);
          }
          await admin.from("payments")
            .update({ status: "liberado" })
            .eq("id", caucao.id);
          caucaoAmount = Number(caucao.amount) || 0;
          actions.caucao_released = true;
        } catch (e) {
          actions.errors.push("caucao: " + (e as Error)?.message);
        }
      }
    }

    // Se ainda não temos customer.id, tenta achar em qualquer pagamento
    // já registrado da reserva (mensalidade, caução liberada, etc.)
    if (!stripeCustomerId) {
      try {
        const { data: anyPay } = await admin.from("payments")
          .select("stripe_payment_intent_id")
          .eq("booking_id", bookingId)
          .not("stripe_payment_intent_id", "is", null)
          .limit(1).maybeSingle();
        if (anyPay?.stripe_payment_intent_id) {
          const pi = await stripe.paymentIntents.retrieve(anyPay.stripe_payment_intent_id);
          const pcust = pi.customer;
          stripeCustomerId = typeof pcust === "string" ? pcust : (pcust?.id ?? null);
        }
      } catch (e) {
        console.error("close-rental: fallback customer lookup falhou:", (e as Error)?.message);
      }
    }

    // 3) Enviar e-mail "Locação encerrada"
    let cliEmail = "";
    if (stripeCustomerId) {
      try {
        const cust = await stripe.customers.retrieve(stripeCustomerId);
        if (!(cust as any).deleted) {
          cliEmail = (cust as Stripe.Customer).email ?? "";
        }
      } catch (e) {
        console.error("close-rental: stripe.customers.retrieve falhou:", (e as Error)?.message);
      }
    }
    // Fallback: tenta auth.admin (pode falhar — mas deixamos como último recurso)
    if (!cliEmail) {
      try {
        const { data: u } = await admin.auth.admin.getUserById(booking.client_id);
        cliEmail = u?.user?.email ?? "";
      } catch { /* ignora */ }
    }
    if (cliEmail) {
      const v: any = (booking as any).vehicles;
      let veh = "Reserva Nomade Drive";
      if (v) {
        veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
        if (v.year_model) veh += " (" + v.year_model + ")";
      }
      // Fase 22c.2: escolhe o template conforme houve avaria ou não
      const tpl = hasPendingDamages
        ? emailLocacaoEncerradaAvaria({
            valor: fmtBRL(caucaoAmount),
            veiculo: veh,
          })
        : emailLocacaoEncerrada({
            valor: fmtBRL(caucaoAmount),
            veiculo: veh,
            caucaoLiberada: actions.caucao_released,
          });
      console.log("close-rental: enviando e-mail (" +
        (hasPendingDamages ? "avaria em análise" : "locação encerrada") + ") para", cliEmail);
      const r = await sendEmail(cliEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo);
      if (r.ok) {
        actions.email_sent = true;
        console.log("close-rental: Resend OK id=", r.id);
      } else {
        actions.errors.push("email: " + (r.error ?? ""));
        console.error("close-rental: Resend falhou:", r.error);
      }
    } else {
      actions.errors.push("email: cliente sem e-mail conhecido (customer Stripe vazio e auth.admin falhou)");
      console.error("close-rental: e-mail do cliente não obtido");
    }

    // Fase 30 / C6: consulta multas Infosimples automaticamente
    // (não bloqueia o fluxo se Infosimples falhar)
    try {
      const { data: vehInfo } = await admin.from("bookings")
        .select("vehicle_id, vehicles(license_plate, renavam)")
        .eq("id", bookingId).maybeSingle();
      const v: any = vehInfo?.vehicles;
      if (v?.license_plate && v?.renavam) {
        // Invoca via fetch interno (não dá pra invoke direto sem helper)
        const supaUrl = Deno.env.get("SUPABASE_URL")!;
        const authHeader = req.headers.get("Authorization") ?? "";
        const consultaResp = await fetch(`${supaUrl}/functions/v1/consulta-multas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader,
          },
          body: JSON.stringify({ vehicle_id: vehInfo.vehicle_id, booking_id: bookingId }),
        });
        if (consultaResp.ok) {
          const cd = await consultaResp.json();
          (actions as any).multas_consultadas = cd.inserted || 0;
          console.log(`close-rental: ${cd.inserted || 0} multas registradas via Infosimples.`);
        } else {
          console.warn("close-rental: consulta-multas falhou:", consultaResp.status);
        }
      }
    } catch (e) {
      console.warn("close-rental: consulta-multas erro (não bloqueia):", (e as Error)?.message);
    }

    return json({ ok: true, actions, email_to: cliEmail || null });
  } catch (e) {
    actions.errors.push("geral: " + ((e as Error)?.message ?? String(e)));
    return json({ ok: false, actions, error: (e as Error)?.message }, 500);
  }
});
