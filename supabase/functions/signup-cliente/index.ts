// ====================================================================
// Nomade Drive Brasil — Edge Function: signup-cliente
// --------------------------------------------------------------------
// Signup público de cliente. Cria:
//   - auth.users (via supabase.auth.admin.createUser)
//   - public.profiles (full_name, phone, city, email, main_role='client')
//   - public.user_roles (role='client', status='em_analise')
//
// Após cadastro, dispara send-template 'mensal_lead_recebido' pro
// cliente e 'team_novo_lead' pra equipe.
//
// SECRETS:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (admin API), SUPABASE_ANON_KEY
//   RESEND_API_KEY (via send-template)
//
// verify_jwt: false (público — qualquer um pode se cadastrar)
// ====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderTemplate, getReplyTo } from "../_shared/template-catalog.ts";
import { sendEmail } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function sanitize(s: unknown, max = 200): string {
  return String(s ?? "").trim().slice(0, max);
}

function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function validPhone(p: string): boolean {
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!url || !serviceKey) {
      return json({ error: "SUPABASE_URL / SERVICE_ROLE_KEY ausentes." }, 500);
    }
    const admin = createClient(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const fullName = sanitize(body.full_name, 120);
    const email = sanitize(body.email, 120).toLowerCase();
    const password = String(body.password ?? "");
    const phone = sanitize(body.phone, 30);
    const city = sanitize(body.city, 80) || "Uberlândia";
    const state = sanitize(body.state, 2) || "MG";

    // Validações
    if (fullName.length < 4) return json({ error: "Nome muito curto (mínimo 4 caracteres)." }, 400);
    if (!validEmail(email)) return json({ error: "E-mail inválido." }, 400);
    if (password.length < 8) return json({ error: "Senha precisa ter pelo menos 8 caracteres." }, 400);
    if (phone && !validPhone(phone)) return json({ error: "Telefone inválido (DDD + número)." }, 400);

    // Verifica se e-mail já existe (evita erro genérico do Supabase)
    const { data: existingList } = await admin.auth.admin.listUsers();
    const alreadyExists = (existingList?.users || []).some(u =>
      (u.email || "").toLowerCase() === email
    );
    if (alreadyExists) {
      return json({
        error: "Já existe conta com este e-mail.",
        hint: "Use 'Esqueci minha senha' em /login.html pra recuperar acesso."
      }, 409);
    }

    // 1. Cria auth.users
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // pula confirmação por e-mail (SMTP custom tá ruim)
      user_metadata: { full_name: fullName, phone, city, state }
    });
    if (createErr || !created?.user) {
      return json({
        error: "Falha ao criar conta.",
        detail: createErr?.message ?? "erro desconhecido"
      }, 500);
    }
    const userId = created.user.id;

    // 2. Cria profile (handle do auth pode ter criado trigger automático — tenta upsert)
    const { error: profErr } = await admin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: fullName,
        email,
        phone: phone || null,
        city,
        state,
        main_role: "client",
        verification_status: "em_analise",
      }, { onConflict: "id" });
    if (profErr) {
      console.error("Erro criando profile:", profErr);
      // Não é fatal — segue
    }

    // 3. Cria user_roles com role=client status=em_analise
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "client",
        status: "em_analise",
      });
    if (roleErr) {
      console.error("Erro criando user_role:", roleErr);
    }

    // 4. Dispara e-mail pro cliente + alerta equipe.
    //    Retorna status no response pra QA conseguir auditar de fora.
    const emailReport: {
      cliente: { sent: boolean; id?: string; error?: string };
      equipe: { sent: boolean; recipients?: string[]; id?: string; error?: string };
      team_env_set: boolean;
    } = {
      cliente: { sent: false },
      equipe: { sent: false },
      team_env_set: false,
    };

    try {
      const firstName = fullName.split(/\s+/)[0];

      // Cliente
      const clientTpl = renderTemplate("mensal_lead_recebido", {
        first_name: firstName,
        car_name: "—",
        plan_name: "—",
        period_days: "—",
        start_date: "—"
      });
      if (clientTpl) {
        const r1 = await sendEmail(
          email,
          clientTpl.subject,
          clientTpl.html,
          clientTpl.text,
          getReplyTo("mensal_lead_recebido")
        );
        emailReport.cliente = r1.ok
          ? { sent: true, id: r1.id }
          : { sent: false, error: r1.error };
      }

      // Equipe
      const teamRecipientsRaw = Deno.env.get("TEAM_EMAIL_RECIPIENTS") ?? "";
      emailReport.team_env_set = teamRecipientsRaw.length > 0;
      const teamList = teamRecipientsRaw.split(",").map(s => s.trim()).filter(Boolean);
      if (teamList.length) {
        const teamTpl = renderTemplate("team_novo_lead", {
          first_name: firstName,
          last_name: fullName.split(/\s+/).slice(1).join(" "),
          user_email: email,
          phone,
          phone_e164: phone.replace(/\D/g, ""),
          car_name: "(não escolhido ainda)",
          plan_name: "(não escolhido ainda)",
          period_days: "—",
          start_date: "—",
          source: "signup site"
        });
        if (teamTpl) {
          const r2 = await sendEmail(
            teamList,
            teamTpl.subject,
            teamTpl.html,
            teamTpl.text,
            getReplyTo("team_novo_lead")
          );
          emailReport.equipe = r2.ok
            ? { sent: true, id: r2.id, recipients: teamList }
            : { sent: false, error: r2.error, recipients: teamList };
        }
      } else {
        emailReport.equipe = { sent: false, error: "TEAM_EMAIL_RECIPIENTS nao setado" };
      }
    } catch (e) {
      console.warn("Bloco de e-mails falhou (não fatal):", (e as Error)?.message);
    }

    return json({
      ok: true,
      user_id: userId,
      email,
      role: "client",
      status: "em_analise",
      message: "Cadastro criado com sucesso. Faça login pra acessar seu painel.",
      emails: emailReport,
    });
  } catch (e) {
    console.error("signup-cliente exceção:", e);
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
