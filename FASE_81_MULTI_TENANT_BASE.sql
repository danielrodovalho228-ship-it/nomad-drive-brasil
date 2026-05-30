-- ====================================================================
-- 🏢 FASE 81 — MULTI-TENANT BASE (preparação pra franquia)
-- --------------------------------------------------------------------
-- Adiciona infraestrutura de multi-tenancy SEM ativar RLS por operator
-- (próximo sprint). Tudo backward-compatible — nada quebra na operação
-- atual. Todos os dados existentes vão pra Matriz Nomade Drive.
--
-- O QUE FAZ:
--   1) Cria tabela `operators` (Matriz + futuros franqueados)
--   2) Insert da Matriz Nomade Drive (royalty 100%)
--   3) Adiciona `operator_id` em 10 tabelas-fato (NULLable)
--   4) Backfill: todos dados existentes → Matriz
--   5) Tabela `user_operators` (M:N user x operator)
--   6) Vincula Daniel (super_admin) à Matriz como admin
--   7) Função `current_operator_id()` (lê de user_operators)
--   8) Função `is_matrix_admin()` (admin matriz vê tudo)
--   9) Triggers `set_default_operator_id` em todas tabelas-fato
--  10) Habilita RLS em `pricing_categories` (débito do QA)
--  11) RLS básico em `operators` e `user_operators`
--
-- COMO RODAR:
--   Já aplicada via MCP em 2026-05-26.
--   Arquivo mantido pra documentação + replay em outras instâncias.
--
-- IDEMPOTENTE — pode rodar várias vezes.
-- ====================================================================

-- 1) TABELA `operators`
create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  cnpj text unique,
  city text,
  state text,
  is_matrix boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','terminated')),
  matrix_royalty_pct numeric(5,2) not null default 30.00 check (matrix_royalty_pct between 0 and 100),
  stripe_connect_account_id text,
  founded_at date default current_date,
  territory_json jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.operators is 'Operadores/franqueados. Matriz Nomade Drive + franqueados regionais.';
comment on column public.operators.matrix_royalty_pct is '% que vai pra Matriz. Matriz = 100. Franqueado padrão = 30 (matriz 30%, franqueado 70%).';
comment on column public.operators.is_matrix is 'TRUE só pra Nomade Drive matriz.';

-- 2) Insert da Matriz Nomade Drive
insert into public.operators (name, slug, cnpj, city, state, is_matrix, status, matrix_royalty_pct, founded_at, notes)
values ('Nomade Drive Matriz', 'matriz', null, 'Uberlândia', 'MG', true, 'active', 100.00, '2026-01-01',
        'Operador matriz. Recebe 100% dos pagamentos da própria operação. Royalty recebido dos franqueados.')
on conflict (slug) do nothing;

-- 3) Adicionar `operator_id` em tabelas-fato (NULLable)
alter table public.vehicles add column if not exists operator_id uuid references public.operators(id);
alter table public.bookings add column if not exists operator_id uuid references public.operators(id);
alter table public.rental_requests add column if not exists operator_id uuid references public.operators(id);
alter table public.payments add column if not exists operator_id uuid references public.operators(id);
alter table public.withdrawals add column if not exists operator_id uuid references public.operators(id);
alter table public.leads add column if not exists operator_id uuid references public.operators(id);
alter table public.applications add column if not exists operator_id uuid references public.operators(id);
alter table public.partners_referrals add column if not exists operator_id uuid references public.operators(id);
alter table public.installation_orders add column if not exists operator_id uuid references public.operators(id);
alter table public.protection_cases add column if not exists operator_id uuid references public.operators(id);

-- 4) Backfill — Matriz
do $$
declare v_matrix_id uuid;
begin
  select id into v_matrix_id from public.operators where slug = 'matriz' limit 1;
  update public.vehicles set operator_id = v_matrix_id where operator_id is null;
  update public.bookings set operator_id = v_matrix_id where operator_id is null;
  update public.rental_requests set operator_id = v_matrix_id where operator_id is null;
  update public.payments set operator_id = v_matrix_id where operator_id is null;
  update public.withdrawals set operator_id = v_matrix_id where operator_id is null;
  update public.leads set operator_id = v_matrix_id where operator_id is null;
  update public.applications set operator_id = v_matrix_id where operator_id is null;
  update public.partners_referrals set operator_id = v_matrix_id where operator_id is null;
  update public.installation_orders set operator_id = v_matrix_id where operator_id is null;
  update public.protection_cases set operator_id = v_matrix_id where operator_id is null;
end $$;

-- 5) Tabela `user_operators` (M:N)
create table if not exists public.user_operators (
  user_id uuid not null references public.profiles(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  role text not null check (role in ('admin','staff','viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, operator_id)
);

comment on table public.user_operators is 'M:N user x operator. Franqueado tem múltiplos staff + admin matriz acessa tudo.';

-- 6) Vincular Daniel (super_admin) à Matriz
do $$
declare v_matrix_id uuid; v_super_admin_id uuid;
begin
  select id into v_matrix_id from public.operators where slug = 'matriz';
  select user_id into v_super_admin_id from public.user_roles where role = 'super_admin' limit 1;
  if v_matrix_id is not null and v_super_admin_id is not null then
    insert into public.user_operators (user_id, operator_id, role)
    values (v_super_admin_id, v_matrix_id, 'admin')
    on conflict do nothing;
  end if;
end $$;

-- 7) Função `current_operator_id()`
create or replace function public.current_operator_id()
returns uuid language sql stable security definer set search_path = public as $$
  select operator_id from public.user_operators
  where user_id = auth.uid()
  order by case when role='admin' then 1 when role='staff' then 2 else 3 end
  limit 1;
$$;
grant execute on function public.current_operator_id() to authenticated;

-- 8) Função `is_matrix_admin()`
create or replace function public.is_matrix_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_operators uo
    join public.operators o on o.id = uo.operator_id
    where uo.user_id = auth.uid() and o.is_matrix = true and uo.role = 'admin'
  );
$$;
grant execute on function public.is_matrix_admin() to authenticated;

-- 9) Triggers default operator_id em INSERTs (10 tabelas)
create or replace function public.set_default_operator_id()
returns trigger language plpgsql as $$
begin
  if new.operator_id is null then
    new.operator_id := public.current_operator_id();
    if new.operator_id is null then
      select id into new.operator_id from public.operators where slug = 'matriz' limit 1;
    end if;
  end if;
  return new;
end $$;

do $$
declare t text;
declare tables text[] := array['vehicles','bookings','rental_requests','payments','withdrawals','leads','applications','partners_referrals','installation_orders','protection_cases'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_set_default_operator_id on public.%I', t);
    execute format('create trigger trg_set_default_operator_id before insert on public.%I for each row execute function public.set_default_operator_id()', t);
  end loop;
end $$;

-- 10) Habilitar RLS na pricing_categories (DÉBITO ANTERIOR)
alter table public.pricing_categories enable row level security;
create policy "leitura publica" on public.pricing_categories for select using (true);
create policy "escrita so admin" on public.pricing_categories for all
  using (public.is_admin()) with check (public.is_admin());

-- 11) RLS em operators e user_operators
alter table public.operators enable row level security;
create policy "operators read all logged" on public.operators for select to authenticated using (true);
create policy "operators write so matrix admin" on public.operators for all
  using (public.is_matrix_admin()) with check (public.is_matrix_admin());

alter table public.user_operators enable row level security;
create policy "user_operators self read" on public.user_operators for select to authenticated
  using (user_id = auth.uid() or public.is_matrix_admin());
create policy "user_operators matrix admin write" on public.user_operators for all
  using (public.is_matrix_admin()) with check (public.is_matrix_admin());

-- ====================================================================
-- PRÓXIMO PASSO (Sprint A.2):
-- - RLS por operator_id em vehicles/bookings/etc.
-- - Edge functions de payment respeitarem operator (split via Stripe Connect)
-- - UI admin diferenciando "Matriz" vs "Franqueado X"
-- ====================================================================
