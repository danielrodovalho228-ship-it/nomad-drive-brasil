-- ====================================================================
-- 💰 FASE 79 — PRICING OVERRIDES + DESCONTOS MULTI-MES
-- --------------------------------------------------------------------
-- POR QUE?
-- Hoje o preco do aluguel e' calculado em JS: FIPE x % da categoria.
-- Owner nao tem como ajustar nem pra cima (carro mais novo/raro) nem
-- pra baixo (promo). Tambem nao tem desconto pra locacoes longas
-- (cliente Nomade fica 3, 6, 12 meses — merece premiar fidelidade).
--
-- O QUE FAZ:
--   1. Adiciona 3 colunas de override de preco (override + floor + ceiling)
--   2. Adiciona 3 colunas de desconto progressivo (3, 6, 12 meses)
--   3. Adiciona CHECK constraints pra evitar valores invalidos
--   4. Adiciona comentarios em cada coluna
--   5. Cria funcao helper `effective_monthly_price()` pro app usar
--
-- IDEMPOTENTE — usa ADD COLUMN IF NOT EXISTS, pode rodar varias vezes.
--
-- COMO RODAR:
--   1. https://supabase.com → projeto nomad-drive-brasil
--   2. SQL Editor → New query
--   3. Cola TUDO aqui → Run
--   4. Confere o output da verificacao no final
-- ====================================================================

-- =====================================
-- 1) COLUNAS DE OVERRIDE DE PRECO
-- =====================================
alter table public.vehicles
  add column if not exists monthly_price_override numeric(10,2),
  add column if not exists pricing_floor numeric(10,2),
  add column if not exists pricing_ceiling numeric(10,2);

comment on column public.vehicles.monthly_price_override is
  'Preco mensal fixo definido pelo owner. NULL = usa calculo automatico (FIPE x rate da categoria). Quando setado, sobrescreve o calculo padrao.';

comment on column public.vehicles.pricing_floor is
  'Preco MINIMO aceitavel pro aluguel mensal. Defesa contra owner subprecificar errado. Aplicado tanto ao override quanto ao calculo automatico.';

comment on column public.vehicles.pricing_ceiling is
  'Preco MAXIMO aceitavel pro aluguel mensal. Defesa contra owner exagerar (ex: T-Cross por R$ 15k/mes). Aplicado tanto ao override quanto ao calculo automatico.';

-- =====================================
-- 2) COLUNAS DE DESCONTO PROGRESSIVO
-- =====================================
alter table public.vehicles
  add column if not exists discount_3mo_pct numeric(5,2) not null default 0,
  add column if not exists discount_6mo_pct numeric(5,2) not null default 0,
  add column if not exists discount_12mo_pct numeric(5,2) not null default 5;

comment on column public.vehicles.discount_3mo_pct is
  'Desconto (%) aplicado quando cliente aluga por 3 meses contigos. Default 0 (sem desconto).';

comment on column public.vehicles.discount_6mo_pct is
  'Desconto (%) aplicado quando cliente aluga por 6 meses contigos. Default 0 (sem desconto).';

comment on column public.vehicles.discount_12mo_pct is
  'Desconto (%) aplicado quando cliente aluga por 12 meses contigos. Default 5%.';

-- =====================================
-- 3) CHECK CONSTRAINTS — protecao contra valores invalidos
-- =====================================

-- Floor <= Ceiling (se ambos setados)
alter table public.vehicles
  drop constraint if exists vehicles_pricing_floor_ceiling_check;
alter table public.vehicles
  add constraint vehicles_pricing_floor_ceiling_check
  check (
    pricing_floor is null
    or pricing_ceiling is null
    or pricing_floor <= pricing_ceiling
  );

-- Override dentro da faixa (se override e floor/ceiling setados)
alter table public.vehicles
  drop constraint if exists vehicles_pricing_override_range_check;
alter table public.vehicles
  add constraint vehicles_pricing_override_range_check
  check (
    monthly_price_override is null
    or (
      (pricing_floor is null or monthly_price_override >= pricing_floor)
      and
      (pricing_ceiling is null or monthly_price_override <= pricing_ceiling)
    )
  );

-- Override positivo
alter table public.vehicles
  drop constraint if exists vehicles_pricing_override_positive_check;
alter table public.vehicles
  add constraint vehicles_pricing_override_positive_check
  check (monthly_price_override is null or monthly_price_override > 0);

-- Descontos entre 0 e 50% (50% e' limite saudavel — alem disso vira loucura)
alter table public.vehicles
  drop constraint if exists vehicles_discounts_range_check;
alter table public.vehicles
  add constraint vehicles_discounts_range_check
  check (
    discount_3mo_pct >= 0 and discount_3mo_pct <= 50
    and discount_6mo_pct >= 0 and discount_6mo_pct <= 50
    and discount_12mo_pct >= 0 and discount_12mo_pct <= 50
  );

-- Descontos crescentes (3mo <= 6mo <= 12mo) — incentivar fidelidade mais longa
alter table public.vehicles
  drop constraint if exists vehicles_discounts_increasing_check;
alter table public.vehicles
  add constraint vehicles_discounts_increasing_check
  check (
    discount_3mo_pct <= discount_6mo_pct
    and discount_6mo_pct <= discount_12mo_pct
  );

-- =====================================
-- 4) FUNCAO HELPER — calcula preco efetivo considerando override + floor + ceiling
-- =====================================
-- USAGE:
--   select public.effective_monthly_price(vehicle_id, base_calculated_price)
-- ONDE:
--   base_calculated_price = FIPE x rate da categoria (calculado no app)
-- RETORNA:
--   - Se monthly_price_override IS NOT NULL: usa override (clamped por floor/ceiling)
--   - Senao: usa base_calculated_price (clamped por floor/ceiling)

create or replace function public.effective_monthly_price(
  p_vehicle_id uuid,
  p_base_price numeric
)
returns numeric
language sql
stable
as $$
  select
    case
      -- Se tem override, usa ele (mas respeita floor/ceiling)
      when v.monthly_price_override is not null then
        greatest(
          coalesce(v.pricing_floor, 0),
          least(
            coalesce(v.pricing_ceiling, v.monthly_price_override),
            v.monthly_price_override
          )
        )
      -- Senao, usa base calculado (mas respeita floor/ceiling)
      else
        greatest(
          coalesce(v.pricing_floor, 0),
          least(
            coalesce(v.pricing_ceiling, p_base_price),
            p_base_price
          )
        )
    end
  from public.vehicles v
  where v.id = p_vehicle_id;
$$;

grant execute on function public.effective_monthly_price(uuid, numeric) to authenticated, anon;

comment on function public.effective_monthly_price(uuid, numeric) is
  'Calcula preco mensal efetivo do veiculo aplicando override (se houver) e clampando por floor/ceiling. Recebe base_price calculado pelo app (FIPE x rate) e retorna preco final aplicavel.';

-- =====================================
-- 5) FUNCAO HELPER — calcula desconto progressivo
-- =====================================
-- USAGE:
--   select public.progressive_discount_pct(vehicle_id, num_months)
-- RETORNA:
--   percentual de desconto aplicavel pra essa duracao (ex: 5 = 5%)
--   - 0 a 2 meses: 0
--   - 3 a 5 meses: discount_3mo_pct
--   - 6 a 11 meses: discount_6mo_pct
--   - 12+ meses: discount_12mo_pct

create or replace function public.progressive_discount_pct(
  p_vehicle_id uuid,
  p_num_months integer
)
returns numeric
language sql
stable
as $$
  select
    case
      when p_num_months >= 12 then v.discount_12mo_pct
      when p_num_months >= 6 then v.discount_6mo_pct
      when p_num_months >= 3 then v.discount_3mo_pct
      else 0
    end
  from public.vehicles v
  where v.id = p_vehicle_id;
$$;

grant execute on function public.progressive_discount_pct(uuid, integer) to authenticated, anon;

comment on function public.progressive_discount_pct(uuid, integer) is
  'Retorna percentual de desconto aplicavel pra essa duracao em meses. Tiers: 3+ / 6+ / 12+ meses. Defaults zerados exceto 12mo (5%).';

-- =====================================
-- VERIFICACAO — mostra status atual da frota com os novos campos
-- =====================================
do $$
declare
  v_total_vehicles int;
  v_with_override int;
  v_with_floor int;
  v_with_ceiling int;
begin
  select count(*) into v_total_vehicles from public.vehicles;
  select count(*) into v_with_override from public.vehicles where monthly_price_override is not null;
  select count(*) into v_with_floor from public.vehicles where pricing_floor is not null;
  select count(*) into v_with_ceiling from public.vehicles where pricing_ceiling is not null;

  raise notice '';
  raise notice '====================================================';
  raise notice '✅ MIGRATION FASE 79 APLICADA';
  raise notice '====================================================';
  raise notice 'Total de veiculos: %', v_total_vehicles;
  raise notice 'Com override de preco: % (esperado 0 — owners ainda nao usaram)', v_with_override;
  raise notice 'Com pricing_floor: % (esperado 0)', v_with_floor;
  raise notice 'Com pricing_ceiling: % (esperado 0)', v_with_ceiling;
  raise notice '';
  raise notice 'Descontos default por veiculo:';
  raise notice '  3 meses: 0%% (owner configura)';
  raise notice '  6 meses: 0%% (owner configura)';
  raise notice '  12 meses: 5%% (default)';
  raise notice '';
  raise notice 'Proximo passo: atualizar /simulador-roi-proprietario.html';
  raise notice '  pra mostrar campos de override + descontos.';
  raise notice '====================================================';
end $$;

-- =====================================
-- SHOW — lista todos veiculos com os novos campos
-- =====================================
select
  make,
  model,
  year_model,
  category,
  fipe_value,
  monthly_price_override,
  pricing_floor,
  pricing_ceiling,
  discount_3mo_pct,
  discount_6mo_pct,
  discount_12mo_pct
from public.vehicles
order by fipe_value desc nulls last;
