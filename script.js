/* ====================================================================
   Nomade Drive Brasil — site logic (PT-only)
   ==================================================================== */

/* ====================================================================
   CONFIG — WhatsApp
   --------------------------------------------------------------------
   Coloque abaixo o número de WhatsApp REAL da operação, somente dígitos,
   no formato internacional: 55 + DDD + número. Exemplo: "5534999998888".

   ENQUANTO ESTIVER VAZIO: nenhum botão envia para um número falso.
   Os botões e formulários usam, como alternativa, o e-mail de contato —
   assim o lead ainda chega, sem publicar um número inexistente.
   ==================================================================== */
var WHATSAPP_NUMBER = "";                       // <-- PREENCHER com o número real
var CONTACT_EMAIL   = "contato@nomadedrive.com.br";

function whatsappReady() {
  return /^\d{12,13}$/.test(WHATSAPP_NUMBER);
}
/* Retorna um link seguro: wa.me se configurado, senão mailto (nunca número falso). */
function waHref(msg) {
  msg = msg || "Olá! Vim pelo site da Nomade Drive Brasil.";
  if (whatsappReady()) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  }
  return "mailto:" + CONTACT_EMAIL +
    "?subject=" + encodeURIComponent("Contato — Nomade Drive Brasil") +
    "&body=" + encodeURIComponent(msg);
}

/* ---- fleet pricing (FIPE × taxa da categoria) ---- */
var FLEET_TIER_RATES = { A: 0.055, B: 0.045, C: 0.040, D: 0.028 };
var CAT_LABEL = { A: "Econômico", B: "Confort", C: "Premium", D: "Luxo" };
function brl(n) { return "R$ " + Math.round(n).toLocaleString("pt-BR"); }

/* ====================================================================
   NAV — scroll state + drawer mobile
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

  function open() {
    if (!drawer) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    if (overlay) overlay.hidden = false;
    if (burger) burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function close() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if (overlay) overlay.hidden = true;
    if (burger) burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  if (burger) burger.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (overlay) overlay.addEventListener("click", close);
  if (drawer) drawer.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();

/* ====================================================================
   BANNERS rotativos
   ==================================================================== */
(function () {
  var rail = document.getElementById("bannerRail");
  if (!rail) return;
  var slides = rail.querySelectorAll(".banner");
  if (slides.length < 2) { if (slides[0]) slides[0].classList.add("is-active"); return; }
  var dotsBox = document.getElementById("bannerDots");
  var i = 0, timer;

  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
    if (dotsBox) [].forEach.call(dotsBox.children, function (d, k) {
      d.classList.toggle("is-active", k === i);
    });
  }
  function next() { show(i + 1); }
  function start() { stop(); timer = setInterval(next, 5500); }
  function stop() { if (timer) clearInterval(timer); }

  if (dotsBox) {
    slides.forEach(function (_, k) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "banner-dot";
      d.setAttribute("aria-label", "Banner " + (k + 1));
      d.addEventListener("click", function () { show(k); start(); });
      dotsBox.appendChild(d);
    });
  }
  var prev = document.getElementById("bannerPrev");
  var nxt = document.getElementById("bannerNext");
  if (prev) prev.addEventListener("click", function () { show(i - 1); start(); });
  if (nxt) nxt.addEventListener("click", function () { next(); start(); });
  rail.addEventListener("mouseenter", stop);
  rail.addEventListener("mouseleave", start);

  show(0);
  start();
})();

/* ====================================================================
   FROTA — render a partir de CAR_CATALOG + filtro
   ==================================================================== */
(function () {
  var grid = document.getElementById("fleet");
  if (!grid || !window.CAR_CATALOG) return;
  var order = window.CAR_ORDER || Object.keys(window.CAR_CATALOG);
  var cards = [];

  order.forEach(function (id) {
    var c = window.CAR_CATALOG[id];
    if (!c || id === "cybertruck") return;
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
            '<span class="fleet-car__est">Faixa de referência — preço final por orçamento</span>'
          : '<span class="fleet-car__price">Sob consulta</span>') +
        '<span class="btn btn--outline btn--sm fleet-car__cta">Ver detalhes</span>' +
      '</div>';
    grid.appendChild(a);
    cards.push(a);
  });

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
   HERO — carrossel automático dos carros do portfólio
   ==================================================================== */
(function () {
  var rail = document.getElementById("heroRail");
  if (!rail || !window.CAR_CATALOG) return;
  var order = window.CAR_ORDER || Object.keys(window.CAR_CATALOG);
  var slides = [];

  rail.innerHTML = "";
  order.forEach(function (id) {
    var c = window.CAR_CATALOG[id];
    if (!c || id === "cybertruck") return;
    // Slide vira <a> clicável → leva direto pra página do carro (UX #2 backlog mobile)
    var slide = document.createElement("a");
    slide.className = "hero-slide";
    slide.href = "car.html?id=" + c.id;
    slide.setAttribute("aria-label", "Ver detalhes do " + c.name);
    var img = document.createElement("img");
    img.src = "images/car-" + c.id + "-1.jpg";
    img.alt = c.name;
    img.loading = "lazy";
    img.onerror = function () { slide.style.display = "none"; };
    var cap = document.createElement("span");
    cap.className = "hero-slide__cap";
    cap.textContent = c.name + " — ver detalhes →";
    slide.appendChild(img);
    slide.appendChild(cap);
    rail.appendChild(slide);
    slides.push(slide);
  });
  if (!slides.length) return;

  var dots = document.createElement("div");
  dots.className = "hero-dots";
  slides.forEach(function (_, k) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Mostrar veículo " + (k + 1));
    b.addEventListener("click", function () { show(k); start(); });
    dots.appendChild(b);
  });
  rail.appendChild(dots);

  function arrow(cls, label, glyph, delta) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hero-arrow " + cls;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = glyph;
    btn.addEventListener("click", function () { show(i + delta); start(); });
    return btn;
  }
  rail.appendChild(arrow("hero-arrow--prev", "Veículo anterior", "‹", -1));
  rail.appendChild(arrow("hero-arrow--next", "Próximo veículo", "›", 1));

  var i = 0, timer;
  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
    [].forEach.call(dots.children, function (d, k) { d.classList.toggle("is-active", k === i); });
  }
  function start() { stop(); timer = setInterval(function () { show(i + 1); }, 3800); }
  function stop() { if (timer) clearInterval(timer); }
  rail.addEventListener("mouseenter", stop);
  rail.addEventListener("mouseleave", start);

  show(0);
  start();
})();

/* ====================================================================
   SIMULADOR de ganhos do proprietário (proprietarios.html)
   ==================================================================== */
(function () {
  var mesesEl = document.getElementById("simMeses");
  if (!mesesEl) return;

  var TIERS = {
    A: { price: 1650, rate: 0.055, repFipe: 30000 },
    B: { price: 2565, rate: 0.045, repFipe: 57000 },
    C: { price: 4800, rate: 0.040, repFipe: 120000 },
    D: { price: 7000, rate: 0.028, repFipe: 250000 }
  };
  var ESTADO = { otimo: 1.0, bom: 0.92, regular: 0.82 };
  var OWNER_SHARE = 0.828;  // parte estimada do proprietário (taxa da plataforma já descontada)
  var RESERVE_FRAC = 0.40;  // reservas recomendadas: IPVA, manutenção, pneus, seguro, depreciação, imprevistos
  var MAX_AGE = 10;         // anos de uso
  var MAX_KM = 200000;      // quilometragem

  var tier = "B";
  var fipeEl = document.getElementById("simFipe");
  var estadoEl = document.getElementById("simEstado");
  var anoEl = document.getElementById("simAno");
  var kmEl = document.getElementById("simKm");
  var alertEl = document.getElementById("simAlert");
  var el = function (id) { return document.getElementById(id); };

  function priceMonthly() {
    var f = parseFloat(fipeEl.value);
    if (f && f > 0) return Math.round(f * TIERS[tier].rate);
    return TIERS[tier].price;
  }
  function cenario(meses) {
    if (meses <= 4) return "Cenário conservador";
    if (meses <= 8) return "Cenário moderado";
    return "Cenário otimista";
  }
  function checkElegibilidade() {
    if (!alertEl) return;
    var msgs = [];
    var ano = parseInt(anoEl && anoEl.value, 10);
    var km = parseInt(kmEl && kmEl.value, 10);
    var anoAtual = new Date().getFullYear();
    if (ano && ano > 1950 && (anoAtual - ano) > MAX_AGE) {
      msgs.push("O veículo tem mais de " + MAX_AGE + " anos de uso. Veículos mais antigos podem ter restrições e costumam exigir análise adicional na aprovação — a elegibilidade não é garantida.");
    }
    if (km && km > MAX_KM) {
      msgs.push("A quilometragem está acima de " + (MAX_KM / 1000) + " mil km. Veículos muito rodados podem ter restrições e costumam exigir análise adicional na aprovação — a elegibilidade não é garantida.");
    }
    if (msgs.length) {
      alertEl.innerHTML = msgs.map(function (m) { return "<p>" + m + "</p>"; }).join("");
      alertEl.hidden = false;
    } else {
      alertEl.innerHTML = "";
      alertEl.hidden = true;
    }
  }
  function update() {
    var meses = +mesesEl.value;
    var price = priceMonthly();
    var estadoF = ESTADO[estadoEl.value] || 0.92;
    var ownerPerMonth = price * OWNER_SHARE * estadoF;
    var gross = ownerPerMonth * meses;
    var reserve = gross * RESERVE_FRAC;
    var net = gross - reserve;

    el("simMesesVal").textContent = meses;
    el("simCenario").textContent = cenario(meses);
    el("simMesesNote").textContent = "(" + meses + (meses === 1 ? " mês" : " meses") + " no ano)";
    el("simPrice").textContent = brl(price) + " / mês";
    el("simMonthly").textContent = "≈ " + brl(ownerPerMonth);
    el("simGross").textContent = "≈ " + brl(gross);
    el("simReserve").textContent = "− " + brl(reserve);
    el("simNet").textContent = "≈ " + brl(net);
    checkElegibilidade();
  }
  document.querySelectorAll(".tier-opt").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tier-opt").forEach(function (x) { x.classList.remove("is-active"); });
      b.classList.add("is-active");
      tier = b.getAttribute("data-tier");
      update();
    });
  });
  if (fipeEl) fipeEl.addEventListener("input", update);
  if (estadoEl) estadoEl.addEventListener("change", update);
  if (anoEl) anoEl.addEventListener("input", update);
  if (kmEl) kmEl.addEventListener("input", update);
  mesesEl.addEventListener("input", update);
  update();
})();

/* ====================================================================
   GATING de checkboxes (proprietarios.html)
   ==================================================================== */
(function () {
  var box = document.getElementById("aceiteBox");
  if (!box) return;
  var checks = box.querySelectorAll('input[type="checkbox"]');
  var btn = document.getElementById("aceiteContinue");
  if (!btn) return;
  function refresh() {
    var all = true;
    checks.forEach(function (c) { if (!c.checked) all = false; });
    btn.classList.toggle("is-enabled", all);
    btn.setAttribute("aria-disabled", all ? "false" : "true");
  }
  checks.forEach(function (c) { c.addEventListener("change", refresh); });
  btn.addEventListener("click", function (e) {
    var all = true;
    checks.forEach(function (c) { if (!c.checked) all = false; });
    if (!all) {
      e.preventDefault();
      box.classList.add("aceite--shake");
      setTimeout(function () { box.classList.remove("aceite--shake"); }, 500);
      return;
    }
    var target = document.getElementById("simuladorProp");
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
  refresh();
})();

/* ====================================================================
   FORMULÁRIOS — qualquer <form class="wa-form" data-intent="...">
   monta a mensagem e abre WhatsApp (ou e-mail, se não configurado)
   --------------------------------------------------------------------
   Backlog #1 (mobile Daniel 2026-05-24):
   Também POSTa pra Edge Function submit-lead-quote pra captar o lead
   via e-mail (contato@nomadedrive.com.br) — mesmo que o cliente
   feche o WhatsApp sem enviar.
   ==================================================================== */
(function () {
  function labelFor(input) {
    var field = input.closest(".field");
    if (field) {
      var sp = field.querySelector("span");
      if (sp) return sp.textContent.replace("*", "").replace(/\(opcional\)/i, "").trim();
    }
    return input.getAttribute("name") || "Campo";
  }

  // POST silencioso pra Edge Function (não bloqueia abertura do WhatsApp)
  function postLeadToBackend(form, payload) {
    try {
      var cfg = window.NOMADDRIVE_SUPABASE;
      if (!cfg || !cfg.url || !cfg.anonKey) return;
      var url = cfg.url.replace(/\/$/, "") + "/functions/v1/submit-lead-quote";
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": cfg.anonKey,
          "Authorization": "Bearer " + cfg.anonKey,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          // Marca form como "lead capturado" pra exibir feedback discreto
          if (data && data.ok && data.captured) {
            var note = form.querySelector(".form__lead-ok");
            if (!note) {
              note = document.createElement("p");
              note.className = "form__lead-ok";
              note.style.cssText = "margin:10px 0 0;padding:10px;background:#e8f6ee;border-left:3px solid #1a7a4f;color:#14201b;font-size:13.5px;border-radius:6px;";
              form.appendChild(note);
            }
            note.textContent = "✅ Lead capturado por e-mail também — nossa equipe responde em até 24h, mesmo que você não envie o WhatsApp.";
          }
        }).catch(function () { /* silencia */ });
    } catch (e) { /* silencia */ }
  }

  document.querySelectorAll("form.wa-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var inputs = form.querySelectorAll("[name]");
      var err = form.querySelector(".form__err");
      var missing = false;
      inputs.forEach(function (inp) {
        if (inp.hasAttribute("required") && !inp.value.trim()) missing = true;
      });
      if (missing) { if (err) err.hidden = false; return; }
      if (err) err.hidden = true;

      var intent = form.getAttribute("data-intent") || "Contato";
      var lines = [intent, ""];
      var payload = { intent: intent, source_url: window.location.href };
      inputs.forEach(function (inp) {
        var v = inp.value.trim();
        lines.push("• " + labelFor(inp) + ": " + (v || "—"));
        if (inp.name) payload[inp.name] = v;
      });

      // POST pro backend (não bloqueia)
      postLeadToBackend(form, payload);

      // Abre WhatsApp (comportamento original preservado)
      window.open(waHref(lines.join("\n")), "_blank");
    });
  });
})();

/* ====================================================================
   ORÇAMENTO — data de devolução preenchida conforme retirada + duração
   ==================================================================== */
(function () {
  var form = document.getElementById("form-orcamento");
  if (!form) return;
  var retirada = form.querySelector('[name="data"]');
  var duracao = form.querySelector('[name="duracao"]');
  var devolucao = form.querySelector('[name="devolucao"]');
  if (!retirada || !duracao || !devolucao) return;
  function update() {
    var meses = parseInt(duracao.value, 10);
    var raw = retirada.value;
    if (!raw || !meses) { devolucao.value = ""; return; }
    var d = new Date(raw + "T12:00:00");
    if (isNaN(d.getTime())) { devolucao.value = ""; return; }
    d.setMonth(d.getMonth() + meses);
    devolucao.value = d.toISOString().slice(0, 10);
  }
  retirada.addEventListener("change", update);
  duracao.addEventListener("change", update);
  update();
})();

/* ====================================================================
   LINKS de contato — qualquer elemento com [data-wa]
   ==================================================================== */
(function () {
  document.querySelectorAll("[data-wa]").forEach(function (el) {
    el.href = waHref(el.getAttribute("data-wa"));
    el.target = "_blank";
    el.rel = "noopener";
  });
})();
