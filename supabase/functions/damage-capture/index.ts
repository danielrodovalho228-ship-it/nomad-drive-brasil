// ====================================================================
// Nomade Drive Brasil — Edge Function: damage-capture (Fase 22c.4)
// --------------------------------------------------------------------
// Captura PARCIAL da caução autorizada no Stripe a partir de uma
// decisão de avaria registrada pela Proteção.
//
// Fluxo:
//   1. Recebe damage_id no body
//   2. Valida que o caller é Proteção ou super-admin
//   3. Lê o damage + booking + payment (caução autorizada)
//   4. stripe.paymentIntents.capture({ amount_to_capture: final_amount })
//      → cobra só o valor da avaria, libera o restante automaticamente
//   5. Marca damage.status = 'resolvido', captured_payment_intent_id,
//      captured_at
//   6. Marca payment (caução): se foi captura total, vira 'pago';
//      se foi parcial, vira 'liberado_parcial' (status novo).
//      Como a Stripe libera o restante sozinha, a caução não fica
//      "pendurada" no cartão do cliente.
//   7. Envia e-mail "Avaria — decisão da Proteção" pro cliente,
//      com link pro painel pra ele contestar em 5 dias úteis.
//
// É chamada pelo dashboard-protecao.html após o UPDATE em damages.
//
// SECRETS: STRIPE_SECRET_KEY, RESEND_API_KEY (opcional), EMAIL_FROM (opcional)
// Verify JWT: LIGADO. Quem pode chamar:
//   - Proteção aprovada (verifica via consulta a profiles)
//   - Super-admin (dtrodovalho40@gmail.com)
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

// ----- helpers de e-mail (mesmo padrão das outras funções) -----
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
  const reply_to = replyTo || "suporte@nomadedrive.com.br";
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

function emailAvariaDecisao(d: {
  veiculo: string;
  tipoAvaria: string;
  descricao: string;
  valor: string;
  parecer: string;
}) {
  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>Avaria — decisão da Proteção</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">'
    + '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">Decisão da Proteção sobre a avaria. Valor capturado da caução.</div>'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    + '<tr><td style="background:linear-gradient(135deg,#a8580e 0%,#cf7a1c 55%,#e89c3f 100%);padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle"><img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>'
    + '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">Decisão da Proteção</td>'
    + '</tr></table></td></tr>'
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;">Decisão sobre a avaria reportada</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">A equipe de Proteção avaliou a avaria reportada no check-out do veículo e decidiu pela <strong>captura parcial da caução</strong> no valor de <strong>R$ ' + d.valor + '</strong>. O restante da caução foi liberado e voltará ao seu cartão em até 5 dias úteis.</p>'
    + '<table cellpadding="8" cellspacing="0" style="background:#fff5e8;border-radius:10px;margin:14px 0 18px;width:100%;">'
    + '<tr><td style="font-weight:600;color:#5b6b63;width:140px;">Veículo</td><td style="color:#14201b;">' + escapeHtml(d.veiculo) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Tipo de avaria</td><td style="color:#14201b;">' + escapeHtml(d.tipoAvaria) + '</td></tr>'
    + '<tr><td style="font-weight:600;color:#5b6b63;">Valor capturado</td><td style="color:#14201b;"><strong>R$ ' + d.valor + '</strong></td></tr>'
    + '</table>'
    + (d.descricao
      ? '<p style="margin:14px 0 4px;font-weight:600;color:#5b6b63;font-size:13px;">Descrição do proprietário:</p>'
        + '<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#3a4945;background:#f9fafb;padding:10px 12px;border-radius:8px;border-left:3px solid #cf7a1c;">' + escapeHtml(d.descricao) + '</p>'
      : '')
    + (d.parecer
      ? '<p style="margin:14px 0 4px;font-weight:600;color:#5b6b63;font-size:13px;">Parecer da Proteção:</p>'
        + '<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#3a4945;background:#f9fafb;padding:10px 12px;border-radius:8px;border-left:3px solid #145f3e;">' + escapeHtml(d.parecer) + '</p>'
      : '')
    + '<div style="background:#fff8e1;border-left:4px solid #f0b400;padding:12px 16px;border-radius:6px;margin:18px 0;">'
    + '<strong style="color:#7a5800;font-size:14px;">⏱ Prazo de contestação: 5 dias úteis</strong>'
    + '<p style="margin:6px 0 0;font-size:13.5px;color:#5b4400;line-height:1.55;">Se você não concorda com a decisão, abra a contestação pelo seu painel. A equipe fará uma 2ª análise.</p>'
    + '</div>'
    + '<p style="margin:24px 0 0;"><a href="' + SITE + '/dashboard-cliente.html#protecao" style="display:inline-block;background:#a8580e;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">Ver e contestar no meu painel</a></p>'
    + '</td></tr>'
    + '<tr><td style="background:#fff5e8;padding:18px 28px;border-top:1px solid #f0d9b8;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#a8580e;text-decoration:none;">nomadedrive.com.br</a> · Para tirar dúvidas, responda a este e-mail.<br>'
    + '<span style="color:#8a9591;">Cobranças seguem o contrato vigente e a política de avarias.</span>'
    + '</td></tr></table></td></tr></table></body></html>';
  const text =
    "Avaria — decisão da Proteção — Nomade Drive Brasil\n\n"
    + "Decisão: captura parcial da caução de R$ " + d.valor + ".\n"
    + "O restante da caução foi liberado e volta ao seu cartão em\n"
    + "até 5 dias úteis.\n\n"
    + "Veículo: " + d.veiculo + "\n"
    + "Tipo: " + d.tipoAvaria + "\n"
    + (d.descricao ? "\nDescrição do proprietário:\n" + d.descricao + "\n" : "")
    + (d.parecer ? "\nParecer da Proteção:\n" + d.parecer + "\n" : "")
    + "\nPrazo de contestação: 5 dias úteis\n"
    + "Acesse seu painel para contestar: " + SITE + "/dashboard-cliente.html#protecao";
  return {
    subject: "Avaria — decisão da Proteção (captura R$ " + d.valor + ")",
    html, text,
    replyTo: "suporte@nomadedrive.com.br",
  };
}

// helper: tira o e-mail do Customer da Stripe
async function getClientEmailFromStripe(
  stripe: Stripe, customerId: string | null
): Promise<string> {
  if (!customerId) return "";
  try {
    const cust = await stripe.customers.retrieve(customerId);
    if ((cust as any).deleted) return "";
    return (cust as Stripe.Customer).email ?? "";
  } catch (e) {
    console.error("getClientEmailFromStripe falhou:", (e as Error)?.message);
    return "";
  }
}

// ============================ HANDLER ===============================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const actions = {
    captured: false,
    amount: 0,
    payment_updated: false,
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

    // Autorização: Proteção aprovada OU super-admin
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin) {
      const { data: prof } = await admin.from("profiles")
        .select("main_role, verification_status")
        .eq("id", user.id).maybeSingle();
      const isProtection = prof?.main_role === "protection_partner"
        && prof?.verification_status === "aprovado";
      if (!isProtection) {
        return json({ error: "Apenas Proteção aprovada ou admin pode capturar avaria." }, 403);
      }
    }

    const payload = await req.json().catch(() => ({}));
    const damageId: string | undefined = payload.damage_id;
    if (!damageId) return json({ error: "damage_id ausente." }, 400);

    // 1) Lê o damage + booking + dados pro e-mail
    const { data: dmg } = await admin.from("damages")
      .select("*, bookings(id, client_id, vehicles(make,model,year_model))")
      .eq("id", damageId).maybeSingle();
    if (!dmg) return json({ error: "Avaria não encontrada." }, 404);

    if (dmg.status === "resolvido" && dmg.captured_payment_intent_id) {
      // idempotência: se já foi capturada, retorna OK sem refazer
      actions.captured = true;
      actions.amount = Number(dmg.final_amount) || 0;
      return json({ ok: true, actions, already_captured: true });
    }

    const finalAmount = Number(dmg.final_amount) || 0;
    if (finalAmount <= 0) {
      return json({ error: "final_amount inválido — Proteção precisa salvar valor > 0 antes de capturar." }, 400);
    }

    // 2) Lê o tipo de avaria pro label do e-mail
    const { data: rule } = await admin.from("damage_rules")
      .select("label").eq("code", dmg.rule_code).maybeSingle();
    const tipoAvaria = rule?.label || dmg.rule_code;

    // 3) Lê a caução autorizada da reserva
    const { data: caucao } = await admin.from("payments")
      .select("id, stripe_payment_intent_id, amount, status")
      .eq("booking_id", dmg.booking_id)
      .eq("kind", "caucao")
      .in("status", ["autorizado"])
      .maybeSingle();
    if (!caucao || !caucao.stripe_payment_intent_id) {
      return json({ error: "Caução autorizada não encontrada para esta reserva." }, 404);
    }

    const caucaoAmount = Number(caucao.amount) || 0;
    if (finalAmount > caucaoAmount) {
      return json({
        error: "Valor da avaria (R$ " + finalAmount + ") maior que caução autorizada (R$ " + caucaoAmount + "). Cobrança separada não é suportada nesta versão."
      }, 400);
    }

    // 4) Captura parcial no Stripe — amount em centavos
    let stripeCustomerId: string | null = null;
    try {
      const captured = await stripe.paymentIntents.capture(
        caucao.stripe_payment_intent_id,
        { amount_to_capture: Math.round(finalAmount * 100) }
      );
      const cust = captured.customer;
      stripeCustomerId = typeof cust === "string" ? cust : (cust?.id ?? null);
      actions.captured = true;
      actions.amount = finalAmount;
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      console.error("damage-capture: stripe capture falhou:", msg);
      return json({ error: "Falha na captura Stripe: " + msg }, 500);
    }

    // 5) Atualiza damage como resolvido
    await admin.from("damages").update({
      status: "resolvido",
      captured_payment_intent_id: caucao.stripe_payment_intent_id,
      captured_at: new Date().toISOString(),
      reviewed_by: user.id
    }).eq("id", damageId);

    // 6) Atualiza payment da caução — vira 'pago' (cobrança real do
    //    valor capturado). O excedente foi liberado automaticamente
    //    pelo Stripe ao fazer captura parcial.
    await admin.from("payments").update({
      status: "pago",
      amount: finalAmount   // ajusta pro valor realmente cobrado
    }).eq("id", caucao.id);
    actions.payment_updated = true;

    // 7) E-mail pro cliente
    let cliEmail = await getClientEmailFromStripe(stripe, stripeCustomerId);
    // Fallback robusto: se o Stripe Customer não devolveu e-mail (ou não
    // havia customer), busca direto em profiles via service role usando o
    // client_id da reserva. Evita que a "Decisão da Proteção" (#12) deixe
    // de sair só porque o PaymentIntent da caução não tinha customer/email.
    if (!cliEmail) {
      const cid = (dmg as any).bookings?.client_id;
      if (cid) {
        try {
          const { data: prof } = await admin.from("profiles")
            .select("email").eq("id", cid).maybeSingle();
          if (prof?.email) cliEmail = prof.email as string;
        } catch (e) {
          console.error("damage-capture: fallback profiles email falhou:", (e as Error)?.message);
        }
      }
    }
    if (cliEmail) {
      const v: any = (dmg as any).bookings?.vehicles;
      let veh = "Reserva Nomade Drive";
      if (v) {
        veh = [v.make, v.model].filter(Boolean).join(" ") || veh;
        if (v.year_model) veh += " (" + v.year_model + ")";
      }
      const tpl = emailAvariaDecisao({
        veiculo: veh,
        tipoAvaria,
        descricao: dmg.description || "",
        valor: fmtBRL(finalAmount),
        parecer: dmg.review_notes || ""
      });
      console.log("damage-capture: enviando e-mail para", cliEmail);
      const r = await sendEmail(cliEmail, tpl.subject, tpl.html, tpl.text, tpl.replyTo);
      if (r.ok) {
        actions.email_sent = true;
        console.log("damage-capture: Resend OK id=", r.id);
      } else {
        actions.errors.push("email: " + (r.error ?? ""));
        console.error("damage-capture: Resend falhou:", r.error);
      }
    } else {
      actions.errors.push("email: cliente sem e-mail conhecido (customer Stripe vazio)");
    }

    return json({ ok: true, actions, email_to: cliEmail || null });
  } catch (e) {
    actions.errors.push("geral: " + ((e as Error)?.message ?? String(e)));
    return json({ ok: false, actions, error: (e as Error)?.message }, 500);
  }
});
