-- ====================================================================
-- Nomade Drive Brasil — Fase 48: Painel saldo/extrato pro owner
-- --------------------------------------------------------------------
-- Owner precisa ver claramente:
--   1. Quanto está DISPONÍVEL pra sacar AGORA
--   2. Quanto está PENDENTE (locação rodando, próximo marco)
--   3. Quanto JÁ RECEBEU total (histórico)
--   4. PRÓXIMO REPASSE esperado (data + valor)
--   5. Histórico mensal completo (pra exportar CSV)
--
-- VIEW PRINCIPAL: owner_financial_overview
--   - 1 linha por owner com agregados
--
-- VIEW SECUNDÁRIA: owner_withdrawal_history
--   - Histórico detalhado por mês (pra tabela + CSV)
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run
-- ====================================================================

-- ============================================================
-- VIEW 1: owner_financial_overview — KPIs agregados
-- ============================================================
create or replace view public.owner_financial_overview as
select
  o.id as owner_id,
  o.full_name as owner_name,

  -- Disponível pra sacar (status='available' e ainda não pagos)
  coalesce(sum(case when w.status = 'available' then w.amount_net else 0 end), 0)::numeric(12,2) as available_to_withdraw,
  count(case when w.status = 'available' then 1 end) as available_count,

  -- Pendente (locação rodando, vai ficar disponível em breve)
  coalesce(sum(case when w.status = 'pending' then w.amount_net else 0 end), 0)::numeric(12,2) as pending_amount,
  count(case when w.status = 'pending' then 1 end) as pending_count,

  -- Já recebeu (status='paid')
  coalesce(sum(case when w.status = 'paid' then w.amount_net else 0 end), 0)::numeric(12,2) as total_received,
  count(case when w.status = 'paid' then 1 end) as paid_count,

  -- Retido (avaria, multa)
  coalesce(sum(case when w.status = 'withheld' then w.amount_net else 0 end), 0)::numeric(12,2) as withheld_amount,
  count(case when w.status = 'withheld' then 1 end) as withheld_count,

  -- Próximo repasse (próximo marco pendente, mais cedo)
  (
    select min(milestone_date)
    from public.withdrawals
    where owner_id = o.id and status in ('pending', 'available')
  ) as next_payout_date,
  (
    select amount_net
    from public.withdrawals w2
    where w2.owner_id = o.id and w2.status in ('pending', 'available')
    order by milestone_date asc
    limit 1
  ) as next_payout_amount,

  -- Total bruto (receita gerada antes da taxa)
  coalesce(sum(w.amount_gross), 0)::numeric(12,2) as total_gross_lifetime,

  -- Total de taxa paga à plataforma (lifetime)
  coalesce(sum(w.platform_fee), 0)::numeric(12,2) as total_platform_fee_lifetime,

  -- Bookings ativas
  (
    select count(*) from public.bookings b
    where b.owner_id = o.id and b.status in ('em_uso', 'aprovado')
  ) as active_bookings,

  -- Última atualização
  greatest(
    coalesce((select max(updated_at) from public.withdrawals where owner_id = o.id), '1970-01-01'::timestamptz),
    coalesce((select max(updated_at) from public.bookings where owner_id = o.id), '1970-01-01'::timestamptz)
  ) as last_updated

from public.profiles o
left join public.withdrawals w on w.owner_id = o.id
where o.main_role = 'owner'
   or exists (select 1 from public.bookings b where b.owner_id = o.id)
group by o.id, o.full_name;

comment on view public.owner_financial_overview is
  'Fase 48: KPIs agregados pro owner ver saldo, pendente, recebido e próximo repasse.';

-- ============================================================
-- VIEW 2: owner_withdrawal_history — extrato detalhado
-- --------------------------------------------------------------------
-- Cada linha = 1 withdrawal/transfer enriquecido com info da booking
-- Pra mostrar em tabela + exportar CSV
-- ============================================================
create or replace view public.owner_withdrawal_history as
select
  w.id as withdrawal_id,
  w.owner_id,
  w.booking_id,
  w.milestone_number,
  w.milestone_date,
  w.amount_gross,
  w.platform_fee,
  w.amount_net,
  w.status,
  w.stripe_payout_id,
  w.paid_at,
  w.withheld_reason,
  w.created_at as withdrawal_created_at,

  -- Dados da booking pra contexto
  b.protocol_number as booking_protocol,
  b.start_date as booking_start,
  b.end_date as booking_end,
  b.monthly_price as booking_monthly_price,

  -- Veículo
  v.make, v.model, v.year_model, v.license_plate,

  -- Cliente (só nome — não expõe e-mail/dados sensíveis no extrato)
  cp.full_name as client_name,

  -- Mês de referência (pra agrupar no CSV)
  to_char(w.milestone_date, 'YYYY-MM') as reference_month

from public.withdrawals w
left join public.bookings b on b.id = w.booking_id
left join public.vehicles v on v.id = b.vehicle_id
left join public.profiles cp on cp.id = b.client_id
order by w.milestone_date desc, w.created_at desc;

comment on view public.owner_withdrawal_history is
  'Fase 48: extrato detalhado de transfers pro owner (1 linha por withdrawal). Usado em tabela + export CSV.';

-- ============================================================
-- RLS: owner só vê os próprios dados
-- (As views não têm RLS direto, mas as tabelas base SIM)
-- withdrawals já tem RLS (owner = auth.uid()). Bookings também.
-- profiles + vehicles têm RLS apropriadas.
-- ============================================================

-- ============================================================
-- Verificação
-- ============================================================
do $$
declare
  total_owners int;
  total_withdrawals int;
  total_available numeric;
begin
  select count(*) into total_owners from public.owner_financial_overview;
  select count(*) into total_withdrawals from public.owner_withdrawal_history;
  select coalesce(sum(available_to_withdraw), 0) into total_available from public.owner_financial_overview;

  raise notice '=== Fase 48 — Painel financeiro owner ===';
  raise notice 'Owners no overview: %', total_owners;
  raise notice 'Total withdrawals históricas: %', total_withdrawals;
  raise notice 'Total disponível pra sacar (todos owners): R$ %', total_available;
  raise notice '';
  raise notice 'Pra testar: select * from public.owner_financial_overview where owner_id = ''<uuid>'';';
  raise notice 'Pra extrato: select * from public.owner_withdrawal_history where owner_id = ''<uuid>'';';
end $$;
