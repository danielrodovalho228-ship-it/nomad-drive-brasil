/* ====================================================================
   NOMADE DRIVE — UI runtime v4 (Redesign R1)
   --------------------------------------------------------------------
   Injetado em todas as páginas pelo site-shell.js. Responsável por:
     1. Navbar: estado .is-scrolled (sombra/blur ao rolar)
     2. Reveal on scroll (.nd-reveal -> .in) via IntersectionObserver
     3. Contagem animada de números ([data-count])
     4. Accordion (.nd-acc) do FAQ
   Tudo no-op se a página não tiver os elementos — seguro globalmente.
   ==================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Navbar scroll ---------- */
  function syncNav() {
    var nav = document.querySelector('.nd-nav');
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', syncNav, { passive: true });
  // Header chega via fetch — tenta de novo até aparecer (máx ~3s)
  var navTries = 0;
  var navTimer = setInterval(function () {
    navTries++;
    if (document.querySelector('.nd-nav') || navTries > 30) {
      clearInterval(navTimer);
      syncNav();
    }
  }, 100);

  /* ---------- 2. Reveal on scroll ---------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = null;

  function initReveals() {
    var els = document.querySelectorAll('.nd-reveal:not(.in)');
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); runCounts(el); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          runCounts(en.target);
          io.unobserve(en.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    }
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. Contagem animada ---------- */
  function animateCount(el) {
    if (el.getAttribute('data-counted')) return;
    el.setAttribute('data-counted', '1');
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';
    if (reduceMotion) {
      el.textContent = prefix + target.toLocaleString('pt-BR') + suffix;
      return;
    }
    var dur = 1100;
    var t0 = null;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
      el.textContent = prefix + Math.round(target * eased).toLocaleString('pt-BR') + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function runCounts(scope) {
    if (scope.hasAttribute && scope.hasAttribute('data-count')) animateCount(scope);
    (scope.querySelectorAll ? scope.querySelectorAll('[data-count]') : []).forEach(animateCount);
  }

  /* ---------- 4. Accordion ---------- */
  document.addEventListener('click', function (e) {
    var q = e.target.closest('.nd-acc__q');
    if (!q) return;
    var acc = q.closest('.nd-acc');
    if (!acc) return;
    var wasOpen = acc.classList.contains('open');
    // Fecha irmãos do mesmo grupo (um aberto por vez)
    var group = acc.parentElement;
    if (group) {
      group.querySelectorAll('.nd-acc.open').forEach(function (other) {
        if (other !== acc) {
          other.classList.remove('open');
          var ob = other.querySelector('.nd-acc__q');
          if (ob) ob.setAttribute('aria-expanded', 'false');
        }
      });
    }
    acc.classList.toggle('open', !wasOpen);
    q.setAttribute('aria-expanded', String(!wasOpen));
  });

  /* ---------- 5. "Compare o preço final" (.ptruth) ---------- */
  function renderPriceTruth() {
    var mount = document.querySelector('[data-pricetruth]');
    if (!mount || mount.getAttribute('data-rendered')) return;
    var P = window.NOMADE_PRICES;
    if (!P || !P.referencia_mercado) return;
    var R = P.referencia_mercado;
    var fmt = function (v) { return P.formatBRL(v); };

    // NomadeDrive sedan — lê do plano canônico (single source)
    var sedan30 = P.planMonthly('sedan', 'essencial', 30);
    var sedan90 = P.planMonthly('sedan', 'essencial', 90);
    var sedanKm = (P.plans.sedan.essencial.kmMonthly || 3000).toLocaleString('pt-BR');

    var lines = R.anatomia.map(function (l) {
      return '<div class="ptruth-line">' +
        '<span><span class="ptruth-line__label">' + l.label + '</span>' +
        (l.detail ? '<span class="ptruth-line__detail">' + l.detail + '</span>' : '') + '</span>' +
        '<span class="ptruth-line__val' + (l.plus ? ' ptruth-line__val--plus' : '') + '">' + fmt(l.valor) + '</span>' +
      '</div>';
    }).join('');

    var cats = R.categorias.map(function (c) {
      var trad = c.tradMax ? (fmt(c.tradMin) + ' a ' + fmt(c.tradMax)) : (fmt(c.tradMin) + '+');
      var chip = c.status === 'disponivel'
        ? '<span class="ptruth-tbl__chip ptruth-tbl__chip--ok">Disponível</span>'
        : '<span class="ptruth-tbl__chip ptruth-tbl__chip--soon">Em breve</span>';
      return '<tr><td>' + c.nome + '</td><td>' + trad + '/mês</td>' +
        '<td>' + c.nomade + chip +
        (c.nomadeNota ? '<span class="ptruth-tbl__nota">' + c.nomadeNota + '</span>' : '') +
        '</td></tr>';
    }).join('');

    mount.className = 'ptruth';
    mount.innerHTML =
      '<div class="ptruth__wrap">' +
        '<div class="ptruth__head nd-reveal">' +
          '<span class="nd-eyebrow">Compare o preço final</span>' +
          '<h2>O preço anunciado não é o preço que se paga</h2>' +
          '<p>Em locadora tradicional, a diária baixa vira outra conta no fim — proteção recomendada e taxas entram depois. Aqui o número que você vê já é o total.</p>' +
        '</div>' +

        '<div class="ptruth__anatomy">' +
          '<div class="ptruth-card ptruth-card--trad nd-reveal">' +
            '<div class="ptruth-card__tag">Locadora tradicional · sedan</div>' +
            lines +
            '<div class="ptruth-card__total">' +
              '<span class="ptruth-card__total-label">Total real</span>' +
              '<span class="ptruth-card__total-val">' + fmt(R.anatomiaTotal) + '<span style="font-size:14px;font-weight:600;color:var(--nd-gray-400);">/mês</span></span>' +
            '</div>' +
            '<div class="ptruth-card__foot">com ~' + R.anatomiaKmMes.toLocaleString('pt-BR') + ' km/mês em contratos longos</div>' +
          '</div>' +

          '<div class="ptruth__vs"><span>vs</span></div>' +

          '<div class="ptruth-card ptruth-card--nomade nd-reveal">' +
            '<div class="ptruth-card__tag">NomadeDrive · sedan</div>' +
            '<div class="ptruth-card__big">' +
              '<div class="ptruth-card__price">' + fmt(sedan30) + '<small>/mês</small></div>' +
              '<p class="ptruth-card__sub">Tudo incluso. <strong>' + sedanKm + ' km/mês.</strong> Zero taxa surpresa. ' + fmt(sedan90) + '/mês em 90+ dias.</p>' +
              '<div class="ptruth-card__pills">' +
                '<span class="ptruth-card__pill">Proteção</span>' +
                '<span class="ptruth-card__pill">Manutenção</span>' +
                '<span class="ptruth-card__pill">IPVA</span>' +
                '<span class="ptruth-card__pill">Assistência 24h</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<p class="ptruth__microcopy nd-reveal">"O preço que você vê é o preço que você paga."</p>' +

        '<div class="ptruth__cats nd-reveal">' +
          '<h3>Preço final por categoria</h3>' +
          '<table class="ptruth-tbl">' +
            '<thead><tr><th>Categoria</th><th>Locadoras tradicionais<br><span style="font-weight:500;opacity:.8;">preço final c/ proteção e taxas</span></th><th>NomadeDrive</th></tr></thead>' +
            '<tbody>' + cats + '</tbody>' +
          '</table>' +
          '<div class="ptruth__econ">No sedan: até <strong>' + fmt(R.economiaSedanMaxBRL) + '/mês</strong> de economia — com mais km incluído.</div>' +
        '</div>' +

        '<div class="ptruth__contract nd-reveal">' +
          '<div class="ptruth__contract-them"><h4>Locadora tradicional</h4><p>Contrato de 90 dias ganha 2–4% de desconto — e o km incluído costuma encolher.</p></div>' +
          '<div class="ptruth__contract-us"><h4>NomadeDrive</h4><p>90+ dias = <strong>R$ 200/mês de desconto</strong> e os mesmos <strong>' + sedanKm + ' km/mês</strong>.</p></div>' +
        '</div>' +

        '<p class="ptruth__disclaimer">Valores de locadoras tradicionais simulados em ' + R.dataSimulacao + ' para ' + R.local + ', contratos de 30 a 90 dias, com pacote de proteção recomendado e taxas incluídas. Sujeitos a alteração. Comparativo informativo — não usamos nome, logotipo ou imagem de concorrentes.</p>' +
      '</div>';

    mount.setAttribute('data-rendered', '1');
    initReveals();
  }

  /* ---------- boot ---------- */
  function boot() {
    renderPriceTruth();
    initReveals();
    syncNav();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // API pública: páginas que injetam conteúdo dinâmico chamam
  // window.ndUI.refresh() pra religar reveals/counts novos.
  window.ndUI = { refresh: initReveals };
})();
