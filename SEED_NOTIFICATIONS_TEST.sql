-- ====================================================================
-- 🔔 SEED: Notificações de teste pro sino in-app (Fase 57)
-- --------------------------------------------------------------------
-- Use este SQL DEPOIS de ter rodado supabase-fase57-user-notifications.sql.
--
-- COMO USAR:
--   1. Substitua o e-mail abaixo pelo SEU e-mail de login
--      (linha 23 — DEFINE_EMAIL).
--   2. Cole tudo no Supabase SQL Editor e rode.
--   3. Abre qualquer dashboard (cliente/owner/admin) e o sino vai
--      aparecer com badge "5" no canto.
--
-- PRA REMOVER as notificações de teste depois:
--   delete from public.user_notifications where type like 'test_%';
-- ====================================================================

do $$
declare
  v_user_id uuid;
  v_email text := 'SEU_EMAIL@AQUI.COM';  -- 🔧 SUBSTITUA AQUI pelo seu email de login
  v_count int;
begin
  -- 1) Resolve user_id pelo email
  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_email)
  limit 1;

  if v_user_id is null then
    raise exception '❌ Usuario com email "%" nao encontrado em auth.users. Verifique se digitou certo (substitua a variavel v_email na linha 23).', v_email;
  end if;

  raise notice '✓ User encontrado: % (%)', v_email, v_user_id;

  -- 2) Limpa notificacoes de teste anteriores (idempotente)
  delete from public.user_notifications
  where user_id = v_user_id and type like 'test_%';

  -- 3) Insere 5 notificacoes variadas (status, prioridade, idade)
  --    Algumas mais antigas pra mostrar "timeAgo" funcionando.

  -- A) Mais recente — reserva aprovada (HIGH priority, unread)
  perform notify_user(
    v_user_id,
    'test_booking_status',
    'Sua reserva foi aprovada!',
    'Cobalt 2020 · Reserva NDB-2026-001234. Disponivel pra retirada amanha 10h.',
    '/reserva-detalhe.html?id=test-1',
    'booking', null, 'high', '✅'
  );

  -- B) Pagamento recebido (NORMAL, unread) — 30 min atras
  perform notify_user(
    v_user_id,
    'test_payment',
    'Mensalidade paga!',
    'Recebemos R$ 2.400,00 da mensalidade #3 da sua locacao. Recibo no e-mail.',
    '/recibo.html?id=test-2',
    'payment', null, 'normal', '💰'
  );
  -- Empurra essa pra 30min atras (pra ver o badge "30 min")
  update public.user_notifications
  set created_at = now() - interval '30 minutes'
  where user_id = v_user_id
    and type = 'test_payment'
    and created_at > now() - interval '5 minutes';

  -- C) Veiculo aprovado (proprietario) — 2 horas atras
  perform notify_user(
    v_user_id,
    'test_vehicle_approved',
    'Seu carro passou na vistoria!',
    'Cobalt 2020 esta liberado pra anunciar. Disponivel na frota agora.',
    '/dashboard-proprietario.html#vehicles',
    'vehicle', null, 'high', '🚗'
  );
  update public.user_notifications
  set created_at = now() - interval '2 hours'
  where user_id = v_user_id
    and type = 'test_vehicle_approved'
    and created_at > now() - interval '5 minutes';

  -- D) Saque disponivel (proprietario) — 1 dia atras (URGENT)
  perform notify_user(
    v_user_id,
    'test_withdrawal',
    'R$ 1.080,00 disponivel pra saque',
    'Marco da locacao do Cobalt liberado. Comissao Nomade Drive (10%) ja descontada.',
    '/dashboard-proprietario.html#earnings',
    'withdrawal', null, 'urgent', '💸'
  );
  update public.user_notifications
  set created_at = now() - interval '1 day'
  where user_id = v_user_id
    and type = 'test_withdrawal'
    and created_at > now() - interval '5 minutes';

  -- E) Promocao tier Gold — 3 dias atras (JA LIDA pra mostrar contraste)
  perform notify_user(
    v_user_id,
    'test_tier_promotion',
    'Voce subiu para Gold!',
    'Agora tem 12% off em todas as locacoes + auto-aprovacao sem analise manual.',
    '/index.html#fidelidade',
    'profile', null, 'normal', '🏆'
  );
  update public.user_notifications
  set status = 'read',
      read_at = now() - interval '2 days',
      created_at = now() - interval '3 days'
  where user_id = v_user_id
    and type = 'test_tier_promotion'
    and created_at > now() - interval '5 minutes';

  -- 4) Conta
  select count(*) into v_count
  from public.user_notifications
  where user_id = v_user_id;

  raise notice '';
  raise notice '✅ 5 notificacoes de teste criadas pro user %', v_email;
  raise notice '   Total na tabela: % (incluindo anteriores)', v_count;
  raise notice '';
  raise notice '🔔 Abra qualquer dashboard e o sino deve mostrar badge "4" (4 unread, 1 lida).';
  raise notice '';
  raise notice 'Pra apagar so as de teste depois:';
  raise notice '  delete from user_notifications where user_id = ''%''::uuid and type like ''test_%%'';', v_user_id;
end $$;

-- ====================================================================
-- VERIFICACAO (opcional) — ver o que foi criado
-- ====================================================================
-- Descomente as linhas abaixo pra ver a lista:
--
-- select
--   icon,
--   title,
--   status,
--   priority,
--   to_char(created_at, 'DD/MM HH24:MI') as quando,
--   left(message, 60) as preview
-- from public.user_notifications
-- where user_id = (select id from auth.users where lower(email) = lower('SEU_EMAIL@AQUI.COM'))
-- order by created_at desc;
