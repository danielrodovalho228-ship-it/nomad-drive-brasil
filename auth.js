/* ====================================================================
   NomadDrive Brasil — Camada de autenticação (Supabase)
   --------------------------------------------------------------------
   Expõe window.ndAuth com helpers de login/cadastro/sessão.
   É resiliente: se o Supabase ainda não estiver configurado (ou o SDK
   não tiver carregado), window.ndAuth continua existindo, mas as ações
   retornam um aviso amigável em vez de quebrar a página.
   ==================================================================== */
(function () {
  "use strict";

  var cfg = window.NOMADDRIVE_SUPABASE || {};
  var hasPlaceholder =
    !cfg.url || !cfg.anonKey ||
    cfg.url.indexOf("SEU-PROJETO") !== -1 ||
    cfg.anonKey.indexOf("COLE_AQUI") !== -1;
  var configured = !hasPlaceholder;

  var sdk = (window.supabase && window.supabase.createClient) ? window.supabase : null;
  var client = (configured && sdk) ? sdk.createClient(cfg.url, cfg.anonKey) : null;

  var ROLE_LABELS = {
    client: "Cliente locatário",
    owner: "Proprietário",
    referral_partner: "Parceiro de indicação",
    workshop: "Oficina mecânica",
    protection_partner: "Parceiro de proteção",
    admin: "Administrador",
    super_admin: "Super admin"
  };
  var ROLE_DASHBOARD = {
    client: "dashboard-cliente.html",
    owner: "dashboard-proprietario.html",
    referral_partner: "dashboard-parceiro.html",
    workshop: "dashboard-oficina.html",
    protection_partner: "dashboard-protecao.html",
    admin: "admin.html",
    super_admin: "admin.html"
  };
  var ROLE_ONBOARDING = {
    client: "onboarding-cliente.html",
    owner: "onboarding-proprietario.html",
    referral_partner: "onboarding-parceiro.html",
    workshop: "onboarding-oficina.html",
    protection_partner: "onboarding-protecao.html"
  };
  var VALID_ROLES = ["client", "owner", "referral_partner", "workshop", "protection_partner"];
  var STATUS_LABELS = {
    rascunho: "Rascunho",
    email_verificado: "E-mail verificado",
    em_analise: "Em análise",
    documentos_pendentes: "Documentos pendentes",
    aprovado: "Aprovado",
    aprovado_com_ressalvas: "Aprovado com ressalvas",
    recusado: "Recusado",
    suspenso: "Suspenso",
    bloqueado_para_revisao: "Bloqueado para revisão"
  };

  function locationDir() {
    var p = window.location.pathname;
    return p.substring(0, p.lastIndexOf("/") + 1);
  }
  function pageUrl(file) {
    return window.location.origin + locationDir() + file;
  }
  function safeRedirect(value) {
    /* aceita apenas caminhos relativos do próprio site (evita open redirect) */
    if (!value) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.indexOf("//") === 0) return "";
    return value.replace(/[^a-zA-Z0-9_./?=&#-]/g, "");
  }
  function notConfiguredMsg() {
    return "Login indisponível: o Supabase ainda não foi configurado. " +
      "Preencha o arquivo supabase-config.js com a URL e a anon key do projeto.";
  }
  function translateError(err) {
    var m = (err && err.message) || "Não foi possível concluir. Tente novamente.";
    if (/invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(m)) return "Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.";
    if (/user already registered|already been registered/i.test(m)) return "Já existe uma conta com este e-mail. Tente entrar.";
    if (/password should be at least/i.test(m)) return "A senha deve ter pelo menos 6 caracteres.";
    if (/rate limit|too many requests/i.test(m)) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    if (/unable to validate email|invalid email/i.test(m)) return "E-mail inválido.";
    if (/network|fetch/i.test(m)) return "Falha de conexão. Verifique sua internet e tente novamente.";
    return m;
  }
  function logoutHandler(e) {
    if (e && e.preventDefault) e.preventDefault();
    ndAuth.signOut().then(function () { window.location.href = "index.html"; });
  }

  var ndAuth = {
    configured: configured,
    ready: !!client,
    googleEnabled: configured && cfg.googleOAuth === true,
    roleLabels: ROLE_LABELS,
    validRoles: VALID_ROLES,
    client: function () { return client; },
    dashboardFor: function (role) { return ROLE_DASHBOARD[role] || "index.html"; },
    onboardingFor: function (role) { return ROLE_ONBOARDING[role] || "index.html"; },
    roleLabel: function (role) { return ROLE_LABELS[role] || role || "—"; },
    statusLabel: function (status) { return STATUS_LABELS[status] || status || "—"; },
    notConfiguredMessage: notConfiguredMsg,

    redirectTarget: function () {
      try {
        return safeRedirect(new URLSearchParams(window.location.search).get("redirect"));
      } catch (e) { return ""; }
    },

    getSession: function () {
      if (!client) return Promise.resolve(null);
      return client.auth.getSession()
        .then(function (r) { return (r && r.data && r.data.session) || null; })
        .catch(function () { return null; });
    },

    getRoles: function () {
      if (!client) return Promise.resolve([]);
      return client.from("user_roles").select("role,status")
        .then(function (r) { return (r && r.data) || []; })
        .catch(function () { return []; });
    },

    /* perfil (linha em profiles) do usuário logado */
    getProfile: function () {
      if (!client) return Promise.resolve(null);
      return ndAuth.getSession().then(function (s) {
        if (!s) return null;
        return client.from("profiles").select("*").eq("id", s.user.id).maybeSingle()
          .then(function (r) { return (r && r.data) || null; });
      }).catch(function () { return null; });
    },

    /* exige sessão. Se não configurado, NÃO redireciona (página continua
       visível com aviso). Se configurado e sem sessão, manda para o login. */
    requireAuth: function () {
      if (!client) return Promise.resolve(null);
      return ndAuth.getSession().then(function (session) {
        if (session) return session;
        var here = window.location.pathname.split("/").pop() + window.location.search;
        window.location.replace("login.html?redirect=" + encodeURIComponent(here));
        return null;
      });
    },

    /* destino após o login: ?redirect= se houver, senão o onboarding do perfil */
    destinationAfterLogin: function () {
      var rt = ndAuth.redirectTarget();
      if (rt) return Promise.resolve(rt);
      return ndAuth.getProfile().then(function (p) {
        return ndAuth.onboardingFor((p && p.main_role) || "client");
      }).catch(function () { return "index.html"; });
    },

    /* true se o usuário logado tem papel admin/super_admin aprovado */
    isAdmin: function () {
      if (!client) return Promise.resolve(false);
      return ndAuth.getRoles().then(function (roles) {
        return roles.some(function (r) {
          return (r.role === "admin" || r.role === "super_admin") && r.status === "aprovado";
        });
      }).catch(function () { return false; });
    },

    signIn: function (email, password) {
      if (!client) return Promise.resolve({ ok: false, error: notConfiguredMsg() });
      return client.auth.signInWithPassword({ email: email, password: password })
        .then(function (r) {
          if (r.error) return { ok: false, error: translateError(r.error) };
          return { ok: true, session: r.data.session };
        })
        .catch(function (err) { return { ok: false, error: translateError(err) }; });
    },

    signUp: function (opts) {
      opts = opts || {};
      if (!client) return Promise.resolve({ ok: false, error: notConfiguredMsg() });
      var role = VALID_ROLES.indexOf(opts.role) !== -1 ? opts.role : "client";
      return client.auth.signUp({
        email: opts.email,
        password: opts.password,
        options: {
          emailRedirectTo: pageUrl("login.html"),
          data: {
            full_name: opts.fullName || "",
            phone: opts.phone || "",
            initial_role: role
          }
        }
      }).then(function (r) {
        if (r.error) return { ok: false, error: translateError(r.error) };
        var hasSession = !!(r.data && r.data.session);
        return { ok: true, needsConfirmation: !hasSession, role: role };
      }).catch(function (err) { return { ok: false, error: translateError(err) }; });
    },

    signOut: function () {
      if (!client) return Promise.resolve();
      return client.auth.signOut().catch(function () {});
    },

    resetPassword: function (email) {
      if (!client) return Promise.resolve({ ok: false, error: notConfiguredMsg() });
      return client.auth.resetPasswordForEmail(email, { redirectTo: pageUrl("login.html") })
        .then(function (r) {
          if (r.error) return { ok: false, error: translateError(r.error) };
          return { ok: true };
        })
        .catch(function (err) { return { ok: false, error: translateError(err) }; });
    },

    signInWithGoogle: function () {
      if (!client) return Promise.resolve({ ok: false, error: notConfiguredMsg() });
      return client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: pageUrl("login.html") }
      }).then(function (r) {
        if (r.error) return { ok: false, error: translateError(r.error) };
        return { ok: true };
      }).catch(function (err) { return { ok: false, error: translateError(err) }; });
    },

    /* Atualiza o botão "Entrar / Criar conta" do site conforme a sessão:
       logado => "Minha conta" apontando para o painel do perfil. */
    applyNavState: function () {
      var btn = document.getElementById("navEntrar");
      var drawerBtn = document.getElementById("drawerEntrar");
      if (!btn && !drawerBtn) return;
      ndAuth.getSession().then(function (session) {
        if (!session) return;
        ndAuth.getProfile().then(function (p) {
          var dash = ndAuth.dashboardFor((p && p.main_role) || "client");
          if (btn) { btn.textContent = "Minha conta"; btn.setAttribute("href", dash); }
          if (drawerBtn) {
            var strong = drawerBtn.querySelector("strong");
            var span = drawerBtn.querySelector("span");
            if (strong) strong.textContent = "Minha conta";
            if (span) span.textContent = "Acessar o meu painel";
            drawerBtn.setAttribute("href", dash);
          }
        });
      });
    },

    /* Liga qualquer elemento [data-logout] para encerrar a sessão. */
    wireLogout: function () {
      var els = document.querySelectorAll("[data-logout]");
      [].forEach.call(els, function (el) {
        if (el.getAttribute("data-logout-wired")) return;
        el.setAttribute("data-logout-wired", "1");
        el.addEventListener("click", logoutHandler);
      });
    }
  };

  window.ndAuth = ndAuth;

  /* aplica o estado de sessão ao menu assim que o DOM estiver pronto */
  function initAuthUI() {
    ndAuth.applyNavState();
    ndAuth.wireLogout();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuthUI);
  } else {
    initAuthUI();
  }
})();
