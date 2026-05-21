-- ============================================================
-- NomadDrive Brasil — Esquema Supabase (Fase 1: autenticacao e perfis)
-- ============================================================
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
--   3. Authentication > Providers > Email: mantenha "Confirm email" ATIVADO.
--   4. Authentication > URL Configuration: defina o "Site URL" para a URL
--      do seu GitHub Pages e adicione-a tambem em "Redirect URLs".
--   5. Project Settings > API: copie "Project URL" e a chave "anon public"
--      para o arquivo supabase-config.js.
--
-- SEGURANCA:
--   - A chave "anon public" pode ficar no front-end (protegida por RLS).
--   - A chave "service_role" NUNCA deve aparecer no front-end, no GitHub
--     ou no GitHub Pages. Use-a apenas em backend seguro / Edge Functions.
--   - Como a service_role ja foi exposta antes, ROTACIONE-A em
--     Project Settings > API antes de ir para producao.
--
-- Este script e idempotente: pode ser executado novamente com seguranca.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------
do $$ begin
  create type app_role as enum (
    'client','owner','referral_partner','workshop','protection_partner','admin','super_admin'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type entity_status as enum (
    'rascunho','email_verificado','em_analise','documentos_pendentes',
    'aprovado','aprovado_com_ressalvas','recusado','suspenso','bloqueado_para_revisao'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------
-- 2. TABELAS
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text,
  phone               text,
  city                text,
  state               text,
  main_role           app_role,
  verification_status entity_status not null default 'rascunho',
  avatar_url          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        app_role not null,
  status      entity_status not null default 'em_analise',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.workshops (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  business_name   text,
  cnpj            text,
  responsible_name text,
  phone           text,
  address         text,
  city            text,
  state           text,
  weekly_capacity int,
  status          entity_status not null default 'em_analise',
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  category          text,
  make              text,
  model             text,
  year_model        int,
  mileage           int,
  fipe_value        numeric(12,2),
  plate_last_digits text,
  city              text,
  state             text,
  status            entity_status not null default 'rascunho',
  eligibility_notes text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.vehicle_documents (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references public.vehicles(id) on delete cascade,
  document_type text,
  file_url      text,
  status        entity_status not null default 'em_analise',
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.vehicle_inspections (
  id                uuid primary key default gen_random_uuid(),
  vehicle_id        uuid not null references public.vehicles(id) on delete cascade,
  workshop_id       uuid references public.workshops(id),
  inspection_status entity_status not null default 'em_analise',
  checklist_json    jsonb,
  photos_json       jsonb,
  mechanic_notes    text,
  approved          boolean not null default false,
  created_at        timestamptz not null default now()
);

create table if not exists public.rental_requests (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references auth.users(id) on delete cascade,
  vehicle_id         uuid references public.vehicles(id) on delete set null,
  desired_start_date date,
  desired_months     int,
  reason             text,
  city               text,
  status             entity_status not null default 'em_analise',
  created_at         timestamptz not null default now()
);

create table if not exists public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references auth.users(id) on delete cascade,
  owner_id              uuid not null references auth.users(id) on delete cascade,
  vehicle_id            uuid references public.vehicles(id) on delete set null,
  start_date            date,
  end_date              date,
  monthly_price         numeric(12,2),
  platform_fee          numeric(12,2),
  owner_estimated_amount numeric(12,2),
  status                entity_status not null default 'rascunho',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.partners_referrals (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references auth.users(id) on delete cascade,
  referred_name     text,
  referred_phone    text,
  referred_email    text,
  referral_type     text,
  status            entity_status not null default 'em_analise',
  commission_status text not null default 'estimada',
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists public.protection_cases (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid references public.vehicles(id) on delete set null,
  booking_id       uuid references public.bookings(id) on delete set null,
  case_type        text,  -- sinistro, limpeza_especial, mau_uso, multa, pane, roubo_furto, dano_interno, dano_externo
  status           entity_status not null default 'em_analise',
  description      text,
  evidence_urls    jsonb,
  estimated_amount numeric(12,2),
  resolution_notes text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid references auth.users(id),
  action        text,
  target_type   text,
  target_id     uuid,
  metadata_json jsonb,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 3. FUNCOES AUXILIARES
-- ----------------------------------------------------------------
-- is_admin(): true se o usuario atual tem papel admin/super_admin aprovado.
-- SECURITY DEFINER evita recursao de RLS ao consultar user_roles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin','super_admin')
      and ur.status = 'aprovado'
  );
$$;

-- my_workshop_id(): id da oficina vinculada ao usuario atual (ou null).
create or replace function public.my_workshop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select w.id from public.workshops w where w.user_id = auth.uid() limit 1;
$$;

-- owns_vehicle() / workshop_sees_vehicle(): checagens entre tabelas usadas
-- pelas policies. SECURITY DEFINER evita recursao de RLS (erro 42P17) quando
-- a policy de vehicles consulta vehicle_inspections e vice-versa.
create or replace function public.owns_vehicle(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vehicles v
    where v.id = v_id and v.owner_id = auth.uid()
  );
$$;

create or replace function public.workshop_sees_vehicle(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vehicle_inspections vi
    where vi.vehicle_id = v_id and vi.workshop_id = public.my_workshop_id()
  );
$$;

-- set_updated_at(): mantem a coluna updated_at sincronizada.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- handle_new_user(): cria profile + user_role inicial a partir do signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role        app_role;
  v_role_status entity_status;
begin
  begin
    v_role := coalesce((new.raw_user_meta_data->>'initial_role')::app_role, 'client');
  exception when others then
    v_role := 'client';
  end;

  -- admin/super_admin nunca sao auto-atribuidos via cadastro publico
  if v_role in ('admin','super_admin') then
    v_role := 'client';
  end if;

  -- papeis criticos exigem aprovacao manual
  if v_role in ('workshop','protection_partner') then
    v_role_status := 'em_analise';
  else
    v_role_status := 'aprovado';
  end if;

  insert into public.profiles (id, full_name, phone, main_role, verification_status)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    v_role,
    'email_verificado'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role, status)
  values (new.id, v_role, v_role_status)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- triggers de updated_at
do $$
declare t text;
begin
  foreach t in array array['profiles','workshops','vehicles','bookings','protection_cases']
  loop
    execute format('drop trigger if exists trg_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.user_roles          enable row level security;
alter table public.workshops           enable row level security;
alter table public.vehicles            enable row level security;
alter table public.vehicle_documents   enable row level security;
alter table public.vehicle_inspections enable row level security;
alter table public.rental_requests     enable row level security;
alter table public.bookings            enable row level security;
alter table public.partners_referrals  enable row level security;
alter table public.protection_cases    enable row level security;
alter table public.admin_audit_logs    enable row level security;

-- PROFILES: usuario le/edita o proprio; admin gerencia tudo.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- USER_ROLES: usuario ve os proprios papeis; so admin altera.
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- WORKSHOPS: dono da oficina ve/edita a propria; admin gerencia tudo.
drop policy if exists workshops_owner on public.workshops;
create policy workshops_owner on public.workshops
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- VEHICLES: proprietario gerencia os proprios; oficina ve os atribuidos; admin tudo.
drop policy if exists vehicles_owner on public.vehicles;
create policy vehicles_owner on public.vehicles
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
drop policy if exists vehicles_workshop_select on public.vehicles;
create policy vehicles_workshop_select on public.vehicles
  for select using (public.workshop_sees_vehicle(id));

-- VEHICLE_DOCUMENTS: proprietario do veiculo; admin.
drop policy if exists vehicle_documents_access on public.vehicle_documents;
create policy vehicle_documents_access on public.vehicle_documents
  for all using (public.is_admin() or public.owns_vehicle(vehicle_id))
  with check (public.is_admin() or public.owns_vehicle(vehicle_id));

-- VEHICLE_INSPECTIONS: oficina atribuida; proprietario do veiculo (leitura); admin.
drop policy if exists vehicle_inspections_select on public.vehicle_inspections;
create policy vehicle_inspections_select on public.vehicle_inspections
  for select using (
    public.is_admin()
    or workshop_id = public.my_workshop_id()
    or public.owns_vehicle(vehicle_id)
  );
drop policy if exists vehicle_inspections_workshop_write on public.vehicle_inspections;
create policy vehicle_inspections_workshop_write on public.vehicle_inspections
  for all using (public.is_admin() or workshop_id = public.my_workshop_id())
  with check (public.is_admin() or workshop_id = public.my_workshop_id());

-- RENTAL_REQUESTS: cliente ve/cria as proprias; admin tudo.
drop policy if exists rental_requests_owner on public.rental_requests;
create policy rental_requests_owner on public.rental_requests
  for all using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

-- BOOKINGS: cliente e proprietario envolvidos veem; admin gerencia.
drop policy if exists bookings_parties_select on public.bookings;
create policy bookings_parties_select on public.bookings
  for select using (client_id = auth.uid() or owner_id = auth.uid() or public.is_admin());
drop policy if exists bookings_admin_write on public.bookings;
create policy bookings_admin_write on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- PARTNERS_REFERRALS: parceiro ve/cria as proprias indicacoes; admin tudo.
drop policy if exists partners_referrals_owner on public.partners_referrals;
create policy partners_referrals_owner on public.partners_referrals
  for all using (partner_id = auth.uid() or public.is_admin())
  with check (partner_id = auth.uid() or public.is_admin());

-- PROTECTION_CASES: proprietario do veiculo le; admin gerencia tudo.
drop policy if exists protection_cases_select on public.protection_cases;
create policy protection_cases_select on public.protection_cases
  for select using (public.is_admin() or public.owns_vehicle(vehicle_id));
drop policy if exists protection_cases_admin_write on public.protection_cases;
create policy protection_cases_admin_write on public.protection_cases
  for all using (public.is_admin()) with check (public.is_admin());

-- ADMIN_AUDIT_LOGS: somente admin.
drop policy if exists admin_audit_logs_admin on public.admin_audit_logs;
create policy admin_audit_logs_admin on public.admin_audit_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------
-- 5. PROMOVER UM ADMINISTRADOR (executar manualmente quando necessario)
-- ----------------------------------------------------------------
-- Crie a conta normalmente pelo site, depois rode (trocando o e-mail):
--
--   insert into public.user_roles (user_id, role, status)
--   select id, 'super_admin', 'aprovado' from auth.users
--   where email = 'seu-email-admin@dominio.com'
--   on conflict (user_id, role) do update set status = 'aprovado';
--
-- ============================================================
-- Fim do esquema — Fase 1.
-- ============================================================
