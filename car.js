/* ====================================================================
   NomadDrive Brasil — página de detalhe do veículo (PT-only)
   ==================================================================== */
(function () {
  var FLEET_TIER_RATES = { A: 0.055, B: 0.045, C: 0.040, D: 0.028 };
  var CAT_LABEL = { A: "Econômico", B: "Confort", C: "Premium", D: "Luxo" };
  var WA = (typeof WA_PHONE !== "undefined") ? WA_PHONE : "5500000000000";

  function brl(n) { return "R$ " + Math.round(n).toLocaleString("pt-BR"); }
  function pt(obj) { return (obj && (obj.pt || obj.en)) || ""; }
  function el(id) { return document.getElementById(id); }

  var params = new URLSearchParams(window.location.search);
  var id = (params.get("id") || "").toLowerCase();
  var car = (window.CAR_CATALOG || {})[id];

  if (!car) {
    var miss = el("carMissing");
    if (miss) miss.hidden = false;
    return;
  }
  el("carDetail").hidden = false;

  /* ---- preço ---- */
  function monthlyPrice() {
    if (car.customPrice) return null;
    var rate = FLEET_TIER_RATES[car.tier] || 0;
    var mod = car.transmission === "manual" ? 0.9 : 1;
    return Math.round(car.fipe * rate * mod);
  }

  /* ---- galeria ---- */
  var photos = [1, 2, 3].map(function (i) { return "images/car-" + car.id + "-" + i + ".jpg"; });
  var idx = 0;
  var main = el("galleryMain");
  var counter = el("galCounter");
  var thumbs = el("galThumbs");

  function renderGallery() {
    main.src = photos[idx];
    main.alt = car.name + " — foto " + (idx + 1);
    counter.textContent = (idx + 1) + " / " + photos.length;
    Array.prototype.forEach.call(thumbs.children, function (t, i) {
      t.classList.toggle("is-active", i === idx);
    });
  }
  photos.forEach(function (src, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "car-gallery__thumb";
    b.innerHTML = '<img src="' + src + '" alt="" onerror="this.style.opacity=.3" />';
    b.addEventListener("click", function () { idx = i; renderGallery(); });
    thumbs.appendChild(b);
  });
  el("galPrev").addEventListener("click", function () { idx = (idx - 1 + photos.length) % photos.length; renderGallery(); });
  el("galNext").addEventListener("click", function () { idx = (idx + 1) % photos.length; renderGallery(); });
  renderGallery();

  /* ---- cabeçalho + specs ---- */
  if (car.pilot) el("pilotBadge").hidden = false;
  el("carCat").textContent = "Categoria " + car.tier + " · " + (CAT_LABEL[car.tier] || "");
  el("carName").textContent = car.name;
  var trans = car.transmission === "manual" ? "Manual" : "Automático";
  var fipeTxt = car.fipe ? "FIPE R$ " + car.fipe.toLocaleString("pt-BR") : "FIPE não oficial no Brasil";
  el("carMeta").textContent = car.year + " · " + trans + " · " + fipeTxt;

  el("qBody").textContent = pt(car.body) || "—";
  el("qSeats").textContent = car.seats || "—";
  el("qTrunk").textContent = car.trunkL ? car.trunkL + " L" : "—";
  el("qColor").textContent = pt(car.color) || "—";

  el("cKm").textContent = car.km ? car.km.toLocaleString("pt-BR") + " km" : "—";
  el("cRev").textContent = car.lastRevision || "—";
  el("cTires").textContent = car.tires ? car.tires + "%" : "—";

  el("carDesc").textContent = pt(car.description);
  var feat = el("carFeatures");
  var featList = (car.features && (car.features.pt || car.features.en)) || [];
  featList.forEach(function (f) {
    var li = document.createElement("li");
    li.textContent = f;
    feat.appendChild(li);
  });

  /* ---- booking ---- */
  var price = monthlyPrice();
  if (price) {
    el("bookPrice").innerHTML = "≈ " + brl(price) + "<small> /mês*</small>";
  } else {
    el("bookPrice").textContent = "Sob consulta";
    el("bookEst").textContent = "Veículo aspiracional — condições e disponibilidade sob consulta.";
  }

  var startInput = el("bookStart");
  var monthsSel = el("bookMonths");
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  function iso(d) { return d.toISOString().slice(0, 10); }
  startInput.min = iso(new Date());
  startInput.value = iso(tomorrow);

  function addMonths(d, n) { var r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
  function fmtDate(d) { return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }

  function updateBooking() {
    var months = +monthsSel.value;
    var s = startInput.value ? new Date(startInput.value + "T12:00:00") : tomorrow;
    var end = addMonths(s, months);
    el("bookEnd").textContent = fmtDate(end);
    el("bookTotal").textContent = price
      ? brl(price * months) + " · " + months + (months === 1 ? " mês" : " meses")
      : "Sob consulta";

    var msg = "Olá! Tenho interesse no " + car.name + " (aluguel mensal).\n\n" +
      "• Retirada: " + fmtDate(s) + "\n" +
      "• Duração: " + months + (months === 1 ? " mês" : " meses") + "\n" +
      (price ? "• Estimativa: " + brl(price) + "/mês (a confirmar)\n" : "") +
      "• Anúncio: " + window.location.href + "\n\n" +
      "Pode me enviar um orçamento?";
    el("bookCta").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }
  startInput.addEventListener("change", updateBooking);
  monthsSel.addEventListener("change", updateBooking);
  updateBooking();

  /* ---- compartilhar ---- */
  var shareText = "Olha este " + car.name + " na NomadDrive Brasil — aluguel mensal de carro em Uberlândia.";
  var shareUrl = window.location.href;
  el("shareWhats").href = "https://wa.me/?text=" + encodeURIComponent(shareText + " " + shareUrl);
  el("shareEmail").href = "mailto:?subject=" + encodeURIComponent("NomadDrive — " + car.name) +
    "&body=" + encodeURIComponent(shareText + "\n\n" + shareUrl);
  el("shareCopy").addEventListener("click", function () {
    var btn = el("shareCopy");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(function () {
        var old = btn.textContent;
        btn.textContent = "Link copiado!";
        setTimeout(function () { btn.textContent = old; }, 2000);
      });
    } else {
      prompt("Copie o link:", shareUrl);
    }
  });

  /* ---- meta / título ---- */
  document.title = car.name + " — NomadDrive Brasil";
  el("pageTitle").textContent = document.title;
  var desc = pt(car.description);
  el("pageDesc").setAttribute("content", desc);
  el("ogTitle").setAttribute("content", document.title);
  el("ogDesc").setAttribute("content", desc);
  el("ogImage").setAttribute("content", photos[0]);

  /* ---- outros carros ---- */
  var grid = el("otherCars");
  (window.CAR_ORDER || []).forEach(function (oid) {
    if (oid === car.id) return;
    var o = window.CAR_CATALOG[oid];
    if (!o) return;
    var a = document.createElement("a");
    a.className = "other-card";
    a.href = "car.html?id=" + o.id;
    var rate = FLEET_TIER_RATES[o.tier] || 0;
    var mod = o.transmission === "manual" ? 0.9 : 1;
    var p = o.customPrice ? "Sob consulta" : "≈ " + brl(o.fipe * rate * mod) + "/mês";
    a.innerHTML =
      '<div class="other-card__img"><img src="images/car-' + o.id + '-1.jpg" alt="' + o.name +
        '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      '<div class="other-card__body"><strong>' + o.name + '</strong>' +
        '<span>' + (CAT_LABEL[o.tier] || "") + ' · ' + p + '</span></div>';
    grid.appendChild(a);
  });
})();
