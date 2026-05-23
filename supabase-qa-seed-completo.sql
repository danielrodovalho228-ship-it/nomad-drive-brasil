-- ====================================================================
-- Nomade Drive Brasil — QA Seed Completo (Fase 28+ ready)
-- --------------------------------------------------------------------
-- Em UM SQL, popula tudo pra testar fluxos end-to-end:
--   1. Reset senha Teste123 nos 5 usuários qa-*
--   2. Confirma e-mail (email_confirmed_at)
--   3. Profiles: nome + telefone + endereço + status=aprovado
--   4. user_roles aprovados
--   5. Application (cadastro inicial) já aprovada
--   6. Workshop ativa com offers_tracker_install=true + price R$ 350
--   7. Vehicle Chevrolet Onix com placa, renavam, tracker_installed=true
--   8. Booking R$ 2.500 ativa (cliente + veículo) com deposit R$ 1.000
--
-- PRÉ-REQUISITO: as 5 contas qa-*@nomadedrive.com.br devem existir em
-- auth.users. Se ainda não foram criadas, rode antes:
--   supabase-qa-aliases-emails.sql
--
-- Idempotente — pode rodar de novo sem duplicar.
-- ====================================================================

-- Garante colunas necessárias mesmo se fase28b/fase30 não tiverem rodado
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='vehicles' and column_name='license_plate'
  ) then
    alter table public.vehicles add column license_plate text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='vehicles' and column_name='renavam'
  ) then
    alter table public.vehicles add column renavam text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='vehicles' and column_name='tracker_installed'
  ) then
    alter table public.vehicles add column tracker_installed boolean not null default false;
    alter table public.vehicles add column tracker_installed_at timestamptz;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='workshops' and column_name='offers_tracker_install'
  ) then
    alter table public.workshops add column offers_tracker_install boolean not null default false;
    alter table public.workshops add column tracker_install_price numeric(12,2);
    alter table public.workshops add column tracker_install_notes text;
  end if;
end $$;

do $$
declare
  email_cliente  text := 'qa-cliente@nomadedrive.com.br';
  email_owner    text := 'qa-proprietario@nomadedrive.com.br';
  email_parceiro text := 'qa-parceiro@nomadedrive.com.br';
  email_oficina  text := 'qa-oficina@nomadedrive.com.br';
  email_protecao text := 'qa-protecao@nomadedrive.com.br';

  uid_cliente   uuid;
  uid_owner     uuid;
  uid_parceiro  uuid;
  uid_oficina   uuid;
  uid_protecao  uuid;
  v_workshop_id uuid;
  v_vehicle_id  uuid;
  v_booking_id  uuid;
  v_pass        text := 'Teste123';
begin
  -- ====================================================
  -- 1. Localiza os 5 usuários
  -- ====================================================
  select id into uid_cliente  from auth.users where email = email_cliente;
  select id into uid_owner    from auth.users where email = email_owner;
  select id into uid_parceiro from auth.users where email = email_parceiro;
  select id into uid_oficina  from auth.users where email = email_oficina;
  select id into uid_protecao from auth.users where email = email_protecao;

  if uid_cliente is null or uid_owner is null or uid_parceiro is null
     or uid_oficina is null or uid_protecao is null then
    raise exception 'Faltam usuários qa-*. Rode supabase-qa-aliases-emails.sql primeiro ou crie os usuários pelo painel.';
  end if;

  -- ====================================================
  -- 2. Reset senha Teste123 + confirma e-mail
  -- ====================================================
  update auth.users
     set encrypted_password = crypt(v_pass, gen_salt('bf', 10)),
         email_confirmed_at = coalesce(email_confirmed_at, now())
   where id in (uid_cliente, uid_owner, uid_parceiro, uid_oficina, uid_protecao);

  -- ====================================================
  -- 3. Profiles: nome + telefone + cidade + status aprovado
  -- ====================================================
  update public.profiles set
    main_role = 'client',
    full_name = 'Carlos Silva Teste',
    phone = '+55 34 99100-0001',
    city = 'Uberlândia',
    state = 'MG',
    verification_status = 'aprovado',
    caucao_tier = 'padrao',
    email = email_cliente
   where id = uid_cliente;

  update public.profiles set
    main_role = 'owner',
    full_name = 'Marcos Pereira Teste',
    phone = '+55 34 99100-0002',
    city = 'Uberlândia',
    state = 'MG',
    verification_status = 'aprovado',
    email = email_owner
   where id = uid_owner;

  update public.profiles set
    main_role = 'referral_partner',
    full_name = 'Juliana Costa Teste',
    phone = '+55 34 99100-0003',
    city = 'Uberlândia',
    state = 'MG',
    verification_status = 'aprovado',
    email = email_parceiro
   where id = uid_parceiro;

  update public.profiles set
    main_role = 'workshop',
    full_name = 'Roberto Lima Teste',
    phone = '+55 34 99100-0004',
    city = 'Uberlândia',
    state = 'MG',
    verification_status = 'aprovado',
    email = email_oficina
   where id = uid_oficina;

  update public.profiles set
    main_role = 'protection_partner',
    full_name = 'Patrícia Souza Teste',
    phone = '+55 34 99100-0005',
    city = 'Uberlândia',
    state = 'MG',
    verification_status = 'aprovado',
    email = email_protecao
   where id = uid_protecao;

  -- ====================================================
  -- 4. user_roles aprovados
  -- ====================================================
  insert into public.user_roles (user_id, role, status) values
    (uid_cliente,  'client',             'aprovado'),
    (uid_owner,    'owner',              'aprovado'),
    (uid_parceiro, 'referral_partner',   'aprovado'),
    (uid_oficina,  'workshop',           'aprovado'),
    (uid_protecao, 'protection_partner', 'aprovado')
  on conflict (user_id, role) do update set status = 'aprovado';

  -- ====================================================
  -- 5. Applications (cadastros já aprovados, com e-mail)
  -- ====================================================
  insert into public.applications (id, user_id, profile_type, full_name, email, phone, city, status, protocol)
  values
    (gen_random_uuid(), uid_cliente,  'client',             'Carlos Silva Teste',    email_cliente,  '+55 34 99100-0001', 'Uberlândia', 'aprovado', 'NDB-2026-QA0001'),
    (gen_random_uuid(), uid_owner,    'owner',              'Marcos Pereira Teste',  email_owner,    '+55 34 99100-0002', 'Uberlândia', 'aprovado', 'NDB-2026-QA0002'),
    (gen_random_uuid(), uid_parceiro, 'referral_partner',   'Juliana Costa Teste',   email_parceiro, '+55 34 99100-0003', 'Uberlândia', 'aprovado', 'NDB-2026-QA0003'),
    (gen_random_uuid(), uid_oficina,  'workshop',           'Roberto Lima Teste',    email_oficina,  '+55 34 99100-0004', 'Uberlândia', 'aprovado', 'NDB-2026-QA0004'),
    (gen_random_uuid(), uid_protecao, 'protection_partner', 'Patrícia Souza Teste',  email_protecao, '+55 34 99100-0005', 'Uberlândia', 'aprovado', 'NDB-2026-QA0005')
  on conflict (protocol) do update set
    status = 'aprovado',
    full_name = excluded.full_name,
    email = excluded.email;

  -- ====================================================
  -- 6. Workshop com offers_tracker_install=true
  --    (user_id não tem constraint UNIQUE, usa where not exists)
  -- ====================================================
  insert into public.workshops (id, user_id, business_name, cnpj, responsible_name,
                                phone, address, city, state, weekly_capacity, status,
                                offers_tracker_install, tracker_install_price, tracker_install_notes)
  select gen_random_uuid(), uid_oficina, 'Auto Center Teste Uberlândia',
          '45997418000153', 'Roberto Lima Teste', '+55 34 99100-0004',
          'Av. Rondon Pacheco, 100', 'Uberlândia', 'MG', 10, 'aprovado',
          true, 350.00, 'Hardwired oculto. Dispositivo Cobli homologado. Instalação em 2h.'
  where not exists (select 1 from public.workshops where user_id = uid_oficina);

  -- Se já existir, atualiza pra aprovado + ativa offers_tracker
  update public.workshops set
    status = 'aprovado',
    offers_tracker_install = true,
    tracker_install_price = 350.00,
    tracker_install_notes = 'Hardwired oculto. Dispositivo Cobli homologado. Instalação em 2h.'
   where user_id = uid_oficina;

  select id into v_workshop_id from public.workshops where user_id = uid_oficina limit 1;

  -- ====================================================
  -- 7. Vehicle Chevrolet Onix com tracker_installed=true + placa + renavam
  --    (tracker_installed=true porque estamos pulando o fluxo de instalação
  --     pro seed; em produção real o gate Fase 28.2b força a instalação)
  -- ====================================================
  insert into public.vehicles (id, owner_id, category, make, model, year_model,
                               mileage, fipe_value, license_plate, renavam,
                               city, state, status, tracker_installed, tracker_installed_at)
  select gen_random_uuid(), uid_owner, 'B', 'Chevrolet', 'Onix', 2022,
         38000, 78000, 'ABC1D23', '12345678901',
         'Uberlândia', 'MG', 'aprovado', true, now()
  where not exists (
    select 1 from public.vehicles where owner_id = uid_owner and make = 'Chevrolet' and model = 'Onix'
  );

  -- Se já existir, atualiza pra ter placa+renavam+tracker
  update public.vehicles set
    license_plate = coalesce(license_plate, 'ABC1D23'),
    renavam = coalesce(renavam, '12345678901'),
    tracker_installed = true,
    tracker_installed_at = coalesce(tracker_installed_at, now()),
    status = 'aprovado'
   where owner_id = uid_owner and make = 'Chevrolet' and model = 'Onix';

  select id into v_vehicle_id
    from public.vehicles where owner_id = uid_owner and make = 'Chevrolet' and model = 'Onix' limit 1;

  -- ====================================================
  -- 8. Booking ativa (R$ 2.500/mês, caução R$ 1.000)
  -- ====================================================
  insert into public.bookings (id, client_id, owner_id, vehicle_id, start_date, end_date,
                               monthly_price, platform_fee, owner_estimated_amount,
                               deposit_amount, billing_mode, status)
  select gen_random_uuid(), uid_cliente, uid_owner, v_vehicle_id,
         current_date, current_date + 90, 2500, 250, 2250, 1000, 'monthly', 'aprovado'
  where not exists (
    select 1 from public.bookings where client_id = uid_cliente and vehicle_id = v_vehicle_id
  );

  select id into v_booking_id
    from public.bookings where client_id = uid_cliente and vehicle_id = v_vehicle_id limit 1;

  raise notice '=========================================';
  raise notice 'QA SEED COMPLETO — pronto pra testar!';
  raise notice '=========================================';
  raise notice 'Usuários (senha=Teste123):';
  raise notice '  qa-cliente@nomadedrive.com.br';
  raise notice '  qa-proprietario@nomadedrive.com.br';
  raise notice '  qa-parceiro@nomadedrive.com.br';
  raise notice '  qa-oficina@nomadedrive.com.br';
  raise notice '  qa-protecao@nomadedrive.com.br';
  raise notice '';
  raise notice 'Veículo aprovado: Chevrolet Onix 2022 ABC1D23';
  raise notice 'Workshop: Auto Center Teste (R$ 350 instalação)';
  raise notice 'Booking ativa: % (R$ 2.500/mês x 3 meses)', v_booking_id;
end $$;
