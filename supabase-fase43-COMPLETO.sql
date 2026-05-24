-- ====================================================================
-- Nomade Drive Brasil — Fase 43 COMPLETO (substitui as 2 anteriores)
-- --------------------------------------------------------------------
-- Por que este existe:
--   Supabase SQL Editor roda em transação. Quando o último CREATE VIEW
--   das tentativas anteriores falhou (rename of column), rollback total —
--   nem o enum loyalty_tier ficou criado.
--
-- ESTE script:
--   1. Dropa tudo da Fase 43 (idempotente — pode rodar quantas vezes)
--   2. Cria do zero na ordem correta
--   3. Não usa "create or replace view" pra views existentes —
--      faz drop-then-create
--
-- COMO RODAR:
--   Supabase SQL Editor → cola TUDO → Run. Substitui as 2 anteriores.
-- ====================================================================

-- ============================================================
-- PASSO 0: Dropa tudo da Fase 43 (idempotente)
-- --------------------------------------------------------------------
-- Ordem importa: triggers/funcs/views antes de tabelas/enums.
-- ============================================================
drop trigger if exists trg_check_loyalty_promotion on public.bookings;
drop function if exists public.check_loyalty_promotion() cascade;
drop function if exists public.get_client_loyalty_tier(uuid) cascade;

drop view if exists public.renewal_opportunities cascade;
drop view if exists public.client_loyalty_overview cascade;
drop view if exists public.client_loyalty cascade;

-- loyalty_events: tabela. NÃO dropa porque pode ter dados em audit.
-- Se quiser zerar audit, descomente:
-- drop table if exists public.loyalty_events cascade;

-- Enum: só dropa se realmente não existe nada usando.
-- Cuidado: se já tem loyalty_events com dados, NÃO podemos dropar.
-- Solução: só cria se não existe.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'loyalty_tier') then
    create type loyalty_tier as enum ('bronze', 'silver', 'gold', 'platinum');
  end if;
end $$;

-- ============================================================
-- PASSO 1: Tabela loyalty_events (idempotente)
-- ============================================================
create table if not exists public.loyalty_events (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references auth.users(id) on delete cascade,
  event        text not null,
  from_tier    loyalty_tier,
  to_tier      loyalty_tier,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists loyalty_events_client_idx on public.loyalty_events(client_id, created_at desc);

alter table public.loyalty_events enable row level security;

drop policy if exists "loyalty_self_read" on public.loyalty_events;
create policy "loyalty_self_read" on public.loyalty_events
  for select using (
    auth.uid() = client_id
    OR exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
        and status = 'aprovado'
    )
  );

-- ============================================================
-- PASSO 2: View client_loyalty
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

comment on view public.client_loyalty is
  'Fase 43: tier de fidelidade calculado de bookings encerradas.';

-- ============================================================
-- PASSO 3: Função get_client_loyalty_tier (helper público)
-- ============================================================
create or replace function public.get_client_loyalty_tier(p_client_id uuid)
returns table (
  tier loyalty_tier,
  months_completed int,
  renewal_discount_pct int,
  deposit_reduction_pct int,
  months_to_next_tier int,
  next_tier loyalty_tier
)
language sql
stable
security definer
as $$
  select
    cl.tier,
    cl.months_completed,
    cl.renewal_discount_pct,
    cl.deposit_reduction_pct,
    cl.months_to_next_tier,
    cl.next_tier
  from public.client_loyalty cl
  where cl.client_id = p_client_id
  union all
  select 'bronze'::loyalty_tier, 0, 5, 0, 3, 'silver'::loyalty_tier
  where not exists (select 1 from public.client_loyalty where client_id = p_client_id)
  limit 1;
$$;

grant execute on function public.get_client_loyalty_tier(uuid) to authenticated;

-- ============================================================
-- PASSO 4: Atualiza clone_booking_for_renewal (usa tier)
-- ============================================================
create or replace function public.clone_booking_for_renewal(
  source_booking_id uuid,
  duration_months int default 1
)
returns uuid
language plpgsql
security definer
as $$
declare
  src record;
  loyalty record;
  new_id uuid;
  new_start date;
  new_end date;
  discount_pct int;
  discounted numeric(12,2);
  fee numeric(12,2);
  owner_net numeric(12,2);
  new_deposit numeric(12,2);
begin
  if duration_months not in (1, 2, 3) then
    raise exception 'duration_months deve ser 1, 2 ou 3';
  end if;

  select * into src from public.bookings where id = source_booking_id;
  if not found then
    raise exception 'Booking % não encontrada', source_booking_id;
  end if;

  if exists (
    select 1 from public.bookings b2
    where b2.client_id = src.client_id
      and b2.vehicle_id = src.vehicle_id
      and b2.start_date > src.end_date
      and b2.status in ('aprovado','em_uso')
  ) then
    raise exception 'Esta reserva já foi renovada';
  end if;

  if auth.uid() <> src.client_id then
    if not exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin' and status = 'aprovado'
    ) then
      raise exception 'Apenas o cliente da reserva pode renovar';
    end if;
  end if;

  -- Fase 43: pega tier do cliente
  select * into loyalty
  from public.get_client_loyalty_tier(src.client_id)
  limit 1;

  if loyalty.renewal_discount_pct is null then
    discount_pct := 5;
  else
    discount_pct := loyalty.renewal_discount_pct;
  end if;

  discounted := round(src.monthly_price * (1 - discount_pct::numeric / 100.0), 2);
  fee := round(discounted * 0.10, 2);
  owner_net := discounted - fee;

  if loyalty.deposit_reduction_pct is not null and loyalty.deposit_reduction_pct > 0 then
    new_deposit := round(coalesce(src.deposit_amount, 0) * (1 - loyalty.deposit_reduction_pct::numeric / 100.0), 2);
  else
    new_deposit := src.deposit_amount;
  end if;

  new_start := greatest(src.end_date + 1, current_date);
  new_end := new_start + (duration_months * 30);

  insert into public.bookings (
    client_id, owner_id, vehicle_id,
    start_date, end_date,
    monthly_price, platform_fee, owner_estimated_amount, deposit_amount,
    status, billing_mode
  ) values (
    src.client_id, src.owner_id, src.vehicle_id,
    new_start, new_end,
    discounted, fee, owner_net, new_deposit,
    'aprovado', src.billing_mode
  )
  returning id into new_id;

  insert into public.admin_audit_logs (
    admin_id, action, target_type, target_id, metadata_json
  ) values (
    auth.uid(), 'booking_renewed', 'bookings', new_id,
    jsonb_build_object(
      'source_booking', source_booking_id,
      'duration_months', duration_months,
      'discount_pct', discount_pct,
      'tier', loyalty.tier,
      'months_completed', loyalty.months_completed,
      'deposit_reduction_pct', loyalty.deposit_reduction_pct,
      'new_start', new_start, 'new_end', new_end
    )
  );

  insert into public.loyalty_events (
    client_id, event, to_tier, metadata
  ) values (
    src.client_id, 'discount_applied', loyalty.tier,
    jsonb_build_object(
      'booking_id', new_id,
      'discount_pct', discount_pct,
      'deposit_reduction_pct', loyalty.deposit_reduction_pct
    )
  );

  return new_id;
end;
$$;

-- ============================================================
-- PASSO 5: View renewal_opportunities (DROP+CREATE pra evitar rename bug)
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

comment on view public.renewal_opportunities is
  'Fase 43: tier-aware (renewal_discount_pct vem do client_loyalty).';

-- ============================================================
-- PASSO 6: View client_loyalty_overview (admin)
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

comment on view public.client_loyalty_overview is
  'Fase 43: tier + LTV estimado + atividade por cliente.';

-- ============================================================
-- PASSO 7: Trigger de detecção de promoção
-- ============================================================
create or replace function public.check_loyalty_promotion()
returns trigger
language plpgsql
as $$
declare
  prev_months int;
  new_months int;
  prev_tier loyalty_tier;
  new_tier loyalty_tier;
begin
  if new.status != 'encerrada' or (old.status = 'encerrada' and new.status = 'encerrada') then
    return new;
  end if;

  select coalesce(sum(
    case when b.end_date is not null and b.start_date is not null
         then greatest(1, ((b.end_date - b.start_date)::int / 30))
         else 0 end
  ), 0)::int into prev_months
  from public.bookings b
  where b.client_id = new.client_id
    and b.status = 'encerrada'
    and b.id != new.id;

  new_months := prev_months + greatest(1, ((new.end_date - new.start_date)::int / 30));

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

  if prev_tier != new_tier then
    insert into public.loyalty_events (
      client_id, event, from_tier, to_tier, metadata
    ) values (
      new.client_id, 'tier_promoted', prev_tier, new_tier,
      jsonb_build_object('triggered_by_booking', new.id, 'prev_months', prev_months, 'new_months', new_months)
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_check_loyalty_promotion on public.bookings;
create trigger trg_check_loyalty_promotion
  after update on public.bookings
  for each row execute function public.check_loyalty_promotion();

-- ============================================================
-- VERIFICAÇÃO FINAL (loop seguro — não quebra se faltar dado)
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

  raise notice '=== Fase 43 COMPLETO — Nomade Gold ===';
  raise notice 'Total clientes no programa: %', total;
  raise notice '  Bronze:   %', cnt_b;
  raise notice '  Silver:   %', cnt_s;
  raise notice '  Gold:     %', cnt_g;
  raise notice '  Platinum: %', cnt_p;
  raise notice '';
  raise notice 'Pra testar:';
  raise notice '  select * from public.client_loyalty limit 10;';
  raise notice '  select * from public.client_loyalty_overview limit 10;';
  raise notice '  select * from public.renewal_opportunities;';
end $$;
