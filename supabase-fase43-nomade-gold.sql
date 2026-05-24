-- ====================================================================
-- Nomade Drive Brasil — Fase 43: Programa Fidelidade "Nomade Gold"
-- --------------------------------------------------------------------
-- OBJETIVO:
--   Tiers de fidelidade baseados em meses de locação CONCLUÍDOS (bookings
--   com status='encerrada'). Cliente vê seu tier no dashboard, ganha
--   desconto progressivo nas renovações + benefícios extras.
--
-- TIERS:
--   Bronze    (0-2 meses)  → 5% off renovação (padrão)
--   Silver    (3-5 meses)  → 7% off renovação
--   Gold      (6-11 meses) → 10% off renovação + caução reduzida 20%
--   Platinum  (12+ meses)  → 15% off renovação + caução reduzida 40%
--
-- COMPONENTES:
--   1. Enum loyalty_tier
--   2. View client_loyalty (calcula tier + meses + progresso)
--   3. Função get_client_loyalty_tier (lookup helper)
--   4. Função get_renewal_discount (% off da renovação por tier)
--   5. UPDATE clone_booking_for_renewal pra usar desconto do tier
--   6. View client_loyalty_overview (admin)
--   7. Tabela loyalty_events (audit de promoções de tier)
-- ====================================================================

-- ============================================================
-- 1. Enum
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'loyalty_tier') then
    create type loyalty_tier as enum ('bronze', 'silver', 'gold', 'platinum');
  end if;
end $$;

-- ============================================================
-- 2. Tabela loyalty_events — audit de mudanças de tier
-- ============================================================
create table if not exists public.loyalty_events (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references auth.users(id) on delete cascade,
  event        text not null,             -- 'tier_promoted', 'discount_applied', etc.
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
-- 3. View client_loyalty
-- --------------------------------------------------------------------
-- Calcula meses CONCLUÍDOS por cliente baseado em bookings.status='encerrada'.
-- Usa (end_date - start_date) convertido em meses (30d/mês).
-- Inclui também meses "em uso" pra mostrar progresso projetado.
-- ============================================================
create or replace view public.client_loyalty as
with completed_months as (
  select
    b.client_id,
    -- Soma meses concluídos (status='encerrada'), aprox (end-start)/30
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
    -- Soma meses projetados em locações ativas
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
  -- Tier calculado dos meses CONCLUÍDOS
  case
    when coalesce(cm.months_done, 0) >= 12 then 'platinum'::loyalty_tier
    when coalesce(cm.months_done, 0) >= 6  then 'gold'::loyalty_tier
    when coalesce(cm.months_done, 0) >= 3  then 'silver'::loyalty_tier
    else 'bronze'::loyalty_tier
  end as tier,
  -- Desconto da renovação (%)
  case
    when coalesce(cm.months_done, 0) >= 12 then 15
    when coalesce(cm.months_done, 0) >= 6  then 10
    when coalesce(cm.months_done, 0) >= 3  then 7
    else 5
  end as renewal_discount_pct,
  -- Redutor de caução (%) — Gold/Platinum têm caução menor
  case
    when coalesce(cm.months_done, 0) >= 12 then 40
    when coalesce(cm.months_done, 0) >= 6  then 20
    else 0
  end as deposit_reduction_pct,
  -- Quantos meses faltam pro próximo tier
  case
    when coalesce(cm.months_done, 0) >= 12 then 0   -- já é platinum
    when coalesce(cm.months_done, 0) >= 6  then (12 - coalesce(cm.months_done, 0))  -- pro platinum
    when coalesce(cm.months_done, 0) >= 3  then (6  - coalesce(cm.months_done, 0))  -- pro gold
    else (3 - coalesce(cm.months_done, 0))                                          -- pro silver
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
  'Fase 43: tier de fidelidade calculado de bookings encerradas. Define desconto de renovação + redutor de caução.';

-- ============================================================
-- 4. Funções helper
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
  -- Fallback: cliente sem registro ainda (novo) → bronze
  select 'bronze'::loyalty_tier, 0, 5, 0, 3, 'silver'::loyalty_tier
  where not exists (select 1 from public.client_loyalty where client_id = p_client_id)
  limit 1;
$$;

grant execute on function public.get_client_loyalty_tier(uuid) to authenticated;

-- ============================================================
-- 5. UPDATE clone_booking_for_renewal — usar desconto do tier
-- --------------------------------------------------------------------
-- ANTES: desconto fixo 5%
-- DEPOIS: desconto = tier do cliente
--         + caução = caução * (1 - deposit_reduction_pct/100)
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
  prev_tier loyalty_tier;
begin
  -- Valida duration
  if duration_months not in (1, 2, 3) then
    raise exception 'duration_months deve ser 1, 2 ou 3';
  end if;

  -- Carrega reserva fonte
  select * into src from public.bookings where id = source_booking_id;
  if not found then
    raise exception 'Booking % não encontrada', source_booking_id;
  end if;

  -- Verifica que NÃO tem renovação já feita
  if exists (
    select 1 from public.bookings b2
    where b2.client_id = src.client_id
      and b2.vehicle_id = src.vehicle_id
      and b2.start_date > src.end_date
      and b2.status in ('aprovado','em_uso')
  ) then
    raise exception 'Esta reserva já foi renovada';
  end if;

  -- Autorização
  if auth.uid() <> src.client_id then
    if not exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin' and status = 'aprovado'
    ) then
      raise exception 'Apenas o cliente da reserva pode renovar';
    end if;
  end if;

  -- ====== FASE 43: pega tier do cliente ======
  select * into loyalty
  from public.get_client_loyalty_tier(src.client_id)
  limit 1;

  if loyalty.renewal_discount_pct is null then
    discount_pct := 5;  -- fallback
  else
    discount_pct := loyalty.renewal_discount_pct;
  end if;

  -- Cálculos com desconto do tier
  discounted := round(src.monthly_price * (1 - discount_pct::numeric / 100.0), 2);
  fee := round(discounted * 0.10, 2);
  owner_net := discounted - fee;

  -- Caução reduzida pra Gold/Platinum
  if loyalty.deposit_reduction_pct is not null and loyalty.deposit_reduction_pct > 0 then
    new_deposit := round(coalesce(src.deposit_amount, 0) * (1 - loyalty.deposit_reduction_pct::numeric / 100.0), 2);
  else
    new_deposit := src.deposit_amount;
  end if;

  -- Datas
  new_start := greatest(src.end_date + 1, current_date);
  new_end := new_start + (duration_months * 30);

  -- Cria nova reserva
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

  -- Audit
  insert into public.admin_audit_logs (
    admin_id, action, target_type, target_id, metadata_json
  ) values (
    auth.uid(),
    'booking_renewed',
    'bookings',
    new_id,
    jsonb_build_object(
      'source_booking', source_booking_id,
      'duration_months', duration_months,
      'discount_pct', discount_pct,
      'tier', loyalty.tier,
      'months_completed', loyalty.months_completed,
      'discount_amount', src.monthly_price - discounted,
      'deposit_reduction_pct', loyalty.deposit_reduction_pct,
      'deposit_saved', coalesce(src.deposit_amount, 0) - coalesce(new_deposit, 0),
      'new_start', new_start,
      'new_end', new_end
    )
  );

  -- Loyalty event
  insert into public.loyalty_events (
    client_id, event, to_tier, metadata
  ) values (
    src.client_id,
    'discount_applied',
    loyalty.tier,
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
-- 6. View client_loyalty_overview — admin
-- ============================================================
create or replace view public.client_loyalty_overview as
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
  -- Total bookings
  (select count(*) from public.bookings where client_id = cl.client_id) as total_bookings,
  -- Total gasto (estimativa = sum monthly_price * meses de status encerrada/em_uso)
  (
    select coalesce(sum(
      b.monthly_price * greatest(1, ((b.end_date - b.start_date)::int / 30))
    ), 0)::numeric(12,2)
    from public.bookings b
    where b.client_id = cl.client_id
      and b.status in ('encerrada', 'em_uso')
  ) as estimated_ltv,
  -- Última atividade
  (
    select max(b.created_at)
    from public.bookings b
    where b.client_id = cl.client_id
  ) as last_booking_at
from public.client_loyalty cl
order by cl.months_completed desc, cl.full_name asc;

comment on view public.client_loyalty_overview is
  'Fase 43: tier + LTV estimado + atividade por cliente, ordenado pelos mais valiosos.';

-- ============================================================
-- 7. Trigger: ao mudar booking.status pra 'encerrada', detecta promoção
--    de tier e grava em loyalty_events. (Sinaliza UI/e-mail futuro.)
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
  -- Só dispara quando vira 'encerrada'
  if new.status != 'encerrada' or (old.status = 'encerrada' and new.status = 'encerrada') then
    return new;
  end if;

  -- Meses ANTES da promoção dessa booking
  select coalesce(sum(
    case when b.end_date is not null and b.start_date is not null
         then greatest(1, ((b.end_date - b.start_date)::int / 30))
         else 0 end
  ), 0)::int into prev_months
  from public.bookings b
  where b.client_id = new.client_id
    and b.status = 'encerrada'
    and b.id != new.id;

  -- Meses DEPOIS (incluindo essa)
  new_months := prev_months + greatest(1, ((new.end_date - new.start_date)::int / 30));

  -- Calcula tiers
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

  -- Se subiu de tier, registra
  if prev_tier != new_tier then
    insert into public.loyalty_events (
      client_id, event, from_tier, to_tier, metadata
    ) values (
      new.client_id,
      'tier_promoted',
      prev_tier,
      new_tier,
      jsonb_build_object(
        'triggered_by_booking', new.id,
        'prev_months', prev_months,
        'new_months', new_months
      )
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_check_loyalty_promotion on public.bookings;
create trigger trg_check_loyalty_promotion
  after update on public.bookings
  for each row execute function public.check_loyalty_promotion();

-- ============================================================
-- 8. UPDATE view renewal_opportunities — usar desconto tier-aware
-- --------------------------------------------------------------------
-- Antes mostrava 5% fixo. Agora mostra desconto do tier do cliente.
-- ============================================================
create or replace view public.renewal_opportunities as
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

  -- Fase 43: desconto baseado no tier do cliente (não mais fixo 5%)
  coalesce(cl.renewal_discount_pct, 5) as renewal_discount_pct,
  coalesce(cl.tier, 'bronze'::loyalty_tier) as client_tier,
  coalesce(cl.deposit_reduction_pct, 0) as deposit_reduction_pct,

  -- Preço com desconto tier-aware
  round(b.monthly_price * (1 - coalesce(cl.renewal_discount_pct, 5)::numeric / 100.0), 2) as discounted_price,
  round(b.monthly_price * (coalesce(cl.renewal_discount_pct, 5)::numeric / 100.0), 2) as discount_amount

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
  'Fase 43: agora com desconto tier-aware (renewal_discount_pct vem do client_loyalty).';

-- ============================================================
-- Verificação
-- ============================================================
do $$
declare
  cnt int;
begin
  raise notice '=== Fase 43 — Nomade Gold ===';
  select count(*) into cnt from public.client_loyalty;
  raise notice 'Clientes no programa: %', cnt;

  raise notice '';
  raise notice 'Distribuição por tier:';
  for cnt in select count(*) from public.client_loyalty where tier = 'bronze' loop
    raise notice '  Bronze: %', cnt;
  end loop;
  for cnt in select count(*) from public.client_loyalty where tier = 'silver' loop
    raise notice '  Silver: %', cnt;
  end loop;
  for cnt in select count(*) from public.client_loyalty where tier = 'gold' loop
    raise notice '  Gold: %', cnt;
  end loop;
  for cnt in select count(*) from public.client_loyalty where tier = 'platinum' loop
    raise notice '  Platinum: %', cnt;
  end loop;

  raise notice '';
  raise notice 'Pra testar: select * from public.client_loyalty limit 10;';
  raise notice 'Pra ver overview admin: select * from public.client_loyalty_overview;';
  raise notice 'Pra ver tier de 1 cliente: select * from public.get_client_loyalty_tier(''<uuid>'');';
end $$;
