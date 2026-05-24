-- ====================================================================
-- Nomade Drive Brasil — Fase 46: Auto-aprovação Gold/Platinum
-- --------------------------------------------------------------------
-- OBJETIVO:
--   Owner pode marcar "Aprovar automaticamente clientes Gold/Platinum"
--   por veículo. Quando cliente Gold/Platinum cria rental_request
--   pra esse veículo, a aprovação acontece IMEDIATAMENTE — cliente
--   já recebe e-mail "Reserva aprovada!" sem owner precisar clicar.
--
-- POR QUE:
--   - Clientes Gold (6+ meses) e Platinum (12+ meses) já provaram
--     que são bons pagadores
--   - Reduz fricção pros melhores clientes (eles esperam tratamento VIP)
--   - Owner economiza tempo, especialmente em viagem/dormindo
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run
-- ====================================================================

-- Coluna na tabela vehicles (granularidade por veículo, owner pode
-- habilitar nuns e não em outros)
alter table public.vehicles
  add column if not exists auto_approve_high_tier boolean not null default false;

comment on column public.vehicles.auto_approve_high_tier is
  'Fase 46: se TRUE, rental_requests de clientes Gold/Platinum são auto-aprovadas pra este veículo (sem owner clicar).';

-- Índice opcional pra queries de auto-approve
create index if not exists vehicles_auto_approve_idx
  on public.vehicles(auto_approve_high_tier)
  where auto_approve_high_tier = true;

-- ====================================================================
-- Verificação
-- ====================================================================
do $$
declare
  total int;
  habilitados int;
begin
  select count(*) into total from public.vehicles;
  select count(*) into habilitados from public.vehicles where auto_approve_high_tier = true;

  raise notice '=== Fase 46 — Auto-aprovação Gold/Platinum ===';
  raise notice 'Total de veículos: %', total;
  raise notice 'Com auto-aprovação habilitada: %', habilitados;
  raise notice '';
  raise notice 'Pra habilitar via SQL (admin):';
  raise notice '  update public.vehicles set auto_approve_high_tier = true where id = ''<uuid>'';';
  raise notice '';
  raise notice 'Owner pode habilitar pela UI: dashboard-proprietario → cada veículo → checkbox';
end $$;
