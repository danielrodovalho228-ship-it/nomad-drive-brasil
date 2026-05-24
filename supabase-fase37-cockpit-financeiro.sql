-- ====================================================================
-- Nomade Drive Brasil — Fase 37/38/39: Cockpit do CEO
-- --------------------------------------------------------------------
-- Schema completo pro dashboard executivo:
--   - expenses          → contas a pagar / pagas
--   - tax_obligations   → DAS MEI, DASN, IRPF, etc.
--   - employees         → equipe (Daniel + sócio + futuros funcionários)
--   - business_settings → config geral (regime tributário, limites)
--   - revenue_by_month  → view materializada de receita
--   - ceo_cockpit_summary → view agregada pro hero
--
-- Idempotente. Sem ALTER TYPE. Pode rodar tudo de uma vez.
-- ====================================================================

-- ============================ 1. EXPENSES (despesas) =================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in (
      'hosting','stripe_fees','resend','infosimples','cobli','notazz',
      'marketing','salario','pro_labore','distribuicao_lucros',
      'contabilidade','dominio','escritorio','equipamentos','outros'
    )),
  vendor text,                             -- nome do fornecedor
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date,                           -- pra contas a pagar
  paid_at timestamptz,                     -- null = ainda não paga
  payment_method text,                     -- 'pix','cartao','boleto','debito_auto'
  recurrence text                          -- 'monthly','yearly','one_off'
    check (recurrence in ('monthly','yearly','one_off')),
  invoice_url text,                        -- URL pra NF do fornecedor
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists expenses_due_date_idx on public.expenses(due_date);
create index if not exists expenses_category_paid_idx on public.expenses(category, paid_at);
create index if not exists expenses_created_at_idx on public.expenses(created_at desc);

comment on table public.expenses is 'Despesas operacionais — contas a pagar/pagas. Categorias: hosting, stripe, resend, marketing, salarios, etc.';

-- ============================ 2. TAX_OBLIGATIONS =====================
create table if not exists public.tax_obligations (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in (
      'das_mei','dasn_simei','das_simples_nacional','irpf','iss',
      'inss_pro_labore','fgts','irrf','outros'
    )),
  reference_period text not null,          -- '2026-05' ou '2026'
  amount numeric(12,2),
  due_date date not null,
  paid_at timestamptz,
  receipt_url text,                        -- comprovante de pagamento
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists tax_obligations_uniq
  on public.tax_obligations(kind, reference_period);
create index if not exists tax_obligations_due_idx on public.tax_obligations(due_date);

comment on table public.tax_obligations is 'Obrigações fiscais: DAS MEI, DASN, IRPF, INSS pro-labore, etc.';

-- ============================ 3. EMPLOYEES ===========================
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf_masked text,                         -- nunca cpf completo
  email text,
  phone text,
  role_title text,                         -- 'CEO','CTO','Sócio','Desenvolvedor','Operação','Suporte'
  contract_type text not null
    check (contract_type in ('socio','clt','pj','estagio','aprendiz','informal')),
  monthly_salary numeric(12,2),            -- bruto
  benefits_monthly numeric(12,2) default 0,-- VR, plano saúde, etc
  hire_date date,
  termination_date date,
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists employees_active_idx on public.employees(active, contract_type);

comment on table public.employees is 'Equipe da Nomade Drive — sócios + funcionários + PJ. MEI só permite 1 funcionário CLT + o titular; mais que isso requer ME.';

-- ============================ 4. BUSINESS_SETTINGS ===================
-- Singleton — só 1 linha (id sempre 1)
create table if not exists public.business_settings (
  id int primary key default 1 check (id = 1),
  company_name text default 'Nomade Drive Brasil',
  legal_name text,                         -- razão social
  cnpj_masked text,                        -- pode ser CPF se MEI
  tax_regime text default 'mei'
    check (tax_regime in ('mei','simples_nacional','lucro_presumido','lucro_real')),
  mei_annual_limit numeric(12,2) default 81000,  -- limite faturamento MEI
  das_mei_monthly numeric(12,2) default 75.90,   -- DAS comércio/indústria 2026
  fiscal_alerts_enabled boolean default true,
  email_alerts_to text,                    -- email pra alertas críticos
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Garante 1 linha
insert into public.business_settings (id, company_name, tax_regime)
  values (1, 'Nomade Drive Brasil', 'mei')
  on conflict (id) do nothing;

comment on table public.business_settings is 'Configurações da empresa (singleton). Regime tributário, limites, etc.';

-- ============================ 5. RLS POLICIES ========================

alter table public.expenses enable row level security;
alter table public.tax_obligations enable row level security;
alter table public.employees enable row level security;
alter table public.business_settings enable row level security;

-- Admin pode tudo
drop policy if exists expenses_admin_all on public.expenses;
create policy expenses_admin_all on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists tax_obligations_admin_all on public.tax_obligations;
create policy tax_obligations_admin_all on public.tax_obligations
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists employees_admin_all on public.employees;
create policy employees_admin_all on public.employees
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists business_settings_admin_all on public.business_settings;
create policy business_settings_admin_all on public.business_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists business_settings_authenticated_read on public.business_settings;
create policy business_settings_authenticated_read on public.business_settings
  for select using (auth.uid() is not null);

-- ============================ 6. VIEW: receita por mês ===============

drop materialized view if exists public.revenue_by_month;
create materialized view public.revenue_by_month as
select
  date_trunc('month', p.created_at)::date as month,
  count(distinct b.id) as bookings_count,
  coalesce(sum(p.amount) filter (
    where p.kind = 'mensalidade' and p.status = 'pago'
  ), 0)::numeric(12,2) as gross_monthly,
  coalesce(sum(p.amount) filter (
    where p.kind = 'caucao' and p.status = 'capturado'
  ), 0)::numeric(12,2) as captured_caucao,
  coalesce(sum(p.amount * 0.10) filter (
    where p.kind = 'mensalidade' and p.status = 'pago'
  ), 0)::numeric(12,2) as platform_commission,
  coalesce(sum(p.amount * 0.90) filter (
    where p.kind = 'mensalidade' and p.status = 'pago'
  ), 0)::numeric(12,2) as owner_payouts
from public.payments p
left join public.bookings b on b.id = p.booking_id
where p.created_at is not null
group by 1
order by 1 desc;

create unique index if not exists revenue_by_month_month_uidx
  on public.revenue_by_month(month);

comment on materialized view public.revenue_by_month is
  'Receita mensal consolidada. Refresh: select public.refresh_revenue_views(); — pode chamar via cron diário.';

-- Função pra refresh fácil
create or replace function public.refresh_revenue_views()
returns void language sql security definer as $$
  refresh materialized view public.revenue_by_month;
$$;

-- ============================ 7. VIEW: cockpit summary ===============

create or replace view public.ceo_cockpit_summary as
select
  -- Operação
  (select count(*) from public.bookings where status = 'em_uso')::int as bookings_ativos,
  (select count(*) from public.bookings where created_at >= date_trunc('month', now()))::int as bookings_novos_mes,
  (select count(*) from public.vehicles where status = 'aprovado')::int as veiculos_aprovados,
  (select count(*) from public.vehicles)::int as veiculos_total,
  (select count(*) from public.vehicles where created_at >= date_trunc('month', now()))::int as veiculos_novos_mes,

  -- Base de usuários
  (select count(*) from public.profiles
    where main_role = 'client' and verification_status = 'aprovado')::int as clientes_aprovados,
  (select count(*) from public.profiles
    where main_role = 'owner' and verification_status = 'aprovado')::int as proprietarios_aprovados,
  (select count(*) from public.profiles
    where created_at >= date_trunc('month', now()))::int as novos_usuarios_mes,
  (select count(*) from public.profiles
    where created_at >= current_date)::int as novos_usuarios_hoje,

  -- Financeiro
  (select coalesce(sum(amount), 0) from public.payments
    where status in ('pago','capturado') and created_at >= date_trunc('month', now()))::numeric(12,2) as receita_mes,
  (select coalesce(sum(amount), 0) from public.payments
    where status in ('pago','capturado') and created_at >= date_trunc('year', now()))::numeric(12,2) as receita_ano,
  (select coalesce(sum(amount), 0) from public.expenses
    where paid_at is null and due_date <= now() + interval '7 days')::numeric(12,2) as contas_pagar_7d,
  (select coalesce(sum(amount), 0) from public.expenses
    where paid_at is null and due_date <= now() + interval '30 days')::numeric(12,2) as contas_pagar_30d,

  -- Alertas
  (select count(*) from public.protection_cases_full
    where status in ('em_analise','documentos_pendentes')
      and sla_remaining_hours is not null and sla_remaining_hours < 6)::int as cases_vencendo_sla,
  (select count(*) from public.damages
    where status in ('pendente_revisao','em_contestacao'))::int as avarias_pendentes,
  (select count(*) from public.vehicle_fines
    where status = 'pendente')::int as multas_pendentes,

  -- Saques (Fase 32)
  (select coalesce(sum(amount_net), 0) from public.withdrawals where status = 'available')::numeric(12,2) as saques_disponiveis,
  (select coalesce(sum(amount_net), 0) from public.withdrawals where status = 'paid' and paid_at >= date_trunc('month', now()))::numeric(12,2) as saques_pagos_mes,

  -- Equipe
  (select count(*) from public.employees where active = true)::int as equipe_ativa,
  (select coalesce(sum(monthly_salary + coalesce(benefits_monthly, 0)), 0) from public.employees where active = true)::numeric(12,2) as folha_mensal,

  -- Fiscal
  (select due_date from public.tax_obligations
    where kind = 'das_mei' and paid_at is null and due_date >= current_date
    order by due_date limit 1) as proximo_das_data,
  (select amount from public.tax_obligations
    where kind = 'das_mei' and paid_at is null and due_date >= current_date
    order by due_date limit 1)::numeric(12,2) as proximo_das_valor,

  -- Faturamento ano (pra alerta MEI)
  (select coalesce(sum(amount), 0) from public.payments
    where status in ('pago','capturado') and created_at >= date_trunc('year', now()))::numeric(12,2) as faturamento_ano_corrente,
  (select mei_annual_limit from public.business_settings where id = 1)::numeric(12,2) as mei_limit;

comment on view public.ceo_cockpit_summary is
  'View agregada pro Cockpit do CEO no admin.html. Uma linha — todos os KPIs do hero.';

-- ============================ 8. SEED inicial =======================

-- Despesas recorrentes conhecidas (você pode adicionar mais via UI)
insert into public.expenses (category, vendor, description, amount, due_date, recurrence, notes)
select * from (values
  ('hosting', 'Hostinger', 'Hospedagem + e-mail (renovação anual)', 165.00, current_date + interval '30 days', 'yearly', 'Plano Cloud Startup'),
  ('dominio', 'Hostinger', 'Domínio nomadedrive.com.br', 40.00, current_date + interval '11 months', 'yearly', 'Renovação automática'),
  ('infosimples', 'Infosimples', 'Consulta multas Senatran (mínimo mensal)', 100.00, date_trunc('month', current_date + interval '1 month'), 'monthly', 'Plano básico + consumo'),
  ('outros', 'Anthropic Claude', 'Assinatura Claude Code (anual)', 1200.00, current_date + interval '11 months', 'yearly', 'Ferramenta de desenvolvimento')
) as t(category, vendor, description, amount, due_date, recurrence, notes)
where not exists (
  select 1 from public.expenses
  where vendor = t.vendor and description = t.description and recurrence = t.recurrence
);

-- DAS MEI dos próximos 6 meses (cria os comprovantes em aberto)
do $$
declare
  i int;
  m date;
  das_amount numeric(12,2);
begin
  select das_mei_monthly into das_amount from public.business_settings where id = 1;
  for i in 0..5 loop
    m := (date_trunc('month', current_date) + (i || ' months')::interval)::date;
    insert into public.tax_obligations (kind, reference_period, amount, due_date, notes)
    values ('das_mei', to_char(m, 'YYYY-MM'), das_amount, m + interval '19 days', 'DAS MEI — gerado automaticamente')
    on conflict (kind, reference_period) do nothing;
  end loop;
end $$;

-- ============================ 9. Verificação ========================

do $$
declare
  exp_count int;
  tax_count int;
  emp_count int;
  has_summary boolean;
begin
  select count(*) into exp_count from public.expenses;
  select count(*) into tax_count from public.tax_obligations;
  select count(*) into emp_count from public.employees;
  select exists(select 1 from public.ceo_cockpit_summary) into has_summary;

  raise notice '=== Fase 37/38/39 Cockpit CEO ===';
  raise notice 'expenses (seed): %', exp_count;
  raise notice 'tax_obligations (DAS 6 meses): %', tax_count;
  raise notice 'employees: %', emp_count;
  raise notice 'ceo_cockpit_summary view: %', case when has_summary then 'OK' else 'FALHA' end;
  raise notice '';
  raise notice 'Próximo passo: refresh revenue → select public.refresh_revenue_views();';
end $$;

-- ============================ ROLLBACK (se precisar) =================
-- drop view if exists public.ceo_cockpit_summary;
-- drop materialized view if exists public.revenue_by_month;
-- drop function if exists public.refresh_revenue_views();
-- drop table if exists public.business_settings;
-- drop table if exists public.employees;
-- drop table if exists public.tax_obligations;
-- drop table if exists public.expenses;
-- ====================================================================
