-- ====================================================================
-- 🚗 SIMULAÇÃO E2E DE RESERVAS — Fase 41 → 43c
-- --------------------------------------------------------------------
-- Cria 1 cenário completo: cliente bronze → faz reservas → promove
-- até platinum → renova com desconto correto.
--
-- ⚠️ ATENÇÃO: este SQL CRIA dados de teste. Roda em ambiente de
-- testes ou usa o cliente_id real do Daniel (mais seguro pra não
-- bagunçar dados reais).
--
-- COMO USAR:
--   1. Edita as variáveis no PASSO 0 com UUIDs reais teus
--   2. Cola TUDO no SQL Editor → Run
--   3. Bloco final mostra resumo: tier antes → depois, e-mails enviados
-- ====================================================================

-- ============================================================
-- PASSO 0: Configuração (EDITE AS LINHAS ABAIXO)
-- ============================================================
do $$
declare
  -- ⚠️ COLA TEUS UUIDs AQUI ANTES DE RODAR:
  v_test_client_id uuid := 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid;
  v_test_owner_id  uuid := 'COLE_UUID_OWNER_TESTE_AQUI'::uuid;
  v_test_vehicle_id uuid := 'COLE_UUID_VEICULO_TESTE_AQUI'::uuid;
begin
  raise notice '===========================================';
  raise notice '🚗 SIMULAÇÃO E2E DE RESERVAS';
  raise notice '===========================================';
  raise notice 'Cliente: %', v_test_client_id;
  raise notice 'Owner:   %', v_test_owner_id;
  raise notice 'Veículo: %', v_test_vehicle_id;
  raise notice '';
  raise notice '⚠️ Verifique se cole UUIDs reais — senão SQL falha com';
  raise notice '   "invalid input syntax for type uuid" antes mesmo de rodar.';
end $$;

-- ============================================================
-- AJUDA: pega UUIDs disponíveis pra teste
-- ============================================================
-- Cole o select abaixo SEPARADAMENTE pra descobrir UUIDs antes de rodar:
--   select 'CLIENTE' as tipo, id, full_name from public.profiles
--     where main_role = 'client' limit 5;
--   select 'OWNER+VEHICLE' as tipo, v.id as vehicle_id, v.owner_id, v.make, v.model
--     from public.vehicles v where v.status='aprovado' limit 5;

-- ============================================================
-- PASSO 1: Estado INICIAL do cliente (antes da simulação)
-- ============================================================
select
  '📊 PASSO 1: Estado INICIAL' as etapa,
  cl.client_id,
  cl.full_name,
  cl.tier,
  cl.months_completed,
  cl.renewal_discount_pct,
  cl.deposit_reduction_pct
from public.client_loyalty cl
where cl.client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid;

-- ============================================================
-- PASSO 2: Cria 1 booking ENCERRADA com 4 meses
-- → Cliente deve subir Bronze → Silver
-- ============================================================
insert into public.bookings (
  client_id, owner_id, vehicle_id,
  start_date, end_date,
  monthly_price, platform_fee, owner_estimated_amount, deposit_amount,
  status, billing_mode
) values (
  'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid,
  'COLE_UUID_OWNER_TESTE_AQUI'::uuid,
  'COLE_UUID_VEICULO_TESTE_AQUI'::uuid,
  current_date - interval '125 days',
  current_date - interval '5 days',
  1800, 180, 1620, 1500,
  'encerrada', 'monthly'
);

select '🚀 PASSO 2: Inseriu booking 4 meses ENCERRADA' as etapa, 'Trigger deve detectar promoção Bronze → Silver' as efeito;

-- ============================================================
-- PASSO 3: Confere promoção pra Silver
-- ============================================================
select pg_sleep(1);

select
  '🥈 PASSO 3: Cliente deve ser Silver agora' as etapa,
  cl.tier,
  cl.months_completed,
  cl.renewal_discount_pct,
  cl.deposit_reduction_pct,
  case
    when cl.tier = 'silver' and cl.renewal_discount_pct = 7 then '✅ PASSOU'
    else '🔴 FALHOU - esperado tier=silver, disc=7'
  end as resultado
from public.client_loyalty cl
where cl.client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid;

-- Confere evento de promoção gravado
select
  '📋 PASSO 3.1: Evento de promoção em loyalty_events' as etapa,
  event,
  from_tier,
  to_tier,
  metadata,
  created_at
from public.loyalty_events
where client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid
  and event = 'tier_promoted'
order by created_at desc
limit 1;

-- ============================================================
-- PASSO 4: Confere se e-mail "Bem-vindo Silver" foi disparado
-- ============================================================
select pg_sleep(2);

select
  '📧 PASSO 4: E-mail de promoção disparado' as etapa,
  metadata_json->>'to_tier' as tier,
  metadata_json->>'client_email' as cliente_email,
  metadata_json->>'email_sent' as email_enviado,
  metadata_json->>'email_error' as erro_se_houver,
  created_at
from public.admin_audit_logs
where action = 'tier_promotion_email_sent'
  and metadata_json->>'client_id' = 'COLE_UUID_CLIENTE_TESTE_AQUI'
order by created_at desc
limit 1;

-- ============================================================
-- PASSO 5: Cria 2ª booking ENCERRADA com 3 meses
-- → Acumula 7 meses → sobe Silver → Gold
-- ============================================================
insert into public.bookings (
  client_id, owner_id, vehicle_id,
  start_date, end_date,
  monthly_price, platform_fee, owner_estimated_amount, deposit_amount,
  status, billing_mode
) values (
  'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid,
  'COLE_UUID_OWNER_TESTE_AQUI'::uuid,
  'COLE_UUID_VEICULO_TESTE_AQUI'::uuid,
  current_date - interval '300 days',
  current_date - interval '210 days',
  1800, 180, 1620, 1500,
  'encerrada', 'monthly'
);

select '🚀 PASSO 5: 2ª booking 3 meses ENCERRADA' as etapa, 'Total agora 7 meses → Silver → Gold' as efeito;

select pg_sleep(2);

select
  '🥇 PASSO 6: Cliente deve ser Gold agora' as etapa,
  cl.tier,
  cl.months_completed,
  cl.renewal_discount_pct,
  cl.deposit_reduction_pct,
  case
    when cl.tier = 'gold' and cl.renewal_discount_pct = 10 and cl.deposit_reduction_pct = 20 then '✅ PASSOU'
    else '🔴 FALHOU - esperado tier=gold, disc=10, deposit_red=20'
  end as resultado
from public.client_loyalty cl
where cl.client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid;

-- ============================================================
-- PASSO 7: Cria booking ATIVA pra testar renovação 1-clique
-- → end_date em 3 dias (entra no D-7)
-- ============================================================
insert into public.bookings (
  client_id, owner_id, vehicle_id,
  start_date, end_date,
  monthly_price, platform_fee, owner_estimated_amount, deposit_amount,
  status, billing_mode
) values (
  'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid,
  'COLE_UUID_OWNER_TESTE_AQUI'::uuid,
  'COLE_UUID_VEICULO_TESTE_AQUI'::uuid,
  current_date - interval '27 days',
  current_date + interval '3 days',
  2000, 200, 1800, 1500,
  'em_uso', 'monthly'
)
returning id as nova_booking_ativa_id;

-- ============================================================
-- PASSO 8: Verifica renewal_opportunities com desconto tier-aware
-- ============================================================
select
  '🔄 PASSO 8: Renewal opportunity (Gold = 10% off)' as etapa,
  booking_id,
  days_remaining,
  monthly_price,
  discounted_price,
  discount_amount,
  renewal_discount_pct,
  client_tier,
  deposit_reduction_pct,
  case
    when renewal_discount_pct = 10 and client_tier = 'gold' then '✅ PASSOU'
    else '🔴 FALHOU - esperado disc=10, tier=gold'
  end as resultado
from public.renewal_opportunities
where client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid
order by days_remaining
limit 1;

-- ============================================================
-- PASSO 9: Simula renovação 1-clique (chama RPC clone_booking_for_renewal)
-- ============================================================
do $$
declare
  v_source_id uuid;
  v_new_id uuid;
  v_loyalty record;
begin
  -- Pega a booking ativa que acabamos de criar
  select id into v_source_id
  from public.bookings
  where client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid
    and status = 'em_uso'
    and end_date = current_date + interval '3 days'
  limit 1;

  if v_source_id is null then
    raise notice '⚠️ PASSO 9: Não achei booking ativa pra renovar';
    return;
  end if;

  -- Simula chamada da RPC (mas via security definer, então funciona com qualquer auth)
  -- ⚠️ Como auth.uid() vai retornar null no SQL Editor, vai falhar a checagem de
  -- "cliente da reserva". Por isso pulamos a chamada direta e mostramos o que
  -- ACONTECERIA com o desconto aplicado:
  select * into v_loyalty
  from public.get_client_loyalty_tier(
    'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid
  ) limit 1;

  raise notice '';
  raise notice '🔄 PASSO 9: Simulação de renovação 1-clique';
  raise notice '  Booking-fonte: %', v_source_id;
  raise notice '  Tier do cliente: %', v_loyalty.tier;
  raise notice '  Desconto que será aplicado: %%%', v_loyalty.renewal_discount_pct;
  raise notice '  Caução reduzida em: %%%', v_loyalty.deposit_reduction_pct;
  raise notice '';
  raise notice 'Pra renovar de verdade (cliente logado), no app:';
  raise notice '  dashboard-cliente.html → clica "Renovar 1 mês"';
  raise notice '  → vai aparecer "10% OFF · Gold" + "caução reduzida 20%"';
end $$;

-- ============================================================
-- PASSO 10: Resumo final do que foi simulado
-- ============================================================
select
  '🎯 RESUMO FINAL' as etapa,
  cl.full_name,
  cl.tier as tier_atual,
  cl.months_completed as meses_concluidos,
  cl.months_active as meses_ativos,
  cl.renewal_discount_pct as desconto_renovacao,
  cl.deposit_reduction_pct as desconto_caucao,
  cl.next_tier,
  cl.months_to_next_tier as faltam_pra_proximo,
  (select count(*) from public.bookings where client_id = cl.client_id) as total_bookings,
  (select count(*) from public.loyalty_events where client_id = cl.client_id) as eventos_loyalty
from public.client_loyalty cl
where cl.client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid;

-- ============================================================
-- 🧹 LIMPEZA (descomenta as 4 linhas pra remover dados de teste)
-- ============================================================
-- delete from public.loyalty_events where client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid and created_at >= current_date;
-- delete from public.admin_audit_logs where metadata_json->>'client_id' = 'COLE_UUID_CLIENTE_TESTE_AQUI' and action like 'tier_%' and created_at >= current_date;
-- delete from public.bookings where client_id = 'COLE_UUID_CLIENTE_TESTE_AQUI'::uuid and created_at >= current_date;
-- (não delete os bookings antigos pra não bagunçar dados reais — só os de hoje)

-- ============================================================
-- ✅ ESPERADO
-- --------------------------------------------------------------------
-- PASSO 1: Cliente Bronze (ou tier que já tinha)
-- PASSO 3: Tier='silver', disc=7 → ✅ PASSOU
-- PASSO 3.1: Evento tier_promoted gravado
-- PASSO 4: E-mail enviado (email_sent=true)
-- PASSO 6: Tier='gold', disc=10, deposit_red=20 → ✅ PASSOU
-- PASSO 8: renewal_opportunities mostra 10% off + tier=gold → ✅ PASSOU
-- PASSO 9: Notice mostra cálculos corretos
-- PASSO 10: Resumo final
--
-- E-mails que devem chegar na caixa do cliente:
--   1. "🥈 Parabéns! Você é Cliente Silver — Nomade Drive Brasil"
--   2. "🥇 Parabéns! Você é Cliente Gold — Nomade Drive Brasil"
-- ============================================================
