/* ====================================================================
   Nomade Drive Brasil — página de detalhe do veículo (PT-only)
   ==================================================================== */
(function () {
  // FASE 80: legacy tiers mapeiam pra preço de mercado (não % FIPE)
  // Pra cálculo detalhado com ano/km/cidade/desconto, ver /simulador-roi-proprietario.html
  var FLEET_TIER_PRICES = { A: 2400, B: 3300, C: 4300, D: 6000 };
  var CAT_LABEL = { A: "Econômico", B: "Confort", C: "Premium", D: "Luxo" };
  // link de contato seguro — usa waHref do script.js (wa.me ou e-mail, nunca número falso)
  var link = (typeof waHref === "function")
    ? waHref
    : function (m) { return "mailto:contato@nomadedrive.com.br?body=" + encodeURIComponent(m); };

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

  /* ---- preço (FASE 80: market-based, não FIPE) ---- */
  function monthlyPrice() {
    if (car.customPrice) return null;
    var base = FLEET_TIER_PRICES[car.tier] || 0;
    // Câmbio manual = preço base. Automático ainda mantém base (já refletido nas categorias de mercado).
    return base;
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
    var cta = el("bookCta");
    var months = parseInt(monthsSel.value, 10);
    if (!months || months < 1) months = 1;
    var raw = startInput.value;
    var s = raw ? new Date(raw + "T12:00:00") : null;
    var hoje = iso(new Date());

    /* data vazia, inválida (ex.: ano digitado errado) ou no passado: bloqueia o CTA */
    if (!raw || !s || isNaN(s.getTime()) || raw < hoje) {
      el("bookEnd").textContent = "—";
      el("bookTotal").textContent = "—";
      cta.textContent = "Corrija a data para pedir orçamento";
      cta.classList.add("is-disabled");
      cta.setAttribute("aria-disabled", "true");
      cta.removeAttribute("href");
      return;
    }

    var end = addMonths(s, months);
    el("bookEnd").textContent = fmtDate(end);
    el("bookTotal").textContent = price
      ? brl(price * months) + " · " + months + (months === 1 ? " mês" : " meses")
      : "Sob consulta";

    var msg = "Olá! Tenho interesse no " + car.name + " (aluguel mensal).\n\n" +
      "• Retirada: " + fmtDate(s) + "\n" +
      "• Duração: " + months + (months === 1 ? " mês" : " meses") + "\n" +
      "• Devolução estimada: " + fmtDate(end) + "\n" +
      (price ? "• Estimativa: " + brl(price) + "/mês (a confirmar)\n" : "") +
      "• Anúncio: " + window.location.href + "\n\n" +
      "Pode me enviar um orçamento?";
    cta.href = link(msg);
    cta.textContent = "Pedir orçamento no WhatsApp";
    cta.classList.remove("is-disabled");
    cta.removeAttribute("aria-disabled");
  }
  startInput.addEventListener("change", updateBooking);
  monthsSel.addEventListener("change", updateBooking);
  updateBooking();

  /* ====================================================================
     "Quero alugar este carro" — Backlog #3 (mobile feedback Daniel)
     Fluxo:
       - Não logado          → cadastro.html?retorno=<url atual>
       - Logado em rascunho  → onboarding-cliente.html
       - Logado pendente     → status-cadastro.html
       - Logado + aprovado   → cria rental_request + notifica owner/staff
     ==================================================================== */
  var rentBtn = el("rentNowCta");
  var rentMsg = el("rentFlowMsg");

  function showFlowMsg(html, kind) {
    if (!rentMsg) return;
    var bg = kind === "success" ? "#e8f6ee" : (kind === "error" ? "#fdecec" : "#fff8e0");
    var bd = kind === "success" ? "#1a7a4f" : (kind === "error" ? "#d33" : "#d4af37");
    var fg = kind === "success" ? "#14201b" : (kind === "error" ? "#7a1d1d" : "#14201b");
    rentMsg.style.display = "block";
    rentMsg.style.background = bg;
    rentMsg.style.borderLeft = "3px solid " + bd;
    rentMsg.style.color = fg;
    rentMsg.innerHTML = html;
  }

  function setBtnLoading(loading) {
    if (!rentBtn) return;
    rentBtn.disabled = !!loading;
    rentBtn.textContent = loading ? "Enviando solicitação..." : "Quero alugar este carro";
  }

  if (rentBtn) {
    rentBtn.addEventListener("click", function (e) {
      e.preventDefault();
      // Captura estado atual
      var months = parseInt(monthsSel.value, 10) || 1;
      var startDate = startInput.value || null;

      // Auth check
      if (!window.ndAuth || typeof window.ndAuth.getSession !== "function") {
        showFlowMsg(
          "Sistema de cadastro indisponível no momento. Use o WhatsApp para falar com a gente.",
          "error",
        );
        return;
      }

      setBtnLoading(true);
      window.ndAuth.getSession().then(function (session) {
        if (!session) {
          // Redireciona pra cadastro com retorno pra esta página
          var here = "car.html?id=" + car.id;
          var url = "cadastro.html?redirect=" + encodeURIComponent(here);
          showFlowMsg(
            "Você precisa criar uma conta primeiro. Redirecionando para o cadastro...",
            "info",
          );
          setTimeout(function () { window.location.href = url; }, 1200);
          return null;
        }
        // Tem sessão — checa profile
        return window.ndAuth.getProfile().then(function (profile) {
          if (!profile) {
            showFlowMsg("Perfil não encontrado. Faça login novamente.", "error");
            setBtnLoading(false);
            return;
          }
          var st = profile.verification_status;
          if (st === "rascunho" || st === "email_verificado") {
            showFlowMsg(
              "Você precisa completar seu cadastro de cliente primeiro. Redirecionando...",
              "info",
            );
            setTimeout(function () { window.location.href = "onboarding-cliente.html"; }, 1500);
            return;
          }
          if (st !== "aprovado" && st !== "aprovado_com_ressalvas") {
            showFlowMsg(
              "Seu cadastro ainda está em análise (<strong>" + (st || "—") + "</strong>). "
              + "Você receberá um e-mail quando for aprovado. "
              + "<a href='status-cadastro.html' style='color:#145f3e;text-decoration:underline;'>Ver status</a>",
              "info",
            );
            setBtnLoading(false);
            return;
          }
          // Aprovado — dispara Edge Function
          var client = window.ndAuth.client();
          if (!client || !client.functions || typeof client.functions.invoke !== "function") {
            showFlowMsg("Erro técnico. Tente novamente em alguns minutos.", "error");
            setBtnLoading(false);
            return;
          }
          return client.functions.invoke("create-rental-request", {
            body: {
              catalog_id: car.id,
              catalog_name: car.name,
              desired_start_date: startDate,
              desired_months: months,
              city: profile.city || null,
              reason: null,
            },
          }).then(function (resp) {
            setBtnLoading(false);
            if (resp.error || (resp.data && resp.data.error)) {
              var errMsg = (resp.data && resp.data.error) || resp.error.message || "Erro desconhecido";
              showFlowMsg("Não foi possível enviar a solicitação: " + errMsg, "error");
              return;
            }
            var d = resp.data || {};
            showFlowMsg(
              "✅ <strong>Solicitação enviada!</strong> "
              + "Você receberá um e-mail de confirmação em instantes. "
              + "O proprietário (ou nossa equipe) responde em até 24h. "
              + "<br><br><a href='dashboard-cliente.html' style='color:#145f3e;text-decoration:underline;font-weight:600;'>Ver no meu painel →</a>"
              + (d.rental_request_id ? "<br><small style='color:#5b6b63;'>Referência: " + d.rental_request_id.slice(0, 8) + "</small>" : ""),
              "success",
            );
            rentBtn.disabled = true;
            rentBtn.textContent = "Solicitação enviada ✓";
          }).catch(function (err) {
            setBtnLoading(false);
            showFlowMsg("Erro ao enviar: " + (err && err.message || String(err)), "error");
          });
        });
      }).catch(function (err) {
        setBtnLoading(false);
        showFlowMsg("Erro: " + (err && err.message || String(err)), "error");
      });
    });
  }

  /* ---- compartilhar ---- */
  var shareText = "Olha este " + car.name + " na Nomade Drive Brasil — aluguel mensal de carro em Uberlândia.";
  var shareUrl = window.location.href;
  el("shareWhats").href = "https://wa.me/?text=" + encodeURIComponent(shareText + " " + shareUrl);
  el("shareEmail").href = "mailto:?subject=" + encodeURIComponent("Nomade Drive — " + car.name) +
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
  document.title = car.name + " — Nomade Drive Brasil";
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
