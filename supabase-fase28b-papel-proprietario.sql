-- ====================================================================
-- Nomade Drive Brasil — Fase 28.2b: corrige papel proprietário
-- --------------------------------------------------------------------
-- Bug semântico na Fase 28.2: usei client_id em installation_orders.
-- CORRETO: é o PROPRIETÁRIO quem paga e cuida da instalação do
-- rastreador no veículo dele ANTES do veículo entrar na frota.
-- O cliente locatário nem existe ainda nesse momento.
--
-- Esta migration é idempotente:
--   - Se installation_orders ainda usa client_id, renomeia pra owner_id
--   - Se booking_id for NOT NULL, vira nullable (instalação acontece
--     ANTES de qualquer booking existir)
--   - Renomeia índice e policies pra refletir o papel correto
--
-- COMO USAR:
--   Supabase Dashboard > SQL Editor > New query > Run
-- ====================================================================

-- 1. Renomeia coluna client_id → owner_id (se ainda não foi feito)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='installation_orders'
      and column_name='client_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='installation_orders'
      and column_name='owner_id'
  ) then
    alter table public.installation_orders rename column client_id to owner_id;
    raise notice 'Coluna client_id renomeada para owner_id.';
  end if;
end $$;

-- 2. Drop NOT NULL de booking_id (instalação ocorre antes da locação existir)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='installation_orders'
      and column_name='booking_id' and is_nullable = 'NO'
  ) then
    alter table public.installation_orders alter column booking_id drop not null;
    raise notice 'booking_id agora é nullable.';
  end if;
end $$;

-- 3. Atualiza índice (se o antigo existir com nome installation_orders_client_idx)
do $$
begin
  if exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='installation_orders_client_idx'
  ) then
    drop index public.installation_orders_client_idx;
    raise notice 'Índice client_idx removido.';
  end if;
end $$;

create index if not exists installation_orders_owner_idx on public.installation_orders(owner_id);

-- 4. Recria policies com owner_id em vez de client_id
drop policy if exists installation_orders_select on public.installation_orders;
create policy installation_orders_select on public.installation_orders
  for select using (
    owner_id = auth.uid()
    or workshop_id in (select id from public.workshops where user_id = auth.uid())
    or public.is_admin()
    or public.is_protection_partner()
  );

-- INSERT continua sendo só admin (Edge Function via service_role)
-- UPDATE continua igual (oficina dona ou admin)
-- DELETE continua só admin

-- 5. Storage policy SELECT — atualizar pra checar owner_id
drop policy if exists installations_storage_select on storage.objects;
create policy installations_storage_select on storage.objects
  for select using (
    bucket_id = 'installations'
    and (
      public.is_admin()
      or public.is_protection_partner()
      or exists (
        select 1 from public.installation_orders io
        where io.id::text = (storage.foldername(name))[1]
          and (
            io.owner_id = auth.uid()
            or io.workshop_id in (select id from public.workshops where user_id = auth.uid())
          )
      )
    )
  );

-- 6. Atualiza comentário
comment on column public.installation_orders.owner_id is
  'Proprietário do veículo que pagou pela instalação do rastreador (não é cliente locatário — instalação ocorre ANTES da frota).';

-- 7. Trigger: gate de aprovação do veículo
--    Veículo só pode ter status='aprovado' se tracker_installed=true
create or replace function public.guard_vehicle_approval_tracker()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aprovado' and (old.status is null or old.status <> 'aprovado') then
    if not coalesce(new.tracker_installed, false) then
      raise exception 'TRACKER_PENDENTE: veículo % não tem rastreador instalado/validado. Conclua a ordem de instalação antes de aprovar o veículo.', new.id
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_vehicle_approval_tracker on public.vehicles;
create trigger trg_guard_vehicle_approval_tracker
  before update of status on public.vehicles
  for each row execute function public.guard_vehicle_approval_tracker();

comment on function public.guard_vehicle_approval_tracker() is
  'Bloqueia status=aprovado em vehicles sem tracker_installed=true. Fase 28.2b.';

-- 8. Verificação
do $$
declare
  v_col_owner int;
  v_col_client int;
  v_trg int;
begin
  select count(*) into v_col_owner
    from information_schema.columns
    where table_schema='public' and table_name='installation_orders'
      and column_name='owner_id';
  if v_col_owner = 0 then
    raise exception 'FALHA: installation_orders.owner_id não existe.';
  end if;

  select count(*) into v_col_client
    from information_schema.columns
    where table_schema='public' and table_name='installation_orders'
      and column_name='client_id';
  if v_col_client > 0 then
    raise notice 'AVISO: installation_orders.client_id ainda existe (não deveria). Migration possivelmente parcial.';
  end if;

  select count(*) into v_trg from pg_trigger where tgname='trg_guard_vehicle_approval_tracker';
  if v_trg = 0 then
    raise exception 'FALHA: trigger guard tracker não foi criado.';
  end if;

  raise notice 'OK — Fase 28.2b instalada. owner_id ativo, gate de aprovação por rastreador ON.';
end $$;

-- ====================================================================
-- Fim — Fase 28.2b (papel proprietário + gate de aprovação tracker)
-- ====================================================================
