-- ====================================================================
-- Nomade Drive Brasil — Fase 42: Painel de Leads no admin
-- --------------------------------------------------------------------
-- OBJETIVO:
--   Centralizar todos os leads (form orçamento landing + futuros canais
--   tipo Instagram Ads, parceiros, etc.) em uma tabela com pipeline.
--   Sem isso, leads viram só inbox e se perdem.
--
-- PIPELINE:
--   novo → contatado → qualificado → convertido (vira booking)
--                                  ↘ perdido (motivo)
--
-- COMPONENTES:
--   1. Tabela leads (substitui "ir só pra e-mail")
--   2. Enum lead_status
--   3. RLS: só admin/super_admin
--   4. View leads_enriched (com SLA + idade do lead)
--   5. Função update_lead_status (transições válidas + audit)
-- ====================================================================

-- Enum do pipeline
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'novo',
      'contatado',
      'qualificado',
      'convertido',
      'perdido'
    );
  end if;
end $$;

-- Tabela principal
create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),

  -- Dados do lead (do form)
  name                text not null,
  contact             text not null,        -- whatsapp ou e-mail
  contact_normalized  text generated always as (lower(trim(contact))) stored,
  city                text,
  desired_start_date  date,
  desired_months      int,
  desired_devolucao   date,
  category            text,
  indication          text,
  obs                 text,

  -- Origem
  source              text not null default 'landing_form',  -- landing_form, instagram, parceiro, etc.
  source_url          text,
  intent              text,

  -- Pipeline
  status              lead_status not null default 'novo',
  assigned_to         uuid references auth.users(id) on delete set null,

  -- Eventos
  contacted_at        timestamptz,
  qualified_at        timestamptz,
  converted_at        timestamptz,
  lost_at             timestamptz,
  lost_reason         text,

  -- Conversão (quando vira booking)
  converted_booking_id uuid references public.bookings(id) on delete set null,

  -- Anotações da equipe (timeline)
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads(status, created_at desc);
create index if not exists leads_contact_idx on public.leads(contact_normalized);
create index if not exists leads_assigned_idx on public.leads(assigned_to);
create index if not exists leads_source_idx on public.leads(source);

-- Trigger pra updated_at
create or replace function public.touch_leads_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.touch_leads_updated_at();

-- RLS — só admin/super_admin
alter table public.leads enable row level security;

drop policy if exists "leads_admin_read" on public.leads;
create policy "leads_admin_read" on public.leads
  for select using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
        and status = 'aprovado'
    )
  );

drop policy if exists "leads_admin_write" on public.leads;
create policy "leads_admin_write" on public.leads
  for update using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
        and status = 'aprovado'
    )
  );

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete" on public.leads
  for delete using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'super_admin'
        and status = 'aprovado'
    )
  );

-- INSERT: feito pela Edge Function submit-lead-quote (service role)
-- Sem policy de INSERT pra usuários — só service role consegue.

-- ====================================================================
-- View enriquecida — pro painel admin
-- ====================================================================
create or replace view public.leads_enriched as
select
  l.*,
  -- Idade do lead em horas
  extract(epoch from (now() - l.created_at))::int / 3600 as age_hours,
  -- SLA: 24h pra primeiro contato
  case
    when l.status != 'novo' then null
    when extract(epoch from (now() - l.created_at)) <= 86400 then 'ok'
    when extract(epoch from (now() - l.created_at)) <= 172800 then 'atrasado'
    else 'crítico'
  end as sla_status,
  -- Tipo de contato (e-mail ou tel)
  case
    when l.contact ~ '@' then 'email'
    when l.contact ~ '[0-9]{8,}' then 'phone'
    else 'outro'
  end as contact_type,
  -- Atribuído (nome)
  ap.full_name as assigned_to_name,
  -- Booking convertido (resumo)
  b.protocol_number as converted_protocol,
  b.monthly_price   as converted_monthly_price
from public.leads l
left join public.profiles ap on ap.id = l.assigned_to
left join public.bookings b on b.id = l.converted_booking_id;

comment on view public.leads_enriched is
  'Fase 42: leads com SLA (24h pra novo) + dados do agente atribuído + dados da booking convertida.';

-- ====================================================================
-- Função: atualizar status do lead (com validações + audit)
-- ====================================================================
create or replace function public.update_lead_status(
  p_lead_id uuid,
  p_new_status lead_status,
  p_notes text default null,
  p_lost_reason text default null,
  p_converted_booking_id uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  curr record;
  v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Não autenticado';
  end if;

  -- Só admin/super_admin
  if not exists (
    select 1 from public.user_roles
    where user_id = v_user
      and role in ('admin', 'super_admin')
      and status = 'aprovado'
  ) then
    raise exception 'Apenas admin pode mover leads';
  end if;

  select * into curr from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Lead % não encontrada', p_lead_id;
  end if;

  if p_new_status = 'convertido' and p_converted_booking_id is null then
    raise exception 'Conversão exige booking_id (link com a reserva criada)';
  end if;

  if p_new_status = 'perdido' and (p_lost_reason is null or length(trim(p_lost_reason)) < 3) then
    raise exception 'Motivo da perda obrigatório (mín 3 chars)';
  end if;

  -- Update
  update public.leads
  set
    status = p_new_status,
    contacted_at = case when p_new_status = 'contatado' and contacted_at is null then now() else contacted_at end,
    qualified_at = case when p_new_status = 'qualificado' and qualified_at is null then now() else qualified_at end,
    converted_at = case when p_new_status = 'convertido' then now() else converted_at end,
    lost_at = case when p_new_status = 'perdido' then now() else lost_at end,
    lost_reason = case when p_new_status = 'perdido' then p_lost_reason else lost_reason end,
    converted_booking_id = case when p_new_status = 'convertido' then p_converted_booking_id else converted_booking_id end,
    notes = case
      when p_notes is null or length(trim(p_notes)) = 0 then notes
      else coalesce(notes || E'\n---\n', '') || to_char(now(), 'DD/MM HH24:MI') || ' • ' || p_notes
    end,
    assigned_to = case when assigned_to is null then v_user else assigned_to end
  where id = p_lead_id;

  -- Audit
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata_json)
  values (
    v_user,
    'lead_status_changed',
    'leads',
    p_lead_id,
    jsonb_build_object(
      'from', curr.status,
      'to', p_new_status,
      'lost_reason', p_lost_reason,
      'converted_booking_id', p_converted_booking_id,
      'notes_added', p_notes is not null
    )
  );
end $$;

comment on function public.update_lead_status is
  'Fase 42: atualiza status do lead com validações de transição + audit log.';

grant execute on function public.update_lead_status(uuid, lead_status, text, text, uuid) to authenticated;

-- ====================================================================
-- Verificação
-- ====================================================================
do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.leads;
  raise notice '=== Fase 42 — Painel de Leads ===';
  raise notice 'Tabela leads criada. Total existente: %', cnt;
  raise notice 'View leads_enriched criada.';
  raise notice 'Função update_lead_status criada.';
  raise notice '';
  raise notice 'Próximo: a Edge Function submit-lead-quote precisa ser atualizada';
  raise notice 'pra também INSERIR em public.leads, não só mandar e-mail.';
end $$;
