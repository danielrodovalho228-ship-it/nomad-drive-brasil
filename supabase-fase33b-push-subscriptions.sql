-- ====================================================================
-- Nomade Drive Brasil — Fase 33b: Push Notifications PWA
-- --------------------------------------------------------------------
-- Armazena Web Push subscriptions de usuários (proprietários e clientes
-- que aceitarem notificações no navegador).
--
-- Quando o status do veículo virar 'red' (ou outro evento crítico),
-- Edge Function send-push lê as subscriptions desse usuário e envia
-- via Web Push API (com VAPID keys).
--
-- Idempotente. Pode rodar várias vezes.
-- ====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Endpoint do push service (Google FCM, Mozilla, Apple, etc.)
  endpoint text not null,

  -- Chaves criptográficas pro Web Push (vêm do navegador)
  p256dh text not null,
  auth text not null,

  -- Metadata
  user_agent text,
  browser_label text,                      -- "Chrome 121 macOS"
  active boolean default true,
  failure_count int default 0,             -- pra desativar subs que falham repetidamente

  created_at timestamptz default now(),
  last_used_at timestamptz,
  expires_at timestamptz,                  -- algumas subs têm expiração

  -- Uma subscription única por endpoint (mesmo browser não duplica)
  constraint push_subs_endpoint_unique unique (endpoint)
);

create index if not exists push_subs_user_active_idx
  on public.push_subscriptions(user_id, active);

comment on table public.push_subscriptions is
  'Web Push subscriptions de usuários. Endpoint + p256dh + auth (VAPID). Edge Function send-push usa pra disparar push real.';

-- RLS
alter table public.push_subscriptions enable row level security;

-- Usuário gerencia próprias subscriptions
drop policy if exists push_subs_own_select on public.push_subscriptions;
create policy push_subs_own_select on public.push_subscriptions
  for select using (user_id = auth.uid());

drop policy if exists push_subs_own_insert on public.push_subscriptions;
create policy push_subs_own_insert on public.push_subscriptions
  for insert with check (user_id = auth.uid());

drop policy if exists push_subs_own_update on public.push_subscriptions;
create policy push_subs_own_update on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_subs_own_delete on public.push_subscriptions;
create policy push_subs_own_delete on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- Admin vê tudo
drop policy if exists push_subs_admin_all on public.push_subscriptions;
create policy push_subs_admin_all on public.push_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- Verificação
do $$
begin
  raise notice '=== Fase 33b: Push Subscriptions ===';
  raise notice 'Tabela push_subscriptions criada.';
  raise notice '';
  raise notice 'PRÓXIMOS PASSOS:';
  raise notice '  1. Gerar VAPID keys (npx web-push generate-vapid-keys)';
  raise notice '  2. Configurar no Supabase secrets: VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY';
  raise notice '  3. Deploy Edge Function send-push';
  raise notice '  4. UI no dashboard-proprietario.html pra ativar push';
end $$;
