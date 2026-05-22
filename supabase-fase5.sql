-- ============================================================
-- Nomade Drive Brasil — Fase 5: check-in / check-out das locações
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Este script é idempotente: pode ser executado novamente com segurança.
-- ============================================================

-- 1. TABELA DE VISTORIAS — check-in e check-out vinculados a uma reserva
create table if not exists public.rental_inspections (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  kind            text not null,                        -- 'checkin' ou 'checkout'
  status          text not null default 'solicitado',   -- solicitado, aprovado, recusado
  scheduled_at    timestamptz,
  location        text,
  mileage         int,
  fuel_level      text,                                 -- vazio, 1/4, 1/2, 3/4, cheio
  notes           text,
  client_accepted boolean not null default false,
  validated_by    uuid references auth.users(id),
  validated_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists rental_inspections_booking_idx
  on public.rental_inspections (booking_id);

-- 2. FUNCOES AUXILIARES — SECURITY DEFINER evita recursao de RLS (42P17)
create or replace function public.booking_is_client(b_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
    where b.id = b_id and b.client_id = auth.uid()
  );
$$;

create or replace function public.booking_is_owner(b_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
    where b.id = b_id and b.owner_id = auth.uid()
  );
$$;

-- 3. ROW LEVEL SECURITY
alter table public.rental_inspections enable row level security;

-- cliente e proprietario da reserva veem; admin ve tudo
drop policy if exists rental_inspections_select on public.rental_inspections;
create policy rental_inspections_select on public.rental_inspections
  for select using (
    public.is_admin()
    or public.booking_is_client(booking_id)
    or public.booking_is_owner(booking_id)
  );

-- o cliente da reserva solicita check-in / check-out
drop policy if exists rental_inspections_client_insert on public.rental_inspections;
create policy rental_inspections_client_insert on public.rental_inspections
  for insert with check (
    public.is_admin() or public.booking_is_client(booking_id)
  );

-- o proprietario da reserva (ou admin) valida — aprova ou recusa
drop policy if exists rental_inspections_validate on public.rental_inspections;
create policy rental_inspections_validate on public.rental_inspections
  for update using (
    public.is_admin() or public.booking_is_owner(booking_id)
  ) with check (
    public.is_admin() or public.booking_is_owner(booking_id)
  );

-- ============================================================
-- Fim — Fase 5.
-- ============================================================
