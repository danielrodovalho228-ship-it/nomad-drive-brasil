-- ============================================================
-- Nomade Drive Brasil — Dados de teste (seed)
-- ------------------------------------------------------------
-- ATENÇÃO: este script cria DADOS FICTÍCIOS no banco. Use apenas em
-- ambiente de teste, ou aceitando que registros de teste serão criados.
-- É idempotente: pode rodar de novo sem duplicar.
--
-- ------------------------------------------------------------
-- PASSO 1 — CRIE AS 5 CONTAS (você precisa fazer isto; eu não posso).
--   Caminho mais rápido — Supabase Dashboard:
--     Authentication > Users > "Add user"
--       - informe e-mail e senha
--       - marque "Auto Confirm User"
--     Repita para as 5 contas de teste.
--   (Alternativa: criar pelo próprio site, em login.html > "Criar conta",
--    e confirmar o e-mail de cada uma.)
--
-- PASSO 2 — troque os 5 e-mails abaixo pelos que você usou e rode este
--   arquivo no SQL Editor. O script descobre o papel, aprova e popula.
--
-- O papel principal de cada conta é DEFINIDO por este script — não
-- importa como a conta foi criada.
-- ============================================================

do $$
declare
  -- >>> TROQUE PELOS E-MAILS QUE VOCÊ USOU <<<
  email_cliente  text := 'teste-cliente@exemplo.com';
  email_owner    text := 'teste-proprietario@exemplo.com';
  email_parceiro text := 'teste-parceiro@exemplo.com';
  email_oficina  text := 'teste-oficina@exemplo.com';
  email_protecao text := 'teste-protecao@exemplo.com';

  uid_cliente   uuid;
  uid_owner     uuid;
  uid_parceiro  uuid;
  uid_oficina   uuid;
  uid_protecao  uuid;
  v_workshop_id uuid;
  v_vehicle_id  uuid;
  v_booking_id  uuid;
begin
  -- localiza os usuários pelas contas criadas no Passo 1
  select id into uid_cliente  from auth.users where email = lower(email_cliente);
  select id into uid_owner    from auth.users where email = lower(email_owner);
  select id into uid_parceiro from auth.users where email = lower(email_parceiro);
  select id into uid_oficina  from auth.users where email = lower(email_oficina);
  select id into uid_protecao from auth.users where email = lower(email_protecao);

  if uid_cliente is null or uid_owner is null or uid_parceiro is null
     or uid_oficina is null or uid_protecao is null then
    raise exception 'Conta de teste faltando. Crie as 5 contas (Passo 1) e confira os e-mails antes de rodar o seed.';
  end if;

  -- ----------------------------------------------------------
  -- 1. PERFIL E PAPEL DE CADA CONTA
  -- ----------------------------------------------------------
  update public.profiles set main_role = 'client',
         full_name = coalesce(nullif(trim(full_name), ''), 'Cliente Teste'),
         verification_status = 'aprovado', city = coalesce(city,'Uberlândia'), state = coalesce(state,'MG')
   where id = uid_cliente;
  update public.profiles set main_role = 'owner',
         full_name = coalesce(nullif(trim(full_name), ''), 'Proprietário Teste'),
         verification_status = 'aprovado', city = coalesce(city,'Uberlândia'), state = coalesce(state,'MG')
   where id = uid_owner;
  update public.profiles set main_role = 'referral_partner',
         full_name = coalesce(nullif(trim(full_name), ''), 'Parceiro Teste'),
         verification_status = 'aprovado', city = coalesce(city,'Uberlândia'), state = coalesce(state,'MG')
   where id = uid_parceiro;
  update public.profiles set main_role = 'workshop',
         full_name = coalesce(nullif(trim(full_name), ''), 'Oficina Teste'),
         verification_status = 'aprovado', city = coalesce(city,'Uberlândia'), state = coalesce(state,'MG')
   where id = uid_oficina;
  update public.profiles set main_role = 'protection_partner',
         full_name = coalesce(nullif(trim(full_name), ''), 'Proteção Teste'),
         verification_status = 'aprovado', city = coalesce(city,'Uberlândia'), state = coalesce(state,'MG')
   where id = uid_protecao;

  insert into public.user_roles (user_id, role, status) values
    (uid_cliente,  'client',             'aprovado'),
    (uid_owner,    'owner',              'aprovado'),
    (uid_parceiro, 'referral_partner',   'aprovado'),
    (uid_oficina,  'workshop',           'aprovado'),
    (uid_protecao, 'protection_partner', 'aprovado')
  on conflict (user_id, role) do update set status = 'aprovado';

  -- ----------------------------------------------------------
  -- 2. OFICINA DE TESTE
  -- ----------------------------------------------------------
  insert into public.workshops (id, user_id, business_name, cnpj, responsible_name,
                                phone, city, state, weekly_capacity, status)
  select gen_random_uuid(), uid_oficina, 'Oficina Teste NDB', '00000000000100',
         'Responsável de Teste', '34000000000', 'Uberlândia', 'MG', 10, 'aprovado'
  where not exists (select 1 from public.workshops where user_id = uid_oficina);
  select id into v_workshop_id from public.workshops where user_id = uid_oficina limit 1;

  -- ----------------------------------------------------------
  -- 3. VEÍCULO DE TESTE (do proprietário)
  -- ----------------------------------------------------------
  insert into public.vehicles (id, owner_id, category, make, model, year_model,
                               mileage, fipe_value, plate_last_digits, city, state, status)
  select gen_random_uuid(), uid_owner, 'B', 'Chevrolet', 'Onix', 2022,
         38000, 78000, '1234', 'Uberlândia', 'MG', 'aprovado'
  where not exists (
    select 1 from public.vehicles where owner_id = uid_owner and make = 'Chevrolet' and model = 'Onix'
  );
  select id into v_vehicle_id
    from public.vehicles where owner_id = uid_owner and make = 'Chevrolet' and model = 'Onix' limit 1;

  -- ----------------------------------------------------------
  -- 4. RESERVA DE TESTE (liga cliente + veículo do proprietário)
  -- ----------------------------------------------------------
  insert into public.bookings (id, client_id, owner_id, vehicle_id, start_date, end_date,
                               monthly_price, platform_fee, owner_estimated_amount, status)
  select gen_random_uuid(), uid_cliente, uid_owner, v_vehicle_id,
         current_date, current_date + 30, 2500, 500, 2000, 'aprovado'
  where not exists (
    select 1 from public.bookings where client_id = uid_cliente and vehicle_id = v_vehicle_id
  );
  select id into v_booking_id
    from public.bookings where client_id = uid_cliente and vehicle_id = v_vehicle_id limit 1;

  -- ----------------------------------------------------------
  -- 5. CHECK-IN SOLICITADO (para o proprietário ter o que aprovar)
  -- ----------------------------------------------------------
  insert into public.rental_inspections (id, booking_id, kind, status, scheduled_at,
                                         location, mileage, fuel_level, notes, client_accepted)
  select gen_random_uuid(), v_booking_id, 'checkin', 'solicitado', now(),
         'Uberlândia-MG', 38000, 'cheio', 'Check-in de teste.', true
  where v_booking_id is not null
    and not exists (select 1 from public.rental_inspections where booking_id = v_booking_id);

  -- ----------------------------------------------------------
  -- 6. OCORRÊNCIA DE TESTE (para o parceiro de proteção triar)
  -- ----------------------------------------------------------
  insert into public.protection_cases (id, vehicle_id, booking_id, case_type, status,
                                       description, reported_by)
  select gen_random_uuid(), v_vehicle_id, v_booking_id, 'dano_externo', 'em_analise',
         'Ocorrência de teste — pequeno arranhão na lataria.', uid_cliente
  where v_booking_id is not null
    and not exists (select 1 from public.protection_cases where booking_id = v_booking_id);

  -- ----------------------------------------------------------
  -- 7. INDICAÇÃO DE TESTE (para o painel do parceiro)
  -- ----------------------------------------------------------
  insert into public.partners_referrals (id, partner_id, referred_name, referred_phone,
                                         referral_type, status, commission_status)
  select gen_random_uuid(), uid_parceiro, 'Lead de Teste', '34000000000',
         'cliente', 'em_analise', 'estimada'
  where not exists (select 1 from public.partners_referrals where partner_id = uid_parceiro);

  raise notice 'Seed de teste concluído. Reserva de teste: %', v_booking_id;
end $$;

-- ------------------------------------------------------------
-- ADMIN (opcional): se quiser uma conta de teste como administrador,
-- crie a conta pelo site e rode (trocando o e-mail):
--
--   insert into public.user_roles (user_id, role, status)
--   select id, 'super_admin', 'aprovado' from auth.users
--   where email = 'teste-admin@exemplo.com'
--   on conflict (user_id, role) do update set status = 'aprovado';
-- ============================================================
-- Fim — seed de dados de teste.
-- ============================================================
