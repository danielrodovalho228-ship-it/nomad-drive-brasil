// ====================================================================
// Nomade Drive Brasil — biblioteca compartilhada de e-mail
// --------------------------------------------------------------------
// Provê:
//   - sendEmail(to, subject, html, text)  -> envio via Resend
//   - baseTemplate(opts)                  -> layout HTML branded
//   - templates específicos (mensalidade, caução, KYC, etc.)
//
// Importada por stripe-webhook e stripe-checkout (via deploy do _shared).
// Sem chave Resend ou erro de envio, falha SILENCIOSAMENTE — não
// derruba o fluxo principal de pagamento.
// ====================================================================

const SITE = "https://nomadedrive.com.br";
const LOGO_URL = SITE + "/images/logo-nomade-drive.jpg";

// Variáveis de ambiente acessadas só dentro das funções (lazy)
function env(name: string): string | undefined {
  try { return Deno.env.get(name) ?? undefined; } catch { return undefined; }
}

// --------------------------------------------------------------------
// Envio via Resend (silencioso em falha)
// --------------------------------------------------------------------
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY ausente" };
  if (!to) return { ok: false, error: "destinatário vazio" };
  const from = env("EMAIL_FROM") ||
    "Nomade Drive Brasil <onboarding@resend.dev>";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Resend respondeu", resp.status, detail);
      return { ok: false, error: "Resend " + resp.status + ": " + detail.slice(0, 200) };
    }
    const body = await resp.json();
    return { ok: true, id: body?.id ?? undefined };
  } catch (e) {
    console.error("sendEmail exceção:", (e as Error)?.message);
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}

// --------------------------------------------------------------------
// Layout base — header com logo + nome, corpo + CTA + rodapé
// --------------------------------------------------------------------
export interface BaseOpts {
  preheader: string;          // texto oculto de pré-visualização
  badge: string;              // texto pequeno acima do título (eyebrow)
  title: string;              // título do e-mail
  intro: string;              // parágrafo de abertura
  rows?: Array<[string, string]>; // tabela de dados (chave, valor)
  body?: string;              // HTML extra após a tabela
  ctaLabel: string;           // texto do botão
  ctaUrl: string;             // URL do botão
  gradient?: string;          // CSS background gradient do header
}

export function baseTemplate(opts: BaseOpts): string {
  const gradient = opts.gradient ||
    "linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%)";
  const rowsHtml = (opts.rows || []).map(([k, v]) =>
    '<tr><td style="padding:8px 12px;font-weight:600;color:#5b6b63;width:120px;border-bottom:1px solid #e3e9e5;">' + k + '</td>' +
    '<td style="padding:8px 12px;color:#14201b;border-bottom:1px solid #e3e9e5;">' + v + '</td></tr>'
  ).join("");
  const tableHtml = rowsHtml
    ? '<table cellpadding="0" cellspacing="0" style="background:#f4f7f5;border-radius:10px;margin:14px 0 18px;width:100%;border-collapse:separate;">' + rowsHtml + '</table>'
    : '';

  return ''
    + '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>' + escapeHtml(opts.title) + '</title>'
    + '</head>'
    + '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;-webkit-font-smoothing:antialiased;">'
    // preheader oculto (preview no cliente de e-mail)
    + '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">' + escapeHtml(opts.preheader) + '</div>'
    + '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">'
    + '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">'
    // header
    + '<tr><td style="background:' + gradient + ';padding:24px 28px;">'
    + '<table cellpadding="0" cellspacing="0" width="100%"><tr>'
    + '<td valign="middle" style="vertical-align:middle;">'
    + '<img src="' + LOGO_URL + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;outline:none;text-decoration:none;background:#fff;border-radius:6px;padding:4px 8px;">'
    + '</td>'
    + '<td align="right" valign="middle" style="vertical-align:middle;color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">'
    + escapeHtml(opts.badge)
    + '</td></tr></table>'
    + '</td></tr>'
    // body
    + '<tr><td style="padding:30px 28px 24px;">'
    + '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;line-height:1.25;">' + escapeHtml(opts.title) + '</h1>'
    + '<p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a4945;">' + opts.intro + '</p>'
    + tableHtml
    + (opts.body || '')
    + '<p style="margin:24px 0 0;">'
    + '<a href="' + opts.ctaUrl + '" style="display:inline-block;background:#1a7a4f;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">' + escapeHtml(opts.ctaLabel) + '</a>'
    + '</p>'
    + '</td></tr>'
    // footer
    + '<tr><td style="background:#f4f7f5;padding:18px 28px;border-top:1px solid #e3e9e5;font-size:12px;color:#5b6b63;line-height:1.55;">'
    + '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>'
    + '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">' + SITE.replace("https://", "") + '</a> · '
    + 'Mensagem automática — não responda a este e-mail.<br>'
    + '<span style="color:#8a9591;">Valores, disponibilidade e condições são confirmados individualmente por contrato.</span>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fmtBRL(amount: number | null | undefined, isCents = false): string {
  const v = amount == null ? 0 : (isCents ? amount / 100 : amount);
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

// --------------------------------------------------------------------
// Templates específicos
// --------------------------------------------------------------------

export interface PagamentoData {
  valor: string;     // já formatado em BRL (ex.: "2.550,00")
  veiculo: string;   // ex.: "Chevrolet Onix (2022)"
}

export function emailMensalidade(d: PagamentoData) {
  const html = baseTemplate({
    preheader: "Recebemos R$ " + d.valor + " da sua mensalidade. Tudo confirmado.",
    badge: "Pagamento confirmado",
    title: "Mensalidade confirmada",
    intro: "Recebemos o pagamento da sua mensalidade. Está tudo certo — você pode acompanhar todos os detalhes da sua locação no seu painel.",
    rows: [
      ["Valor", "R$ " + d.valor],
      ["Reserva", d.veiculo],
    ],
    ctaLabel: "Acessar meu painel",
    ctaUrl: SITE + "/dashboard-cliente.html",
  });
  const text = [
    "Mensalidade confirmada — Nomade Drive Brasil",
    "",
    "Recebemos o pagamento da sua mensalidade.",
    "",
    "Valor:   R$ " + d.valor,
    "Reserva: " + d.veiculo,
    "",
    "Acesse seu painel: " + SITE + "/dashboard-cliente.html",
    "",
    "Mensagem automática — Nomade Drive Brasil, Uberlândia/MG.",
  ].join("\n");
  return {
    subject: "Mensalidade confirmada — Nomade Drive Brasil",
    html, text,
  };
}

export function emailCaucao(d: PagamentoData) {
  const html = baseTemplate({
    preheader: "Caução R$ " + d.valor + " autorizada — valor reservado no cartão, sem cobrança imediata.",
    badge: "Caução autorizada",
    title: "Caução autorizada",
    intro: "A caução da sua locação foi <strong>autorizada</strong> no seu cartão — o valor fica reservado, sem cobrança imediata. Só é capturado em caso de dano, multa ou outro custo previsto em contrato.",
    rows: [
      ["Caução", "R$ " + d.valor],
      ["Reserva", d.veiculo],
      ["Cobrança", "Apenas em caso de dano/multa"],
    ],
    ctaLabel: "Acessar meu painel",
    ctaUrl: SITE + "/dashboard-cliente.html",
    gradient: "linear-gradient(135deg,#0d4a2f 0%,#1f7050 55%,#4ba37e 100%)",
  });
  const text = [
    "Caução autorizada — Nomade Drive Brasil",
    "",
    "A caução da sua locação foi AUTORIZADA no seu cartão.",
    "O valor fica reservado, sem cobrança imediata — só é capturado",
    "em caso de dano, multa ou outro custo previsto em contrato.",
    "",
    "Caução:  R$ " + d.valor,
    "Reserva: " + d.veiculo,
    "",
    "Acesse seu painel: " + SITE + "/dashboard-cliente.html",
  ].join("\n");
  return {
    subject: "Caução autorizada — Nomade Drive Brasil",
    html, text,
  };
}
