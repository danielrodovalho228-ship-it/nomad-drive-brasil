-- ====================================================================
-- Nomade Drive Brasil — FIX Fase 43
-- --------------------------------------------------------------------
-- BUG: Postgres não permite create or replace view trocar
-- nome/ordem de colunas. Fix: DROP VIEW antes do CREATE.
--
-- COMO RODAR:
--   Cola este SQL primeiro, depois re-rode supabase-fase43-nomade-gold.sql
--   (ou só rode este arquivo — ele já inclui as duas views corretas).
-- ====================================================================

-- Drops em ordem (renewal_opportunities depende de client_loyalty se já existir)
drop view if exists public.renewal_opportunities cascade;
drop view if exists public.client_loyalty_overview cascade;
drop view if exists public.client_loyalty cascade;

-- ============================================================
-- Recria client_loyalty
-- ============================================================
create view public.client_loyalty as
with completed_months as (
  select
    b.client_id,
    coalesce(
      sum(
        case
          when b.end_date is not null and b.start_date is not null
          then greatest(1, ((b.end_date - b.start_date)::int / 30))
          else 0
        end
      ),
      0
    )::int as months_done
  from public.bookings b
  where b.status = 'encerrada'
  group by b.client_id
),
in_progress as (
  select
    b.client_id,
    coalesce(
      sum(
        case
          when b.end_date is not null and b.start_date is not null
          then greatest(1, ((b.end_date - b.start_date)::int / 30))
          else 0
        end
      ),
      0
    )::int as months_active
  from public.bookings b
  where b.status in ('em_uso', 'aprovado')
  group by b.client_id
)
select
  p.id as client_id,
  p.full_name,
  coalesce(cm.months_done, 0) as months_completed,
  coalesce(ip.months_active, 0) as months_active,
  case
    when coalesce(cm.months_done, 0) >= 12 then 'platinum'::loyalty_tier
    when coalesce(cm.months_done, 0) >= 6  then 'gold'::loyalty_tier
    when coalesce(cm.months_done, 0) >= 3  then 'silver'::loyalty_tier
    else 'bronze'::loyalty_tier
  end as tier,
  case
    when coalesce(cm.months_done, 0) >= 12 then 15
    when coalesce(cm.months_done, 0) >= 6  then 10
    when coalesce(cm.months_done, 0) >= 3  then 7
    else 5
  end as renewal_discount_pct,
  case
    when coalesce(cm.months_done, 0) >= 12 then 40
    when coalesce(cm.months_done, 0) >= 6  then 20
    else 0
  end as deposit_reduction_pct,
  case
    when coalesce(cm.months_done, 0) >= 12 then 0
    when coalesce(cm.months_done, 0) >= 6  then (12 - coalesce(cm.months_done, 0))
    when coalesce(cm.months_done, 0) >= 3  then (6  - coalesce(cm.months_done, 0))
    else (3 - coalesce(cm.months_done, 0))
  end as months_to_next_tier,
  case
    when coalesce(cm.months_done, 0) >= 12 then null
    when coalesce(cm.months_done, 0) >= 6  then 'platinum'::loyalty_tier
    when coalesce(cm.months_done, 0) >= 3  then 'gold'::loyalty_tier
    else 'silver'::loyalty_tier
  end as next_tier
from public.profiles p
left join completed_months cm on cm.client_id = p.id
left join in_progress ip on ip.client_id = p.id
where p.main_role = 'client'
   or exists (select 1 from public.bookings b where b.client_id = p.id);

-- ============================================================
-- Recria client_loyalty_overview
-- ============================================================
create view public.client_loyalty_overview as
select
  cl.client_id,
  cl.full_name,
  cl.tier,
  cl.months_completed,
  cl.months_active,
  cl.renewal_discount_pct,
  cl.deposit_reduction_pct,
  cl.months_to_next_tier,
  cl.next_tier,
  (select count(*) from public.bookings where client_id = cl.client_id) as total_bookings,
  (
    select coalesce(sum(
      b.monthly_price * greatest(1, ((b.end_date - b.start_date)::int / 30))
    ), 0)::numeric(12,2)
    from public.bookings b
    where b.client_id = cl.client_id
      and b.status in ('encerrada', 'em_uso')
  ) as estimated_ltv,
  (
    select max(b.created_at)
    from public.bookings b
    where b.client_id = cl.client_id
  ) as last_booking_at
from public.client_loyalty cl
order by cl.months_completed desc, cl.full_name asc;

-- ============================================================
-- Recria renewal_opportunities com tier-aware (sem reordenar errado)
-- ============================================================
create view public.renewal_opportunities as
select
  b.id as booking_id,
  b.client_id,
  b.owner_id,
  b.vehicle_id,
  b.start_date,
  b.end_date,
  b.monthly_price,
  b.deposit_amount,
  b.protocol_number,
  (b.end_date - current_date)::int as days_remaining,
  v.make, v.model, v.year_model, v.license_plate,
  cp.full_name as client_name,
  cp.email as client_email,
  op.full_name as owner_name,
  exists (
    select 1 from public.damages d
    where d.booking_id = b.id
      and d.status in ('pendente_revisao','em_contestacao','aprovado_captura')
  ) as has_pending_damage,
  exists (
    select 1 from public.bookings b2
    where b2.client_id = b.client_id
      and b2.vehicle_id = b.vehicle_id
      and b2.start_date > b.end_date
      and b2.status in ('aprovado','em_uso')
  ) as already_renewed,
  -- Fase 43: tier-aware (colunas novas no final pra não bagunçar order)
  round(b.monthly_price * (1 - coalesce(cl.renewal_discount_pct, 5)::numeric / 100.0), 2) as discounted_price,
  round(b.monthly_price * (coalesce(cl.renewal_discount_pct, 5)::numeric / 100.0), 2) as discount_amount,
  coalesce(cl.renewal_discount_pct, 5) as renewal_discount_pct,
  coalesce(cl.tier, 'bronze'::loyalty_tier) as client_tier,
  coalesce(cl.deposit_reduction_pct, 0) as deposit_reduction_pct
from public.bookings b
join public.vehicles v on v.id = b.vehicle_id
join public.profiles cp on cp.id = b.client_id
join public.profiles op on op.id = b.owner_id
left join public.client_loyalty cl on cl.client_id = b.client_id
where b.status in ('em_uso','aprovado')
  and b.end_date is not null
  and b.end_date <= current_date + interval '7 days'
  and b.end_date >= current_date - interval '7 days';

comment on view public.client_loyalty is 'Fase 43: tier de fidelidade calculado de bookings encerradas.';
comment on view public.client_loyalty_overview is 'Fase 43: tier + LTV estimado + atividade por cliente.';
comment on view public.renewal_opportunities is 'Fase 43: tier-aware (renewal_discount_pct vem do client_loyalty).';

-- ============================================================
-- Verificação
-- ============================================================
do $$
declare
  total int;
  cnt_b int;
  cnt_s int;
  cnt_g int;
  cnt_p int;
begin
  select count(*) into total from public.client_loyalty;
  select count(*) into cnt_b from public.client_loyalty where tier = 'bronze';
  select count(*) into cnt_s from public.client_loyalty where tier = 'silver';
  select count(*) into cnt_g from public.client_loyalty where tier = 'gold';
  select count(*) into cnt_p from public.client_loyalty where tier = 'platinum';

  raise notice '=== Fase 43 FIX — Views recriadas ===';
  raise notice 'Total clientes no programa: %', total;
  raise notice '  🥉 Bronze:   %', cnt_b;
  raise notice '  🥈 Silver:   %', cnt_s;
  raise notice '  🥇 Gold:     %', cnt_g;
  raise notice '  💎 Platinum: %', cnt_p;
end $$;
