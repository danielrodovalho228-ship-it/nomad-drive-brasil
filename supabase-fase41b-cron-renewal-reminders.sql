-- ====================================================================
-- Nomade Drive Brasil — Fase 41b: Cron pra send-renewal-reminders
-- --------------------------------------------------------------------
-- Agenda chamada diária à Edge Function send-renewal-reminders.
-- Roda 9h UTC (6h Brasília) — boa hora pra disparar lembretes
-- (cliente abre celular na manhã, vê o e-mail).
--
-- DEPENDÊNCIAS:
--   - Fase 32c (pg_cron habilitado)
--   - Fase 41 (renewal_opportunities view)
--   - Edge Function send-renewal-reminders deployada
--   - app.supabase_url + app.supabase_anon_key configurados
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run
-- ====================================================================

create extension if not exists pg_cron schema extensions;
create extension if not exists pg_net schema extensions;

-- Remove cron antigo (idempotência)
do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'renewal_reminders_daily';
  if job_id is not null then
    perform cron.unschedule(job_id);
    raise notice 'Cron antigo removido (jobid=%)', job_id;
  end if;
exception when others then
  raise notice 'Sem cron antigo: %', sqlerrm;
end $$;

-- Agenda novo cron — todo dia às 09:00 UTC (06:00 Brasília sem horário de verão)
select cron.schedule(
  'renewal_reminders_daily',
  '0 9 * * *',  -- 09:00 UTC = 06:00 BRT (sem verão) ou 07:00 BRT (com verão)
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object('source', 'pg_cron_daily')
  );
  $$
);

-- Verificação
do $$
declare
  job_count int;
  app_url text;
begin
  select count(*) into job_count
    from cron.job where jobname = 'renewal_reminders_daily' and active = true;

  begin
    app_url := current_setting('app.supabase_url');
  exception when others then
    app_url := null;
  end;

  raise notice '=== Fase 41b — Cron renewal reminders ===';
  raise notice 'Cron agendado: %', job_count = 1;
  raise notice 'app.supabase_url configurada: %', app_url is not null;

  if app_url is null then
    raise warning 'ATENÇÃO: configurar com:';
    raise warning '  alter database postgres set app.supabase_url = ''https://SEU_PROJETO.supabase.co'';';
    raise warning '  alter database postgres set app.supabase_anon_key = ''SUA_ANON_KEY'';';
  end if;

  raise notice '';
  raise notice 'Pra rodar manualmente (teste):';
  raise notice '  curl -X POST https://...supabase.co/functions/v1/send-renewal-reminders \';
  raise notice '       -H "Authorization: Bearer ANON_KEY"';
end $$;
