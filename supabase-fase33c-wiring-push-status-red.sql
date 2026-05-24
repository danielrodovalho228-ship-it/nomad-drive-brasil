-- ====================================================================
-- Nomade Drive Brasil — Fase 33c: Wiring automático de push
-- --------------------------------------------------------------------
-- OBJETIVO:
--   Quando um snapshot novo entra em vehicle_status_snapshots com
--   overall_status='red' E o anterior NÃO era red (transição green/yellow → red),
--   chamar automaticamente a Edge Function send-push pra notificar o
--   proprietário em tempo real (mesmo com a aba fechada).
--
-- COMO FUNCIONA:
--   Trigger AFTER INSERT em vehicle_status_snapshots →
--   chama public.notify_owner_status_red() (security definer) →
--   net.http_post pra send-push Edge Function via pg_net extension.
--
-- PRÉ-REQ:
--   - Fase 33  (vehicle_status_snapshots)
--   - Fase 33b (push_subscriptions + send-push Edge Function)
--   - Extensão pg_net (Supabase Database → Extensions → pg_net)
--
-- DEPLOY:
--   1. Habilita pg_net no Supabase Dashboard se ainda não estiver
--   2. Cola este SQL e Run
--   3. Funciona automaticamente em snapshots novos
-- ====================================================================

-- 1. Habilita pg_net (idempotente — só erra se já tiver schema diferente)
create extension if not exists pg_net schema extensions;

-- 2. Função: extrai owner_id do veículo + dispara push
create or replace function public.notify_owner_status_red()
returns trigger
language plpgsql
security definer
as $$
declare
  v_owner_id uuid;
  v_vehicle text;
  v_supabase_url text;
  v_anon_key text;
  v_previous_status text;
begin
  -- Só dispara se status novo é 'red'
  if new.overall_status <> 'red' then
    return new;
  end if;

  -- Verifica se o status ANTERIOR já era red (evita spam de push)
  select overall_status into v_previous_status
    from public.vehicle_status_snapshots
   where vehicle_id = new.vehicle_id
     and id <> new.id
   order by created_at desc
   limit 1;

  if v_previous_status = 'red' then
    -- Já estava red — não dispara push de novo (evita spam)
    return new;
  end if;

  -- Carrega owner_id + nome do veículo
  select
    v.owner_id,
    coalesce(v.make || ' ' || v.model, 'Seu veículo')
  into v_owner_id, v_vehicle
  from public.vehicles v
  where v.id = new.vehicle_id;

  if v_owner_id is null then
    return new;
  end if;

  -- URLs (Supabase config — hardcoded ou via vault)
  -- IMPORTANTE: substituir SUPABASE_URL pela URL do projeto
  -- (ex: 'https://zeexmbgacvsaciojcrwr.supabase.co')
  v_supabase_url := current_setting('app.supabase_url', true);
  v_anon_key := current_setting('app.supabase_anon_key', true);

  if v_supabase_url is null or v_anon_key is null then
    raise warning 'app.supabase_url ou app.supabase_anon_key não configurados — push não disparado. Configurar via: alter database postgres set app.supabase_url = ''https://....supabase.co'';';
    return new;
  end if;

  -- Dispara HTTP POST pra send-push (async — não bloqueia o INSERT)
  perform net.http_post(
    url := v_supabase_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'user_id', v_owner_id,
      'title', '🚨 Alerta crítico — ' || v_vehicle,
      'body', coalesce(
        (new.alert_messages->>0)::text,
        'Veículo com status crítico — verifique o painel.'
      ),
      'url', '/dashboard-proprietario.html#rastreamento',
      'icon', '/images/favicon.svg',
      'tag', 'vehicle-' || new.vehicle_id::text,
      'requireInteraction', true
    )
  );

  -- Loga audit
  insert into public.admin_audit_logs (action, target_type, target_id, metadata_json)
  values (
    'push_notification_triggered',
    'vehicle_status_snapshot',
    new.id,
    jsonb_build_object(
      'vehicle_id', new.vehicle_id,
      'owner_id', v_owner_id,
      'transition', coalesce(v_previous_status, 'null') || '→red'
    )
  );

  return new;
exception
  when others then
    -- Não quebra o INSERT se push falhar
    raise warning 'notify_owner_status_red falhou (não bloqueante): %', sqlerrm;
    return new;
end;
$$;

comment on function public.notify_owner_status_red is
  'Fase 33c: dispara push notification quando vehicle_status_snapshot vira red. Evita spam (só se status anterior NÃO era red). Não bloqueia INSERT se falhar.';

-- 3. Trigger
drop trigger if exists trg_notify_owner_status_red on public.vehicle_status_snapshots;
create trigger trg_notify_owner_status_red
  after insert on public.vehicle_status_snapshots
  for each row
  execute function public.notify_owner_status_red();

-- 4. Verificação
do $$
declare
  has_pg_net boolean;
  has_trigger boolean;
begin
  select exists(
    select 1 from pg_extension where extname = 'pg_net'
  ) into has_pg_net;
  select exists(
    select 1 from pg_trigger where tgname = 'trg_notify_owner_status_red'
  ) into has_trigger;

  raise notice '=== Fase 33c — Wiring push status red ===';
  raise notice 'pg_net habilitado: %', has_pg_net;
  raise notice 'trigger criado: %', has_trigger;

  if not has_pg_net then
    raise warning 'pg_net não habilitado! Ative em: Supabase Dashboard → Database → Extensions → pg_net';
  end if;

  raise notice '';
  raise notice 'CONFIGURAR (uma vez): ';
  raise notice '  alter database postgres set app.supabase_url = ''https://SEU_PROJETO.supabase.co'';';
  raise notice '  alter database postgres set app.supabase_anon_key = ''SUA_ANON_KEY'';';
  raise notice '';
  raise notice 'Pra testar manualmente:';
  raise notice '  select public.create_vehicle_snapshot(<vehicle_uuid>, false);  -- simula rastreador OFF → status=red → push';
end $$;
