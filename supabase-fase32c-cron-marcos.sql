-- ====================================================================
-- Nomade Drive Brasil — Fase 32c
-- Cron diário: promove marcos pending → available quando data chega
-- --------------------------------------------------------------------
-- POR QUÊ:
--   A função `activate_due_milestones()` (criada em fase32-timeline-
--   saques.sql) promove withdrawals.status de 'pending' pra 'available'
--   quando milestone_date <= hoje. Sem cron, isso só roda manualmente.
--   Com cron, todo dia 00:01 a função roda automaticamente e os marcos
--   ficam disponíveis pro proprietário sacar.
--
-- COMO RODAR:
--   Supabase SQL Editor → cola tudo → Run.
--   ⚠️ ATENÇÃO: precisa habilitar a extensão pg_cron PRIMEIRO no
--   Supabase Dashboard → Database → Extensions → busca "pg_cron" → Enable.
--
-- ALTERNATIVA SE NÃO ATIVAR pg_cron:
--   Chamar `select public.activate_due_milestones();` manualmente uma
--   vez por dia (CRON do servidor que você tiver, GitHub Actions, etc.)
-- ====================================================================

-- 1. Habilita a extensão (idempotente)
create extension if not exists pg_cron schema extensions;

-- 2. Remove cron antigo se existir (idempotência)
do $$
declare
  job_id bigint;
begin
  select jobid into job_id
    from cron.job
   where jobname = 'activate_milestones_daily';
  if job_id is not null then
    perform cron.unschedule(job_id);
    raise notice 'Cron antigo removido (jobid=%)', job_id;
  end if;
exception when others then
  raise notice 'Sem cron antigo pra remover: %', sqlerrm;
end $$;

-- 3. Agenda novo cron pra rodar todo dia às 00:01 (UTC)
-- 00:01 UTC = 21:01 horário de Brasília (verão) ou 22:01 (sem verão)
-- Bom horário porque rola depois da virada do dia em qualquer fuso
select cron.schedule(
  'activate_milestones_daily',           -- nome do job
  '1 0 * * *',                            -- cron: 00:01 todo dia
  $$select public.activate_due_milestones();$$
);

-- 4. Verificação
do $$
declare
  active_count int;
begin
  select count(*) into active_count
    from cron.job
   where jobname = 'activate_milestones_daily'
     and active = true;

  if active_count = 1 then
    raise notice 'OK — cron activate_milestones_daily agendado pra 00:01 UTC todo dia.';
    raise notice 'Pra forçar uma rodada agora: select public.activate_due_milestones();';
  else
    raise warning 'FALHA — cron não foi agendado. Possível causa: pg_cron não habilitado.';
    raise warning 'Habilita em: Supabase Dashboard → Database → Extensions → pg_cron → Enable';
  end if;
end $$;

-- ---------- Comandos úteis (rodar manualmente se quiser) ----------

-- Ver cron jobs agendados:
-- select jobid, jobname, schedule, active from cron.job;

-- Ver últimas 10 execuções do cron:
-- select runid, jobid, command, status, return_message, start_time
--   from cron.job_run_details
--  order by start_time desc limit 10;

-- Rodar manualmente (testar):
-- select public.activate_due_milestones();

-- Desativar temporariamente:
-- update cron.job set active = false where jobname = 'activate_milestones_daily';

-- ====================================================================
-- ROLLBACK (se precisar reverter)
-- ====================================================================
-- select cron.unschedule((select jobid from cron.job where jobname = 'activate_milestones_daily'));
-- ====================================================================
