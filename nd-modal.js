/* ============================================================
 * Nomade Drive Brasil — Modal helper (UX #12)
 * ============================================================
 * Substitui window.confirm() / window.alert() por modal não-bloqueante
 * com animação suave e Promise-based API.
 *
 * USO:
 *   var ok = await ndModal.confirm({
 *     title: "Cancelar assinatura?",
 *     body: "Esta ação...",
 *     okText: "Sim, cancelar",
 *     cancelText: "Não",
 *     danger: true   // botão OK vira vermelho
 *   });
 *   if (ok) { ... }
 *
 *   await ndModal.alert({
 *     title: "Sucesso",
 *     body: "Operação concluída.",
 *     icon: "✅"
 *   });
 *
 * Funciona sem dependências. Inclui CSS inline na primeira chamada.
 * ============================================================ */
(function () {
  if (window.ndModal) return; // já carregado

  var CSS_INJECTED = false;
  var CSS = '\
    .ndm-backdrop { position: fixed; inset: 0; z-index: 99999;\
      background: rgba(20,32,27,0.55); display: flex;\
      align-items: center; justify-content: center; padding: 20px;\
      opacity: 0; transition: opacity 0.18s ease;\
      backdrop-filter: blur(2px); }\
    .ndm-backdrop[data-open="true"] { opacity: 1; }\
    .ndm-box { background: #fff; border-radius: 14px;\
      width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto;\
      box-shadow: 0 25px 80px rgba(0,0,0,0.4);\
      transform: translateY(20px) scale(0.96);\
      transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1); }\
    .ndm-backdrop[data-open="true"] .ndm-box {\
      transform: translateY(0) scale(1); }\
    .ndm-head { padding: 22px 26px 6px; display: flex;\
      align-items: center; gap: 12px; }\
    .ndm-icon { font-size: 28px; line-height: 1; }\
    .ndm-title { font-size: 18px; font-weight: 700; color: #14201b;\
      margin: 0; flex: 1; font-family: "Sora", sans-serif; }\
    .ndm-body { padding: 8px 26px 18px; font-size: 14.5px;\
      line-height: 1.55; color: #3a4945; white-space: pre-wrap; }\
    .ndm-body strong { color: #14201b; }\
    .ndm-input { width: 100%; padding: 10px 12px; border: 1px solid #ccd5cf;\
      border-radius: 8px; font-size: 14px; margin-top: 10px;\
      font-family: inherit; }\
    .ndm-input:focus { outline: 2px solid #1a7a4f; outline-offset: 1px; }\
    .ndm-footer { padding: 14px 26px 20px; display: flex;\
      justify-content: flex-end; gap: 10px; flex-wrap: wrap; }\
    .ndm-btn { padding: 10px 20px; border-radius: 8px;\
      font-size: 14px; font-weight: 600; cursor: pointer;\
      border: 1px solid; transition: all 0.15s; font-family: inherit; }\
    .ndm-btn--cancel { background: #fff; color: #5b6b63;\
      border-color: #ccd5cf; }\
    .ndm-btn--cancel:hover { background: #f4f7f5; border-color: #5b6b63; }\
    .ndm-btn--ok { background: #1a7a4f; color: #fff; border-color: #1a7a4f; }\
    .ndm-btn--ok:hover { background: #0f5132; border-color: #0f5132; }\
    .ndm-btn--danger { background: #b00020; color: #fff; border-color: #b00020; }\
    .ndm-btn--danger:hover { background: #800014; border-color: #800014; }\
    .ndm-meta { font-size: 12.5px; color: #6b7670; margin-top: 8px;\
      padding: 8px 12px; background: #f4f7f5; border-radius: 6px;\
      border-left: 3px solid #6b7670; }\
    @media (max-width: 480px) {\
      .ndm-box { max-width: 100%; }\
      .ndm-footer { flex-direction: column-reverse; }\
      .ndm-footer .ndm-btn { width: 100%; }\
    }\
  ';

  function injectCSS() {
    if (CSS_INJECTED) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    CSS_INJECTED = true;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Cria modal e retorna { backdrop, box, resolve, cleanup }.
   */
  function createModal(opts) {
    injectCSS();
    opts = opts || {};
    var backdrop = document.createElement('div');
    backdrop.className = 'ndm-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    var box = document.createElement('div');
    box.className = 'ndm-box';
    backdrop.appendChild(box);

    // Header
    var head = document.createElement('header');
    head.className = 'ndm-head';
    head.innerHTML =
      (opts.icon ? '<span class="ndm-icon">' + opts.icon + '</span>' : '') +
      '<h3 class="ndm-title">' + escapeHtml(opts.title || 'Atenção') + '</h3>';
    box.appendChild(head);

    // Body
    if (opts.body || opts.html) {
      var body = document.createElement('div');
      body.className = 'ndm-body';
      if (opts.html) body.innerHTML = opts.html;
      else body.textContent = opts.body;
      box.appendChild(body);
    }

    // Meta (info adicional discreta)
    if (opts.meta) {
      var meta = document.createElement('div');
      meta.className = 'ndm-meta';
      meta.style.margin = '0 26px';
      meta.innerHTML = opts.meta;
      box.appendChild(meta);
    }

    // Input (pra prompt)
    var input = null;
    if (opts.input) {
      var inputWrap = document.createElement('div');
      inputWrap.style.cssText = 'padding: 0 26px 6px;';
      input = document.createElement('input');
      input.type = opts.inputType || 'text';
      input.className = 'ndm-input';
      input.placeholder = opts.inputPlaceholder || '';
      input.value = opts.inputDefault || '';
      inputWrap.appendChild(input);
      box.appendChild(inputWrap);
    }

    // Footer
    var footer = document.createElement('footer');
    footer.className = 'ndm-footer';
    box.appendChild(footer);

    document.body.appendChild(backdrop);

    // Animação de entrada
    requestAnimationFrame(function () {
      backdrop.setAttribute('data-open', 'true');
      if (input) setTimeout(function () { input.focus(); input.select(); }, 200);
    });

    function cleanup() {
      backdrop.setAttribute('data-open', 'false');
      setTimeout(function () { backdrop.remove(); }, 220);
      document.removeEventListener('keydown', onKey);
    }

    return { backdrop: backdrop, box: box, footer: footer, input: input, cleanup: cleanup };

    function onKey(e) { /* placeholder, overridden depois */ }
  }

  /**
   * confirm({ title, body, okText, cancelText, danger, icon })
   * → Promise<boolean>
   */
  function confirm(opts) {
    return new Promise(function (resolve) {
      opts = opts || {};
      var m = createModal({
        title: opts.title || 'Confirmar?',
        body: opts.body || '',
        meta: opts.meta,
        icon: opts.icon || (opts.danger ? '⚠️' : '❓'),
        html: opts.html
      });

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'ndm-btn ndm-btn--cancel';
      cancelBtn.textContent = opts.cancelText || 'Cancelar';
      cancelBtn.onclick = function () { m.cleanup(); resolve(false); };
      m.footer.appendChild(cancelBtn);

      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'ndm-btn ndm-btn--' + (opts.danger ? 'danger' : 'ok');
      okBtn.textContent = opts.okText || 'Confirmar';
      okBtn.onclick = function () { m.cleanup(); resolve(true); };
      m.footer.appendChild(okBtn);

      // Esc cancela, Enter confirma
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); cancelBtn.click(); }
        else if (e.key === 'Enter' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault(); okBtn.click();
        }
      }
      document.addEventListener('keydown', onKey);
      m.backdrop.addEventListener('click', function (e) {
        if (e.target === m.backdrop) cancelBtn.click();
      });
      // Override cleanup pra desregistrar handler
      var origCleanup = m.cleanup;
      m.cleanup = function () { document.removeEventListener('keydown', onKey); origCleanup(); };

      // Foco no botão OK pra rapidez
      setTimeout(function () { okBtn.focus(); }, 200);
    });
  }

  /**
   * alert({ title, body, okText, icon }) → Promise<void>
   */
  function alert(opts) {
    return new Promise(function (resolve) {
      opts = opts || {};
      var m = createModal({
        title: opts.title || 'Atenção',
        body: opts.body || '',
        meta: opts.meta,
        icon: opts.icon || 'ℹ️',
        html: opts.html
      });

      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'ndm-btn ndm-btn--ok';
      okBtn.textContent = opts.okText || 'OK';
      okBtn.onclick = function () { m.cleanup(); resolve(); };
      m.footer.appendChild(okBtn);

      function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
      }
      document.addEventListener('keydown', onKey);
      m.backdrop.addEventListener('click', function (e) {
        if (e.target === m.backdrop) okBtn.click();
      });
      var origCleanup = m.cleanup;
      m.cleanup = function () { document.removeEventListener('keydown', onKey); origCleanup(); };

      setTimeout(function () { okBtn.focus(); }, 200);
    });
  }

  /**
   * prompt({ title, body, default, placeholder }) → Promise<string|null>
   */
  function prompt(opts) {
    return new Promise(function (resolve) {
      opts = opts || {};
      var m = createModal({
        title: opts.title || 'Informe',
        body: opts.body || '',
        icon: opts.icon || '✏️',
        input: true,
        inputDefault: opts.default || '',
        inputPlaceholder: opts.placeholder || ''
      });

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'ndm-btn ndm-btn--cancel';
      cancelBtn.textContent = opts.cancelText || 'Cancelar';
      cancelBtn.onclick = function () { m.cleanup(); resolve(null); };
      m.footer.appendChild(cancelBtn);

      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'ndm-btn ndm-btn--ok';
      okBtn.textContent = opts.okText || 'OK';
      okBtn.onclick = function () { var v = m.input ? m.input.value : ''; m.cleanup(); resolve(v); };
      m.footer.appendChild(okBtn);

      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); cancelBtn.click(); }
        else if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
      }
      document.addEventListener('keydown', onKey);
      var origCleanup = m.cleanup;
      m.cleanup = function () { document.removeEventListener('keydown', onKey); origCleanup(); };
    });
  }

  // Expose
  window.ndModal = { confirm: confirm, alert: alert, prompt: prompt };
})();
