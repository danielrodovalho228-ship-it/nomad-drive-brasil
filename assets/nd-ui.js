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

  /* ---------- boot ---------- */
  function boot() {
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
