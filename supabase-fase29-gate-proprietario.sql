-- ====================================================================
-- Nomade Drive Brasil — Fase 29: Gate de proprietário recusado/suspenso
-- --------------------------------------------------------------------
-- Bug QA reportado: proprietário com verification_status='recusado'
-- continua aprovando check-in/check-out e operando normalmente.
-- Resultado: locação ativa com responsável NÃO aprovado pela plataforma.
--
-- Solução: trigger que bloqueia operações críticas quando o owner do
-- veículo NÃO está aprovado.
--
-- AÇÕES BLOQUEADAS quando owner.verification_status in
-- ('recusado','suspenso','bloqueado_para_revisao'):
--   1. Aprovar/recusar rental_inspections (check-in/check-out)
--   2. Update em vehicles próprios (não pode editar dados)
--   3. Receber novas bookings (admin não pode criar booking em
--      veículo de owner não-aprovado)
--
-- Idempotente.
-- ====================================================================

-- 1. Helper: status do owner de um veículo
create or replace function public.vehicle_owner_status(v_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select p.verification_status::text
    from public.vehicles v
    join public.profiles p on p.id = v.owner_id
   where v.id = v_id
$$;

-- 2. Trigger em rental_inspections: bloqueia se owner não-aprovado
create or replace function public.guard_inspection_owner_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_status text;
  v_owner_id uuid;
begin
  -- Só checa em UPDATE (admin precisa poder INSERT mesmo se owner tiver problema)
  if tg_op <> 'UPDATE' then return new; end if;

  -- Pega owner_id via booking
  select b.owner_id into v_owner_id
    from public.bookings b
   where b.id = new.booking_id;

  if v_owner_id is null then return new; end if;

  select verification_status::text into v_owner_status
    from public.profiles where id = v_owner_id;

  if v_owner_status in ('recusado','suspenso','bloqueado_para_revisao') then
    -- Admin pode passar (precisa pra resolver situações)
    if public.is_admin() then return new; end if;

    raise exception 'OWNER_BLOQUEADO: o proprietário deste veículo está com perfil "%". Aprovações de check-in/check-out estão suspensas até regularização. Entre em contato com o suporte.', v_owner_status
      using errcode = 'P0001';
  end if;

  return new;
end $$;

drop trigger if exists trg_guard_inspection_owner on public.rental_inspections;
create trigger trg_guard_inspection_owner
  before update on public.rental_inspections
  for each row execute function public.guard_inspection_owner_status();

-- 3. Trigger em vehicles: bloqueia owner não-aprovado de editar próprio veículo
create or replace function public.guard_vehicle_owner_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_status text;
begin
  -- Pula admin (precisa poder editar)
  if public.is_admin() then return new; end if;

  -- Só checa quando o caller é o owner do veículo (operação normal de manutenção)
  if new.owner_id is null or new.owner_id <> auth.uid() then
    return new;
  end if;

  select verification_status::text into v_owner_status
    from public.profiles where id = new.owner_id;

  if v_owner_status in ('recusado','suspenso','bloqueado_para_revisao') then
    raise exception 'OWNER_BLOQUEADO: seu perfil está "%" — não é possível editar veículos. Regularize a situação com o suporte.', v_owner_status
      using errcode = 'P0001';
  end if;

  return new;
end $$;

drop trigger if exists trg_guard_vehicle_owner on public.vehicles;
create trigger trg_guard_vehicle_owner
  before update on public.vehicles
  for each row execute function public.guard_vehicle_owner_status();

-- 4. Trigger em bookings: bloqueia criar nova com owner não-aprovado
create or replace function public.guard_booking_owner_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_status text;
begin
  if new.owner_id is null then return new; end if;

  select verification_status::text into v_owner_status
    from public.profiles where id = new.owner_id;

  if v_owner_status in ('recusado','suspenso','bloqueado_para_revisao') then
    raise exception 'OWNER_BLOQUEADO: não é possível criar reserva pra veículo cujo proprietário está "%". Reative o cadastro do proprietário primeiro.', v_owner_status
      using errcode = 'P0001';
  end if;

  return new;
end $$;

drop trigger if exists trg_guard_booking_owner on public.bookings;
create trigger trg_guard_booking_owner
  before insert on public.bookings
  for each row execute function public.guard_booking_owner_status();

-- 5. Audit action novo
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='audit_actions'
  ) then
    insert into public.audit_actions (action, label, severity)
    values ('owner_blocked_operation', 'Operação bloqueada — proprietário recusado/suspenso', 'critica')
    on conflict (action) do nothing;
  end if;
end $$;

-- 6. Comentários
comment on function public.guard_inspection_owner_status() is
  'Bloqueia update em rental_inspections se owner do veículo não está aprovado. Admin pode sobrescrever.';
comment on function public.guard_vehicle_owner_status() is
  'Bloqueia owner não-aprovado de editar próprios veículos. Admin pode sobrescrever.';
comment on function public.guard_booking_owner_status() is
  'Bloqueia criação de booking em veículo de owner não-aprovado.';

-- 7. Verificação
do $$
declare v_trg int;
begin
  select count(*) into v_trg from pg_trigger
   where tgname in (
     'trg_guard_inspection_owner',
     'trg_guard_vehicle_owner',
     'trg_guard_booking_owner'
   );
  if v_trg <> 3 then
    raise exception 'FALHA: alguns triggers de guard não foram criados. (% de 3)', v_trg;
  end if;
  raise notice 'OK — Fase 29 instalada. 3 triggers de gate proprietário ativos.';
end $$;

-- ====================================================================
-- Fim — Fase 29 (gate de proprietário recusado/suspenso)
-- ====================================================================
