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

/* ---- fleet pricing (FASE 80: market-based, não FIPE × %) ---- */
// Preço base pra cards da frota — pra cálculo detalhado (ano/km/cidade/desconto)
// owner usa /simulador-roi-proprietario.html
var FLEET_TIER_PRICES = { A: 2400, B: 3300, C: 4300, D: 6000 };
// Compat: alguns trechos ainda referenciam FLEET_TIER_RATES — mantemos como zero pra
// não quebrar (qualquer referência multiplica por FIPE × 0 = 0, e o código já tem fallback).
var FLEET_TIER_RATES = { A: 0, B: 0, C: 0, D: 0 };
var CAT_LABEL = { A: "Econômico", B: "Confort", C: "Premium", D: "Luxo" };
function brl(n) { return "R$ " + Math.round(n).toLocaleString("pt-BR"); }

/* ---- Fase 57c: fallback de imagem da frota (Unsplash por tier) ---- */
var FLEET_FALLBACK = {
  // Cada URL é uma foto Unsplash genérica do tipo de carro. ?w=480&h=320 = card thumb.
  A: "https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=480&h=320&fit=crop&q=80&auto=format", // hatch compacto
  B: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=480&h=320&fit=crop&q=80&auto=format", // sedan mediano
  C: "https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=480&h=320&fit=crop&q=80&auto=format", // SUV premium
  D: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=480&h=320&fit=crop&q=80&auto=format"  // luxo
};
// Placeholder SVG inline (último recurso — se até o Unsplash falhar)
// Fix code-review M1: variavel grad era morta — agora os stops do
// linearGradient sao construidos dinamicamente pelo tier.
function fleetPlaceholderSVG(tier) {
  var labels = { A: "Econômico", B: "Confort", C: "Premium", D: "Luxo" };
  var label = labels[tier] || "Veículo";
  // Cores por tier — D fica preto/dourado (luxo); outros verde
  var c1 = tier === "D" ? "#1f2937" : "#145f3e";
  var c2 = tier === "D" ? "#374151" : "#1a7a4f";
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="480" height="320" fill="url(#g)"/>' +
      '<text x="240" y="160" font-family="Inter,sans-serif" font-size="44" fill="rgba(255,255,255,.95)" text-anchor="middle" font-weight="700">🚗</text>' +
      '<text x="240" y="220" font-family="Inter,sans-serif" font-size="22" fill="rgba(255,255,255,.85)" text-anchor="middle" font-weight="600">' + label + '</text>' +
    '</svg>'
  );
}
// Handler de erro: tenta Unsplash → placeholder SVG
function fleetImgFallback(img, tier) {
  // Step 1: imagem local falhou → tenta Unsplash do tier
  if (img.dataset.fallbackStep !== "unsplash" && img.dataset.fallbackStep !== "svg") {
    img.dataset.fallbackStep = "unsplash";
    img.src = FLEET_FALLBACK[tier] || FLEET_FALLBACK.A;
    return;
  }
  // Step 2: Unsplash também falhou → SVG placeholder local (não pode falhar)
  if (img.dataset.fallbackStep === "unsplash") {
    img.dataset.fallbackStep = "svg";
    img.src = fleetPlaceholderSVG(tier);
  }
}
// Expõe globalmente pro onerror inline poder chamar
window.fleetImgFallback = fleetImgFallback;

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

  // Fix code-review C1: sanitiza tier (whitelist) + escapa nome/year/body
  // via textContent (DOM API) — se CAR_CATALOG virar dinamico no futuro
  // (Supabase ou admin input), atacante nao consegue injetar HTML.
  var VALID_TIERS = { A: 1, B: 1, C: 1, D: 1 };
  function setText(el, t) { el.textContent = (t == null ? "" : String(t)); return el; }
  function makeEl(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  order.forEach(function (id) {
    var c = window.CAR_CATALOG[id];
    if (!c || id === "cybertruck") return;
    var safeTier = VALID_TIERS[c.tier] ? c.tier : "A";  // bloqueia tier malicioso
    // FASE 80: preço de mercado por tier (não FIPE × %)
    var price = FLEET_TIER_PRICES[safeTier] || 0;
    var trans = c.transmission === "manual" ? "Manual" : "Automático";
    var body = (c.body && c.body.pt) ? c.body.pt : "";

    var a = makeEl("a", "fleet-car");
    a.href = "car.html?id=" + encodeURIComponent(c.id);
    a.setAttribute("data-tier", safeTier);

    var imgWrap = makeEl("div", "fleet-car__img");
    var img = makeEl("img");
    img.src = "images/car-" + encodeURIComponent(c.id) + "-1.jpg";
    img.alt = String(c.name || "");
    img.loading = "lazy";
    // Fallback via JS (sem inline onerror — assim safeTier nao vira string interp)
    img.addEventListener("error", function () {
      window.fleetImgFallback(img, safeTier);
    });
    imgWrap.appendChild(img);

    var bodyEl = makeEl("div", "fleet-car__body");
    bodyEl.appendChild(setText(makeEl("span", "fleet-car__cat"), CAT_LABEL[safeTier] || ""));
    bodyEl.appendChild(setText(makeEl("span", "fleet-car__name"), c.name));
    bodyEl.appendChild(setText(makeEl("span", "fleet-car__meta"),
      c.year + " · " + trans + (body ? " · " + body : "")));

    if (price) {
      var priceEl = makeEl("span", "fleet-car__price");
      priceEl.textContent = "≈ " + brl(price);
      var small = makeEl("small");
      small.textContent = "/mês";
      priceEl.appendChild(small);
      bodyEl.appendChild(priceEl);
      bodyEl.appendChild(setText(makeEl("span", "fleet-car__est"),
        "Preço de mercado — ajustado por ano/km/cidade no orçamento"));
    } else {
      bodyEl.appendChild(setText(makeEl("span", "fleet-car__price"), "Sob consulta"));
    }
    bodyEl.appendChild(setText(makeEl("span", "btn btn--outline btn--sm fleet-car__cta"), "Ver detalhes"));

    a.appendChild(imgWrap);
    a.appendChild(bodyEl);
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
  // Fix code-review C1 (hero idem): sanitiza tier + encodeURIComponent no id
  var VALID_TIERS_H = { A: 1, B: 1, C: 1, D: 1 };
  order.forEach(function (id) {
    var c = window.CAR_CATALOG[id];
    if (!c || id === "cybertruck") return;
    var safeTier = VALID_TIERS_H[c.tier] ? c.tier : "A";
    // Slide vira <a> clicável → leva direto pra página do carro (UX #2 backlog mobile)
    var slide = document.createElement("a");
    slide.className = "hero-slide";
    slide.href = "car.html?id=" + encodeURIComponent(c.id);
    slide.setAttribute("aria-label", "Ver detalhes do " + String(c.name || ""));
    var img = document.createElement("img");
    img.src = "images/car-" + encodeURIComponent(c.id) + "-1.jpg";
    img.alt = String(c.name || "");
    img.loading = "lazy";
    img.onerror = function () { window.fleetImgFallback(img, safeTier); };
    var cap = document.createElement("span");
    cap.className = "hero-slide__cap";
    cap.textContent = (c.name || "") + " — ver detalhes →";
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

  // FASE 80: preços agora são MARKET-BASED (não % FIPE).
  // Cada tier legado mapeia pra uma categoria nova de mercado.
  // Pra cálculo detalhado com ano/km/cidade/desconto, ver /simulador-roi-proprietario.html
  var TIERS = {
    A: { price: 2400, rate: 0,      repFipe: 50000,  marketCat: "Hatch Econômico (Onix 1.0, HB20 manual)" },
    B: { price: 3300, rate: 0,      repFipe: 80000,  marketCat: "Hatch Automático (HB20 AT, Onix AT)" },
    C: { price: 4300, rate: 0,      repFipe: 135000, marketCat: "SUV Médio (Tracker, T-Cross, Renegade)" },
    D: { price: 6000, rate: 0,      repFipe: 250000, marketCat: "Luxo Importado (BMW, Audi, Tesla)" }
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
    // FASE 80: ignora FIPE — preço agora vem da categoria (market-based).
    // FIPE é coletado pra cálculo de ROI/depreciação, não pra definir aluguel.
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
