/* ====================================================================
   Nomade Drive Brasil — Site shell loader (header + footer + drawer)
   --------------------------------------------------------------------
   Uso em cada página:
     <head>
       <link rel="stylesheet" href="assets/site-shell.css?v=1">
       <script defer src="assets/site-shell.js?v=1"></script>
     </head>
     <body data-nd-page="frota">  <!-- ou home, precos, como-funciona, etc -->
       <div id="site-header"></div>
       ...conteúdo...
       <div id="site-footer"></div>
     </body>

   O script busca /partials/header.html e /partials/footer.html via
   fetch, injeta no DOM e religa o drawer (toggle hambúrguer + ESC +
   click backdrop). Marca link ativo via data-nd-page do <body>.

   Por que não server-side include: GitHub Pages não suporta SSI. Por
   que não duplicar HTML: cada edit precisaria tocar 12 arquivos.
   ==================================================================== */
(function () {
  'use strict';

  const HEADER_URL = 'partials/header.html';
  const FOOTER_URL = 'partials/footer.html';

  // Resolve path relativo correto se a página estiver em subpasta (ex: carros/popular.html)
  function resolvePath(url) {
    const depth = (location.pathname.match(/\//g) || []).length - 1;
    return depth > 0 ? '../'.repeat(depth) + url : url;
  }

  function loadPartial(url, mountId, after) {
    const mount = document.getElementById(mountId);
    if (!mount) return Promise.resolve(null);
    return fetch(resolvePath(url))
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => {
        mount.innerHTML = html;
        if (after) after(mount);
        return mount;
      })
      .catch(err => {
        console.warn('Falha ao carregar', url, err);
        mount.innerHTML = '';
      });
  }

  function fixRelativeLinks(scope) {
    // Se estamos em subpasta (ex: carros/), os links 'frota.html' precisam virar '../frota.html'
    const depth = (location.pathname.match(/\//g) || []).length - 1;
    if (depth === 0) return;
    const prefix = '../'.repeat(depth);
    scope.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (!h) return;
      if (h.startsWith('http') || h.startsWith('//') || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:')) return;
      if (h.startsWith('../') || h.startsWith('/')) return;
      a.setAttribute('href', prefix + h);
    });
    scope.querySelectorAll('img[src]').forEach(img => {
      const s = img.getAttribute('src');
      if (!s || s.startsWith('http') || s.startsWith('/')) return;
      img.setAttribute('src', prefix + s);
    });
  }

  function markActive(scope) {
    const page = document.body.getAttribute('data-nd-page');
    if (!page) return;
    scope.querySelectorAll('[data-nd-page]').forEach(a => {
      if (a.getAttribute('data-nd-page') === page) a.classList.add('is-active');
    });
  }

  function setYear(scope) {
    const y = new Date().getFullYear();
    scope.querySelectorAll('[data-nd-year]').forEach(el => { el.textContent = y; });
  }

  function wireDrawer(headerScope) {
    const toggle = document.querySelector('[data-nd-toggle]');
    const drawer = document.getElementById('nd-drawer');
    const closeEls = document.querySelectorAll('[data-nd-close]');
    if (!toggle || !drawer) return;

    const backdrop = document.querySelector('.nd-backdrop');
    if (backdrop) backdrop.hidden = false;

    function open() {
      document.body.classList.add('is-drawer-open');
      toggle.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('aria-hidden', 'false');
      // Foco no primeiro link após animação
      setTimeout(() => {
        const first = drawer.querySelector('a, button');
        if (first) first.focus();
      }, 320);
    }
    function close() {
      document.body.classList.remove('is-drawer-open');
      toggle.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.focus();
    }
    function toggleFn() {
      document.body.classList.contains('is-drawer-open') ? close() : open();
    }

    toggle.addEventListener('click', toggleFn);
    closeEls.forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('is-drawer-open')) close();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadPartial(HEADER_URL, 'site-header', scope => {
      fixRelativeLinks(scope);
      markActive(scope);
      wireDrawer(scope);
    });
    loadPartial(FOOTER_URL, 'site-footer', scope => {
      fixRelativeLinks(scope);
      setYear(scope);
    });
  });
})();
