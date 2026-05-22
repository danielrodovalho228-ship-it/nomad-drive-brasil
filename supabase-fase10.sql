-- ============================================================
-- Nomade Drive Brasil — Fase 10: proteção / sinistros operacional
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente: pode ser executado novamente com segurança.
--
-- O QUE ESTE SCRIPT FAZ:
--   - Adiciona a coluna reported_by em protection_cases (quem abriu o caso).
--   - Cria helpers is_protection_partner() e is_booking_party().
--   - Reescreve o RLS de protection_cases para o fluxo operacional:
--       * cliente/proprietário envolvido na reserva ABRE a ocorrência;
--       * cliente, proprietário, parceiro de proteção e admin VEEM o caso;
--       * parceiro de proteção e admin fazem a TRIAGEM (mudam status).
-- ============================================================

-- ------------------------------------------------------------
-- 1. COLUNA reported_by
-- ------------------------------------------------------------
alter table public.protection_cases
  add column if not exists reported_by uuid references auth.users(id);

-- ------------------------------------------------------------
-- 2. HELPERS (SECURITY DEFINER evita recursão de RLS)
-- ------------------------------------------------------------
-- is_protection_partner(): usuário atual é parceiro de proteção aprovado.
create or replace function public.is_protection_partner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'protection_partner'
      and ur.status = 'aprovado'
  );
$$;

-- is_booking_party(): usuário atual é o cliente ou o proprietário da reserva.
create or replace function public.is_booking_party(b_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = b_id
      and (b.client_id = auth.uid() or b.owner_id = auth.uid())
  );
$$;

-- ------------------------------------------------------------
-- 3. RLS — protection_cases
-- ------------------------------------------------------------
-- SELECT: admin, parceiro de proteção, dono do veículo, parte da reserva
-- ou quem registrou a ocorrência.
drop policy if exists protection_cases_select on public.protection_cases;
create policy protection_cases_select on public.protection_cases
  for select using (
    public.is_admin()
    or public.is_protection_partner()
    or public.owns_vehicle(vehicle_id)
    or public.is_booking_party(booking_id)
    or reported_by = auth.uid()
  );

-- INSERT: a parte da reserva (cliente/proprietário) abre o caso para si.
drop policy if exists protection_cases_report on public.protection_cases;
create policy protection_cases_report on public.protection_cases
  for insert with check (
    reported_by = auth.uid()
    and (public.is_booking_party(booking_id) or public.owns_vehicle(vehicle_id))
  );

-- UPDATE: parceiro de proteção e admin fazem a triagem do caso.
drop policy if exists protection_cases_triage on public.protection_cases;
create policy protection_cases_triage on public.protection_cases
  for update using (public.is_admin() or public.is_protection_partner())
  with check (public.is_admin() or public.is_protection_partner());

-- (a policy protection_cases_admin_write, do esquema base, segue valendo
--  para o admin — inclusive para qualquer exclusão excepcional.)

-- ============================================================
-- Fim — Fase 10 (proteção / sinistros operacional).
-- ============================================================
