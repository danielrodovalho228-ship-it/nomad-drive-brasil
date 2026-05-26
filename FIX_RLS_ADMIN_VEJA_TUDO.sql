-- ====================================================================
-- 🔓 RLS pra ADMIN ver TUDO (bookings + vehicles + rental_requests + payments)
-- --------------------------------------------------------------------
-- POR QUE? Em /historico.html (e outras telas admin), a query nao tem
-- WHERE — confia na RLS pra liberar. Se nao tem policy admin, retorna
-- 0 rows silenciosamente. Esse SQL cria policies "admin pode ler tudo"
-- nas 4 tabelas mais usadas pelo painel admin.
--
-- COMO RODAR (3 cliques):
--   1. https://supabase.com → seu projeto
--   2. Menu esquerdo → "SQL Editor"
--   3. Cola TUDO aqui → clica "Run" (canto sup direito)
--
-- IDEMPOTENTE — pode rodar varias vezes, DROP POLICY IF EXISTS antes.
-- ====================================================================

-- =====================================
-- HELPER: funcao is_admin() reutilizavel
-- =====================================
-- (Se ja existe, recria — codigo igual; senao, cria do zero.)
create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_uid
      and role in ('admin', 'super_admin')
      and status = 'aprovado'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- =====================================
-- 1) BOOKINGS — admin ve todas as reservas
-- =====================================
drop policy if exists "admin_read_all_bookings" on public.bookings;
create policy "admin_read_all_bookings" on public.bookings
  for select to authenticated
  using ( public.is_admin() );

-- =====================================
-- 2) VEHICLES — admin ve todos os veiculos (qualquer status)
-- =====================================
drop policy if exists "admin_read_all_vehicles" on public.vehicles;
create policy "admin_read_all_vehicles" on public.vehicles
  for select to authenticated
  using ( public.is_admin() );

-- =====================================
-- 3) RENTAL_REQUESTS — admin ve todas as solicitacoes
-- =====================================
drop policy if exists "admin_read_all_rental_requests" on public.rental_requests;
create policy "admin_read_all_rental_requests" on public.rental_requests
  for select to authenticated
  using ( public.is_admin() );

-- =====================================
-- 4) PAYMENTS — admin ve todos os pagamentos
-- =====================================
drop policy if exists "admin_read_all_payments" on public.payments;
create policy "admin_read_all_payments" on public.payments
  for select to authenticated
  using ( public.is_admin() );

-- =====================================
-- 5) PROFILES — admin ve todos os perfis (pra moderacao)
-- =====================================
drop policy if exists "admin_read_all_profiles" on public.profiles;
create policy "admin_read_all_profiles" on public.profiles
  for select to authenticated
  using ( public.is_admin() );

-- =====================================
-- VERIFICACAO — mostra status atual
-- =====================================
do $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_bookings_count int;
  v_vehicles_count int;
begin
  -- 1) Sua sessao
  v_user_id := auth.uid();
  if v_user_id is null then
    raise notice '⚠️  Rodando como service_role (sem auth.uid()). Policies criadas, mas teste com sua conta logada.';
    return;
  end if;

  -- 2) Sua sessao e admin?
  v_is_admin := public.is_admin(v_user_id);
  raise notice '✓ User UID atual: %', v_user_id;
  raise notice '✓ Sua sessao e admin? %', v_is_admin;

  if not v_is_admin then
    raise notice '⚠️  ATENCAO: voce NAO e admin. Pra ser admin, precisa estar em public.user_roles com role=admin AND status=aprovado.';
    raise notice '    Comando pra te tornar admin (substitua o email):';
    raise notice '      insert into public.user_roles (user_id, role, status) values (';
    raise notice '        (select id from auth.users where lower(email) = lower(''SEU_EMAIL@AQUI.COM'')),';
    raise notice '        ''admin'', ''aprovado''';
    raise notice '      ) on conflict do nothing;';
    return;
  end if;

  -- 3) Conta o que voce ve agora
  select count(*) into v_bookings_count from public.bookings;
  select count(*) into v_vehicles_count from public.vehicles;
  raise notice '';
  raise notice '✅ POLICIES CRIADAS — voce agora ve:';
  raise notice '   - % bookings (reservas)', v_bookings_count;
  raise notice '   - % vehicles (veiculos)', v_vehicles_count;
  raise notice '';
  raise notice 'Agora abre https://nomadedrive.com.br/historico.html como admin → deve mostrar todas as reservas.';
end $$;

-- =====================================
-- POLICIES CRIADAS (lista pra conferir)
-- =====================================
select
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
from pg_policies
where policyname like 'admin_read_all_%'
order by tablename;
