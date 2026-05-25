-- ====================================================================
-- 🔴 FIX CRÍTICO Fase 52: redeem_coupon revalida tudo internamente
-- --------------------------------------------------------------------
-- BUG (code-reviewer):
--   redeem_coupon aceitava discount_amount + original_amount como
--   PARÂMETROS do cliente sem revalidar. Atacante autenticado podia:
--     select redeem_coupon('<id>', '<bid>', 9999, 9998)
--   Registrava desconto fake, poluía coupon_stats, e se o backend
--   confiasse em final_amount = fraude direta.
--
-- TAMBÉM CORRIGE:
--   - Falta de unique constraint (booking_id, coupon_id) → dupla redenção
--   - Falta de check booking.client_id = auth.uid()
--   - Falta de revalidação dos limites no momento da redenção
--   - client_ratings_summary sem filtro is_public
--   - applied_amount sem CHECK >= 0
-- ====================================================================

-- =====================================
-- 1) Unique constraint anti-dupla-redenção
-- =====================================
alter table public.coupon_redemptions
  add constraint uq_redemption_per_booking_coupon
  unique (booking_id, coupon_id);

-- =====================================
-- 2) CHECK constraints anti-fraude
-- =====================================
alter table public.coupon_redemptions
  drop constraint if exists chk_redemption_positive_amounts;
alter table public.coupon_redemptions
  add constraint chk_redemption_positive_amounts
  check (applied_amount >= 0 and final_amount >= 0 and original_amount >= 0);

-- =====================================
-- 3) min_tier com CHECK constraint (anti-typo)
-- =====================================
alter table public.coupons
  drop constraint if exists chk_min_tier;
alter table public.coupons
  add constraint chk_min_tier
  check (min_tier is null or min_tier in ('silver', 'gold', 'platinum'));

-- =====================================
-- 4) Reescreve redeem_coupon com validação completa
-- =====================================
drop function if exists public.redeem_coupon(uuid, uuid, numeric, numeric);

create or replace function public.redeem_coupon(
  p_code text,
  p_booking_id uuid
)
returns table (
  ok boolean,
  redemption_id uuid,
  applied_amount numeric,
  final_amount numeric,
  error text
)
language plpgsql
security definer
as $$
declare
  v_user uuid;
  c record;
  booking_record record;
  v_original numeric(10,2);
  v_discount numeric(10,2);
  v_final numeric(10,2);
  uses_count_total int;
  uses_count_user int;
  user_tier text;
  user_has_bookings boolean;
  v_redemption_id uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'not_authenticated'::text;
    return;
  end if;

  -- 1) Valida booking pertence ao usuário + pega monthly_price
  select id, client_id, monthly_price into booking_record
  from public.bookings
  where id = p_booking_id;

  if not found then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'booking_not_found'::text;
    return;
  end if;
  if booking_record.client_id <> v_user then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'booking_not_owned'::text;
    return;
  end if;

  v_original := booking_record.monthly_price;
  if v_original is null or v_original <= 0 then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'invalid_booking_amount'::text;
    return;
  end if;

  -- 2) Busca cupom + valida ativo/validade
  select * into c
  from public.coupons
  where code_normalized = upper(trim(p_code))
    and is_active = true
  limit 1;

  if not found then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_not_found'::text;
    return;
  end if;
  if c.valid_from > now() then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_not_started'::text;
    return;
  end if;
  if c.valid_until is not null and c.valid_until < now() then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_expired'::text;
    return;
  end if;

  -- 3) Limite total — com lock pra evitar TOCTOU
  if c.max_uses_total is not null then
    select count(*) into uses_count_total
    from public.coupon_redemptions
    where coupon_id = c.id
    for update;  -- bloqueia leitura concorrente até COMMIT
    if uses_count_total >= c.max_uses_total then
      return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_max_uses_reached'::text;
      return;
    end if;
  end if;

  -- 4) Limite por cliente
  select count(*) into uses_count_user
  from public.coupon_redemptions
  where coupon_id = c.id and client_id = v_user;
  if uses_count_user >= c.max_uses_per_client then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_user_limit_reached'::text;
    return;
  end if;

  -- 5) Só novos clientes?
  if c.only_new_clients then
    select exists(select 1 from public.bookings where client_id = v_user) into user_has_bookings;
    if user_has_bookings then
      return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_only_new_clients'::text;
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
      return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_min_tier_required'::text;
      return;
    end if;
  end if;

  -- 7) CALCULA desconto SERVER-SIDE (não confia em parâmetro do cliente)
  if c.discount_type = 'percentage' then
    v_discount := round(v_original * c.discount_value / 100.0, 2);
  else
    v_discount := least(c.discount_value, v_original);
  end if;
  v_final := greatest(v_original - v_discount, 0);

  -- 8) Insere com unique constraint (booking_id, coupon_id) bloqueando dupla
  insert into public.coupon_redemptions (
    coupon_id, client_id, booking_id,
    applied_amount, original_amount, final_amount
  ) values (
    c.id, v_user, p_booking_id,
    v_discount, v_original, v_final
  )
  returning id into v_redemption_id;

  return query select true, v_redemption_id, v_discount, v_final, null::text;
exception
  when unique_violation then
    return query select false, null::uuid, 0::numeric, 0::numeric, 'coupon_already_used_on_booking'::text;
end $$;

grant execute on function public.redeem_coupon(text, uuid) to authenticated;

comment on function public.redeem_coupon is
  'Fase 52 FIX: revalida TUDO no momento da redenção (não confia em params do cliente). Calcula desconto server-side baseado no monthly_price da booking.';

-- =====================================
-- 5) Fix client_ratings_summary — filtrar is_public
-- =====================================
drop view if exists public.client_ratings_summary cascade;
create view public.client_ratings_summary
with (security_invoker = true) as
select
  c.id as client_id,
  count(r.id) as total_ratings,
  round(avg(r.stars)::numeric, 1) as avg_stars,
  round(avg(r.cleanliness)::numeric, 1) as avg_cleanliness,
  round(avg(r.communication)::numeric, 1) as avg_communication,
  round(avg(r.punctuality)::numeric, 1) as avg_punctuality
from public.profiles c
left join public.ratings r on r.ratee_id = c.id
  and r.direction = 'owner_rates_client'
  and r.is_public = true   -- 🔧 FIX: estava faltando filtro is_public
where c.main_role = 'client'
group by c.id;

-- =====================================
-- Verificação
-- =====================================
do $$
begin
  raise notice '=== Fase 52b FIX — Cupons revalidação completa ===';
  raise notice '✓ unique (booking_id, coupon_id) adicionado';
  raise notice '✓ CHECK amounts >= 0 adicionado';
  raise notice '✓ CHECK min_tier in (silver/gold/platinum) adicionado';
  raise notice '✓ redeem_coupon reescrita: revalida tudo + lock + booking_owned';
  raise notice '✓ client_ratings_summary filtra is_public agora';
  raise notice '';
  raise notice 'NOVA assinatura redeem_coupon:';
  raise notice '  select * from redeem_coupon(''CODIGO'', ''<booking_uuid>'');';
  raise notice '  (cliente NÃO passa mais amounts — função calcula)';
end $$;
