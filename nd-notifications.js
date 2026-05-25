/* ============================================================
 * Nomade Drive Brasil — nd-notifications.js (Fase 57)
 * Sino de notificações in-app com badge contador + dropdown.
 *
 * Uso (em qualquer dashboard):
 *   <div id="ndBell"></div>
 *   <script src="nd-notifications.js"></script>
 *   <script>ndNotifs.mount("#ndBell")</script>
 *
 * Funcionalidades:
 *   - Lê user_notifications WHERE user_id=me AND status='unread' LIMIT 10
 *   - Badge mostra count (até 9, depois "9+")
 *   - Click abre dropdown com lista
 *   - Click numa notif: marca como lida + navega pro link
 *   - "Marcar todas" / "Ver todas"
 *   - Auto-refresh via Supabase Realtime (channel)
 *   - Degrada gracioso se Supabase falhar
 * ============================================================ */
(function () {
  "use strict";

  // ---------- HTML do componente (injetado uma vez) ----------
  var BELL_HTML = '' +
    '<button type="button" class="ndb-bell__btn" id="ndbBellBtn" aria-label="Notificações" aria-haspopup="true">' +
    '  <svg class="ndb-bell__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-1.7 1.7c-.63.63-.19 1.71.7 1.71h14c.89 0 1.34-1.08.71-1.71L18 16z"/>' +
    '  </svg>' +
    '  <span class="ndb-bell__badge" id="ndbBellBadge" hidden>0</span>' +
    '</button>' +
    '<div class="ndb-bell__dropdown" id="ndbBellDropdown" hidden role="menu">' +
    '  <div class="ndb-bell__dropdown-head">' +
    '    <strong>Notificações</strong>' +
    '    <button type="button" class="ndb-bell__mark-all" id="ndbBellMarkAll" hidden>Marcar todas como lidas</button>' +
    '  </div>' +
    '  <div class="ndb-bell__list" id="ndbBellList">' +
    '    <div class="ndb-bell__empty">Carregando...</div>' +
    '  </div>' +
    '  <div class="ndb-bell__dropdown-foot">' +
    '    <a href="#" id="ndbBellViewAll" class="ndb-bell__view-all">Ver todas</a>' +
    '  </div>' +
    '</div>';

  // ---------- CSS injetado (uma vez) ----------
  var CSS = '' +
    '.ndb-bell { position: relative; display: inline-block; }' +
    '.ndb-bell__btn { background: transparent; border: none; cursor: pointer; padding: 8px; border-radius: 50%; color: #14201b; position: relative; transition: background .15s, transform .1s; }' +
    '.ndb-bell__btn:hover { background: rgba(20,40,30,.08); }' +
    '.ndb-bell__btn:focus-visible { outline: 2px solid #198754; outline-offset: 2px; }' +
    '.ndb-bell__btn:active { transform: scale(.95); }' +
    '.ndb-bell__icon { width: 22px; height: 22px; display: block; }' +
    '.ndb-bell__badge { position: absolute; top: 2px; right: 2px; background: #dc3545; color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; display: flex; align-items: center; justify-content: center; line-height: 1; box-shadow: 0 0 0 2px #fff; font-family: Inter, sans-serif; animation: ndb-bell-pop .25s cubic-bezier(.34,1.56,.64,1); }' +
    '@keyframes ndb-bell-pop { from { transform: scale(0); } to { transform: scale(1); } }' +
    '.ndb-bell__btn--has-unread .ndb-bell__icon { animation: ndb-bell-shake 1.2s ease 1; transform-origin: top center; }' +
    '@keyframes ndb-bell-shake { 0%, 100% { transform: rotate(0); } 10%, 30%, 50% { transform: rotate(-12deg); } 20%, 40%, 60% { transform: rotate(12deg); } 70%, 90% { transform: rotate(-6deg); } 80% { transform: rotate(6deg); } }' +
    '.ndb-bell__dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 340px; max-width: 90vw; background: #fff; border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.08); z-index: 1000; overflow: hidden; animation: ndb-bell-slide .2s cubic-bezier(.22,1,.36,1); }' +
    '@keyframes ndb-bell-slide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }' +
    '.ndb-bell__dropdown-head { padding: 14px 16px 10px; border-bottom: 1px solid #eef0ee; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-family: Sora, sans-serif; font-size: 15px; }' +
    '.ndb-bell__mark-all { background: transparent; border: none; color: #198754; font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 4px; font-family: inherit; }' +
    '.ndb-bell__mark-all:hover { background: #f0f9f3; text-decoration: underline; }' +
    '.ndb-bell__list { max-height: 380px; overflow-y: auto; }' +
    '.ndb-bell__item { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f3f5f3; text-decoration: none; color: inherit; cursor: pointer; transition: background .15s; }' +
    '.ndb-bell__item:hover { background: #f8fafb; }' +
    '.ndb-bell__item--unread { background: linear-gradient(90deg, rgba(25,135,84,.05), transparent); border-left: 3px solid #198754; padding-left: 13px; }' +
    '.ndb-bell__item-icon { flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; background: #f0f7f1; border-radius: 50%; }' +
    '.ndb-bell__item--unread .ndb-bell__item-icon { background: #d1e7dd; }' +
    '.ndb-bell__item-body { flex: 1; min-width: 0; }' +
    '.ndb-bell__item-title { font-size: 13.5px; font-weight: 600; margin: 0 0 2px; color: #14201b; line-height: 1.35; }' +
    '.ndb-bell__item-msg { font-size: 12.5px; color: #5b6b63; margin: 0 0 4px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }' +
    '.ndb-bell__item-time { font-size: 11px; color: #98a09b; }' +
    '.ndb-bell__empty { padding: 28px 18px; text-align: center; color: #98a09b; font-size: 13px; }' +
    '.ndb-bell__empty span { display: block; font-size: 26px; margin-bottom: 6px; opacity: .6; }' +
    '.ndb-bell__dropdown-foot { padding: 8px 16px; text-align: center; border-top: 1px solid #eef0ee; background: #fbfcfb; }' +
    '.ndb-bell__view-all { font-size: 12.5px; color: #198754; text-decoration: none; font-weight: 600; }' +
    '.ndb-bell__view-all:hover { text-decoration: underline; }' +
    '@media (max-width: 480px) { .ndb-bell__dropdown { position: fixed; top: 60px; right: 8px; left: 8px; width: auto; max-width: none; } }';

  // Injeta CSS uma vez
  function injectCSS() {
    if (document.getElementById("ndb-bell-styles")) return;
    var s = document.createElement("style");
    s.id = "ndb-bell-styles";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---------- Estado interno ----------
  var state = {
    sb: null,
    userId: null,
    items: [],
    unreadCount: 0,
    channel: null,
    refs: {} // dom refs
  };

  // ---------- Helpers ----------
  function escapeText(t) {
    return String(t == null ? "" : t);
  }

  function timeAgo(iso) {
    if (!iso) return "";
    var ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return "agora";
    var m = Math.floor(ms / 60000);
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h";
    var d = Math.floor(h / 24);
    if (d < 7) return d + "d";
    var w = Math.floor(d / 7);
    if (w < 4) return w + " sem";
    var dt = new Date(iso);
    return ("0" + dt.getDate()).slice(-2) + "/" + ("0" + (dt.getMonth() + 1)).slice(-2);
  }

  function updateBadge() {
    var badge = state.refs.badge;
    var btn = state.refs.btn;
    if (!badge || !btn) return;
    var n = state.unreadCount;
    if (n > 0) {
      badge.textContent = n > 9 ? "9+" : String(n);
      badge.hidden = false;
      btn.classList.add("ndb-bell__btn--has-unread");
    } else {
      badge.hidden = true;
      btn.classList.remove("ndb-bell__btn--has-unread");
    }
  }

  function renderList() {
    var list = state.refs.list;
    var markAllBtn = state.refs.markAll;
    if (!list) return;

    if (!state.items.length) {
      list.innerHTML = '<div class="ndb-bell__empty"><span>🔔</span>Nenhuma notificação por enquanto.</div>';
      if (markAllBtn) markAllBtn.hidden = true;
      return;
    }

    list.innerHTML = "";
    state.items.forEach(function (n) {
      var item = document.createElement("a");
      item.className = "ndb-bell__item" + (n.status === "unread" ? " ndb-bell__item--unread" : "");
      item.href = n.link || "#";
      item.setAttribute("role", "menuitem");
      item.setAttribute("data-id", n.id);

      // Click: marca lido + navega (a navegação acontece naturalmente via href)
      item.addEventListener("click", function (e) {
        if (n.status === "unread") {
          markAsRead([n.id]);
        }
        if (!n.link || n.link === "#") {
          e.preventDefault();
          closeDropdown();
        }
      });

      var icon = document.createElement("div");
      icon.className = "ndb-bell__item-icon";
      icon.textContent = n.icon || "🔔";

      var body = document.createElement("div");
      body.className = "ndb-bell__item-body";

      var title = document.createElement("p");
      title.className = "ndb-bell__item-title";
      title.textContent = escapeText(n.title);

      body.appendChild(title);

      if (n.message) {
        var msg = document.createElement("p");
        msg.className = "ndb-bell__item-msg";
        msg.textContent = escapeText(n.message);
        body.appendChild(msg);
      }

      var time = document.createElement("span");
      time.className = "ndb-bell__item-time";
      time.textContent = timeAgo(n.created_at);
      body.appendChild(time);

      item.appendChild(icon);
      item.appendChild(body);
      list.appendChild(item);
    });

    // Mostra "Marcar todas" se tem unread
    var hasUnread = state.items.some(function (n) { return n.status === "unread"; });
    if (markAllBtn) markAllBtn.hidden = !hasUnread;
  }

  function loadNotifications() {
    if (!state.sb || !state.userId) return;
    state.sb.from("user_notifications")
      .select("id, type, title, message, link, icon, priority, status, created_at, read_at")
      .eq("user_id", state.userId)
      .order("created_at", { ascending: false })
      .limit(12)
      .then(function (r) {
        if (r.error) {
          console.warn("[ndNotifs] load error:", r.error.message);
          var list = state.refs.list;
          if (list) list.innerHTML = '<div class="ndb-bell__empty"><span>⚠️</span>Não foi possível carregar.</div>';
          return;
        }
        state.items = (r.data || []);
        state.unreadCount = state.items.filter(function (n) { return n.status === "unread"; }).length;
        renderList();
        updateBadge();
      })
      .catch(function (e) {
        console.warn("[ndNotifs] load exception:", e && e.message);
      });
  }

  function markAsRead(ids) {
    if (!state.sb || !ids || !ids.length) return;
    state.sb.from("user_notifications")
      .update({ status: "read", read_at: new Date().toISOString() })
      .in("id", ids)
      .then(function () {
        // Otimismo: atualiza local imediatamente
        ids.forEach(function (id) {
          var n = state.items.find(function (x) { return x.id === id; });
          if (n) { n.status = "read"; n.read_at = new Date().toISOString(); }
        });
        state.unreadCount = state.items.filter(function (n) { return n.status === "unread"; }).length;
        renderList();
        updateBadge();
      })
      .catch(function (e) { console.warn("[ndNotifs] mark read failed:", e); });
  }

  function markAllRead() {
    var unreadIds = state.items
      .filter(function (n) { return n.status === "unread"; })
      .map(function (n) { return n.id; });
    if (unreadIds.length) markAsRead(unreadIds);
  }

  function openDropdown() {
    var dd = state.refs.dropdown;
    if (!dd) return;
    dd.hidden = false;
    // Recarrega ao abrir pra ter dados frescos
    loadNotifications();
  }
  function closeDropdown() {
    var dd = state.refs.dropdown;
    if (dd) dd.hidden = true;
  }
  function toggleDropdown() {
    var dd = state.refs.dropdown;
    if (!dd) return;
    if (dd.hidden) openDropdown();
    else closeDropdown();
  }

  function setupRealtime() {
    if (!state.sb || !state.userId || state.channel) return;
    try {
      state.channel = state.sb
        .channel("ndb-notifs-" + state.userId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: "user_id=eq." + state.userId
          },
          function () { loadNotifications(); }
        )
        .subscribe();
    } catch (e) {
      // Realtime opcional — sem ele, sino só atualiza ao abrir
      console.warn("[ndNotifs] realtime opt-out:", e && e.message);
    }
  }

  // ---------- API pública ----------
  window.ndNotifs = {
    mount: function (selectorOrEl) {
      var host = (typeof selectorOrEl === "string")
        ? document.querySelector(selectorOrEl)
        : selectorOrEl;
      if (!host) { console.warn("[ndNotifs] host não encontrado:", selectorOrEl); return; }

      injectCSS();
      host.classList.add("ndb-bell");
      host.innerHTML = BELL_HTML;

      state.refs.btn      = host.querySelector("#ndbBellBtn");
      state.refs.badge    = host.querySelector("#ndbBellBadge");
      state.refs.dropdown = host.querySelector("#ndbBellDropdown");
      state.refs.list     = host.querySelector("#ndbBellList");
      state.refs.markAll  = host.querySelector("#ndbBellMarkAll");
      state.refs.viewAll  = host.querySelector("#ndbBellViewAll");

      state.refs.btn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleDropdown();
      });
      state.refs.markAll.addEventListener("click", function (e) {
        e.stopPropagation();
        markAllRead();
      });
      // "Ver todas" — direciona pro painel de notificações específico de cada role
      state.refs.viewAll.addEventListener("click", function (e) {
        e.preventDefault();
        // Não tem ainda /notificacoes.html — por enquanto só fecha + marca todas
        markAllRead();
        closeDropdown();
      });

      // Fecha ao clicar fora
      document.addEventListener("click", function (e) {
        if (!host.contains(e.target)) closeDropdown();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeDropdown();
      });

      // Espera auth pronto + supabase client
      var tryInit = function () {
        var a = window.ndAuth;
        if (!a || !a.ready) { setTimeout(tryInit, 300); return; }
        a.getSession().then(function (s) {
          if (!s) return; // user não logado — sino fica invisível
          state.sb = a.client();
          state.userId = s.user.id;
          loadNotifications();
          setupRealtime();
        });
      };
      tryInit();
    },
    // Recarrega manualmente
    refresh: loadNotifications,
    // API pra outros scripts dispararem ação no sino
    markAllRead: markAllRead
  };
})();
