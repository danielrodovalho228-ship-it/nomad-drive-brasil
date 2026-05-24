-- ====================================================================
-- Nomade Drive Brasil — Fase 41: Renovação 1-clique de locação
-- --------------------------------------------------------------------
-- OBJETIVO:
--   Quando faltam <=7 dias pro fim da locação, cliente vê card destacado
--   "Sua locação termina em X dias — renovar?". Com 1 clique, cria uma
--   nova reserva (mesma viatura, novo período) com 5% desconto.
--
-- COMPONENTES:
--   1. View renewal_opportunities (lista reservas elegíveis)
--   2. Função clone_booking_for_renewal (cria booking nova)
--   3. Template e-mail D-7 (na próxima fase, via cron)
--
-- ELEGIBILIDADE PRA RENOVAÇÃO:
--   - booking.status in ('em_uso', 'aprovado')
--   - end_date <= today + 7 days
--   - cliente não tem outra renovação pendente
--   - sem avarias em aberto (caução já liberada)
--
-- BENEFÍCIO:
--   - 5% off na primeira mensalidade da renovação
--   - Mesmo veículo (continuidade)
--   - Sem precisar passar por KYC de novo
-- ====================================================================

-- View: oportunidades de renovação ativas
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

  -- Dias restantes
  (b.end_date - current_date)::int as days_remaining,

  -- Veículo
  v.make, v.model, v.year_model, v.license_plate,

  -- Cliente
  cp.full_name as client_name,
  cp.email as client_email,

  -- Owner
  op.full_name as owner_name,

  -- Tem avaria pendente?
  exists (
    select 1 from public.damages d
    where d.booking_id = b.id
      and d.status in ('pendente_revisao','em_contestacao','aprovado_captura')
  ) as has_pending_damage,

  -- Já tem renovação aceita? (booking nova após esta com mesmo client+vehicle)
  exists (
    select 1 from public.bookings b2
    where b2.client_id = b.client_id
      and b2.vehicle_id = b.vehicle_id
      and b2.start_date > b.end_date
      and b2.status in ('aprovado','em_uso')
  ) as already_renewed,

  -- Calcula preço com desconto (5%)
  round(b.monthly_price * 0.95, 2) as discounted_price,
  round(b.monthly_price * 0.05, 2) as discount_amount

from public.bookings b
join public.vehicles v on v.id = b.vehicle_id
join public.profiles cp on cp.id = b.client_id
join public.profiles op on op.id = b.owner_id
where b.status in ('em_uso','aprovado')
  and b.end_date is not null
  and b.end_date <= current_date + interval '7 days'
  and b.end_date >= current_date - interval '7 days';  -- até 7d após fim (período de graça)

comment on view public.renewal_opportunities is
  'Reservas elegíveis pra renovação 1-clique (D-7 até D+7 do fim). Calcula 5% off automático.';

-- ============================================================
-- Função: cria booking nova baseada em outra (renovação)
-- ============================================================
create or replace function public.clone_booking_for_renewal(
  source_booking_id uuid,
  duration_months int default 1   -- 1, 2 ou 3
)
returns uuid
language plpgsql
security definer
as $$
declare
  src record;
  new_id uuid;
  new_start date;
  new_end date;
  discounted numeric(12,2);
  fee numeric(12,2);
  owner_net numeric(12,2);
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

  -- Verifica autorização: cliente da reserva OR super-admin
  if auth.uid() <> src.client_id then
    if not exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin' and status = 'aprovado'
    ) then
      raise exception 'Apenas o cliente da reserva pode renovar';
    end if;
  end if;

  -- Calcula valores com desconto
  discounted := round(src.monthly_price * 0.95, 2);  -- 5% off na 1ª
  fee := round(discounted * 0.10, 2);                 -- 10% comissão plataforma
  owner_net := discounted - fee;

  -- Datas da nova reserva (começa no dia seguinte ao fim da atual)
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
    discounted, fee, owner_net, src.deposit_amount,
    'aprovado', src.billing_mode
  )
  returning id into new_id;

  -- Loga audit
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
      'discount_pct', 5,
      'discount_amount', src.monthly_price - discounted,
      'new_start', new_start,
      'new_end', new_end
    )
  );

  return new_id;
end;
$$;

comment on function public.clone_booking_for_renewal is
  'Fase 41: clona uma booking pra renovação com 5% off na primeira mensalidade. Validações: cliente correto, não já renovada. Retorna id da nova booking.';

-- Permissões
grant execute on function public.clone_booking_for_renewal(uuid, int) to authenticated;

-- Verificação
do $$
declare
  cnt int;
begin
  select count(*) into cnt from public.renewal_opportunities;
  raise notice '=== Fase 41 — Renovação 1-clique ===';
  raise notice 'Oportunidades de renovação ativas: %', cnt;
  raise notice '';
  raise notice 'Pra testar: select * from public.renewal_opportunities;';
  raise notice 'Pra renovar: select public.clone_booking_for_renewal(<booking_uuid>, 1);';
end $$;
