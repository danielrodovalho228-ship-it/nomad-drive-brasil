-- ====================================================================
-- Nomade Drive Brasil — Fase 36d: Force-Backfill de Protocolos
-- --------------------------------------------------------------------
-- BUG (cowork QA Fase 36 — BUG_fase36_rodape_protocolo_nao_aparece.md):
--   E-mail de triagem não mostra "📋 Protocolo: PR-####" no rodapé porque
--   o cs.protocol_number do caso testado está NULL.
--
-- CAUSA-RAIZ:
--   Backfill original (Fase 34/36) só rodou pros casos existentes ANTES
--   do SQL ter sido aplicado. Casos criados ANTES dos triggers e que
--   não tinham protocol_number ficaram null se o backfill falhou ou foi
--   pulado.
--
-- FIX:
--   Re-roda backfill de TODAS as entidades. Idempotente — só atualiza
--   linhas onde protocol_number IS NULL.
--
-- ENTIDADES:
--   - protection_cases  → PR-AAAA-####
--   - damages           → AV-AAAA-####
--   - bookings          → RS-AAAA-####
--   - rental_inspections → VS-AAAA-####
--   - payments          → PG-AAAA-####
--
-- Idempotente. Pode rodar quantas vezes quiser.
-- ====================================================================

-- ============================ 1. protection_cases ===================
do $$
declare
  r record;
  cnt int := 0;
begin
  for r in select id, created_at, case_type, priority
             from public.protection_cases
            where protocol_number is null
            order by created_at, id
  loop
    cnt := cnt + 1;
    update public.protection_cases
       set protocol_number = 'PR-' ||
             to_char(coalesce(r.created_at, now()), 'YYYY') || '-' ||
             lpad(nextval('public.protection_case_protocol_seq')::text, 4, '0'),
           priority = coalesce(r.priority,
                              public.classify_case_priority(r.case_type),
                              'media')
     where id = r.id;
  end loop;
  raise notice 'protection_cases backfill: % linhas', cnt;
end $$;

-- ============================ 2. damages ============================
do $$
declare
  r record;
  cnt int := 0;
begin
  for r in select id, created_at
             from public.damages
            where protocol_number is null
            order by created_at, id
  loop
    cnt := cnt + 1;
    update public.damages
       set protocol_number = 'AV-' ||
             to_char(coalesce(r.created_at, now()), 'YYYY') || '-' ||
             lpad(nextval('public.damage_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
  raise notice 'damages backfill: % linhas', cnt;
end $$;

-- ============================ 3. bookings (RS-) =====================
do $$
declare
  r record;
  cnt int := 0;
begin
  for r in select id, created_at
             from public.bookings
            where protocol_number is null
            order by created_at, id
  loop
    cnt := cnt + 1;
    update public.bookings
       set protocol_number = 'RS-' ||
             to_char(coalesce(r.created_at, now()), 'YYYY') || '-' ||
             lpad(nextval('public.booking_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
  raise notice 'bookings backfill: % linhas', cnt;
end $$;

-- ============================ 4. rental_inspections (VS-) ===========
do $$
declare
  r record;
  cnt int := 0;
begin
  for r in select id, created_at
             from public.rental_inspections
            where protocol_number is null
            order by created_at, id
  loop
    cnt := cnt + 1;
    update public.rental_inspections
       set protocol_number = 'VS-' ||
             to_char(coalesce(r.created_at, now()), 'YYYY') || '-' ||
             lpad(nextval('public.inspection_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
  raise notice 'rental_inspections backfill: % linhas', cnt;
end $$;

-- ============================ 5. payments (PG-) =====================
do $$
declare
  r record;
  cnt int := 0;
begin
  for r in select id, created_at
             from public.payments
            where protocol_number is null
            order by created_at, id
  loop
    cnt := cnt + 1;
    update public.payments
       set protocol_number = 'PG-' ||
             to_char(coalesce(r.created_at, now()), 'YYYY') || '-' ||
             lpad(nextval('public.payment_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
  raise notice 'payments backfill: % linhas', cnt;
end $$;

-- ============================ 6. Verificação ========================
do $$
declare
  pc_null int;
  dmg_null int;
  bk_null int;
  ri_null int;
  pay_null int;
begin
  select count(*) into pc_null from public.protection_cases where protocol_number is null;
  select count(*) into dmg_null from public.damages where protocol_number is null;
  select count(*) into bk_null from public.bookings where protocol_number is null;
  select count(*) into ri_null from public.rental_inspections where protocol_number is null;
  select count(*) into pay_null from public.payments where protocol_number is null;

  raise notice '=== Fase 36d: Force-backfill done ===';
  raise notice 'protection_cases ainda sem protocolo: %', pc_null;
  raise notice 'damages ainda sem protocolo: %', dmg_null;
  raise notice 'bookings ainda sem protocolo: %', bk_null;
  raise notice 'rental_inspections ainda sem protocolo: %', ri_null;
  raise notice 'payments ainda sem protocolo: %', pay_null;

  if (pc_null + dmg_null + bk_null + ri_null + pay_null) = 0 then
    raise notice 'OK — todas as entidades têm protocolo. E-mails vão renderizar 📋 Protocolo no rodapé.';
  else
    raise warning 'Algumas entidades ainda sem protocolo. Verificar se a sequência existe + se RPC tem permissão.';
  end if;
end $$;
