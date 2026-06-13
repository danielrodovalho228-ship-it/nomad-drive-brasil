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

  // === Auto-redirect: se URL tem hash de recovery do Supabase Auth,
  // manda pra página de redefinir-senha.html sem perder o token.
  // Executa ANTES de tudo (DOM ainda nem carregou) pra não deixar
  // o usuário ver flash da home.
  (function () {
    var hash = window.location.hash || '';
    if (hash.indexOf('type=recovery') === -1) return;
    if (/redefinir-senha\.html/.test(window.location.pathname)) return;
    var depth = (window.location.pathname.match(/\//g) || []).length - 1;
    var prefix = depth > 0 ? '../'.repeat(depth) : '';
    window.location.replace(prefix + 'redefinir-senha.html' + hash);
  })();

  // === Design System v4 (Redesign fintech) ===
  // Injeta a fonte Plus Jakarta Sans, o nd-design.css e o nd-ui.js em
  // TODAS as páginas sem precisar editar cada HTML. O nd-design.css
  // entra DEPOIS dos estilos da página, então as regras dele vencem.
  (function injectDesignSystem() {
    var depth = (location.pathname.match(/\//g) || []).length - 1;
    var prefix = depth > 0 ? '../'.repeat(depth) : '';
    var head = document.head;

    if (!document.querySelector('link[href*="Plus+Jakarta"]')) {
      var f = document.createElement('link');
      f.rel = 'stylesheet';
      f.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      head.appendChild(f);
    }
    if (!document.querySelector('link[href*="nd-design.css"]')) {
      var c = document.createElement('link');
      c.rel = 'stylesheet';
      c.href = prefix + 'assets/nd-design.css?v=3';
      head.appendChild(c);
    }
    if (!document.querySelector('script[src*="nd-ui.js"]')) {
      var s = document.createElement('script');
      s.defer = true;
      s.src = prefix + 'assets/nd-ui.js?v=2';
      head.appendChild(s);
    }
  })();

  const HEADER_URL = 'partials/header.html';
  const HEADER_APP_URL = 'partials/header-app.html';
  const FOOTER_URL = 'partials/footer.html';

  // Escolhe o partial certo de header:
  //  - body data-nd-shell="app"  → header-app.html (área logada do cliente)
  //  - body data-nd-header-src="..." → URL customizada
  //  - default                      → header.html (público)
  function pickHeaderUrl() {
    var custom = document.body.getAttribute('data-nd-header-src');
    if (custom) return custom;
    var mode = document.body.getAttribute('data-nd-shell');
    if (mode === 'app') return HEADER_APP_URL;
    return HEADER_URL;
  }

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

  // Religa botões [data-logout] que estão dentro do header injetado
  // dinamicamente. Preferência: ndAuth.wireLogout() (auth.js) — ele já
  // tem a lógica completa de signOut + redirect. Fallback simples se
  // ndAuth não estiver carregado.
  function wireLogout(scope) {
    if (window.ndAuth && typeof window.ndAuth.wireLogout === 'function') {
      window.ndAuth.wireLogout();
      return;
    }
    scope.querySelectorAll('[data-logout]').forEach(function (btn) {
      if (btn.getAttribute('data-logout-wired')) return;
      btn.setAttribute('data-logout-wired', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'index.html';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    var headerUrl = pickHeaderUrl();
    loadPartial(headerUrl, 'site-header', scope => {
      fixRelativeLinks(scope);
      markActive(scope);
      wireDrawer(scope);
      wireLogout(scope);
    });
    loadPartial(FOOTER_URL, 'site-footer', scope => {
      fixRelativeLinks(scope);
      setYear(scope);
    });
  });
})();
