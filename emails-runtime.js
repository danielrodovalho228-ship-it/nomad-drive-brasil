/* ====================================================================
   Nomade Drive Brasil — Biblioteca de templates de e-mail (runtime)
   --------------------------------------------------------------------
   Templates de e-mail renderizados no browser e enviados via Edge
   Function `send-email`. Os templates seguem o mesmo padrão visual
   das Edge Functions (header gradiente verde, tabela de dados,
   CTA, rodapé padronizado).

   Uso:
     // dispara notificação para um usuário (lê email do profile)
     ndEmails.notify(supabaseClient, userId, "kyc_approved", { full_name: "João" })
       .then(function (r) { console.log(r.ok ? "enviado" : r.error); });

   Templates disponíveis nesta fase:
     - kyc_approved          (cliente: documentos aprovados)
     - kyc_rejected          (cliente: documentos com problema + motivo)
     - profile_approved      (qualquer papel: perfil liberado)
     - profile_rejected      (qualquer papel: perfil recusado + motivo)
     - booking_confirmed_client (cliente: reserva confirmada)
     - booking_confirmed_owner  (proprietário: reserva confirmada)
     - referral_commission_paid (parceiro: R$ 200 liberados)

   Reply-to por categoria:
     - identidade/perfil → contato@nomadedrive.com.br
     - reservas/pagamentos → pagamentos@nomadedrive.com.br
   ==================================================================== */
(function () {
  "use strict";

  var SITE = "https://nomadedrive.com.br";
  var LOGO = SITE + "/images/logo-nomade-drive.jpg";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function brl(v) {
    var n = Number(v) || 0;
    return "R$ " + n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function fmtDate(d) {
    if (!d) return "—";
    var p = String(d).slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(d);
  }

  /* ============================================================
   * Template base — recebe { title, badge, gradient, sections,
   *   ctaText, ctaUrl, body, footerNote } e devolve HTML completo.
   * ============================================================ */
  function baseTemplate(opts) {
    var gradient = opts.gradient || "linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%)";
    var ctaBg = opts.ctaBg || "#1a7a4f";
    var badge = opts.badge || "Atualização";
    var rows = (opts.sections || []).map(function (s) {
      return '<tr><td style="font-weight:600;color:#5b6b63;width:160px;">' +
        escapeHtml(s[0]) + '</td><td style="color:#14201b;">' + s[1] + '</td></tr>';
    }).join("");
    var sectionsHtml = rows
      ? '<table cellpadding="8" cellspacing="0" style="background:#f4f7f5;border-radius:10px;margin:14px 0 18px;width:100%;">' + rows + '</table>'
      : '';
    var bodyHtml = (opts.body || []).map(function (p) {
      return '<p style="margin:0 0 12px;font-size:14.5px;line-height:1.6;color:#3a4945;">' + p + '</p>';
    }).join("");
    var ctaHtml = opts.ctaText && opts.ctaUrl
      ? '<p style="margin:24px 0 0;"><a href="' + opts.ctaUrl +
        '" style="display:inline-block;background:' + ctaBg +
        ';color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14.5px;">' +
        escapeHtml(opts.ctaText) + '</a></p>'
      : '';
    var footerNote = opts.footerNote ||
      "Para tirar dúvidas, responda a este e-mail.";

    return (
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
      '<title>' + escapeHtml(opts.title || "Nomade Drive Brasil") + '</title></head>' +
      '<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14201b;">' +
      (opts.preheader ? '<div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;">' + escapeHtml(opts.preheader) + '</div>' : '') +
      '<table cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;background:#f4f5f7;"><tr><td align="center">' +
      '<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px -12px rgba(20,40,30,.15);">' +
      '<tr><td style="background:' + gradient + ';padding:24px 28px;">' +
      '<table cellpadding="0" cellspacing="0" width="100%"><tr>' +
      '<td valign="middle"><img src="' + LOGO + '" alt="Nomade Drive Brasil" width="120" style="display:block;height:auto;border:0;background:#fff;border-radius:6px;padding:4px 8px;"></td>' +
      '<td align="right" valign="middle" style="color:#fff;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.92;">' + escapeHtml(badge) + '</td>' +
      '</tr></table></td></tr>' +
      '<tr><td style="padding:30px 28px 24px;">' +
      '<h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#14201b;">' + escapeHtml(opts.title) + '</h1>' +
      bodyHtml + sectionsHtml + ctaHtml +
      '</td></tr>' +
      '<tr><td style="background:#f4f7f5;padding:18px 28px;border-top:1px solid #e3e9e5;font-size:12px;color:#5b6b63;line-height:1.55;">' +
      '<strong style="color:#14201b;">Nomade Drive Brasil</strong> · Uberlândia/MG<br>' +
      '<a href="' + SITE + '" style="color:#145f3e;text-decoration:none;">nomadedrive.com.br</a> · ' + escapeHtml(footerNote) + '<br>' +
      '<span style="color:#8a9591;">Disponibilidade, proteção, caução e preço final são confirmados individualmente por contrato.</span>' +
      '</td></tr></table></td></tr></table></body></html>'
    );
  }

  /* ============================================================
   * Templates
   * ============================================================ */
  var templates = {
    kyc_approved: function (p) {
      return {
        replyTo: "contato@nomadedrive.com.br",
        subject: "Seus documentos foram aprovados — Nomade Drive Brasil",
        html: baseTemplate({
          badge: "Identidade verificada",
          title: "Seus documentos foram aprovados",
          preheader: "Tudo pronto para você reservar um veículo na Nomade Drive.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ", boas notícias!",
            "A equipe Nomade Drive analisou seus documentos e <strong>aprovou</strong> sua verificação de identidade. Você já pode criar uma nova solicitação de locação a qualquer momento."
          ],
          ctaText: "Criar solicitação de locação",
          ctaUrl: SITE + "/dashboard-cliente.html#solicitacoes"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Sua verificação de identidade foi APROVADA.\n" +
          "Você já pode criar uma nova solicitação de locação.\n\n" +
          "Acesse: " + SITE + "/dashboard-cliente.html#solicitacoes"
      };
    },

    kyc_rejected: function (p) {
      var motivo = p.reason || "Documentos precisam de ajustes.";
      return {
        replyTo: "contato@nomadedrive.com.br",
        subject: "Documentos precisam de ajustes — Nomade Drive Brasil",
        html: baseTemplate({
          gradient: "linear-gradient(135deg,#a8580e 0%,#cf7a1c 55%,#e89c3f 100%)",
          ctaBg: "#a8580e",
          badge: "Ação necessária",
          title: "Seus documentos precisam de ajustes",
          preheader: "Reenvie pelo painel para liberar suas reservas.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "Analisamos seus documentos e identificamos que algum item precisa de ajuste antes de aprovarmos sua verificação.",
            "<strong>Motivo:</strong> " + escapeHtml(motivo)
          ],
          ctaText: "Reenviar pelo painel",
          ctaUrl: SITE + "/dashboard-cliente.html#documentos",
          footerNote: "Em caso de dúvida sobre o ajuste, responda a este e-mail."
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Seus documentos precisam de ajustes.\n" +
          "Motivo: " + motivo + "\n\n" +
          "Reenvie em: " + SITE + "/dashboard-cliente.html#documentos"
      };
    },

    profile_approved: function (p) {
      var roleLabel = p.role_label || "perfil";
      var dashUrl = SITE + "/" + (p.dashboard_path || "dashboard-cliente.html");
      return {
        replyTo: "contato@nomadedrive.com.br",
        subject: "Seu cadastro foi aprovado — Nomade Drive Brasil",
        html: baseTemplate({
          badge: "Cadastro aprovado",
          title: "Bem-vindo(a) à Nomade Drive!",
          preheader: "Seu cadastro está liberado para usar a plataforma.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ", boas notícias!",
            "Seu cadastro como <strong>" + escapeHtml(roleLabel) + "</strong> foi <strong>aprovado</strong> pela equipe Nomade Drive. Você já pode acessar seu painel completo.",
            (p.notes ? "<strong>Observação da equipe:</strong> " + escapeHtml(p.notes) : "")
          ].filter(Boolean),
          ctaText: "Acessar meu painel",
          ctaUrl: dashUrl
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Seu cadastro como " + roleLabel + " foi APROVADO.\n" +
          (p.notes ? "Observação: " + p.notes + "\n\n" : "\n") +
          "Acesse: " + dashUrl
      };
    },

    profile_rejected: function (p) {
      var motivo = p.reason || "Cadastro recusado pela equipe.";
      return {
        replyTo: "contato@nomadedrive.com.br",
        subject: "Sobre seu cadastro na Nomade Drive Brasil",
        html: baseTemplate({
          gradient: "linear-gradient(135deg,#a8580e 0%,#cf7a1c 55%,#e89c3f 100%)",
          ctaBg: "#a8580e",
          badge: "Cadastro recusado",
          title: "Sobre seu cadastro",
          preheader: "Há um motivo registrado para a recusa do cadastro.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "Analisamos seu cadastro e não foi possível aprová-lo no momento.",
            "<strong>Motivo:</strong> " + escapeHtml(motivo),
            "Se você acredita que houve um engano ou quer entender melhor os requisitos, responda a este e-mail."
          ],
          footerNote: "Resposta direta neste e-mail vai pro nosso time de contato."
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Não foi possível aprovar seu cadastro no momento.\n" +
          "Motivo: " + motivo + "\n\n" +
          "Para entender melhor, responda este e-mail."
      };
    },

    booking_confirmed_client: function (p) {
      return {
        replyTo: "pagamentos@nomadedrive.com.br",
        subject: "Reserva confirmada — " + (p.veiculo || "Nomade Drive Brasil"),
        html: baseTemplate({
          badge: "Reserva confirmada",
          title: "Sua reserva está confirmada!",
          preheader: "Próximo passo: pagar a mensalidade e autorizar a caução.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ", recebemos sua reserva!",
            "A equipe Nomade Drive confirmou sua locação. Próximo passo é fazer o pagamento da primeira mensalidade e autorizar a caução pela tela hospedada da Stripe."
          ],
          sections: [
            ["Veículo", escapeHtml(p.veiculo || "—")],
            ["Período", escapeHtml(fmtDate(p.start_date) + " até " + fmtDate(p.end_date))],
            ["Mensalidade", brl(p.monthly_price)],
            ["Caução", brl(p.deposit_amount) + " <em>(pré-autorização, não cobrança)</em>"]
          ],
          ctaText: "Ir para pagamento",
          ctaUrl: SITE + "/reserva-detalhe.html?id=" + (p.booking_id || "")
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Sua reserva foi confirmada!\n" +
          "Veículo: " + (p.veiculo || "—") + "\n" +
          "Período: " + fmtDate(p.start_date) + " até " + fmtDate(p.end_date) + "\n" +
          "Mensalidade: " + brl(p.monthly_price) + "\n" +
          "Caução: " + brl(p.deposit_amount) + " (pré-autorização)\n\n" +
          "Pagar agora: " + SITE + "/reserva-detalhe.html?id=" + (p.booking_id || "")
      };
    },

    booking_confirmed_owner: function (p) {
      return {
        replyTo: "pagamentos@nomadedrive.com.br",
        subject: "Seu veículo foi reservado — " + (p.veiculo || "Nomade Drive Brasil"),
        html: baseTemplate({
          badge: "Locação confirmada",
          title: "Seu veículo tem uma locação confirmada",
          preheader: "A equipe Nomade Drive confirmou uma reserva no seu veículo.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "Boa notícia: <strong>seu veículo " + escapeHtml(p.veiculo || "") + " foi reservado</strong>. A locação inicia assim que o cliente concluir o pagamento da primeira mensalidade."
          ],
          sections: [
            ["Veículo", escapeHtml(p.veiculo || "—")],
            ["Período", escapeHtml(fmtDate(p.start_date) + " até " + fmtDate(p.end_date))],
            ["Mensalidade bruta", brl(p.monthly_price)],
            ["Repasse estimado (90%)", brl(p.owner_amount)]
          ],
          ctaText: "Acompanhar no painel",
          ctaUrl: SITE + "/dashboard-proprietario.html#locacao"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Seu veículo " + (p.veiculo || "") + " foi reservado.\n\n" +
          "Período: " + fmtDate(p.start_date) + " até " + fmtDate(p.end_date) + "\n" +
          "Mensalidade bruta: " + brl(p.monthly_price) + "\n" +
          "Repasse estimado (90%): " + brl(p.owner_amount) + "\n\n" +
          "Acompanhe: " + SITE + "/dashboard-proprietario.html#locacao"
      };
    },

    referral_commission_paid: function (p) {
      return {
        replyTo: "pagamentos@nomadedrive.com.br",
        subject: "Comissão de indicação liberada — Nomade Drive Brasil",
        html: baseTemplate({
          badge: "Comissão paga",
          title: "Sua comissão foi liberada!",
          preheader: "R$ 200 referentes à indicação convertida.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "Sua indicação <strong>" + escapeHtml(p.referred_name || "") + "</strong> foi convertida em locação ativa. A comissão fixa de R$ 200 já está disponível na sua conta de recebimento Stripe."
          ],
          sections: [
            ["Indicado", escapeHtml(p.referred_name || "—")],
            ["Valor", brl(p.commission_amount || 200)],
            ["Forma", "Repasse Stripe na conta cadastrada"]
          ],
          ctaText: "Ver no painel",
          ctaUrl: SITE + "/dashboard-parceiro.html#comissoes"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Comissão de R$ " + (p.commission_amount || 200) +
          " liberada pela indicação " + (p.referred_name || "—") + ".\n\n" +
          "Painel: " + SITE + "/dashboard-parceiro.html#comissoes"
      };
    },

    /* ----- Parte 2: check-in/out + ocorrências ----- */

    inspection_requested_owner: function (p) {
      var kindLabel = p.kind === "checkout" ? "Check-out" : "Check-in";
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: kindLabel + " solicitado — " + (p.veiculo || "Nomade Drive Brasil"),
        html: baseTemplate({
          badge: kindLabel + " pendente",
          title: kindLabel + " solicitado pelo cliente",
          preheader: "Há um " + kindLabel.toLowerCase() + " aguardando sua aprovação.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "O cliente <strong>" + escapeHtml(p.client_name || "da reserva") + "</strong> acabou de solicitar um " + kindLabel.toLowerCase() + " para o seu veículo <strong>" + escapeHtml(p.veiculo || "") + "</strong>. Aprove ou recuse pelo seu painel."
          ],
          sections: [
            ["Data e hora", escapeHtml(p.scheduled_at || "a confirmar")],
            ["Local", escapeHtml(p.location || "—")],
            (p.mileage != null ? ["Quilometragem", escapeHtml(String(p.mileage) + " km")] : null),
            (p.fuel_level ? ["Combustível", escapeHtml(p.fuel_level)] : null),
            (p.notes ? ["Observações do cliente", escapeHtml(p.notes)] : null)
          ].filter(Boolean),
          ctaText: "Abrir no painel",
          ctaUrl: SITE + "/dashboard-proprietario.html#locacao"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          kindLabel + " solicitado pelo cliente " + (p.client_name || "") + ".\n" +
          "Veículo: " + (p.veiculo || "") + "\n" +
          "Data: " + (p.scheduled_at || "a confirmar") + "\n" +
          "Local: " + (p.location || "—") + "\n\n" +
          "Aprove em: " + SITE + "/dashboard-proprietario.html#locacao"
      };
    },

    inspection_approved_client: function (p) {
      var kindLabel = p.kind === "checkout" ? "Check-out" : "Check-in";
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: kindLabel + " aprovado — sua locação está ativa",
        html: baseTemplate({
          badge: kindLabel + " aprovado",
          title: kindLabel + " aprovado pelo proprietário",
          preheader: "Seu " + kindLabel.toLowerCase() + " foi confirmado pelo proprietário.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ", tudo certo!",
            "O proprietário aprovou o seu <strong>" + kindLabel.toLowerCase() + "</strong> do veículo <strong>" + escapeHtml(p.veiculo || "") + "</strong>.",
            (p.kind === "checkin"
              ? "Sua locação está oficialmente ativa. Bom uso!"
              : "Acompanhe pelo painel o status da caução e da liberação do veículo.")
          ],
          sections: [
            ["Veículo", escapeHtml(p.veiculo || "—")],
            ["Data registrada", escapeHtml(p.scheduled_at || "—")],
            (p.location ? ["Local", escapeHtml(p.location)] : null)
          ].filter(Boolean),
          ctaText: "Ver no meu painel",
          ctaUrl: SITE + "/dashboard-cliente.html#checklist"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          kindLabel + " aprovado pelo proprietário.\n" +
          "Veículo: " + (p.veiculo || "") + "\n\n" +
          "Painel: " + SITE + "/dashboard-cliente.html#checklist"
      };
    },

    inspection_rejected_client: function (p) {
      var kindLabel = p.kind === "checkout" ? "Check-out" : "Check-in";
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: kindLabel + " recusado — entre em contato",
        html: baseTemplate({
          gradient: "linear-gradient(135deg,#a8580e 0%,#cf7a1c 55%,#e89c3f 100%)",
          ctaBg: "#a8580e",
          badge: kindLabel + " recusado",
          title: "Seu " + kindLabel.toLowerCase() + " precisa de ajustes",
          preheader: "O proprietário recusou — entre em contato.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "O proprietário <strong>recusou</strong> sua solicitação de " + kindLabel.toLowerCase() + " no veículo " + escapeHtml(p.veiculo || "") + ". Entre em contato pelo painel ou pelo WhatsApp da Nomade Drive para resolver a situação."
          ],
          ctaText: "Falar com a equipe",
          ctaUrl: SITE + "/dashboard-cliente.html#suporte",
          footerNote: "Resposta direta neste e-mail vai pro nosso time de suporte."
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          kindLabel + " RECUSADO pelo proprietário.\n" +
          "Veículo: " + (p.veiculo || "") + "\n\n" +
          "Painel: " + SITE + "/dashboard-cliente.html#suporte"
      };
    },

    case_opened_client: function (p) {
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: "Recebemos sua ocorrência — Nomade Drive Brasil",
        html: baseTemplate({
          badge: "Ocorrência registrada",
          title: "Recebemos sua ocorrência",
          preheader: "A equipe Proteção vai analisar.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "Recebemos sua ocorrência do tipo <strong>" + escapeHtml(p.case_type_label || p.case_type || "—") + "</strong> e ela já está na fila da equipe de Proteção.",
            "Você pode acompanhar o andamento pelo painel ou responder a este e-mail caso queira complementar com mais informações ou fotos."
          ],
          sections: [
            ["Tipo", escapeHtml(p.case_type_label || p.case_type || "—")],
            (p.veiculo ? ["Veículo", escapeHtml(p.veiculo)] : null),
            ["Aberta em", escapeHtml(p.created_at_fmt || new Date().toLocaleString("pt-BR"))]
          ].filter(Boolean),
          ctaText: "Acompanhar no painel",
          ctaUrl: SITE + "/dashboard-cliente.html#protecao"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Ocorrência registrada — tipo: " + (p.case_type_label || p.case_type || "—") + ".\n" +
          "A equipe Proteção vai analisar.\n\n" +
          "Painel: " + SITE + "/dashboard-cliente.html#protecao"
      };
    },

    /* Variante "team": usada via notifyEmail() pra suporte@ ou
       super-admin, NÃO depende de profiles.email. */
    case_opened_team: function (p) {
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: "[Proteção] Nova ocorrência: " + (p.case_type_label || p.case_type || "—"),
        html: baseTemplate({
          gradient: "linear-gradient(135deg,#7a1f4b 0%,#a02865 55%,#c83c87 100%)",
          ctaBg: "#7a1f4b",
          badge: "Ação interna",
          title: "Nova ocorrência registrada",
          preheader: "Caso aberto pelo cliente — triagem pendente.",
          body: [
            "Um cliente abriu uma ocorrência na plataforma.",
            (p.description ? "<strong>Descrição:</strong> " + escapeHtml(p.description) : "")
          ].filter(Boolean),
          sections: [
            ["Tipo", escapeHtml(p.case_type_label || p.case_type || "—")],
            ["Cliente", escapeHtml(p.client_name || p.client_id || "—")],
            (p.veiculo ? ["Veículo", escapeHtml(p.veiculo)] : null),
            ["Aberta em", escapeHtml(p.created_at_fmt || new Date().toLocaleString("pt-BR"))]
          ].filter(Boolean),
          ctaText: "Abrir fila de triagem",
          ctaUrl: SITE + "/dashboard-protecao.html#triagem"
        }),
        text: "Nova ocorrência — tipo: " + (p.case_type_label || p.case_type || "—") + ".\n" +
          "Cliente: " + (p.client_name || "—") + "\n" +
          (p.description ? "Descrição: " + p.description + "\n" : "") +
          "\nTriagem: " + SITE + "/dashboard-protecao.html#triagem"
      };
    },

    lead_status_updated: function (p) {
      var statusLbl = p.status_label || p.status || "atualizada";
      var orangeStatus = p.status === "recusado" || p.status === "suspenso";
      return {
        replyTo: "contato@nomadedrive.com.br",
        subject: "Sua solicitação de aluguel — " + statusLbl,
        html: baseTemplate({
          gradient: orangeStatus
            ? "linear-gradient(135deg,#a8580e 0%,#cf7a1c 55%,#e89c3f 100%)"
            : "linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%)",
          ctaBg: orangeStatus ? "#a8580e" : "#1a7a4f",
          badge: "Status atualizado",
          title: "Atualização na sua solicitação",
          preheader: "Status agora: " + statusLbl,
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "A equipe Nomade Drive analisou sua solicitação de aluguel e o status agora é <strong>" + escapeHtml(statusLbl) + "</strong>.",
            (p.status === "aprovado"
              ? "Em breve um consultor vai entrar em contato pelo WhatsApp com as opções disponíveis."
              : p.status === "aprovado_com_ressalvas"
                ? "Há condições especiais para sua solicitação. O consultor vai detalhar no contato."
                : p.status === "recusado"
                  ? "Infelizmente não foi possível atender no momento. Você pode responder este e-mail pra entender o motivo."
                  : "Acompanhe pelo painel ou aguarde nosso contato.")
          ],
          sections: [
            (p.cidade ? ["Cidade", escapeHtml(p.cidade)] : null),
            (p.duracao ? ["Duração", escapeHtml(p.duracao + " mês(es)")] : null),
            (p.inicio ? ["Início desejado", escapeHtml(p.inicio)] : null)
          ].filter(Boolean),
          ctaText: "Acompanhar no painel",
          ctaUrl: SITE + "/dashboard-cliente.html#solicitacoes"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Sua solicitação foi atualizada: " + statusLbl + ".\n\n" +
          "Painel: " + SITE + "/dashboard-cliente.html#solicitacoes"
      };
    },

    inspection_assigned_workshop: function (p) {
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: "Nova vistoria atribuída — " + (p.veiculo || "Nomade Drive Brasil"),
        html: baseTemplate({
          badge: "Vistoria atribuída",
          title: "Você tem uma nova vistoria",
          preheader: "Veículo na fila da sua oficina.",
          body: [
            "Olá " + escapeHtml(p.workshop_name || p.full_name || "") + ",",
            "A Nomade Drive atribuiu uma nova vistoria técnica para a sua oficina. Acesse seu painel para ver os detalhes do veículo, fazer o checklist, registrar fotos e enviar o laudo."
          ],
          sections: [
            ["Veículo", escapeHtml(p.veiculo || "—")],
            ["Status atual", "Em análise"]
          ],
          ctaText: "Abrir minha fila",
          ctaUrl: SITE + "/dashboard-oficina.html#vistorias"
        }),
        text: "Olá " + (p.workshop_name || p.full_name || "") + ",\n\n" +
          "Nova vistoria atribuída para sua oficina.\n" +
          "Veículo: " + (p.veiculo || "—") + "\n\n" +
          "Painel: " + SITE + "/dashboard-oficina.html#vistorias"
      };
    },

    inspection_completed_owner: function (p) {
      var approved = p.approved === true || p.approved === "true";
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: approved
          ? "Vistoria do seu veículo APROVADA"
          : "Vistoria do seu veículo concluída — com ressalvas",
        html: baseTemplate({
          gradient: approved
            ? "linear-gradient(135deg,#145f3e 0%,#1a7a4f 55%,#2da473 100%)"
            : "linear-gradient(135deg,#a8580e 0%,#cf7a1c 55%,#e89c3f 100%)",
          ctaBg: approved ? "#1a7a4f" : "#a8580e",
          badge: approved ? "Vistoria aprovada" : "Vistoria concluída",
          title: approved
            ? "Vistoria do seu veículo aprovada"
            : "Vistoria concluída com ressalvas",
          preheader: "Laudo técnico disponível no painel.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "A oficina <strong>" + escapeHtml(p.workshop_name || "credenciada") + "</strong> concluiu a vistoria técnica do seu veículo " + escapeHtml(p.veiculo || "") + ".",
            (approved
              ? "<strong>Resultado:</strong> aprovado para entrar na frota Nomade Drive."
              : "<strong>Resultado:</strong> concluído com observações. Veja o parecer no painel."),
            (p.mechanic_notes ? "<strong>Notas do mecânico:</strong> " + escapeHtml(p.mechanic_notes) : "")
          ].filter(Boolean),
          ctaText: "Ver no painel",
          ctaUrl: SITE + "/dashboard-proprietario.html#veiculos"
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Vistoria concluída por " + (p.workshop_name || "oficina credenciada") + ".\n" +
          "Resultado: " + (approved ? "APROVADO" : "CONCLUÍDO COM RESSALVAS") + "\n" +
          (p.mechanic_notes ? "Notas: " + p.mechanic_notes + "\n" : "") +
          "\nPainel: " + SITE + "/dashboard-proprietario.html#veiculos"
      };
    },

    case_resolved_client: function (p) {
      var statusLbl = p.status_label || p.status || "atualizada";
      return {
        replyTo: "suporte@nomadedrive.com.br",
        subject: "Triagem concluída — " + statusLbl,
        html: baseTemplate({
          badge: "Triagem concluída",
          title: "Sua ocorrência foi analisada",
          preheader: "A equipe Proteção finalizou a análise.",
          body: [
            "Olá " + escapeHtml(p.full_name || "") + ",",
            "A equipe de Proteção concluiu a análise da sua ocorrência do tipo <strong>" + escapeHtml(p.case_type_label || p.case_type || "—") + "</strong>.",
            (p.resolution_notes ? "<strong>Parecer da equipe:</strong> " + escapeHtml(p.resolution_notes) : "")
          ].filter(Boolean),
          sections: [
            ["Status final", escapeHtml(statusLbl)],
            (p.veiculo ? ["Veículo", escapeHtml(p.veiculo)] : null)
          ].filter(Boolean),
          ctaText: "Ver no meu painel",
          ctaUrl: SITE + "/dashboard-cliente.html#protecao",
          footerNote: "Se tiver dúvida sobre o parecer, responda este e-mail."
        }),
        text: "Olá " + (p.full_name || "") + ",\n\n" +
          "Triagem da sua ocorrência concluída.\n" +
          "Status final: " + statusLbl + "\n" +
          (p.resolution_notes ? "Parecer: " + p.resolution_notes + "\n" : "") +
          "\nPainel: " + SITE + "/dashboard-cliente.html#protecao"
      };
    }
  };

  /* ============================================================
   * notify(client, userId, templateKey, payload)
   * Lê profiles.email + full_name, renderiza template, envia.
   * ============================================================ */
  function notify(client, userId, templateKey, payload) {
    if (!client || !userId || !templateKey) {
      return Promise.resolve({ ok: false, error: "invalid_args" });
    }
    var make = templates[templateKey];
    if (!make) return Promise.resolve({ ok: false, error: "unknown_template" });

    return client.from("profiles").select("email,full_name")
      .eq("id", userId).maybeSingle()
      .then(function (r) {
        if (!r || r.error || !r.data || !r.data.email) {
          return { ok: false, error: "email_not_found" };
        }
        var to = r.data.email;
        var merged = Object.assign({}, payload || {}, { full_name: r.data.full_name });
        var tpl = make(merged);
        return client.functions.invoke("send-email", {
          body: {
            to: to,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
            reply_to: tpl.replyTo
          }
        }).then(function (rr) {
          var d = rr && rr.data;
          if (d && d.ok) return { ok: true, id: d.id, to: to };
          return { ok: false, error: (rr && rr.error && rr.error.message) ||
            (d && d.error) || "send_failed", to: to };
        }).catch(function (e) {
          return { ok: false, error: (e && e.message) || String(e), to: to };
        });
      });
  }

  /* ============================================================
   * notifyEmail(client, toEmail, templateKey, payload)
   * Envia pra um e-mail literal (sem lookup em profiles).
   * Útil para notificações da equipe (suporte@, super-admin) ou
   * casos onde já temos o e-mail em mãos.
   * ============================================================ */
  function notifyEmail(client, toEmail, templateKey, payload) {
    if (!client || !toEmail || !templateKey) {
      return Promise.resolve({ ok: false, error: "invalid_args" });
    }
    var make = templates[templateKey];
    if (!make) return Promise.resolve({ ok: false, error: "unknown_template" });
    var tpl = make(payload || {});
    return client.functions.invoke("send-email", {
      body: {
        to: toEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        reply_to: tpl.replyTo
      }
    }).then(function (rr) {
      var d = rr && rr.data;
      if (d && d.ok) return { ok: true, id: d.id, to: toEmail };
      return { ok: false, error: (rr && rr.error && rr.error.message) ||
        (d && d.error) || "send_failed", to: toEmail };
    }).catch(function (e) {
      return { ok: false, error: (e && e.message) || String(e), to: toEmail };
    });
  }

  window.ndEmails = {
    notify: notify,
    notifyEmail: notifyEmail,
    templates: templates,   // exposto pra debug / preview
    _base: baseTemplate,    // exposto pra testes
    TEAM_PROTECTION: "suporte@nomadedrive.com.br"
  };
})();
