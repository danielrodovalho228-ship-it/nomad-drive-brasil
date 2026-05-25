-- ====================================================================
-- Nomade Drive Brasil — Fase 50b: Cron pra send-rating-request
-- --------------------------------------------------------------------
-- Agenda chamada diária à Edge Function send-rating-request.
-- Roda 18h UTC (15h Brasília) — boa hora pra cliente ler à noite
-- depois do trabalho.
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run
-- ====================================================================

create extension if not exists pg_cron schema extensions;
create extension if not exists pg_net  schema extensions;

-- Remove cron antigo (idempotência)
do $$
declare job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'rating_requests_daily';
  if job_id is not null then
    perform cron.unschedule(job_id);
    raise notice 'Cron antigo removido (jobid=%)', job_id;
  end if;
exception when others then null;
end $$;

-- Agenda novo cron — todo dia às 18:00 UTC (15:00 BRT)
-- FIX 2026-05-24: agora envia x-cron-secret header pra Edge Function
-- validar (anti-abuse). REQUER CRON_SECRET configurado nos Secrets
-- do Supabase E aqui hardcoded (substituir 'COLE-AQUI-O-CRON-SECRET').
--
-- COMO SETAR:
--   1) Gera um secret aleatório: openssl rand -hex 32
--      OU em qualquer site tipo: https://generate-secret.vercel.app/32
--   2) Supabase Dashboard → Edge Functions → Secrets
--      CRON_SECRET = <o valor gerado>
--   3) Substitui 'COLE-AQUI-O-CRON-SECRET' abaixo pelo MESMO valor
--   4) Re-roda este SQL
select cron.schedule(
  'rating_requests_daily',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-rating-request',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8',
      'x-cron-secret', 'COLE-AQUI-O-CRON-SECRET'
    ),
    body := jsonb_build_object('source', 'pg_cron_daily', 'cron_secret', 'COLE-AQUI-O-CRON-SECRET')
  );
  $$
);

-- Verificação
do $$
declare job_count int;
begin
  select count(*) into job_count from cron.job where jobname = 'rating_requests_daily' and active = true;
  raise notice '=== Fase 50b — Cron rating requests ===';
  raise notice 'Cron agendado e ativo: %', job_count = 1;
  raise notice 'Roda 18:00 UTC (15:00 BRT) diariamente';
  raise notice '';
  raise notice 'Pra testar AGORA manual:';
  raise notice '  select net.http_post(...send-rating-request...)';
end $$;
