/* ====================================================================
   Nomade Drive Brasil — Recebimentos (Stripe Connect — Fase A)
   --------------------------------------------------------------------
   Liga a seção #recebimentos (painéis de proprietário, parceiro e
   oficina) à Edge Function connect-onboard. Monta-se sozinho se a
   seção existir na página. Lê o caminho de retorno de data-return.
   ==================================================================== */
(function () {
  "use strict";
  var panel = document.getElementById("recebimentos");
  if (!panel) return;

  var statusBox = document.getElementById("payoutStatus");
  var btn = document.getElementById("payoutBtn");
  var note = document.getElementById("payoutNote");
  var a = window.ndAuth;
  var returnPath = panel.getAttribute("data-return") || "dashboard-proprietario.html";

  function setNote(text, kind) {
    if (!note) return;
    note.textContent = text || "";
    note.className = "auth-msg auth-msg--" + (kind || "warn");
    note.hidden = !text;
  }
  function statusInfo(s) {
    if (s === "ativo") return ["Conta ativa — pronta para receber", "ok"];
    if (s === "em_analise") return ["Em análise pela Stripe", "warn"];
    if (s === "restrito") return ["Conta com pendências — conclua o cadastro", "bad"];
    return ["Ainda não configurada", "neutral"];
  }
  function render(status) {
    if (!statusBox) return;
    var info = statusInfo(status);
    statusBox.innerHTML = "";
    var row = document.createElement("div"); row.className = "dash-row";
    var main = document.createElement("div"); main.className = "dash-row__main";
    var s = document.createElement("strong"); s.textContent = "Conta de recebimento";
    var sp = document.createElement("span"); sp.textContent = info[0];
    main.appendChild(s); main.appendChild(sp); row.appendChild(main);
    var pill = document.createElement("span");
    pill.className = "dash-pill dash-pill--" + info[1];
    pill.textContent = info[0];
    row.appendChild(pill);
    statusBox.appendChild(row);
    if (btn) {
      btn.textContent = (status === "ativo")
        ? "Revisar conta de recebimento"
        : "Configurar conta de recebimento";
    }
  }
  function client() {
    return (a && a.client && a.client()) || null;
  }
  function call(action) {
    var c = client();
    if (!c || !c.functions) return Promise.resolve(null);
    return c.functions.invoke("connect-onboard", {
      body: { action: action, return_path: returnPath }
    }).then(function (r) {
      return (r && !r.error && r.data) ? r.data : null;
    }, function () { return null; });
  }

  render("pendente");
  call("status").then(function (d) { if (d && d.status) render(d.status); });

  if (btn) {
    btn.addEventListener("click", function () {
      setNote("");
      var c = client();
      if (!c || !c.functions) {
        setNote("Recebimentos indisponível nesta pré-visualização.", "warn");
        return;
      }
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Abrindo cadastro...";
      call("onboard").then(function (d) {
        if (d && d.url) { window.location.href = d.url; return; }
        btn.disabled = false; btn.textContent = label;
        setNote("Não foi possível abrir o cadastro agora. Tente novamente.", "error");
      });
    });
  }

  try {
    var p = new URLSearchParams(window.location.search).get("recebimentos");
    if (p === "ok") {
      setNote("Cadastro enviado. O status é atualizado assim que a Stripe verificar.", "ok");
    } else if (p === "retry") {
      setNote("O cadastro não foi concluído. Clique no botão para continuar.", "warn");
    }
  } catch (e) {}
})();
