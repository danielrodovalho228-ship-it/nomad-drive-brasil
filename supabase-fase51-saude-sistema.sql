-- ====================================================================
-- Nomade Drive Brasil — Fase 51: Dashboard saúde do sistema
-- --------------------------------------------------------------------
-- Métricas operacionais em real-time pro admin:
--   - E-mails enviados últimas 24h (sucesso/falha)
--   - Cron jobs ativos + última execução
--   - Stripe Connect counts (ativos/pendentes/restritos)
--   - Taxa aprovação rental_requests (7 dias)
--   - Edge function errors recentes
--   - Last seen owners
-- ====================================================================

-- ============================================================
-- View: emails_health_24h — saúde dos disparos de e-mail
-- ============================================================
create or replace view public.emails_health_24h
with (security_invoker = true) as
with email_actions as (
  select
    action,
    metadata_json,
    created_at,
    coalesce(
      (metadata_json->>'email_sent')::boolean,
      (metadata_json->>'sent')::boolean,
      true  -- assume sucesso se não tem o campo
    ) as email_sent
  from public.admin_audit_logs
  where created_at >= now() - interval '24 hours'
    and (action like '%email%' or action like '%reminder%'
         or action like '%notification%' or action like '%_sent%'
         or action in ('tier_promotion_email_sent', 'renewal_reminder_sent',
                       'rental_request_created', 'lead_quote_submitted',
                       'rental_request_approved', 'rental_request_rejected',
                       'connect_account_activated', 'connect_account_restricted'))
)
select
  count(*) as total_24h,
  count(*) filter (where email_sent = true) as success_24h,
  count(*) filter (where email_sent = false) as failure_24h,
  case
    when count(*) = 0 then 100::numeric
    else round((count(*) filter (where email_sent = true)::numeric / count(*) * 100), 1)
  end as success_rate_pct,
  count(distinct action) as unique_action_types
from email_actions;

comment on view public.emails_health_24h is
  'Fase 51: saúde dos e-mails nas últimas 24h. >95% sucesso = ok, <95% = investigar.';

-- ============================================================
-- View: cron_jobs_health — status dos cron jobs
-- ============================================================
create or replace view public.cron_jobs_health
with (security_invoker = true) as
select
  cj.jobid,
  cj.jobname,
  cj.schedule,
  cj.active,
  -- Última execução (mais recente)
  (
    select max(start_time) from cron.job_run_details
    where jobid = cj.jobid
  ) as last_run_at,
  -- Status da última execução
  (
    select status from cron.job_run_details
    where jobid = cj.jobid
    order by start_time desc limit 1
  ) as last_status,
  -- Quantas falharam nas últimas 24h
  (
    select count(*) from cron.job_run_details
    where jobid = cj.jobid
      and status = 'failed'
      and start_time >= now() - interval '24 hours'
  ) as failures_24h
from cron.job cj;

comment on view public.cron_jobs_health is
  'Fase 51: status de cada cron job (renewal_reminders_daily, etc.) + última execução.';

-- ============================================================
-- View: stripe_connect_health — distribuição de status Connect
-- ============================================================
create or replace view public.stripe_connect_health
with (security_invoker = true) as
select
  count(*) as total_owners,
  count(*) filter (where status = 'ativo') as connect_active,
  count(*) filter (where status = 'em_analise') as connect_in_review,
  count(*) filter (where status = 'pendente') as connect_pending,
  count(*) filter (where status = 'restrito') as connect_restricted,
  count(*) filter (where payouts_enabled = true) as payouts_enabled_count,
  case
    when count(*) = 0 then 0::numeric
    else round((count(*) filter (where status = 'ativo')::numeric / count(*) * 100), 1)
  end as activation_rate_pct
from public.payout_accounts;

comment on view public.stripe_connect_health is
  'Fase 51: distribuição de status Stripe Connect entre owners.';

-- ============================================================
-- View: rental_requests_funnel_7d — funil aprovação 7 dias
-- ============================================================
create or replace view public.rental_requests_funnel_7d
with (security_invoker = true) as
select
  count(*) as total_7d,
  count(*) filter (where status = 'em_analise') as pending,
  count(*) filter (where status = 'aprovado') as approved,
  count(*) filter (where status = 'recusado') as rejected,
  count(*) filter (where status = 'cancelado') as cancelled,
  case
    when count(*) filter (where status in ('aprovado', 'recusado')) = 0 then 0::numeric
    else round((
      count(*) filter (where status = 'aprovado')::numeric /
      nullif(count(*) filter (where status in ('aprovado', 'recusado')), 0) * 100
    ), 1)
  end as approval_rate_pct,
  -- Tempo médio até aprovação (em horas)
  round(extract(epoch from avg(
    case when status = 'aprovado'
    then updated_at - created_at end
  )) / 3600, 1) as avg_hours_to_approve
from public.rental_requests
where created_at >= now() - interval '7 days';

comment on view public.rental_requests_funnel_7d is
  'Fase 51: funil de aprovação de rental_requests nos últimos 7 dias.';

-- ============================================================
-- View: users_last_seen — quem está ativo
-- ============================================================
create or replace view public.users_last_seen
with (security_invoker = true) as
select
  p.id,
  p.full_name,
  p.main_role,
  p.updated_at,
  -- Última atividade de qualquer tabela
  greatest(
    p.updated_at,
    coalesce((select max(created_at) from public.bookings where client_id = p.id or owner_id = p.id), '1970-01-01'::timestamptz),
    coalesce((select max(created_at) from public.rental_requests where client_id = p.id), '1970-01-01'::timestamptz),
    coalesce((select max(created_at) from public.withdrawals where owner_id = p.id), '1970-01-01'::timestamptz)
  ) as last_activity_at,
  case
    when greatest(
      p.updated_at,
      coalesce((select max(created_at) from public.bookings where client_id = p.id or owner_id = p.id), '1970-01-01'::timestamptz),
      coalesce((select max(created_at) from public.rental_requests where client_id = p.id), '1970-01-01'::timestamptz)
    ) >= now() - interval '24 hours' then 'active_24h'
    when greatest(
      p.updated_at,
      coalesce((select max(created_at) from public.bookings where client_id = p.id or owner_id = p.id), '1970-01-01'::timestamptz),
      coalesce((select max(created_at) from public.rental_requests where client_id = p.id), '1970-01-01'::timestamptz)
    ) >= now() - interval '7 days' then 'active_7d'
    when greatest(
      p.updated_at,
      coalesce((select max(created_at) from public.bookings where client_id = p.id or owner_id = p.id), '1970-01-01'::timestamptz),
      coalesce((select max(created_at) from public.rental_requests where client_id = p.id), '1970-01-01'::timestamptz)
    ) >= now() - interval '30 days' then 'active_30d'
    else 'inactive'
  end as activity_bucket
from public.profiles p;

-- ============================================================
-- View: system_alerts — alertas críticos consolidados
-- ============================================================
create or replace view public.system_alerts
with (security_invoker = true) as
with alerts as (
  -- Alerta 1: cron falhou nas últimas 24h
  select 'cron_failure' as type, 'crítico' as severity,
    'Cron job "' || jobname || '" falhou ' || failures_24h || 'x nas últimas 24h'  as message
  from public.cron_jobs_health
  where failures_24h > 0

  union all

  -- Alerta 2: cron inativo
  select 'cron_inactive', 'crítico',
    'Cron "' || jobname || '" está INATIVO'
  from public.cron_jobs_health
  where active = false

  union all

  -- Alerta 3: e-mail success rate < 95%
  select 'email_low_success', 'médio',
    'Taxa de sucesso e-mail caiu pra ' || success_rate_pct || '% (últimas 24h)'
  from public.emails_health_24h
  where total_24h > 5 and success_rate_pct < 95

  union all

  -- Alerta 4: muitos rental_requests pendentes > 48h
  select 'rental_stale', 'médio',
    count(*)::text || ' rental_requests pendentes há mais de 48h (clientes esperando)'
  from public.rental_requests
  where status = 'em_analise' and created_at <= now() - interval '48 hours'
  group by 1, 2
  having count(*) > 0

  union all

  -- Alerta 5: owners com Connect restrito
  select 'connect_restricted', 'crítico',
    'Owner com Connect RESTRITO: ' || full_name || ' (precisa resolver pendências Stripe)'
  from public.payout_accounts pa
  join public.profiles pr on pr.id = pa.user_id
  where pa.status = 'restrito'
)
select * from alerts;

comment on view public.system_alerts is
  'Fase 51: alertas críticos consolidados pro admin tomar ação imediata.';

-- ============================================================
-- Verificação
-- ============================================================
do $$
declare
  alert_count int;
  cron_count int;
begin
  select count(*) into alert_count from public.system_alerts;
  select count(*) into cron_count from public.cron_jobs_health where active = true;

  raise notice '=== Fase 51 — Saúde do sistema ===';
  raise notice 'Alertas ativos: %', alert_count;
  raise notice 'Cron jobs ativos: %', cron_count;
  raise notice '';
  raise notice 'Pra ver saúde: select * from public.emails_health_24h;';
  raise notice 'Pra ver alertas: select * from public.system_alerts;';
end $$;
