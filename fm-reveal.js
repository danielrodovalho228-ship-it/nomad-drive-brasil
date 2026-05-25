/* ====================================================================
   Nomade Drive Brasil — fm-reveal (Framer Motion-inspired)
   --------------------------------------------------------------------
   Inicializa scroll-triggered animations usando IntersectionObserver.
   Performance-friendly: usa transform+opacity (GPU). Sem libs externas.

   USO no HTML:
     <div data-fm-reveal>Esconde até entrar na viewport</div>
     <div data-fm-reveal="slide-left" data-fm-delay="200">Custom</div>

   Variantes (data-fm-reveal="X"):
     - "" ou "slide-up"  (default — fade + slide up)
     - "slide-left"      (fade + slide right→left)
     - "slide-right"     (fade + slide left→right)
     - "scale"           (fade + scale 0.9→1)
     - "blur"            (fade + blur 8px→0)

   Delay (data-fm-delay="N"): 100, 200, 300, 400, 500 (ms)
   ==================================================================== */

(function () {
  'use strict';

  // Sem IntersectionObserver? Mostra tudo direto (graceful degradation)
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-fm-reveal]').forEach(function (el) {
      el.classList.add('is-revealed');
    });
    return;
  }

  // Respeita prefer reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-fm-reveal]').forEach(function (el) {
      el.classList.add('is-revealed');
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target); // só anima 1x
      }
    });
  }, {
    threshold: 0.1,       // dispara quando 10% do elemento aparece
    rootMargin: '0px 0px -50px 0px' // dispara um pouco ANTES de aparecer
  });

  function init() {
    document.querySelectorAll('[data-fm-reveal]').forEach(function (el) {
      observer.observe(el);
    });
  }

  // Init no DOM ready + observa mutações pra elementos adicionados dinamicamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-observa elementos novos (caso JS adicione mais elementos depois)
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return; // só elementos
          if (node.hasAttribute && node.hasAttribute('data-fm-reveal')) {
            observer.observe(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('[data-fm-reveal]').forEach(function (el) {
              observer.observe(el);
            });
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ============================================================
     BONUS: Number Counter (anima 0 → valor)
     ============================================================ */
  function animateCounter(el, target, duration) {
    duration = duration || 1500;
    var start = 0;
    var startTime = null;

    function update(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      // Easing: easeOutQuart (decelera no fim — Framer Motion-like)
      var eased = 1 - Math.pow(1 - progress, 4);
      var current = Math.floor(eased * (target - start) + start);
      el.textContent = current.toLocaleString('pt-BR');
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target.toLocaleString('pt-BR');
    }
    requestAnimationFrame(update);
  }

  // Auto-anima [data-fm-counter] quando entra na viewport
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var target = parseInt(entry.target.getAttribute('data-fm-counter'), 10);
        var duration = parseInt(entry.target.getAttribute('data-fm-counter-duration') || '1500', 10);
        if (!isNaN(target)) animateCounter(entry.target, target, duration);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  function initCounters() {
    document.querySelectorAll('[data-fm-counter]').forEach(function (el) {
      counterObserver.observe(el);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounters);
  } else {
    initCounters();
  }

  // Expõe API pública
  window.fmReveal = {
    animateCounter: animateCounter
  };
})();
