-- ====================================================================
-- Nomade Drive Brasil — Fase 30: Tabela de multas (C6)
-- --------------------------------------------------------------------
-- Suporta o fluxo:
--   1. close-rental (check-out aprovado) dispara consulta-multas
--   2. Edge Function consulta Infosimples passando placa+Renavam+período
--   3. Salva cada infração encontrada em vehicle_fines
--   4. Admin vê pendentes em /admin#multas e cobra do cliente
--
-- Idempotente.
-- ====================================================================

create table if not exists public.vehicle_fines (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid references public.bookings(id) on delete set null,
  vehicle_id      uuid not null references public.vehicles(id) on delete cascade,
  client_id       uuid references auth.users(id) on delete set null,
  ait             text,           -- número do auto de infração
  data_infracao   date,
  hora_infracao   text,
  local           text,
  descricao       text,
  valor           numeric(12,2),
  pontos          int,
  status          text not null default 'pendente'
                  check (status in ('pendente','contestada','cobrada','paga','prescrita')),
  -- Cobrança
  charged_at      timestamptz,
  payment_id      uuid references public.payments(id) on delete set null,
  -- Origem
  source          text not null default 'infosimples',  -- ou 'manual'
  raw_data        jsonb,    -- payload completo da API pra auditoria
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists vehicle_fines_ait_unique
  on public.vehicle_fines (ait) where ait is not null;
create index if not exists vehicle_fines_booking_idx on public.vehicle_fines(booking_id);
create index if not exists vehicle_fines_vehicle_idx on public.vehicle_fines(vehicle_id);
create index if not exists vehicle_fines_status_idx  on public.vehicle_fines(status);

-- updated_at trigger
create or replace function public.touch_vehicle_fines_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_vehicle_fines_touch on public.vehicle_fines;
create trigger trg_vehicle_fines_touch
  before update on public.vehicle_fines
  for each row execute function public.touch_vehicle_fines_updated_at();

-- RLS
alter table public.vehicle_fines enable row level security;

-- SELECT: cliente da multa, owner do veículo, admin, proteção
drop policy if exists vehicle_fines_select on public.vehicle_fines;
create policy vehicle_fines_select on public.vehicle_fines
  for select using (
    client_id = auth.uid()
    or vehicle_id in (select id from public.vehicles where owner_id = auth.uid())
    or public.is_admin()
    or public.is_protection_partner()
  );

-- INSERT/UPDATE/DELETE: só admin
drop policy if exists vehicle_fines_admin_write on public.vehicle_fines;
create policy vehicle_fines_admin_write on public.vehicle_fines
  for all using (public.is_admin()) with check (public.is_admin());

-- Coluna em vehicles pra cachear placa + renavam (lookup rápido na Edge Function)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='vehicles' and column_name='renavam'
  ) then
    alter table public.vehicles add column renavam text;
  end if;
end $$;

comment on table public.vehicle_fines is
  'Multas de trânsito do veículo durante locações — Fase 30 (C6 Infosimples).';
comment on column public.vehicles.renavam is
  'Renavam do veículo (necessário pra consulta de multas Senatran via Infosimples)';

-- Verificação
do $$
declare v_table int; v_col int;
begin
  select count(*) into v_table
    from information_schema.tables
    where table_schema='public' and table_name='vehicle_fines';
  if v_table = 0 then raise exception 'FALHA: vehicle_fines não foi criada.'; end if;
  select count(*) into v_col
    from information_schema.columns
    where table_schema='public' and table_name='vehicles' and column_name='renavam';
  if v_col = 0 then raise exception 'FALHA: vehicles.renavam não foi criada.'; end if;
  raise notice 'OK — Fase 30 instalada. vehicle_fines pronta para receber consultas Infosimples.';
end $$;
