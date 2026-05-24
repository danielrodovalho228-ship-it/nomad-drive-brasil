-- ====================================================================
-- Nomade Drive Brasil — Fase 43c FIX: contagem correta de meses
-- --------------------------------------------------------------------
-- BUG: greatest(1, ((end - start)::int / 30)) força mínimo 1 mês pra
-- QUALQUER booking, mesmo de 1 dia. E pior: se end_date < start_date
-- (dados ruins / cancelamento antecipado), vira 1 também. Resultado:
-- cliente promovido prematuramente — recebe e-mail "Silver" sem ter
-- 3 meses de locação real.
--
-- FIX: round(days/30.0) sem mínimo forçado, com filtro end_date > start_date
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run
-- ====================================================================

-- Drop em ordem: views dependentes primeiro
drop view if exists public.renewal_opportunities cascade;
drop view if exists public.client_loyalty_overview cascade;
drop view if exists public.client_loyalty cascade;

-- Recria client_loyalty com cálculo correto
create view public.client_loyalty as
with completed_months as (
  select
    b.client_id,
    coalesce(
      sum(
        round(((b.end_date - b.start_date)::numeric / 30), 0)
      ),
      0
    )::int as months_done
  from public.bookings b
  where b.status = 'encerrada'
    and b.end_date is not null
    and b.start_date is not null
    and b.end_date > b.start_date   -- ⚠️ NOVO: ignora dados inconsistentes
  group by b.client_id
),
in_progress as (
  select
    b.client_id,
    coalesce(
      sum(
        round(((b.end_date - b.start_date)::numeric / 30), 0)
      ),
      0
    )::int as months_active
  from public.bookings b
  where b.status in ('em_uso', 'aprovado')
    and b.end_date is not null
    and b.start_date is not null
    and b.end_date > b.start_date   -- ⚠️ NOVO
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
where p.main_role = 'client';   -- ⚠️ NOVO: só clientes (não inflar com owners)

comment on view public.client_loyalty is
  'Fase 43c: contagem corrigida (round, sem mínimo 1, filtro end>start, só clients).';

-- Recria client_loyalty_overview
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
      b.monthly_price * round(((b.end_date - b.start_date)::numeric / 30), 0)
    ), 0)::numeric(12,2)
    from public.bookings b
    where b.client_id = cl.client_id
      and b.status in ('encerrada', 'em_uso')
      and b.end_date > b.start_date
  ) as estimated_ltv,
  (
    select max(b.created_at)
    from public.bookings b
    where b.client_id = cl.client_id
  ) as last_booking_at
from public.client_loyalty cl
order by cl.months_completed desc, cl.full_name asc;

-- Recria renewal_opportunities (mesma estrutura, só recriando porque dropamos)
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

-- Fix do trigger também (mesma lógica de contagem)
create or replace function public.check_loyalty_promotion()
returns trigger
language plpgsql
as $$
declare
  prev_months int;
  new_months int;
  prev_tier loyalty_tier;
  new_tier loyalty_tier;
  event_id uuid;
  request_id bigint;
  this_booking_months int;
begin
  -- Só dispara quando vira 'encerrada' (transição nova)
  if new.status != 'encerrada' or (old.status = 'encerrada' and new.status = 'encerrada') then
    return new;
  end if;

  -- Valida que datas fazem sentido
  if new.end_date is null or new.start_date is null or new.end_date <= new.start_date then
    return new;
  end if;

  this_booking_months := round(((new.end_date - new.start_date)::numeric / 30), 0)::int;
  if this_booking_months < 1 then
    return new;  -- booking menor que 15 dias não promove
  end if;

  -- Meses ANTES dessa booking (lógica corrigida)
  select coalesce(sum(
    round(((b.end_date - b.start_date)::numeric / 30), 0)
  ), 0)::int into prev_months
  from public.bookings b
  where b.client_id = new.client_id
    and b.status = 'encerrada'
    and b.id != new.id
    and b.end_date is not null
    and b.start_date is not null
    and b.end_date > b.start_date;

  new_months := prev_months + this_booking_months;

  prev_tier := case
    when prev_months >= 12 then 'platinum'::loyalty_tier
    when prev_months >= 6  then 'gold'::loyalty_tier
    when prev_months >= 3  then 'silver'::loyalty_tier
    else 'bronze'::loyalty_tier
  end;
  new_tier := case
    when new_months >= 12 then 'platinum'::loyalty_tier
    when new_months >= 6  then 'gold'::loyalty_tier
    when new_months >= 3  then 'silver'::loyalty_tier
    else 'bronze'::loyalty_tier
  end;

  if prev_tier = new_tier then
    return new;
  end if;

  -- Insere evento
  insert into public.loyalty_events (
    client_id, event, from_tier, to_tier, metadata
  ) values (
    new.client_id, 'tier_promoted', prev_tier, new_tier,
    jsonb_build_object(
      'triggered_by_booking', new.id,
      'prev_months', prev_months,
      'new_months', new_months
    )
  )
  returning id into event_id;

  -- Dispara e-mail (best-effort)
  if new_tier in ('silver', 'gold', 'platinum') then
    begin
      select net.http_post(
        url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-tier-promotion',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
        ),
        body := jsonb_build_object(
          'client_id', new.client_id,
          'from_tier', prev_tier::text,
          'to_tier', new_tier::text,
          'event_id', event_id,
          'prev_months', prev_months,
          'new_months', new_months
        )
      ) into request_id;
    exception when others then
      raise notice 'Falha ao disparar e-mail de promoção (event_id=%): %', event_id, sqlerrm;
    end;
  end if;

  return new;
end $$;

-- Verificação
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

  raise notice '=== Fase 43c FIX — Contagem corrigida ===';
  raise notice 'Total clientes no programa: %', total;
  raise notice '  Bronze:   %', cnt_b;
  raise notice '  Silver:   %', cnt_s;
  raise notice '  Gold:     %', cnt_g;
  raise notice '  Platinum: %', cnt_p;
  raise notice '';
  raise notice 'Mudanças:';
  raise notice '  - round(days/30, 0) em vez de greatest(1, days/30)';
  raise notice '  - filtro end_date > start_date (ignora dados ruins)';
  raise notice '  - só clientes (main_role=client) — não inflar com owners';
  raise notice '  - booking <15 dias não promove tier';
end $$;
