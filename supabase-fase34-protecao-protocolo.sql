-- ====================================================================
-- Nomade Drive Brasil — Fase 34: Painel Proteção profissional
-- Sprint 1: Protocolo único + Prioridade + Backfill
-- --------------------------------------------------------------------
-- O QUE FAZ:
--   1. Adiciona protocol_number (texto único) em protection_cases e damages
--      formato PR-YYYY-NNNN (proteção) e AV-YYYY-NNNN (avarias)
--   2. Adiciona priority (alta/media/baixa) em protection_cases
--      auto-classificada pelo case_type quando NULL
--   3. Trigger BEFORE INSERT que gera protocolo + prioridade automaticamente
--   4. Backfill dos casos/avarias existentes
--
-- COMO RODAR:
--   Supabase SQL Editor → New query → cola → Run.
--   Pode rodar tudo de uma vez (não é caso de "unsafe use of enum value").
--
-- REVERSÍVEL:
--   Sim — seção ROLLBACK no fim.
-- ====================================================================

-- ---------- 1. Sequências (idempotente) ----------

create sequence if not exists protection_case_protocol_seq;
create sequence if not exists damage_protocol_seq;

-- ---------- 2. Colunas novas ----------

alter table public.protection_cases
  add column if not exists protocol_number text;

alter table public.protection_cases
  add column if not exists priority text default 'media'
    check (priority in ('alta','media','baixa'));

alter table public.damages
  add column if not exists protocol_number text;

-- Índice único pra protocolo (idempotente)
create unique index if not exists protection_cases_protocol_uq
  on public.protection_cases(protocol_number);

create unique index if not exists damages_protocol_uq
  on public.damages(protocol_number);

-- Índices auxiliares pra filtros
create index if not exists protection_cases_status_priority_idx
  on public.protection_cases(status, priority, created_at desc);

create index if not exists damages_status_idx
  on public.damages(status, created_at desc);

-- ---------- 3. Função: classificar prioridade pelo tipo de caso ----------

create or replace function public.classify_case_priority(case_type_in text)
returns text
language sql
immutable
as $$
  select case case_type_in
    when 'sinistro'         then 'alta'
    when 'roubo_furto'      then 'alta'
    when 'pane'             then 'alta'
    when 'dano_externo'     then 'media'
    when 'dano_interno'     then 'media'
    when 'mau_uso'          then 'media'
    when 'limpeza_especial' then 'baixa'
    when 'multa'            then 'baixa'
    else                         'media'
  end;
$$;

-- ---------- 4. Trigger: protection_cases BEFORE INSERT ----------

create or replace function public.set_protection_case_defaults()
returns trigger
language plpgsql
as $$
begin
  -- Gera protocolo se não vier preenchido
  if new.protocol_number is null then
    new.protocol_number := 'PR-' ||
      to_char(coalesce(new.created_at, now()), 'YYYY') || '-' ||
      lpad(nextval('protection_case_protocol_seq')::text, 4, '0');
  end if;

  -- Classifica prioridade pelo tipo se não vier
  if new.priority is null then
    new.priority := public.classify_case_priority(new.case_type);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_protection_case_defaults on public.protection_cases;
create trigger trg_set_protection_case_defaults
  before insert on public.protection_cases
  for each row execute function public.set_protection_case_defaults();

-- ---------- 5. Trigger: damages BEFORE INSERT ----------

create or replace function public.set_damage_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.protocol_number is null then
    new.protocol_number := 'AV-' ||
      to_char(coalesce(new.created_at, now()), 'YYYY') || '-' ||
      lpad(nextval('damage_protocol_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_damage_defaults on public.damages;
create trigger trg_set_damage_defaults
  before insert on public.damages
  for each row execute function public.set_damage_defaults();

-- ---------- 6. Backfill: dar protocolo pros casos existentes ----------

do $$
declare
  r record;
  counter int;
begin
  -- protection_cases sem protocolo
  counter := 0;
  for r in
    select id, created_at, case_type, priority
      from public.protection_cases
     where protocol_number is null
     order by created_at
  loop
    counter := counter + 1;
    update public.protection_cases
       set protocol_number = 'PR-' ||
             to_char(coalesce(r.created_at, now()), 'YYYY') || '-' ||
             lpad(nextval('protection_case_protocol_seq')::text, 4, '0'),
           priority = coalesce(r.priority,
                              public.classify_case_priority(r.case_type),
                              'media')
     where id = r.id;
  end loop;
  raise notice 'Backfill protection_cases: % linhas atualizadas.', counter;

  -- damages sem protocolo
  counter := 0;
  for r in
    select id, created_at
      from public.damages
     where protocol_number is null
     order by created_at
  loop
    counter := counter + 1;
    update public.damages
       set protocol_number = 'AV-' ||
             to_char(coalesce(r.created_at, now()), 'YYYY') || '-' ||
             lpad(nextval('damage_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
  raise notice 'Backfill damages: % linhas atualizadas.', counter;
end $$;

-- ---------- 7. View enriquecida: protection_cases_full ----------
-- Centraliza joins (vehicle, client) + computa SLA + aberto há.
-- Usada pelo dashboard-protecao em vez de protection_cases direto.

create or replace view public.protection_cases_full as
select
  pc.id,
  pc.protocol_number,
  pc.priority,
  pc.status,
  pc.case_type,
  pc.description,
  pc.estimated_amount,
  pc.resolution_notes,
  pc.evidence_urls,
  pc.reported_by,
  pc.vehicle_id,
  pc.booking_id,
  pc.created_at,
  pc.updated_at,

  -- Veículo (pode ser null se desvinculado)
  v.make            as vehicle_make,
  v.model           as vehicle_model,
  v.year_model      as vehicle_year_model,
  v.license_plate   as vehicle_license_plate,
  v.plate_last_digits as vehicle_plate_digits,
  v.renavam         as vehicle_renavam,
  v.city            as vehicle_city,
  v.state           as vehicle_state,

  -- Cliente (prioriza reported_by; fallback pra booking.client_id)
  rp.full_name      as client_name,
  rp.phone          as client_phone,
  rp.email          as client_email,

  -- Computa: horas desde abertura
  round(extract(epoch from (now() - pc.created_at)) / 3600, 1) as hours_since_open,

  -- Computa: SLA em horas (depende da prioridade)
  case
    when pc.priority = 'alta'  then 24
    when pc.priority = 'media' then 48
    else 72
  end as sla_total_hours,

  -- Computa: horas restantes pra estourar SLA (0 se já encerrou ou estourou)
  case
    when pc.status in ('aprovado','aprovado_com_ressalvas','recusado') then null
    else greatest(0,
      (case
        when pc.priority = 'alta'  then 24
        when pc.priority = 'media' then 48
        else 72
      end) - extract(epoch from (now() - pc.created_at)) / 3600
    )
  end as sla_remaining_hours

from public.protection_cases pc
left join public.vehicles v on v.id = pc.vehicle_id
left join public.profiles rp on rp.id = pc.reported_by;

comment on view public.protection_cases_full is
  'Versão enriquecida de protection_cases com veículo, cliente, SLA e prioridade. Usada pelo dashboard-protecao.';

-- ---------- 8. View enriquecida: damages_full ----------

create or replace view public.damages_full as
select
  d.id,
  d.protocol_number,
  d.booking_id,
  d.status,
  d.description,
  d.rule_code,
  d.suggested_amount,
  d.final_amount,
  d.review_notes,
  d.client_dispute,
  d.client_disputed_at,
  d.reviewed_at,
  d.captured_at,
  d.evidence_urls,
  d.created_at,
  d.updated_at,

  -- Booking + Veículo
  b.vehicle_id,
  v.make            as vehicle_make,
  v.model           as vehicle_model,
  v.year_model      as vehicle_year_model,
  v.license_plate   as vehicle_license_plate,
  v.plate_last_digits as vehicle_plate_digits,

  -- Cliente
  b.client_id,
  cp.full_name      as client_name,
  cp.phone          as client_phone,
  cp.email          as client_email,

  -- Proprietário (quem reportou a avaria)
  b.owner_id,
  op.full_name      as owner_name,

  -- Computa: horas desde abertura
  round(extract(epoch from (now() - d.created_at)) / 3600, 1) as hours_since_open,

  -- SLA pra avarias: 48h sempre (até resolver/captar)
  48 as sla_total_hours,

  case
    when d.status in ('aprovado_captura','aprovado_sem_captura','resolvido') then null
    else greatest(0, 48 - extract(epoch from (now() - d.created_at)) / 3600)
  end as sla_remaining_hours

from public.damages d
left join public.bookings b on b.id = d.booking_id
left join public.vehicles v on v.id = b.vehicle_id
left join public.profiles cp on cp.id = b.client_id
left join public.profiles op on op.id = b.owner_id;

comment on view public.damages_full is
  'Versão enriquecida de damages com veículo, cliente, proprietário, SLA. Usada pelo dashboard-protecao.';

-- ---------- 9. Stats agregadas pro top-bar do painel ----------

create or replace view public.protection_dashboard_stats as
select
  (select count(*) from public.protection_cases
    where status in ('em_analise','documentos_pendentes')) as casos_em_analise,
  (select count(*) from public.damages
    where status in ('pendente_revisao','em_contestacao'))  as avarias_pendentes,
  (select count(*) from public.protection_cases_full
    where status in ('em_analise','documentos_pendentes')
      and sla_remaining_hours is not null
      and sla_remaining_hours < 6)                          as casos_vencendo_sla,
  (select count(*) from public.protection_cases
    where status in ('aprovado','aprovado_com_ressalvas','recusado')
      and updated_at >= current_date)                       as resolvidos_hoje,
  (select count(*) from public.damages
    where status in ('aprovado_captura','aprovado_sem_captura','resolvido')
      and updated_at >= current_date)                       as avarias_resolvidas_hoje;

comment on view public.protection_dashboard_stats is
  'Top-bar do painel da Proteção. Usado pra mostrar contadores.';

-- ---------- 10. Verificação ----------

do $$
declare
  pc_count int;
  dmg_count int;
  pc_with_proto int;
  dmg_with_proto int;
begin
  select count(*) into pc_count from public.protection_cases;
  select count(*) into dmg_count from public.damages;
  select count(*) into pc_with_proto from public.protection_cases where protocol_number is not null;
  select count(*) into dmg_with_proto from public.damages where protocol_number is not null;

  raise notice '=== Fase 34 Sprint 1 ===';
  raise notice 'protection_cases: % total, % com protocolo', pc_count, pc_with_proto;
  raise notice 'damages: % total, % com protocolo', dmg_count, dmg_with_proto;

  if pc_count = pc_with_proto and dmg_count = dmg_with_proto then
    raise notice 'OK — todos têm protocolo.';
  else
    raise warning 'Alguns ainda sem protocolo — rodar backfill de novo';
  end if;
end $$;

-- ====================================================================
-- ROLLBACK (descomentar se precisar reverter)
-- ====================================================================
-- drop view if exists public.protection_dashboard_stats;
-- drop view if exists public.damages_full;
-- drop view if exists public.protection_cases_full;
-- drop trigger if exists trg_set_damage_defaults on public.damages;
-- drop trigger if exists trg_set_protection_case_defaults on public.protection_cases;
-- drop function if exists public.set_damage_defaults();
-- drop function if exists public.set_protection_case_defaults();
-- drop function if exists public.classify_case_priority(text);
-- drop index if exists public.protection_cases_protocol_uq;
-- drop index if exists public.damages_protocol_uq;
-- alter table public.damages drop column if exists protocol_number;
-- alter table public.protection_cases drop column if exists priority;
-- alter table public.protection_cases drop column if exists protocol_number;
-- drop sequence if exists protection_case_protocol_seq;
-- drop sequence if exists damage_protocol_seq;
-- ====================================================================
