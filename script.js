/* ====================================================================
   NomadDrive Brasil — site logic (PT-only)
   ==================================================================== */

/* ---- CONFIG ---- */
// TODO: trocar pelo número real de WhatsApp (formato: 55 + DDD + número)
var WA_PHONE = "5500000000000";
var SITE_URL = "https://danielrodovalho228-ship-it.github.io/nomad-drive-brasil/";

function waLink(msg) {
  return "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(msg);
}

/* ---- fleet pricing (FIPE × taxa da categoria) ---- */
var FLEET_TIER_RATES = { A: 0.055, B: 0.045, C: 0.040, D: 0.028 };
var CAT_LABEL = { A: "Econômico", B: "Confort", C: "Premium", D: "Luxo" };

function brl(n) {
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
}

/* ====================================================================
   NAV — scroll state + mobile drawer
   ==================================================================== */
(function () {
  var nav = document.getElementById("nav");
  if (nav) {
    window.addEventListener("scroll", function () {
      nav.classList.toggle("scrolled", window.scrollY > 10);
    });
  }

  var burger = document.getElementById("navBurger");
  var drawer = document.getElementById("mobileDrawer");
  var overlay = document.getElementById("drawerOverlay");
  var closeBtn = document.getElementById("drawerClose");

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    if (overlay) overlay.hidden = false;
    if (burger) burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if (overlay) overlay.hidden = true;
    if (burger) burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  if (burger) burger.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
  if (drawer) {
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeDrawer);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });
})();

/* ====================================================================
   FLEET — render cards from CAR_CATALOG + filter
   ==================================================================== */
(function () {
  var grid = document.getElementById("fleet");
  if (!grid || !window.CAR_CATALOG) return;

  var order = window.CAR_ORDER || Object.keys(window.CAR_CATALOG);
  var cards = [];

  order.forEach(function (id) {
    var c = window.CAR_CATALOG[id];
    if (!c || id === "cybertruck") return;          // cybertruck fica na área aspiracional
    var rate = FLEET_TIER_RATES[c.tier] || 0;
    var mod = c.transmission === "manual" ? 0.9 : 1;
    var price = c.fipe ? c.fipe * rate * mod : 0;
    var trans = c.transmission === "manual" ? "Manual" : "Automático";
    var body = (c.body && c.body.pt) ? c.body.pt : "";

    var a = document.createElement("a");
    a.className = "fleet-car";
    a.href = "car.html?id=" + c.id;
    a.setAttribute("data-tier", c.tier);
    a.innerHTML =
      '<div class="fleet-car__img"><img src="images/car-' + c.id + '-1.jpg" alt="' + c.name +
        '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      '<div class="fleet-car__body">' +
        '<span class="fleet-car__cat">' + (CAT_LABEL[c.tier] || "") + '</span>' +
        '<span class="fleet-car__name">' + c.name + '</span>' +
        '<span class="fleet-car__meta">' + c.year + ' · ' + trans + (body ? ' · ' + body : '') + '</span>' +
        (price
          ? '<span class="fleet-car__price">≈ ' + brl(price) + '<small>/mês</small></span>' +
            '<span class="fleet-car__est">Estimativa — confirmada por orçamento</span>'
          : '<span class="fleet-car__price">Sob consulta</span>') +
        '<span class="btn btn--outline btn--sm fleet-car__cta">Ver detalhes</span>' +
      '</div>';
    grid.appendChild(a);
    cards.push(a);
  });

  // filter
  document.querySelectorAll(".fleet-filter").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".fleet-filter").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var f = btn.getAttribute("data-filter");
      cards.forEach(function (card) {
        card.style.display = (f === "all" || card.getAttribute("data-tier") === f) ? "" : "none";
      });
    });
  });
})();

/* ====================================================================
   SIMULADOR de ganhos do proprietário
   ==================================================================== */
(function () {
  var monthsEl = document.getElementById("simMonths");
  if (!monthsEl) return;

  var TIERS = {
    A: { price: 1650, rate: 0.055, costRatio: 0.22, repFipe: 30000 },
    B: { price: 2565, rate: 0.045, costRatio: 0.18, repFipe: 57000 },
    C: { price: 4800, rate: 0.040, costRatio: 0.14, repFipe: 120000 },
    D: { price: 7000, rate: 0.028, costRatio: 0.10, repFipe: 250000 }
  };
  var TRACKER_YEAR = 360; // R$ 30/mês

  var tier = "B";
  var fipeEl = document.getElementById("simFipe");
  var feeEl = document.getElementById("simFee");
  var el = function (id) { return document.getElementById(id); };

  function priceMonthly() {
    var f = parseFloat(fipeEl.value);
    if (f && f > 0) return Math.round(f * TIERS[tier].rate);
    return TIERS[tier].price;
  }
  function fipeRef() {
    var f = parseFloat(fipeEl.value);
    return (f && f > 0) ? f : TIERS[tier].repFipe;
  }
  function netFor(months, feeRate) {
    var p = priceMonthly();
    var gross = p * months;
    var fee = gross * feeRate;
    var cash = gross - fee - TRACKER_YEAR;
    var costs = fipeRef() * TIERS[tier].costRatio;
    return cash - costs;
  }

  function update() {
    var months = +monthsEl.value;
    var feeRate = (+feeEl.value) / 100;
    var p = priceMonthly();
    var gross = p * months;
    var fee = gross * feeRate;
    var cash = gross - fee - TRACKER_YEAR;
    var costs = fipeRef() * TIERS[tier].costRatio;
    var net = cash - costs;

    el("simMonthsVal").textContent = months;
    el("simFeeVal").textContent = (+feeEl.value) + "%";
    el("simPrice").textContent = brl(p) + " / mês";
    el("simGross").textContent = brl(gross);
    el("simFeeOut").textContent = "– " + brl(fee);
    el("simTracker").textContent = "– " + brl(TRACKER_YEAR);
    el("simCash").textContent = brl(cash);
    el("simCosts").textContent = "– " + brl(costs);
    el("simNet").textContent = (net < 0 ? "– " : "") + brl(Math.abs(net));

    var cons = netFor(Math.max(2, months - 3), feeRate);
    var real = netFor(months, feeRate);
    var otim = netFor(Math.min(12, months + 2), feeRate);
    el("scnCons").querySelector("strong").textContent = (cons < 0 ? "– " : "") + brl(Math.abs(cons));
    el("scnReal").querySelector("strong").textContent = (real < 0 ? "– " : "") + brl(Math.abs(real));
    el("scnOtim").querySelector("strong").textContent = (otim < 0 ? "– " : "") + brl(Math.abs(otim));
    el("scnReal").classList.add("sim-scn--hl");
  }

  document.querySelectorAll(".tier-opt").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tier-opt").forEach(function (x) { x.classList.remove("is-active"); });
      b.classList.add("is-active");
      tier = b.getAttribute("data-tier");
      update();
    });
  });
  fipeEl.addEventListener("input", update);
  monthsEl.addEventListener("input", update);
  feeEl.addEventListener("input", update);
  update();
})();

/* ====================================================================
   FORM TABS + WhatsApp submit
   ==================================================================== */
(function () {
  var tabs = document.querySelectorAll(".form-tab");
  var forms = document.querySelectorAll(".form");

  function activateTab(name) {
    tabs.forEach(function (t) { t.classList.toggle("is-active", t.getAttribute("data-tab") === name); });
    forms.forEach(function (f) { f.classList.toggle("is-active", f.getAttribute("data-panel") === name); });
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { activateTab(t.getAttribute("data-tab")); });
  });

  // botões/links com data-form-tab pré-selecionam a aba
  document.querySelectorAll("[data-form-tab]").forEach(function (link) {
    link.addEventListener("click", function () {
      activateTab(link.getAttribute("data-form-tab"));
    });
  });

  function val(form, name) {
    var f = form.querySelector('[name="' + name + '"]');
    return f ? f.value.trim() : "";
  }

  // LOCATÁRIO
  var fLoc = document.getElementById("form-locatario");
  if (fLoc) fLoc.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = val(fLoc, "nome"), contato = val(fLoc, "contato");
    var err = document.getElementById("err-locatario");
    if (!nome || !contato) { if (err) err.hidden = false; return; }
    if (err) err.hidden = true;
    var msg = "Olá! Quero alugar um carro pela NomadDrive.\n\n" +
      "• Nome: " + nome + "\n" +
      "• Contato: " + contato + "\n" +
      "• Cidade de retirada: " + (val(fLoc, "cidade") || "—") + "\n" +
      "• Data de retirada: " + (val(fLoc, "data") || "—") + "\n" +
      "• Duração: " + val(fLoc, "duracao") + "\n" +
      "• Categoria desejada: " + val(fLoc, "categoria") + "\n" +
      "• Indicação: " + (val(fLoc, "indicacao") || "—") + "\n" +
      "• Observações: " + (val(fLoc, "obs") || "—");
    window.open(waLink(msg), "_blank");
  });

  // PROPRIETÁRIO
  var fProp = document.getElementById("form-proprietario");
  if (fProp) fProp.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = val(fProp, "nome"), contato = val(fProp, "contato");
    var err = document.getElementById("err-proprietario");
    if (!nome || !contato) { if (err) err.hidden = false; return; }
    if (err) err.hidden = true;
    var msg = "Olá! Quero cadastrar meu carro na NomadDrive.\n\n" +
      "• Nome: " + nome + "\n" +
      "• WhatsApp: " + contato + "\n" +
      "• Cidade: " + (val(fProp, "cidade") || "—") + "\n" +
      "• Modelo: " + (val(fProp, "modelo") || "—") + "\n" +
      "• Ano: " + (val(fProp, "ano") || "—") + "\n" +
      "• FIPE aproximada: " + (val(fProp, "fipe") || "—") + "\n" +
      "• Disponibilidade: " + val(fProp, "disponibilidade") + "\n" +
      "• Uso atual: " + val(fProp, "uso");
    window.open(waLink(msg), "_blank");
  });

  // PARCEIRO
  var fPar = document.getElementById("form-parceiro");
  if (fPar) fPar.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = val(fPar, "nome"), contato = val(fPar, "contato");
    var err = document.getElementById("err-parceiro");
    if (!nome || !contato) { if (err) err.hidden = false; return; }
    if (err) err.hidden = true;
    var msg = "Olá! Quero ser parceiro indicador da NomadDrive.\n\n" +
      "• Nome: " + nome + "\n" +
      "• WhatsApp: " + contato + "\n" +
      "• Cidade: " + (val(fPar, "cidade") || "—") + "\n" +
      "• Tipo de rede: " + val(fPar, "rede") + "\n" +
      "• Como pretende indicar: " + (val(fPar, "comoindica") || "—");
    window.open(waLink(msg), "_blank");
  });
})();

/* ====================================================================
   WhatsApp links genéricos (float, drawer, footer)
   ==================================================================== */
(function () {
  var generic = "Olá! Vim pelo site da NomadDrive Brasil e quero falar sobre aluguel mensal de carro.";
  ["waFloat", "drawerWhats", "footerWhats"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.href = waLink(generic);
  });
  // CTA específico de oficinas
  var oficina = document.getElementById("oficinaWhats");
  if (oficina) {
    oficina.href = waLink("Olá! Tenho uma oficina e quero credenciá-la na rede NomadDrive Brasil.");
    oficina.target = "_blank";
    oficina.rel = "noopener";
  }
})();
