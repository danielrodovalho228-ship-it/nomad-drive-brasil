-- ====================================================================
-- 💎 FASE 80 — MARKET-BASED PRICING (substitui % da FIPE)
-- --------------------------------------------------------------------
-- POR QUE?
-- O modelo atual (FIPE x % categoria) gera precos MAIORES que Localiza:
--   - T-Cross R$ 5.400 (nosso) vs R$ 5.221 (Localiza) — somos mais caros!
-- Para ser marketplace P2P competitivo precisamos:
--   1. Preco BASE por categoria de mercado (nao por % FIPE)
--   2. Ajustes por: cambio, ano, km, regiao
--   3. Descontos progressivos crescentes ate 20% em 12 meses
--   4. Garantir 15-30% abaixo da locadora tradicional
--
-- A FIPE continua relevante pra:
--   - Caucao
--   - Seguro
--   - ROI do proprietario
--   - Validacao de elegibilidade
-- Mas NUNCA mais define o aluguel mensal diretamente.
-- ====================================================================

-- =====================================
-- 1) TABELA `pricing_categories` — 13 categorias inspiradas em Localiza
-- =====================================
create table if not exists public.pricing_categories (
  key text primary key,
  label text not null,
  body_type text not null check (body_type in ('hatch','sedan','suv','pickup','luxo')),
  transmission_default text check (transmission_default in ('manual','automatico')),
  base_price_brl numeric(10,2) not null check (base_price_brl > 0),
  examples text[] not null default '{}',
  localiza_base_brl numeric(10,2),
  localiza_final_brl numeric(10,2),
  sort_order integer not null default 999,
  created_at timestamptz not null default now()
);

comment on table public.pricing_categories is
  'Tabela de categorias com preco base de mercado. Substitui o sistema FLEET_TIER_RATES (% FIPE). Inspirada nos grupos Localiza/Unidas/Movida.';

-- Popular com 13 categorias
insert into public.pricing_categories (key, label, body_type, transmission_default, base_price_brl, examples, localiza_base_brl, localiza_final_brl, sort_order) values
  ('B',    'Compacto Básico',      'hatch',  'manual',     2200.00, '{"Mobi","Kwid"}',                 1708.00, 3040.00, 10),
  ('CH',   'Hatch Econômico',      'hatch',  'manual',     2400.00, '{"Onix 1.0"}',                    1798.00, 3200.00, 20),
  ('CE',   'Hatch Econômico Plus', 'hatch',  'manual',     2600.00, '{"HB20","Argo","Polo"}',          1918.00, 3415.00, 30),
  ('CS',   'Sedan Compacto',       'sedan',  'manual',     2800.00, '{"Cronos","Onix Plus","HB20S"}',  2008.00, 3575.00, 40),
  ('FS',   'Sedan Intermediário',  'sedan',  'manual',     3200.00, '{"Cronos 1.3","Onix Turbo"}',     2368.00, 4215.00, 50),
  ('FH',   'Hatch Automático',     'hatch',  'automatico', 3300.00, '{"HB20 AT","Onix AT"}',           2398.00, 4270.00, 60),
  ('FX',   'Sedan Automático',     'sedan',  'automatico', 3500.00, '{"Onix Plus Turbo AT"}',          2518.00, 4480.00, 70),
  ('G',    'SUV Compacto',         'suv',    'manual',     3700.00, '{"Basalt","VW Tera"}',            2608.00, 4640.00, 80),
  ('GC',   'SUV Compacto Plus',    'suv',    'automatico', 3900.00, '{"VW Tera AT"}',                  2728.00, 4860.00, 90),
  ('GI',   'SUV Premium',          'suv',    'automatico', 4100.00, '{"Nissan Kicks AT"}',             2878.00, 5120.00, 100),
  ('GX',   'SUV Médio',            'suv',    'automatico', 4300.00, '{"Tracker","T-Cross","Renegade"}', 2938.00, 5221.00, 110),
  ('GH',   'SUV Luxo',             'suv',    'automatico', 4600.00, '{"Tracker Premier","T-Cross Highline"}', 3058.00, 5445.00, 120),
  ('LUXO', 'Luxo Importado',       'luxo',   'automatico', 6000.00, '{"BMW","Audi","Tesla","Mercedes"}', null,    null,    200)
on conflict (key) do update set
  label = excluded.label,
  body_type = excluded.body_type,
  transmission_default = excluded.transmission_default,
  base_price_brl = excluded.base_price_brl,
  examples = excluded.examples,
  localiza_base_brl = excluded.localiza_base_brl,
  localiza_final_brl = excluded.localiza_final_brl,
  sort_order = excluded.sort_order;

-- =====================================
-- 2) NOVAS COLUNAS em `vehicles`
-- =====================================
alter table public.vehicles
  add column if not exists category_key text references public.pricing_categories(key),
  add column if not exists transmission text check (transmission in ('manual','automatico')),
  add column if not exists city_tier text check (city_tier in ('capital','media','interior')) default 'media';

comment on column public.vehicles.category_key is
  'Categoria de mercado (referencia pricing_categories.key). Substitui o campo legacy `category` A/B/C/D.';
comment on column public.vehicles.transmission is
  'Cambio: manual ou automatico. Afeta ajuste de preco (+5% se auto).';
comment on column public.vehicles.city_tier is
  'Tier da cidade do veiculo: capital (+10%), media (0%), interior (-10%).';

-- =====================================
-- 3) DESCONTOS — adicionar 2mo e 4mo (Fase 79 so tinha 3/6/12)
-- =====================================

-- Primeiro DROP a constraint crescente da Fase 79 (vamos refazer)
alter table public.vehicles drop constraint if exists vehicles_discounts_increasing_check;
alter table public.vehicles drop constraint if exists vehicles_discounts_range_check;

-- Adicionar 2mo e 4mo
alter table public.vehicles
  add column if not exists discount_2mo_pct numeric(5,2) not null default 5,
  add column if not exists discount_4mo_pct numeric(5,2) not null default 12;

-- Update defaults pros descontos existentes da Fase 79 pra refletir nova tabela
-- (somente onde owner ainda nao customizou — usamos comparacao com defaults antigos)
update public.vehicles
set
  discount_3mo_pct  = case when discount_3mo_pct  = 0 then 10 else discount_3mo_pct  end,
  discount_6mo_pct  = case when discount_6mo_pct  = 0 then 15 else discount_6mo_pct  end,
  discount_12mo_pct = case when discount_12mo_pct = 5 then 20 else discount_12mo_pct end;

comment on column public.vehicles.discount_2mo_pct is 'Desconto (%) pra contrato de 2 meses. Default 5%.';
comment on column public.vehicles.discount_4mo_pct is 'Desconto (%) pra contrato de 4 meses. Default 12%.';

-- Re-criar constraints (agora com 5 tiers)
alter table public.vehicles add constraint vehicles_discounts_range_check
  check (
    discount_2mo_pct  >= 0 and discount_2mo_pct  <= 50
    and discount_3mo_pct  >= 0 and discount_3mo_pct  <= 50
    and discount_4mo_pct  >= 0 and discount_4mo_pct  <= 50
    and discount_6mo_pct  >= 0 and discount_6mo_pct  <= 50
    and discount_12mo_pct >= 0 and discount_12mo_pct <= 50
  );

alter table public.vehicles add constraint vehicles_discounts_increasing_check
  check (
    discount_2mo_pct  <= discount_3mo_pct
    and discount_3mo_pct  <= discount_4mo_pct
    and discount_4mo_pct  <= discount_6mo_pct
    and discount_6mo_pct  <= discount_12mo_pct
  );

-- =====================================
-- 4) FUNCAO HELPER — calcular ajustes por ano, km, cambio, cidade
-- =====================================

-- Ajuste por ano: 0-2 anos +8%, 3-5 +3%, 6-8 -5%, 9+ -10%
create or replace function public.pricing_age_adjustment(p_year_model integer)
returns numeric language sql immutable as $$
  select case
    when p_year_model is null then 1.00
    when (extract(year from current_date)::int - p_year_model) <= 2 then 1.08
    when (extract(year from current_date)::int - p_year_model) <= 5 then 1.03
    when (extract(year from current_date)::int - p_year_model) <= 8 then 0.95
    else 0.90
  end;
$$;

-- Ajuste por quilometragem: <30k +5%, 30-60k 0%, 60-100k -5%, >100k -10%
create or replace function public.pricing_mileage_adjustment(p_mileage integer)
returns numeric language sql immutable as $$
  select case
    when p_mileage is null then 1.00
    when p_mileage < 30000 then 1.05
    when p_mileage <= 60000 then 1.00
    when p_mileage <= 100000 then 0.95
    else 0.90
  end;
$$;

-- Ajuste por cambio: manual 0%, automatico +5%
create or replace function public.pricing_transmission_adjustment(p_transmission text)
returns numeric language sql immutable as $$
  select case
    when p_transmission = 'automatico' then 1.05
    else 1.00
  end;
$$;

-- Ajuste por cidade: capital +10%, media 0%, interior -10%
create or replace function public.pricing_city_adjustment(p_city_tier text)
returns numeric language sql immutable as $$
  select case
    when p_city_tier = 'capital' then 1.10
    when p_city_tier = 'interior' then 0.90
    else 1.00
  end;
$$;

-- =====================================
-- 5) FUNCAO CENTRAL — calculate_suggested_monthly_price
-- =====================================
-- Recebe vehicle_id + duracao (meses), retorna preco mensal sugerido FINAL
-- aplicando: base_price (categoria) x ajustes (ano/km/cambio/cidade) x desconto progressivo
-- Respeita monthly_price_override e pricing_floor/ceiling se setados.

create or replace function public.calculate_suggested_monthly_price(
  p_vehicle_id uuid,
  p_num_months integer default 1
)
returns numeric
language plpgsql
stable
as $$
declare
  v record;
  v_base numeric;
  v_adjusted numeric;
  v_discount_pct numeric;
  v_final numeric;
begin
  -- Carrega veiculo + categoria de uma vez
  select
    veh.*,
    pc.base_price_brl as cat_base_price
  into v
  from public.vehicles veh
  left join public.pricing_categories pc on pc.key = veh.category_key
  where veh.id = p_vehicle_id;

  if not found then return null; end if;

  -- Se owner setou override, usa direto (com clamps)
  if v.monthly_price_override is not null then
    v_final := v.monthly_price_override;
  else
    -- Senao, calcula via base + ajustes
    if v.cat_base_price is null then
      -- Fallback: categoria nao mapeada → retorna null (forca configurar)
      return null;
    end if;
    v_base := v.cat_base_price;
    v_adjusted := v_base
      * public.pricing_age_adjustment(v.year_model)
      * public.pricing_mileage_adjustment(v.mileage)
      * public.pricing_transmission_adjustment(v.transmission)
      * public.pricing_city_adjustment(v.city_tier);
    v_final := v_adjusted;
  end if;

  -- Aplica desconto progressivo
  v_discount_pct := public.progressive_discount_pct(p_vehicle_id, p_num_months);
  v_final := v_final * (1 - v_discount_pct / 100);

  -- Clamp por floor/ceiling
  if v.pricing_floor is not null then
    v_final := greatest(v_final, v.pricing_floor);
  end if;
  if v.pricing_ceiling is not null then
    v_final := least(v_final, v.pricing_ceiling);
  end if;

  return round(v_final, 2);
end;
$$;

grant execute on function public.calculate_suggested_monthly_price(uuid, integer) to authenticated, anon;

comment on function public.calculate_suggested_monthly_price(uuid, integer) is
  'FASE 80: calcula preco mensal sugerido considerando categoria de mercado + ajustes (ano/km/cambio/cidade) + desconto progressivo + override + clamps. Substitui completamente o modelo % FIPE.';

-- =====================================
-- 6) ATUALIZAR `progressive_discount_pct` pra cobrir 5 tiers (2/3/4/6/12)
-- =====================================
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
      when p_num_months >= 4 then v.discount_4mo_pct
      when p_num_months >= 3 then v.discount_3mo_pct
      when p_num_months >= 2 then v.discount_2mo_pct
      else 0
    end
  from public.vehicles v
  where v.id = p_vehicle_id;
$$;

comment on function public.progressive_discount_pct(uuid, integer) is
  'FASE 80: tiers atualizados pra 2/3/4/6/12 meses. Defaults: 5/10/12/15/20.';

-- =====================================
-- 7) MIGRAR OS 4 VEICULOS ATUAIS pras novas categorias
-- =====================================
-- T-Cross 2023 → GX (SUV Médio), automatico (T-Cross só vem assim)
-- Onix 2022 → assumir automatico → FH (Hatch Automatico)
-- Argo 2023 → CE (Hatch Econômico Plus), assumir manual
-- HB20 2021 → CE (Hatch Econômico Plus), assumir manual

update public.vehicles set category_key = 'GX', transmission = 'automatico' where lower(make) = 'volkswagen' and lower(model) = 't-cross';
update public.vehicles set category_key = 'FH', transmission = 'automatico' where lower(make) = 'chevrolet' and lower(model) = 'onix';
update public.vehicles set category_key = 'CE', transmission = 'manual'     where lower(make) = 'fiat'      and lower(model) = 'argo';
update public.vehicles set category_key = 'CE', transmission = 'manual'     where lower(make) = 'hyundai'   and lower(model) = 'hb20';

-- Default city_tier = 'media' ja foi setado pelo ADD COLUMN. Owner ajusta no painel.

-- =====================================
-- VERIFICACAO FINAL
-- =====================================
do $$
declare
  v_total_categories int;
  v_total_vehicles int;
  v_vehicles_categorized int;
begin
  select count(*) into v_total_categories from public.pricing_categories;
  select count(*) into v_total_vehicles from public.vehicles;
  select count(*) into v_vehicles_categorized from public.vehicles where category_key is not null;

  raise notice '';
  raise notice '====================================================';
  raise notice '✅ MIGRATION FASE 80 APLICADA';
  raise notice '====================================================';
  raise notice 'Categorias criadas: %', v_total_categories;
  raise notice 'Veiculos: % (% migrados pra nova categoria)', v_total_vehicles, v_vehicles_categorized;
  raise notice '';
  raise notice 'Novas funcoes:';
  raise notice '  - pricing_age_adjustment(year)';
  raise notice '  - pricing_mileage_adjustment(km)';
  raise notice '  - pricing_transmission_adjustment(trans)';
  raise notice '  - pricing_city_adjustment(tier)';
  raise notice '  - calculate_suggested_monthly_price(vehicle_id, num_months)';
  raise notice '  - progressive_discount_pct(vehicle_id, num_months) [atualizada: 5 tiers]';
  raise notice '====================================================';
end $$;

-- Mostrar resultado por veiculo
select
  v.make,
  v.model,
  v.year_model,
  v.mileage,
  v.category_key,
  pc.label as categoria,
  pc.base_price_brl as base,
  v.transmission,
  v.city_tier,
  public.calculate_suggested_monthly_price(v.id, 1) as sugerido_1mes,
  public.calculate_suggested_monthly_price(v.id, 3) as sugerido_3meses,
  public.calculate_suggested_monthly_price(v.id, 12) as sugerido_12meses,
  pc.localiza_final_brl as localiza_referencia
from public.vehicles v
left join public.pricing_categories pc on pc.key = v.category_key
order by pc.sort_order nulls last, v.fipe_value desc;
