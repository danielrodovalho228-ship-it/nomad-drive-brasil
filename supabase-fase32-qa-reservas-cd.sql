-- ====================================================================
-- Nomade Drive Brasil — Fase 32 (QA): reservas extras p/ Fluxo C e D
-- --------------------------------------------------------------------
-- O Fluxo B encerrou (e cancelou a assinatura) da reserva Onix. Pra
-- testar:
--   - Fluxo C (avaria + captura de caução) → precisa de uma reserva
--     "limpa" com veículo próprio (evita conflito com a Onix).
--   - Fluxo D (cancelar assinatura) → precisa de uma reserva com
--     assinatura ATIVA (a ativa será criada pagando a mensalidade no
--     Stripe Checkout depois; aqui só criamos a reserva base).
--
-- Cria 2 veículos novos do qa-proprietário (HB20 e T-Cross) e 2 reservas
-- do qa-cliente (status 'aprovado', billing_mode 'monthly').
--
-- Idempotente — pode rodar de novo sem duplicar (usa where not exists).
-- Depende das contas qa-* já existentes (supabase-qa-seed-completo.sql).
-- ====================================================================
do $$
declare
  uid_cliente  uuid;
  uid_owner    uuid;
  v_hb20_id    uuid;
  v_tcross_id  uuid;
begin
  select id into uid_cliente from auth.users where email = 'qa-cliente@nomadedrive.com.br';
  select id into uid_owner   from auth.users where email = 'qa-proprietario@nomadedrive.com.br';

  if uid_cliente is null or uid_owner is null then
    raise exception 'Faltam contas qa-cliente/qa-proprietario. Rode supabase-qa-seed-completo.sql antes.';
  end if;

  -- ----- Veículo HB20 (Fluxo C — avaria) -----
  insert into public.vehicles (id, owner_id, category, make, model, year_model,
                               mileage, fipe_value, license_plate, renavam,
                               city, state, status, tracker_installed, tracker_installed_at)
  select gen_random_uuid(), uid_owner, 'B', 'Hyundai', 'HB20', 2023,
         25000, 72000, 'QAC2C34', '22345678902',
         'Uberlândia', 'MG', 'aprovado', true, now()
  where not exists (
    select 1 from public.vehicles where owner_id = uid_owner and make='Hyundai' and model='HB20'
  );
  select id into v_hb20_id from public.vehicles
    where owner_id = uid_owner and make='Hyundai' and model='HB20' limit 1;

  -- ----- Veículo T-Cross (Fluxo D — assinatura) -----
  insert into public.vehicles (id, owner_id, category, make, model, year_model,
                               mileage, fipe_value, license_plate, renavam,
                               city, state, status, tracker_installed, tracker_installed_at)
  select gen_random_uuid(), uid_owner, 'C', 'Volkswagen', 'T-Cross', 2023,
         18000, 135000, 'QAD3D45', '32345678903',
         'Uberlândia', 'MG', 'aprovado', true, now()
  where not exists (
    select 1 from public.vehicles where owner_id = uid_owner and make='Volkswagen' and model='T-Cross'
  );
  select id into v_tcross_id from public.vehicles
    where owner_id = uid_owner and make='Volkswagen' and model='T-Cross' limit 1;

  -- ----- Reserva C (HB20) — caução R$ 1.000 -----
  insert into public.bookings (id, client_id, owner_id, vehicle_id, start_date, end_date,
                               monthly_price, platform_fee, owner_estimated_amount,
                               deposit_amount, billing_mode, status)
  select gen_random_uuid(), uid_cliente, uid_owner, v_hb20_id,
         current_date, current_date + 90, 2200, 220, 1980, 1000, 'monthly', 'aprovado'
  where not exists (
    select 1 from public.bookings where client_id = uid_cliente and vehicle_id = v_hb20_id
  );

  -- ----- Reserva D (T-Cross) — assinatura será criada via Checkout -----
  insert into public.bookings (id, client_id, owner_id, vehicle_id, start_date, end_date,
                               monthly_price, platform_fee, owner_estimated_amount,
                               deposit_amount, billing_mode, status)
  select gen_random_uuid(), uid_cliente, uid_owner, v_tcross_id,
         current_date, current_date + 150, 3200, 320, 2880, 1200, 'monthly', 'aprovado'
  where not exists (
    select 1 from public.bookings where client_id = uid_cliente and vehicle_id = v_tcross_id
  );

  raise notice '=========================================';
  raise notice 'Fase 32 QA — reservas C e D criadas';
  raise notice '  HB20 (Fluxo C/avaria)  veiculo=%', v_hb20_id;
  raise notice '  T-Cross (Fluxo D/assinatura) veiculo=%', v_tcross_id;
  raise notice 'Reservas do qa-cliente prontas (status aprovado).';
  raise notice '=========================================';
end $$;
