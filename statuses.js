/* ====================================================================
   Nomade Drive Brasil — biblioteca de explicações de status
   --------------------------------------------------------------------
   Centraliza:
     - tip(status)              -> texto explicativo curto p/ tooltip
     - applyTo(el, status)      -> seta data-tip num elemento (pill)
     - renderTodos(id, items)   -> renderiza o banner "Ações pendentes"
                                   no elemento de id <id> a partir de
                                   um array [{count, label, link, tip}]
   API global: window.ndStatus
   ==================================================================== */
(function () {
  "use strict";

  var TIPS = {
    /* perfil / cadastros / KYC ------------------------------------- */
    em_analise: "Em análise pela equipe Nomade Drive — normalmente leva 1 a 3 dias úteis.",
    documentos_pendentes: "Faltam documentos para concluir o cadastro. Envie os pendentes na seção Documentos.",
    aprovado: "Aprovado pela equipe Nomade Drive. Tudo certo nesta etapa.",
    aprovado_com_ressalvas: "Aprovado, mas com observações. Veja o parecer da equipe.",
    recusado: "Não aprovado nesta etapa. Verifique o motivo na seção correspondente.",
    suspenso: "Suspenso temporariamente. Entre em contato com o suporte para regularizar.",
    bloqueado_para_revisao: "Bloqueado para revisão da equipe. Aguarde o desbloqueio.",
    solicitado: "Solicitação enviada — aguardando análise da equipe.",

    /* reservas ---------------------------------------------------- */
    rascunho: "Rascunho — esta reserva ainda não foi enviada para análise.",
    aprovada: "Reserva aprovada. Você pode solicitar check-in.",

    /* pagamentos -------------------------------------------------- */
    pendente: "Pagamento ainda não iniciado ou em processamento.",
    pago: "Pagamento confirmado pela Stripe.",
    autorizado: "Caução autorizada — valor retido no cartão, sem cobrança imediata.",
    capturado: "Caução capturada — valor cobrado em definitivo.",
    liberado: "Caução liberada — não houve cobrança.",
    falhou: "Pagamento recusado pela operadora do cartão.",
    expirado: "Link de pagamento expirou. Inicie o pagamento novamente.",
    estornado: "Pagamento estornado.",

    /* check-in/out ------------------------------------------------ */
    aguardando_aprovacao: "Aguardando aprovação do proprietário do veículo.",

    /* Connect / recebimentos ------------------------------------- */
    ativo: "Conta de recebimento ativa — pronta para receber repasses pela Stripe.",
    restrito: "A Stripe pediu mais informações ou documentos. Clique em Configurar/Revisar para concluir.",
    pendente_conta: "Conta de recebimento ainda não foi configurada.",

    /* default ----------------------------------------------------- */
    default: "Status atual desta etapa do fluxo."
  };

  function _key(status) {
    return status ? String(status).toLowerCase().trim() : "";
  }

  function tip(status) {
    var k = _key(status);
    if (!k) return "";
    return TIPS[k] || TIPS.default;
  }

  /**
   * Aplica data-tip num elemento. Aceita override opcional.
   */
  function applyTo(el, status, override) {
    if (!el) return;
    var text = override || tip(status);
    if (text) {
      el.setAttribute("data-tip", text);
    } else {
      el.removeAttribute("data-tip");
    }
  }

  /* --------------------------------------------------------------
     Banner "Ações pendentes"
     --------------------------------------------------------------
     items: array de objetos { count, label, link, linkLabel, tip }
       - count: número (se 0 ou falsy, item é ignorado)
       - label: texto descritivo
       - link: âncora ou URL opcional
       - linkLabel: rótulo do link (padrão "ver")
       - tip: tooltip opcional pro item
  -------------------------------------------------------------- */
  function _iconBell() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16.01"/></svg>';
  }
  function _iconCheck() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="20 6 9 17 4 12"/></svg>';
  }

  function renderTodos(elementId, items) {
    var el = document.getElementById(elementId);
    if (!el) return;
    items = items || [];
    var pending = items.filter(function (it) { return it && it.count > 0; });

    if (!pending.length) {
      el.className = "dash-todos dash-todos--ok";
      el.innerHTML =
        '<div class="dash-todos__icon">' + _iconCheck() + '</div>' +
        '<div class="dash-todos__body">' +
        '<p class="dash-todos__title">Tudo em dia</p>' +
        '<ul class="dash-todos__list"><li>Nada pendente da sua parte no momento.</li></ul>' +
        '</div>';
      el.hidden = false;
      return;
    }

    el.className = "dash-todos";
    var ul = '';
    pending.forEach(function (it) {
      var linkHtml = "";
      if (it.link) {
        linkHtml = ' · <a href="' + it.link + '">' + (it.linkLabel || "ver") + '</a>';
      }
      var tipAttr = it.tip ? ' data-tip="' + String(it.tip).replace(/"/g, "&quot;") + '"' : '';
      ul += '<li' + tipAttr + '><strong>' + it.count + '</strong> ' + it.label + linkHtml + '</li>';
    });
    el.innerHTML =
      '<div class="dash-todos__icon">' + _iconBell() + '</div>' +
      '<div class="dash-todos__body">' +
      '<p class="dash-todos__title">Ações pendentes</p>' +
      '<ul class="dash-todos__list">' + ul + '</ul>' +
      '</div>';
    el.hidden = false;
  }

  window.ndStatus = {
    tip: tip,
    applyTo: applyTo,
    renderTodos: renderTodos
  };
})();
