-- ====================================================================
-- Nomade Drive Brasil — FIX Fase 41b
-- --------------------------------------------------------------------
-- Supabase gerenciado NÃO permite ALTER DATABASE postgres SET app.*
-- (erro: permission denied to set parameter).
--
-- Solução: hardcode da URL e anon key direto no body do cron.
-- Ambos os valores são PÚBLICOS (anon key já está exposta no
-- supabase-config.js do GitHub Pages — RLS é quem protege os dados).
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run
-- ====================================================================

create extension if not exists pg_cron schema extensions;
create extension if not exists pg_net  schema extensions;

-- Remove cron anterior (Fase 41b original que dependia de current_setting)
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

-- Agenda o cron com URL + key hardcoded (anon key é pública, sem risco)
select cron.schedule(
  'renewal_reminders_daily',
  '0 9 * * *',  -- 09:00 UTC = 06:00 BRT (sem horário de verão)
  $$
  select net.http_post(
    url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
    ),
    body := jsonb_build_object('source', 'pg_cron_daily')
  );
  $$
);

-- Verificação: deve mostrar 1 cron ativo
do $$
declare
  job_count int;
begin
  select count(*) into job_count
    from cron.job where jobname = 'renewal_reminders_daily' and active = true;

  raise notice '=== Fase 41b FIX — Cron renewal reminders ===';
  raise notice 'Cron agendado e ativo: %', job_count = 1;
  raise notice '';
  raise notice 'Pra testar AGORA (sem esperar 09:00 UTC), rode em outra query:';
  raise notice '';
  raise notice '  select net.http_post(';
  raise notice '    url := ''https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-renewal-reminders'',';
  raise notice '    headers := jsonb_build_object(';
  raise notice '      ''Content-Type'', ''application/json'',';
  raise notice '      ''Authorization'', ''Bearer <anon_key>''';
  raise notice '    ),';
  raise notice '    body := jsonb_build_object(''source'', ''manual_test'')';
  raise notice '  );';
end $$;
