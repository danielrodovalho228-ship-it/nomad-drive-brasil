/* ============================================================
   NomadDrive Brasil — car detail page (Turo-style)
   Reads id from ?id=cobalt, finds the car in CAR_CATALOG, renders.
   ============================================================ */
(function () {
  // -- shared constants (kept in sync with main script.js) --
  const FLEET_TIER_RATES = { A: 0.055, B: 0.045, C: 0.040, D: 0.028 };
  const USD_RATE = 5.50;
  const WA_PHONE = "5500000000000";  // same placeholder used in index.html footer

  const url = new URL(window.location.href);
  const id = (url.searchParams.get("id") || "").toLowerCase();
  const car = (window.CAR_CATALOG || {})[id];

  // Show "not found" if id missing / unknown
  if (!car) {
    const missing = document.getElementById("carMissing");
    if (missing) missing.hidden = false;
    return;
  }
  document.getElementById("carDetail").hidden = false;

  // -- read current language from <html lang> set by script.js, default to en --
  function currentLang() {
    return (document.documentElement.getAttribute("lang") || "en").toLowerCase();
  }
  function tr(obj) {
    const lang = currentLang();
    if (!obj || typeof obj !== "object") return obj || "";
    return obj[lang] || obj.en || obj.pt || "";
  }

  // ============================================================
  // PRICE
  // ============================================================
  function computePrice() {
    if (car.customPrice) return null;             // Cybertruck
    const rate = FLEET_TIER_RATES[car.tier] || 0;
    const mod  = car.transmission === "manual" ? 0.9 : 1;
    return Math.round(car.fipe * rate * mod);
  }
  function fmtBRL(n) {
    return "R$ " + Math.round(n).toLocaleString("pt-BR");
  }
  function fmtPct(r, lang) {
    const v = (r * 100).toFixed(1);
    return (lang !== "en" ? v.replace(".", ",") : v) + "%";
  }
  function priceLabel(lang) {
    return { en: "/mo", pt: "/mês", es: "/mes" }[lang] || "/mês";
  }

  // ============================================================
  // GALLERY
  // ============================================================
  const photos = [1, 2, 3].map((i) => `images/car-${car.id}-${i}.jpg`);
  let idx = 0;
  const galMain = document.getElementById("galleryMain");
  const galCounter = document.getElementById("galleryCounter");
  const galThumbs = document.getElementById("galleryThumbs");

  function renderGallery() {
    galMain.src = photos[idx];
    galMain.alt = car.name + " — foto " + (idx + 1);
    galCounter.textContent = (idx + 1) + " / " + photos.length;
    [...galThumbs.children].forEach((t, i) => {
      t.classList.toggle("is-active", i === idx);
    });
  }
  photos.forEach((src, i) => {
    const t = document.createElement("button");
    t.type = "button";
    t.className = "car-gallery__thumb";
    t.innerHTML = `<img src="${src}" alt="" />`;
    t.addEventListener("click", () => { idx = i; renderGallery(); });
    galThumbs.appendChild(t);
  });
  document.getElementById("galleryPrev").addEventListener("click", () => {
    idx = (idx - 1 + photos.length) % photos.length; renderGallery();
  });
  document.getElementById("galleryNext").addEventListener("click", () => {
    idx = (idx + 1) % photos.length; renderGallery();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft")  { idx = (idx - 1 + photos.length) % photos.length; renderGallery(); }
    if (e.key === "ArrowRight") { idx = (idx + 1) % photos.length; renderGallery(); }
  });
  // basic touch swipe
  let touchStartX = 0;
  galMain.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  galMain.addEventListener("touchend",   (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    idx = dx < 0 ? (idx + 1) % photos.length : (idx - 1 + photos.length) % photos.length;
    renderGallery();
  });

  if (car.pilot) document.getElementById("pilotBadge").hidden = false;
  renderGallery();

  // ============================================================
  // CALENDAR / BOOKING
  // ============================================================
  const startInput = document.getElementById("bookStart");
  // default = tomorrow
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = (d) => d.toISOString().slice(0, 10);
  startInput.min   = iso(new Date());
  startInput.value = iso(tomorrow);

  let months = 2;
  document.querySelectorAll(".months-opt").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".months-opt").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      months = +b.dataset.months;
      update();
    });
  });
  startInput.addEventListener("change", update);

  function addMonths(d, n) {
    const r = new Date(d);
    r.setMonth(r.getMonth() + n);
    return r;
  }
  function fmtDate(d, lang) {
    const locale = { en: "en-US", pt: "pt-BR", es: "es-AR" }[lang] || "pt-BR";
    return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  }

  // ============================================================
  // SHARE
  // ============================================================
  function shareTexts(lang) {
    const url = window.location.href;
    const name = car.name;
    const dict = {
      en: { text: `Check out the ${name} on NomadDrive Brasil — monthly rental, all-in price.`, subject: `NomadDrive — ${name}` },
      pt: { text: `Olha esse ${name} na NomadDrive Brasil — locação mensal, preço fechado.`, subject: `NomadDrive — ${name}` },
      es: { text: `Mirá este ${name} en NomadDrive Brasil — alquiler mensual, precio cerrado.`, subject: `NomadDrive — ${name}` },
    };
    const m = dict[lang] || dict.en;
    return { url, ...m };
  }

  // Native share API support
  const shareBtn = document.getElementById("shareNative");
  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener("click", async () => {
      const s = shareTexts(currentLang());
      try { await navigator.share({ title: s.subject, text: s.text, url: s.url }); } catch (_) {}
    });
  }

  document.getElementById("shareCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const fb = document.getElementById("shareFeedback");
      fb.hidden = false;
      clearTimeout(window.__shareFbT);
      window.__shareFbT = setTimeout(() => { fb.hidden = true; }, 2200);
    } catch (e) { alert(window.location.href); }
  });

  // ============================================================
  // WhatsApp message builder
  // ============================================================
  function buildWaMsg(lang) {
    const s = startInput.value;
    const startD = s ? new Date(s + "T12:00:00") : tomorrow;
    const endD   = addMonths(startD, months);
    const price  = computePrice();
    const dict = {
      en: {
        hi: "Hi! I'd like to reserve",
        from: "from",
        to: "until",
        months: months === 1 ? "month" : "months",
        for: "for",
        link: "Listing: ",
        ref: "Referred by: (optional)",
      },
      pt: {
        hi: "Oi! Quero reservar o",
        from: "de",
        to: "até",
        months: months === 1 ? "mês" : "meses",
        for: "por",
        link: "Anúncio: ",
        ref: "Indicação: (opcional)",
      },
      es: {
        hi: "¡Hola! Quiero reservar el",
        from: "del",
        to: "al",
        months: months === 1 ? "mes" : "meses",
        for: "por",
        link: "Listado: ",
        ref: "Recomendado por: (opcional)",
      },
    };
    const w = dict[lang] || dict.en;
    const priceLine = price
      ? ` ${w.for} ~${fmtBRL(price)}/mês (${months} ${w.months})`
      : ` (${w.for} ${months} ${w.months})`;
    const lines = [
      `${w.hi} ${car.name}`,
      `${w.from} ${fmtDate(startD, lang)} ${w.to} ${fmtDate(endD, lang)}${priceLine}.`,
      "",
      `${w.link}${window.location.href}`,
      "",
      w.ref,
    ];
    return lines.join("\n");
  }

  // ============================================================
  // RENDER
  // ============================================================
  function update() {
    const lang = currentLang();
    const tierName = (window.TIER_LABELS[car.tier] || {})[lang] || car.tier;
    const transLabel = car.transmission === "manual"
      ? ({ en: "Manual", pt: "Manual", es: "Manual" })[lang]
      : ({ en: "Automatic", pt: "Automático", es: "Automático" })[lang];

    // header
    document.getElementById("carTier").textContent = `CATEGORIA ${car.tier} · ${tierName}`;
    document.getElementById("carName").textContent = car.name;
    const fipeText = car.fipe
      ? "FIPE R$ " + car.fipe.toLocaleString("pt-BR")
      : ({ en: "FIPE not official in Brazil", pt: "FIPE não oficial no Brasil", es: "FIPE no oficial en Brasil" })[lang];
    document.getElementById("carMeta").textContent = `${car.year} · ${transLabel} · ${fipeText}`;

    // quick specs
    document.getElementById("qBody").textContent  = tr(car.body);
    document.getElementById("qSeats").textContent = car.seats;
    document.getElementById("qTrunk").textContent = car.trunkL ? car.trunkL + " L" : "—";
    document.getElementById("qColor").textContent = tr(car.color);

    // condition
    document.getElementById("cKm").textContent    = car.km.toLocaleString("pt-BR");
    document.getElementById("cRev").textContent   = car.lastRevision;
    document.getElementById("cTires").textContent = car.tires + "%";

    // description + features
    document.getElementById("carDescription").textContent = tr(car.description);
    const feat = document.getElementById("carFeatures");
    feat.innerHTML = "";
    (car.features[lang] || car.features.en).forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      feat.appendChild(li);
    });

    // price block
    const price = computePrice();
    if (price) {
      document.getElementById("bookPrice").textContent = fmtBRL(price);
      document.getElementById("bookUsd").textContent   = "≈ $" + Math.round(price / USD_RATE) + " USD";
      const rate = FLEET_TIER_RATES[car.tier] || 0;
      const fmtMod = car.transmission === "manual" ? ` × ${lang === "en" ? "0.9" : "0,9"} (manual)` : "";
      document.getElementById("bookFormula").textContent = `FIPE × ${fmtPct(rate, lang)}${fmtMod} · Cat. ${car.tier}`;
    } else {
      document.getElementById("bookPrice").textContent = tr(car.customPrice);
      document.getElementById("bookUsd").textContent   = "";
      document.getElementById("bookFormula").textContent = ({ en: "Custom pricing — talk to us", pt: "Preço sob consulta — fale com a gente", es: "Precio a consultar — escribinos" })[lang];
    }
    const unit = document.querySelector("[data-i18n='car.priceUnit']");
    if (unit) unit.textContent = priceLabel(lang);

    // dates / total
    const s = startInput.value;
    const startD = s ? new Date(s + "T12:00:00") : tomorrow;
    const endD   = addMonths(startD, months);
    document.getElementById("bookEnd").textContent = fmtDate(endD, lang);
    document.getElementById("bookTotal").textContent = price
      ? fmtBRL(price * months) + " · " + months + (lang === "en" ? (months === 1 ? " month" : " months") : (lang === "pt" ? (months === 1 ? " mês" : " meses") : (months === 1 ? " mes" : " meses")))
      : tr(car.customPrice);

    // WhatsApp link
    document.getElementById("bookCta").href =
      `https://wa.me/${WA_PHONE}?text=` + encodeURIComponent(buildWaMsg(lang));

    // Share links
    const s2 = shareTexts(lang);
    document.getElementById("shareWhats").href =
      `https://wa.me/?text=` + encodeURIComponent(s2.text + " " + s2.url);
    document.getElementById("shareEmail").href =
      `mailto:?subject=` + encodeURIComponent(s2.subject) +
      `&body=` + encodeURIComponent(s2.text + "\n\n" + s2.url);

    // <title> / meta
    document.title = `${car.name} — NomadDrive Brasil`;
    document.getElementById("pageTitle").textContent = document.title;
    const desc = tr(car.description);
    document.getElementById("pageDesc").setAttribute("content", desc);
    document.getElementById("ogTitle").setAttribute("content", document.title);
    document.getElementById("ogDesc").setAttribute("content", desc);
    document.getElementById("ogImage").setAttribute("content", photos[0]);
  }

  // ============================================================
  // OTHER CARS strip
  // ============================================================
  function renderOthers() {
    const lang = currentLang();
    const grid = document.getElementById("otherCars");
    if (!grid) return;
    grid.innerHTML = "";
    (window.CAR_ORDER || []).forEach((otherId) => {
      if (otherId === car.id) return;
      const o = window.CAR_CATALOG[otherId];
      if (!o) return;
      const rate = FLEET_TIER_RATES[o.tier] || 0;
      const mod  = o.transmission === "manual" ? 0.9 : 1;
      const p    = o.customPrice ? tr(o.customPrice) : fmtBRL(o.fipe * rate * mod);
      const a = document.createElement("a");
      a.className = "other-card";
      a.href = "car.html?id=" + o.id;
      a.innerHTML = `
        <div class="other-card__img"><img src="images/car-${o.id}-1.jpg" alt="${o.name}" loading="lazy" /></div>
        <div class="other-card__body">
          <span class="other-card__tier">Cat. ${o.tier}</span>
          <strong>${o.name}</strong>
          <span class="other-card__year">${o.year}</span>
          <span class="other-card__price">${p}${o.customPrice ? "" : " /mês"}</span>
        </div>`;
      grid.appendChild(a);
    });
  }

  // Initial render + react to language changes from main script
  update();
  renderOthers();

  // The main script.js triggers applyLang() on lang button clicks. We listen
  // by polling the active lang button — but cleaner: intercept the toggle.
  document.querySelectorAll(".lang-toggle__opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      // tiny delay so applyLang() in script.js runs first and updates <html lang>
      setTimeout(() => { update(); renderOthers(); }, 20);
    });
  });
})();
