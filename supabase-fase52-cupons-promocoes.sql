-- ====================================================================
-- Nomade Drive Brasil — Fase 52: Sistema de cupons/promoções
-- --------------------------------------------------------------------
-- OBJETIVO:
--   Permitir criar códigos promocionais com regras flexíveis:
--   - % off OU valor fixo R$ off
--   - Aplicação na 1ª mensalidade OU recorrente OU caução
--   - Validade (data início + data fim)
--   - Uso máximo total + uso máximo por cliente
--   - Restrições: somente novos clientes, somente tier X, etc.
--
-- USOS:
--   - "PRIMEIRO10" — 10% off pra primeira locação
--   - "INSTAGRAM50" — R$ 50 off de campanha
--   - "PARCEIRO5MIN" — 5% off de parceria com Uber Eats
--   - "GOLD15" — 15% off exclusivo Gold/Platinum
--
-- COMPONENTES:
--   1. Tabela coupons
--   2. Tabela coupon_redemptions (uso por booking)
--   3. Função RPC apply_coupon (validação + cálculo desconto)
--   4. View coupon_stats (admin: quantos usos, receita gerada)
-- ====================================================================

-- Enum: tipos de desconto
do $$
begin
  if not exists (select 1 from pg_type where typname = 'coupon_discount_type') then
    create type coupon_discount_type as enum ('percentage', 'fixed_amount');
  end if;
  if not exists (select 1 from pg_type where typname = 'coupon_applies_to') then
    create type coupon_applies_to as enum ('first_month', 'all_months', 'deposit');
  end if;
end $$;

-- Tabela principal
create table if not exists public.coupons (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,  -- "PRIMEIRO10"
  code_normalized      text generated always as (upper(trim(code))) stored,

  -- Tipo de desconto
  discount_type        coupon_discount_type not null,
  discount_value       numeric(10,2) not null check (discount_value > 0),
  -- Ex: 10 (10% off) ou 50.00 (R$ 50 off)

  -- Onde aplica
  applies_to           coupon_applies_to not null default 'first_month',

  -- Validade
  valid_from           timestamptz not null default now(),
  valid_until          timestamptz,

  -- Limites de uso
  max_uses_total       int,                    -- null = ilimitado
  max_uses_per_client  int default 1,          -- 1 = só 1x por cliente

  -- Restrições
  only_new_clients     boolean not null default false,  -- só clientes sem booking prévia
  min_tier             text,                            -- 'silver', 'gold', 'platinum' (null = qualquer)
  min_months           int,                             -- mínimo de meses na locação

  -- Metadata
  name                 text,                            -- "Promoção Instagram"
  description          text,
  campaign_source      text,                            -- 'instagram', 'parceiro_X'
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- Status
  is_active            boolean not null default true,

  constraint chk_validity check (valid_until is null or valid_until > valid_from),
  constraint chk_percentage_max check (
    discount_type != 'percentage' or discount_value <= 100
  )
);

create index if not exists coupons_code_norm_idx on public.coupons(code_normalized);
create index if not exists coupons_active_idx on public.coupons(is_active) where is_active = true;
create index if not exists coupons_campaign_idx on public.coupons(campaign_source);

-- Tabela de uso (auditoria de cada aplicação)
create table if not exists public.coupon_redemptions (
  id              uuid primary key default gen_random_uuid(),
  coupon_id       uuid not null references public.coupons(id) on delete cascade,
  client_id       uuid not null references auth.users(id) on delete cascade,
  booking_id      uuid references public.bookings(id) on delete set null,
  applied_amount  numeric(10,2) not null,  -- valor real do desconto aplicado em R$
  original_amount numeric(10,2) not null,  -- valor antes do desconto
  final_amount    numeric(10,2) not null,  -- valor depois do desconto
  created_at      timestamptz not null default now()
);

create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id);
create index if not exists coupon_redemptions_client_idx on public.coupon_redemptions(client_id);
create index if not exists coupon_redemptions_booking_idx on public.coupon_redemptions(booking_id);

-- Trigger updated_at
create or replace function public.touch_coupons_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at
  before update on public.coupons
  for each row execute function public.touch_coupons_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

-- READ coupons: qualquer authenticated (cliente vai aplicar)
drop policy if exists "coupons_read" on public.coupons;
create policy "coupons_read" on public.coupons
  for select using (true);

-- WRITE coupons: só admin/super_admin
drop policy if exists "coupons_write_admin" on public.coupons;
create policy "coupons_write_admin" on public.coupons
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
        and status = 'aprovado'
    )
  );

-- READ redemptions: cliente vê os seus, admin vê tudo
drop policy if exists "redemptions_read" on public.coupon_redemptions;
create policy "redemptions_read" on public.coupon_redemptions
  for select using (
    auth.uid() = client_id
    OR exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
        and status = 'aprovado'
    )
  );

-- INSERT redemptions: via RPC apply_coupon (security definer)

-- ============================================================
-- Função RPC: apply_coupon
-- --------------------------------------------------------------------
-- Cliente chama: select * from apply_coupon('PRIMEIRO10', 1900.00);
-- Retorna: { valid, error?, discount_amount, final_amount, coupon_id }
-- ============================================================
create or replace function public.apply_coupon(
  p_code text,
  p_original_amount numeric
)
returns table (
  valid boolean,
  error text,
  coupon_id uuid,
  discount_type text,
  discount_value numeric,
  discount_amount numeric,
  final_amount numeric,
  coupon_name text
)
language plpgsql
stable
security definer
as $$
declare
  c record;
  v_user uuid;
  uses_count_total int;
  uses_count_user int;
  user_tier text;
  user_has_bookings boolean;
  v_discount_amount numeric;
  v_final numeric;
begin
  v_user := auth.uid();
  if v_user is null then
    return query select false, 'not_authenticated'::text, null::uuid, null::text, null::numeric, null::numeric, null::numeric, null::text;
    return;
  end if;

  -- 1) Busca cupom
  select * into c
  from public.coupons
  where code_normalized = upper(trim(p_code))
    and is_active = true
  limit 1;

  if not found then
    return query select false, 'coupon_not_found'::text, null::uuid, null::text, null::numeric, null::numeric, null::numeric, null::text;
    return;
  end if;

  -- 2) Validade
  if c.valid_from > now() then
    return query select false, 'coupon_not_started'::text, c.id, null::text, null::numeric, null::numeric, null::numeric, c.name;
    return;
  end if;
  if c.valid_until is not null and c.valid_until < now() then
    return query select false, 'coupon_expired'::text, c.id, null::text, null::numeric, null::numeric, null::numeric, c.name;
    return;
  end if;

  -- 3) Limite total
  if c.max_uses_total is not null then
    select count(*) into uses_count_total
    from public.coupon_redemptions where coupon_id = c.id;
    if uses_count_total >= c.max_uses_total then
      return query select false, 'coupon_max_uses_reached'::text, c.id, null::text, null::numeric, null::numeric, null::numeric, c.name;
      return;
    end if;
  end if;

  -- 4) Limite por cliente
  select count(*) into uses_count_user
  from public.coupon_redemptions
  where coupon_id = c.id and client_id = v_user;
  if uses_count_user >= c.max_uses_per_client then
    return query select false, 'coupon_user_limit_reached'::text, c.id, null::text, null::numeric, null::numeric, null::numeric, c.name;
    return;
  end if;

  -- 5) Só novos clientes?
  if c.only_new_clients then
    select exists(select 1 from public.bookings where client_id = v_user) into user_has_bookings;
    if user_has_bookings then
      return query select false, 'coupon_only_new_clients'::text, c.id, null::text, null::numeric, null::numeric, null::numeric, c.name;
      return;
    end if;
  end if;

  -- 6) Tier mínimo?
  if c.min_tier is not null then
    select tier::text into user_tier from public.client_loyalty where client_id = v_user;
    if user_tier is null then user_tier := 'bronze'; end if;
    if (
      (c.min_tier = 'silver' and user_tier not in ('silver','gold','platinum'))
      OR (c.min_tier = 'gold' and user_tier not in ('gold','platinum'))
      OR (c.min_tier = 'platinum' and user_tier != 'platinum')
    ) then
      return query select false, 'coupon_min_tier_required'::text, c.id, null::text, null::numeric, null::numeric, null::numeric, c.name;
      return;
    end if;
  end if;

  -- 7) Calcula desconto
  if c.discount_type = 'percentage' then
    v_discount_amount := round(p_original_amount * c.discount_value / 100.0, 2);
  else
    v_discount_amount := least(c.discount_value, p_original_amount);  -- não pode dar desconto > valor
  end if;

  v_final := greatest(p_original_amount - v_discount_amount, 0);

  return query select true, null::text, c.id, c.discount_type::text, c.discount_value, v_discount_amount, v_final, c.name;
end $$;

grant execute on function public.apply_coupon(text, numeric) to authenticated;

-- ============================================================
-- Função RPC: redeem_coupon (registra uso após booking criada)
-- ============================================================
create or replace function public.redeem_coupon(
  p_coupon_id uuid,
  p_booking_id uuid,
  p_original_amount numeric,
  p_discount_amount numeric
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user uuid;
  v_redemption_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then raise exception 'not_authenticated'; end if;

  insert into public.coupon_redemptions (
    coupon_id, client_id, booking_id,
    applied_amount, original_amount, final_amount
  ) values (
    p_coupon_id, v_user, p_booking_id,
    p_discount_amount, p_original_amount, p_original_amount - p_discount_amount
  )
  returning id into v_redemption_id;

  return v_redemption_id;
end $$;

grant execute on function public.redeem_coupon(uuid, uuid, numeric, numeric) to authenticated;

-- ============================================================
-- View: coupon_stats — admin vê quanto cada cupom gerou
-- ============================================================
create or replace view public.coupon_stats
with (security_invoker = true) as
select
  c.id,
  c.code,
  c.name,
  c.campaign_source,
  c.discount_type,
  c.discount_value,
  c.is_active,
  c.valid_from, c.valid_until,
  c.max_uses_total,
  count(r.id) as uses_count,
  coalesce(sum(r.applied_amount), 0) as total_discount_given,
  coalesce(sum(r.final_amount), 0) as total_revenue_with_coupon,
  count(distinct r.client_id) as unique_clients,
  c.created_at
from public.coupons c
left join public.coupon_redemptions r on r.coupon_id = c.id
group by c.id, c.code, c.name, c.campaign_source, c.discount_type, c.discount_value,
         c.is_active, c.valid_from, c.valid_until, c.max_uses_total, c.created_at
order by c.created_at desc;

comment on view public.coupon_stats is
  'Fase 52: estatísticas de cada cupom — usos, desconto total dado, receita gerada.';

-- ============================================================
-- SEED: cupons de exemplo (descomenta pra usar)
-- ============================================================
-- insert into public.coupons (code, discount_type, discount_value, applies_to, name, only_new_clients, max_uses_per_client, campaign_source)
-- values
--   ('PRIMEIRO10', 'percentage', 10, 'first_month', '10% off primeira locação', true, 1, 'lancamento'),
--   ('INSTAGRAM50', 'fixed_amount', 50, 'first_month', 'Promoção Instagram R$50 off', false, 1, 'instagram_ads'),
--   ('GOLD15', 'percentage', 15, 'all_months', '15% off pra Gold/Platinum', false, null, 'fidelidade')
-- on conflict (code) do nothing;
--
-- update public.coupons set min_tier='gold' where code='GOLD15';

-- ============================================================
-- Verificação
-- ============================================================
do $$
declare
  active_count int;
begin
  select count(*) into active_count from public.coupons where is_active = true;
  raise notice '=== Fase 52 — Sistema de cupons ===';
  raise notice 'Cupons ativos: %', active_count;
  raise notice '';
  raise notice 'Pra testar:';
  raise notice '  insert into coupons (code, discount_type, discount_value, name)';
  raise notice '    values (''TESTE10'', ''percentage'', 10, ''Teste'');';
  raise notice '  select * from apply_coupon(''TESTE10'', 1900);';
end $$;
