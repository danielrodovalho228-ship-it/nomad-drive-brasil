-- ============================================================
-- Nomade Drive Brasil — Fase 15: correção do fluxo Admin/KYC
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente.
--
-- O QUE FAZ:
--   - Reforça o RLS de user_documents: além de is_admin(), o super
--     admin oficial (dtrodovalho40@gmail.com) sempre pode ver e
--     atualizar documentos — garante a persistência da revisão de KYC
--     mesmo que o vínculo de papel admin esteja incompleto.
--   - Permite que o CLIENTE leia o veículo das suas reservas — corrige
--     o "Veículo da reserva" genérico na tela de detalhe da reserva.
-- ============================================================

-- ------------------------------------------------------------
-- 1. user_documents — leitura e atualização pelo admin/super admin
-- ------------------------------------------------------------
drop policy if exists user_documents_select on public.user_documents;
create policy user_documents_select on public.user_documents
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or (auth.jwt() ->> 'email') = 'dtrodovalho40@gmail.com'
  );

drop policy if exists user_documents_admin_update on public.user_documents;
create policy user_documents_admin_update on public.user_documents
  for update using (
    public.is_admin()
    or (auth.jwt() ->> 'email') = 'dtrodovalho40@gmail.com'
  ) with check (
    public.is_admin()
    or (auth.jwt() ->> 'email') = 'dtrodovalho40@gmail.com'
  );

-- ------------------------------------------------------------
-- 2. CLIENTE lê o veículo das próprias reservas
-- ------------------------------------------------------------
-- SECURITY DEFINER evita recursão de RLS ao consultar bookings.
create or replace function public.vehicle_in_my_booking(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.vehicle_id = v_id and b.client_id = auth.uid()
  );
$$;

drop policy if exists vehicles_booking_client_select on public.vehicles;
create policy vehicles_booking_client_select on public.vehicles
  for select using (public.vehicle_in_my_booking(id));

-- ============================================================
-- Fim — Fase 15 (correção do fluxo Admin/KYC).
-- ============================================================
