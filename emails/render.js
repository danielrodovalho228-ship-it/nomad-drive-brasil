/* ====================================================================
   Nomade Drive Brasil — Motor de renderização de e-mails
   --------------------------------------------------------------------
   Junta base-template.html + um template do catálogo + variáveis reais
   e devolve o HTML final do e-mail. Funciona no navegador (preview.html)
   e em Node (quando houver um backend de envio).

   Uso:
     var html = NDB_EMAIL_RENDER.render(baseHtml, template, vars, defaults);
     var txt  = NDB_EMAIL_RENDER.plainText(template);

   Se uma variável estiver ausente, é trocada por um fallback seguro
   ("—") — o layout nunca quebra.
   ==================================================================== */
(function (root) {
  "use strict";

  var BTN = "#079344";

  function paragraphs(arr) {
    return (arr || []).map(function (p) {
      return '<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#1f2937;">' + p + "</p>";
    }).join("");
  }

  function dataBlocks(rows) {
    if (!rows || !rows.length) return "";
    var trs = rows.map(function (r) {
      return "<tr>" +
        '<td style="padding:9px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #eef0ef;">' + r[0] + "</td>" +
        '<td style="padding:9px 14px;font-size:13px;color:#1f2937;font-weight:bold;text-align:right;border-bottom:1px solid #eef0ef;">' + r[1] + "</td>" +
        "</tr>";
    }).join("");
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
      'style="margin:2px 0 20px;background:#f6f8f7;border:1px solid #e5e7eb;border-radius:10px;">' +
      trs + "</table>";
  }

  function button(label, url, primary) {
    if (!label) return "";
    var bg = primary ? BTN : "#ffffff";
    var fg = primary ? "#ffffff" : "#079344";
    return '<table role="presentation" class="ndb-btn" cellpadding="0" cellspacing="0" style="margin:6px 0;">' +
      '<tr><td style="border-radius:10px;background:' + bg + ';">' +
      '<a href="' + (url || "#") + '" style="display:inline-block;padding:13px 26px;font-size:15px;' +
      "font-weight:bold;color:" + fg + ";text-decoration:none;border:1px solid #079344;" +
      'border-radius:10px;font-family:Arial,Helvetica,sans-serif;">' + label + "</a>" +
      "</td></tr></table>";
  }

  function adminBadge(profile) {
    if (profile !== "admin") return "";
    return '<div style="margin-top:8px;"><span style="display:inline-block;padding:3px 10px;' +
      'font-size:11px;font-weight:bold;color:#b45309;background:#fef3c7;border-radius:6px;">Admin Nomade Drive</span></div>';
  }

  function fillVars(html, vars) {
    return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (m, key) {
      if (vars && vars[key] != null && vars[key] !== "") return String(vars[key]);
      return "—"; /* fallback seguro */
    });
  }

  function render(baseHtml, tpl, vars, defaults) {
    vars = vars || {};
    defaults = defaults || {};
    var map = {
      subject: tpl.subject || "Nomade Drive Brasil",
      preheader: tpl.preheader || "",
      title: tpl.title || "",
      logo_url: vars.logo_url || defaults.logo_url || "https://nomadedrive.com.br/images/logo-nomade-drive.jpg",
      admin_badge: adminBadge(tpl.profile),
      body_html: paragraphs(tpl.body),
      data_blocks_html: dataBlocks(tpl.data_blocks),
      cta_html: button(tpl.cta, tpl.cta_url, true),
      secondary_cta_html: button(tpl.cta2, tpl.cta2_url, false),
      security_notice: tpl.security || defaults.security_default || "",
      support_url: vars.support_url || defaults.support_url || "https://nomadedrive.com.br",
      year: new Date().getFullYear()
    };
    var out = baseHtml;
    Object.keys(map).forEach(function (k) {
      out = out.split("{{" + k + "}}").join(map[k]);
    });
    return fillVars(out, vars);
  }

  function plainText(tpl) {
    var lines = [tpl.title || ""];
    (tpl.body || []).forEach(function (p) { lines.push("", String(p).replace(/<[^>]+>/g, "")); });
    if (tpl.data_blocks && tpl.data_blocks.length) {
      lines.push("");
      tpl.data_blocks.forEach(function (r) { lines.push(r[0] + ": " + r[1]); });
    }
    if (tpl.cta) lines.push("", tpl.cta + ": " + (tpl.cta_url || ""));
    lines.push("", (tpl.security || ""), "", "Nomade Drive Brasil — nomadedrive.com.br");
    return lines.join("\n");
  }

  var api = { render: render, plainText: plainText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NDB_EMAIL_RENDER = api;
})(typeof window !== "undefined" ? window : this);
