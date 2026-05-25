-- ====================================================================
-- 🔴 FIX CRÍTICO Fase 48: Views sem security_invoker = vazamento de PII
-- --------------------------------------------------------------------
-- BUG (encontrado pelo code-reviewer):
--   Views criadas com create or replace view SEM
--   `WITH (security_invoker = true)`. Em Postgres, views executam com
--   privilégio do OWNER (postgres role), IGNORANDO RLS das tabelas base.
--
-- IMPACTO:
--   Qualquer owner logado pode rodar:
--     supabase.from('owner_financial_overview')
--       .select('*').eq('owner_id', '<uuid_de_outro_owner>')
--   E ver: saldo, receitas, próximos repasses, nome do cliente, etc.
--   Vazamento de PII (nome cliente em owner_withdrawal_history).
--
-- FIX:
--   Recriar as 2 views com WITH (security_invoker = true).
--   Aí elas respeitam RLS de bookings, withdrawals, vehicles, profiles.
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run.
-- ====================================================================

-- Drop em ordem (overview depende de withdrawal_history indireto via tabelas)
drop view if exists public.owner_withdrawal_history cascade;
drop view if exists public.owner_financial_overview cascade;

-- Recria com security_invoker = true (Postgres 15+)
create view public.owner_financial_overview
with (security_invoker = true) as
select
  o.id as owner_id,
  o.full_name as owner_name,

  coalesce(sum(case when w.status = 'available' then w.amount_net else 0 end), 0)::numeric(12,2) as available_to_withdraw,
  count(case when w.status = 'available' then 1 end) as available_count,

  coalesce(sum(case when w.status = 'pending' then w.amount_net else 0 end), 0)::numeric(12,2) as pending_amount,
  count(case when w.status = 'pending' then 1 end) as pending_count,

  coalesce(sum(case when w.status = 'paid' then w.amount_net else 0 end), 0)::numeric(12,2) as total_received,
  count(case when w.status = 'paid' then 1 end) as paid_count,

  coalesce(sum(case when w.status = 'withheld' then w.amount_net else 0 end), 0)::numeric(12,2) as withheld_amount,
  count(case when w.status = 'withheld' then 1 end) as withheld_count,

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

  coalesce(sum(w.amount_gross), 0)::numeric(12,2) as total_gross_lifetime,
  coalesce(sum(w.platform_fee), 0)::numeric(12,2) as total_platform_fee_lifetime,

  (
    select count(*) from public.bookings b
    where b.owner_id = o.id and b.status in ('em_uso', 'aprovado')
  ) as active_bookings,

  greatest(
    coalesce((select max(updated_at) from public.withdrawals where owner_id = o.id), '1970-01-01'::timestamptz),
    coalesce((select max(updated_at) from public.bookings where owner_id = o.id), '1970-01-01'::timestamptz)
  ) as last_updated

from public.profiles o
left join public.withdrawals w on w.owner_id = o.id
where o.main_role = 'owner'
   or exists (select 1 from public.bookings b where b.owner_id = o.id)
group by o.id, o.full_name;

create view public.owner_withdrawal_history
with (security_invoker = true) as
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

  b.protocol_number as booking_protocol,
  b.start_date as booking_start,
  b.end_date as booking_end,
  b.monthly_price as booking_monthly_price,

  v.make, v.model, v.year_model, v.license_plate,

  cp.full_name as client_name,

  to_char(w.milestone_date, 'YYYY-MM') as reference_month

from public.withdrawals w
left join public.bookings b on b.id = w.booking_id
left join public.vehicles v on v.id = b.vehicle_id
left join public.profiles cp on cp.id = b.client_id
order by w.milestone_date desc, w.created_at desc;

comment on view public.owner_financial_overview is
  'Fase 48 FIX: security_invoker=true respeita RLS das tabelas base. Owner só vê os próprios dados.';

comment on view public.owner_withdrawal_history is
  'Fase 48 FIX: security_invoker=true respeita RLS. Cliente nome só vai pra owner da booking.';

do $$
begin
  raise notice '=== Fase 48b FIX — RLS bypass corrigido ===';
  raise notice 'As 2 views agora respeitam RLS de withdrawals, bookings, vehicles, profiles.';
  raise notice '';
  raise notice 'Teste: loga como owner A e tenta';
  raise notice '  supabase.from(''owner_financial_overview'').select(''*'')';
  raise notice '  → Deve retornar SÓ os dados do owner A (não dos outros).';
end $$;
