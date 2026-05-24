-- ====================================================================
-- Nomade Drive Brasil — Fase 33: Painel Verde de Monitoramento
-- --------------------------------------------------------------------
-- O QUE FAZ:
--   Tabelas pra suportar o painel "Tudo OK ✅" do proprietário, mostrando
--   status agregado do veículo SEM violar privacidade do cliente (LGPD).
--
-- TABELAS:
--   1. notification_preferences  → preferências de notificação por usuário
--   2. vehicle_status_snapshots  → snapshot periódico do status (Cobli/manual)
--
-- VIEW:
--   3. vehicle_health_latest     → último snapshot de cada veículo + booking ativo
--
-- LGPD:
--   - NÃO armazena GPS exato (só região agregada)
--   - NÃO armazena rotas / velocidade / horários de uso
--   - APENAS booleanos e agregados que o proprietário pode ver
--
-- Idempotente. Pode rodar de novo sem duplicar.
-- ====================================================================

-- ============================ 1. notification_preferences ===========

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Frequência do "status check" periódico
  status_frequency text not null default 'weekly'
    check (status_frequency in ('off','daily','weekly','biweekly','monthly')),

  -- Canais de entrega (array no formato JSONB)
  channels jsonb not null default '["email"]'::jsonb,
  -- valores possíveis: 'email','push','whatsapp','sms'

  -- Tipos de alertas
  financial_alerts boolean not null default true,  -- saque disponível, NF emitida
  critical_alerts boolean not null default true,   -- sempre on (não desabilita)
  maintenance_alerts boolean not null default true,-- próx revisão, multas

  -- Horário preferido pro envio (HH:MM em horário local do Brasil)
  preferred_hour int default 9 check (preferred_hour between 0 and 23),

  -- Último envio (pra evitar duplicação se cron rodar mais que 1x/dia)
  last_status_sent_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists notification_prefs_user_uidx
  on public.notification_preferences(user_id);

comment on table public.notification_preferences is
  'Preferências de notificação por usuário. Status periódico configurável + alertas críticos sempre ativos.';

-- ============================ 2. vehicle_status_snapshots ===========
-- Cada snapshot é uma "foto" do estado do veículo num momento.
-- Cron diário (ou Cobli webhook) cria novo snapshot.
-- Histórico é mantido pra auditoria + gráficos de evolução.

create table if not exists public.vehicle_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,

  -- Status do rastreador (Cobli API)
  tracker_connected boolean,
  tracker_battery_pct int check (tracker_battery_pct between 0 and 100),
  tracker_last_ping_at timestamptz,

  -- Localização AGREGADA (NÃO ponto exato — só região/cidade aprovada)
  in_authorized_region boolean,
  current_region text,         -- "Triângulo Mineiro", "Grande Belo Horizonte" — não cidade exata
  current_state text,          -- "MG", "SP" — autorizado pelo contrato

  -- Status manutenção (calculado de vehicles.last_revision_km vs vehicle_mileage)
  maintenance_status text check (maintenance_status in ('em_dia','proxima','atrasada')),
  km_to_next_revision int,

  -- Multas (lê de vehicle_fines)
  pending_fines_count int default 0,
  pending_fines_amount numeric(10,2) default 0,

  -- Status geral (computed)
  overall_status text not null check (overall_status in ('green','yellow','red')),
  alert_messages jsonb,        -- array de mensagens de alerta se != green

  -- Raw payload da fonte (Cobli ou outra) pra debug
  raw_data jsonb,

  created_at timestamptz default now()
);

create index if not exists vehicle_snapshots_vehicle_created_idx
  on public.vehicle_status_snapshots(vehicle_id, created_at desc);

create index if not exists vehicle_snapshots_overall_status_idx
  on public.vehicle_status_snapshots(overall_status, created_at desc);

comment on table public.vehicle_status_snapshots is
  'Snapshots periódicos do estado de cada veículo. Histórico mantido. LGPD-safe — sem GPS exato.';

-- ============================ 3. VIEW: vehicle_health_latest ========
-- Pega o ÚLTIMO snapshot de cada veículo + info do booking ativo.
-- Usada pelo painel verde no dashboard-proprietario.

create or replace view public.vehicle_health_latest as
with latest_snapshot as (
  select distinct on (vehicle_id)
    vehicle_id,
    tracker_connected, tracker_battery_pct, tracker_last_ping_at,
    in_authorized_region, current_region, current_state,
    maintenance_status, km_to_next_revision,
    pending_fines_count, pending_fines_amount,
    overall_status, alert_messages,
    created_at as snapshot_at
  from public.vehicle_status_snapshots
  order by vehicle_id, created_at desc
),
active_booking as (
  select distinct on (vehicle_id)
    vehicle_id,
    id as booking_id,
    client_id,
    start_date, end_date,
    status as booking_status
  from public.bookings
  where status in ('em_uso','aprovado')
  order by vehicle_id, created_at desc
)
select
  v.id as vehicle_id,
  v.owner_id,
  v.make, v.model, v.year_model,
  v.license_plate, v.plate_last_digits,
  v.status as vehicle_status,
  v.tracker_installed,

  -- Snapshot
  ls.tracker_connected,
  ls.tracker_battery_pct,
  ls.tracker_last_ping_at,
  ls.in_authorized_region,
  ls.current_region,
  ls.current_state,
  ls.maintenance_status,
  ls.km_to_next_revision,
  ls.pending_fines_count,
  ls.pending_fines_amount,
  coalesce(ls.overall_status, 'yellow') as overall_status,  -- yellow = sem dados
  ls.alert_messages,
  ls.snapshot_at,

  -- Idade do snapshot (em horas) — útil pra alertar se Cobli parou de enviar
  case when ls.snapshot_at is not null
    then round(extract(epoch from (now() - ls.snapshot_at)) / 3600, 1)
    else null
  end as snapshot_age_hours,

  -- Booking ativo (pra mostrar "em uso por Fulano até DD/MM")
  ab.booking_id as active_booking_id,
  ab.client_id as active_client_id,
  cp.full_name as active_client_name,
  ab.start_date as active_booking_start,
  ab.end_date as active_booking_end,
  ab.booking_status as active_booking_status

from public.vehicles v
left join latest_snapshot ls on ls.vehicle_id = v.id
left join active_booking ab on ab.vehicle_id = v.id
left join public.profiles cp on cp.id = ab.client_id
where v.status = 'aprovado';

comment on view public.vehicle_health_latest is
  'Estado mais recente de cada veículo aprovado + booking ativo (se houver). Usada pelo painel verde do proprietário.';

-- ============================ 4. RLS Policies =======================

alter table public.notification_preferences enable row level security;
alter table public.vehicle_status_snapshots enable row level security;

-- notification_preferences: cada usuário gerencia as próprias
drop policy if exists notif_prefs_own_select on public.notification_preferences;
create policy notif_prefs_own_select on public.notification_preferences
  for select using (user_id = auth.uid());

drop policy if exists notif_prefs_own_insert on public.notification_preferences;
create policy notif_prefs_own_insert on public.notification_preferences
  for insert with check (user_id = auth.uid());

drop policy if exists notif_prefs_own_update on public.notification_preferences;
create policy notif_prefs_own_update on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- vehicle_status_snapshots: proprietário vê só os do próprio veículo
drop policy if exists snapshots_owner_select on public.vehicle_status_snapshots;
create policy snapshots_owner_select on public.vehicle_status_snapshots
  for select using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_status_snapshots.vehicle_id
        and v.owner_id = auth.uid()
    )
  );

-- Admin pode tudo
drop policy if exists snapshots_admin_all on public.vehicle_status_snapshots;
create policy snapshots_admin_all on public.vehicle_status_snapshots
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================ 5. SEED de teste ======================
-- Cria 1 snapshot "verde" pra cada veículo aprovado (mock até integrar Cobli)

do $$
declare
  v record;
begin
  for v in select id, last_revision_km, mileage, tire_baseline_km, tire_life_km
             from public.vehicles where status = 'aprovado'
  loop
    -- Só insere se não tem snapshot ainda
    if not exists (select 1 from public.vehicle_status_snapshots where vehicle_id = v.id) then
      insert into public.vehicle_status_snapshots (
        vehicle_id,
        tracker_connected, tracker_battery_pct, tracker_last_ping_at,
        in_authorized_region, current_region, current_state,
        maintenance_status, km_to_next_revision,
        pending_fines_count, pending_fines_amount,
        overall_status, alert_messages, raw_data
      ) values (
        v.id,
        true, 95, now() - interval '5 minutes',
        true, 'Triângulo Mineiro', 'MG',
        'em_dia', 4500,
        0, 0,
        'green', '[]'::jsonb, '{"source": "seed_initial"}'::jsonb
      );
    end if;
  end loop;
end $$;

-- ============================ 6. Função: helper "criar snapshot" ====
-- Útil pra dev/testes manuais OU pro webhook do Cobli chamar quando
-- receber update do rastreador.

create or replace function public.create_vehicle_snapshot(
  vehicle_id_in uuid,
  tracker_connected_in boolean default true,
  tracker_battery_in int default 100,
  in_region_in boolean default true,
  region_in text default 'Triângulo Mineiro',
  state_in text default 'MG',
  pending_fines_count_in int default 0,
  pending_fines_amount_in numeric default 0,
  raw_data_in jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
  veh record;
  km_remaining int;
  status_calc text;
  alerts jsonb := '[]'::jsonb;
begin
  -- Carrega veículo
  select last_revision_km, mileage, revision_interval_km
    into veh from public.vehicles where id = vehicle_id_in;
  if not found then
    raise exception 'Vehicle % not found', vehicle_id_in;
  end if;

  -- Calcula manutenção (placeholder simples)
  km_remaining := coalesce(veh.last_revision_km, 0) + coalesce(veh.revision_interval_km, 10000) - coalesce(veh.mileage, 0);

  -- Calcula overall_status
  if not tracker_connected_in then
    status_calc := 'red';
    alerts := alerts || jsonb_build_array('Rastreador desconectado');
  elsif tracker_battery_in < 20 then
    status_calc := 'red';
    alerts := alerts || jsonb_build_array('Bateria do GPS abaixo de 20%');
  elsif not in_region_in then
    status_calc := 'red';
    alerts := alerts || jsonb_build_array('Veículo fora da região autorizada');
  elsif pending_fines_count_in > 0 then
    status_calc := 'yellow';
    alerts := alerts || jsonb_build_array(pending_fines_count_in || ' multa(s) pendente(s)');
  elsif km_remaining < 500 then
    status_calc := 'yellow';
    alerts := alerts || jsonb_build_array('Revisão próxima (< 500 km)');
  else
    status_calc := 'green';
  end if;

  insert into public.vehicle_status_snapshots (
    vehicle_id, tracker_connected, tracker_battery_pct, tracker_last_ping_at,
    in_authorized_region, current_region, current_state,
    maintenance_status, km_to_next_revision,
    pending_fines_count, pending_fines_amount,
    overall_status, alert_messages, raw_data
  ) values (
    vehicle_id_in, tracker_connected_in, tracker_battery_in, now(),
    in_region_in, region_in, state_in,
    case when km_remaining > 1000 then 'em_dia'
         when km_remaining > 0 then 'proxima'
         else 'atrasada' end,
    greatest(0, km_remaining),
    pending_fines_count_in, pending_fines_amount_in,
    status_calc, alerts, raw_data_in
  )
  returning id into new_id;

  return new_id;
end;
$$;

comment on function public.create_vehicle_snapshot is
  'Helper pra criar snapshot. Calcula overall_status automaticamente. Usar pelo webhook Cobli ou tests.';

-- ============================ 7. Verificação ========================

do $$
declare
  snapshot_count int;
  vehicles_aprovados int;
begin
  select count(*) into snapshot_count from public.vehicle_status_snapshots;
  select count(*) into vehicles_aprovados from public.vehicles where status = 'aprovado';

  raise notice '=== Fase 33 — Painel Verde ===';
  raise notice 'vehicles aprovados: %', vehicles_aprovados;
  raise notice 'snapshots iniciais: %', snapshot_count;
  raise notice 'view vehicle_health_latest: pronta';
  raise notice '';
  raise notice 'Pra testar manualmente um snapshot, rode:';
  raise notice '  select public.create_vehicle_snapshot(<vehicle_uuid>, false);  -- simula rastreador OFF';
end $$;

-- ====================================================================
-- ROLLBACK (descomente se precisar reverter)
-- ====================================================================
-- drop function if exists public.create_vehicle_snapshot;
-- drop view if exists public.vehicle_health_latest;
-- drop table if exists public.vehicle_status_snapshots;
-- drop table if exists public.notification_preferences;
-- ====================================================================
