-- ====================================================================
-- Nomade Drive Brasil — Fase 57: Notificações in-app por usuário
-- --------------------------------------------------------------------
-- OBJETIVO:
--   Tabela user_notifications + RLS + trigger útil pra alimentar o
--   sino in-app no header dos dashboards (cliente, owner, admin).
--
-- DIFERENÇA da tabela 'notifications' existente:
--   - 'notifications' (Fase 1) é GLOBAL — só pro admin ver tudo.
--   - 'user_notifications' (Fase 57) é POR USUÁRIO — cada user
--     vê as suas no sino do header.
--
-- COMPONENTES:
--   1. Tabela user_notifications
--   2. RLS (user vê só as suas; admin vê tudo)
--   3. Função notify_user() — utilitário pra inserir
--   4. Trigger em bookings: status muda → notifica cliente + owner
--   5. Trigger em rental_requests: status muda → notifica cliente
-- ====================================================================

-- =====================================
-- 1) Tabela principal
-- =====================================
create table if not exists public.user_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,          -- 'booking_status', 'payment_received', 'rental_approved', etc.
  title       text not null,
  message     text,
  link        text,                   -- URL relativa pra clicar e ir direto pro contexto
  entity_type text,                   -- 'booking', 'payment', 'withdrawal', etc.
  entity_id   uuid,
  status      text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  icon        text default '🔔',      -- emoji ou char pra UI
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists user_notifications_user_status_idx
  on public.user_notifications(user_id, status, created_at desc);
create index if not exists user_notifications_unread_count_idx
  on public.user_notifications(user_id) where status = 'unread';

-- =====================================
-- 2) RLS — user vê só as suas; admin vê tudo
-- =====================================
alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_read_own" on public.user_notifications;
create policy "user_notifications_read_own" on public.user_notifications
  for select using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
        and status = 'aprovado'
    )
  );

-- User pode marcar as suas como lidas (update status/read_at)
drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own" on public.user_notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- INSERT só via função SECURITY DEFINER (notify_user) ou service_role.
-- Bloqueia inserts diretos do client.
drop policy if exists "user_notifications_no_direct_insert" on public.user_notifications;
create policy "user_notifications_no_direct_insert" on public.user_notifications
  for insert with check (false);

-- =====================================
-- 3) Função notify_user — utilitário com SECURITY DEFINER
-- =====================================
create or replace function public.notify_user(
  p_user_id     uuid,
  p_type        text,
  p_title       text,
  p_message     text default null,
  p_link        text default null,
  p_entity_type text default null,
  p_entity_id   uuid default null,
  p_priority    text default 'normal',
  p_icon        text default '🔔'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;
  insert into public.user_notifications (
    user_id, type, title, message, link, entity_type, entity_id, priority, icon
  ) values (
    p_user_id, p_type, p_title, p_message, p_link, p_entity_type, p_entity_id,
    coalesce(p_priority, 'normal'),
    coalesce(p_icon, '🔔')
  ) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.notify_user(
  uuid, text, text, text, text, text, uuid, text, text
) to authenticated, service_role;

-- =====================================
-- 4) Trigger: booking status mudou → notifica cliente + owner
-- =====================================
create or replace function public.notify_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link text;
  v_label_old text;
  v_label_new text;
begin
  -- só dispara se status realmente mudou
  if new.status is null or new.status = coalesce(old.status, '') then
    return new;
  end if;

  v_link := '/reserva-detalhe.html?id=' || new.id::text;

  -- Labels amigáveis
  v_label_new := case new.status
    when 'aprovado'   then '✅ aprovada'
    when 'confirmada' then '✅ confirmada'
    when 'em_uso'     then '🚗 em uso'
    when 'encerrada'  then '🏁 encerrada'
    when 'cancelada'  then '❌ cancelada'
    when 'recusada'   then '❌ recusada'
    else new.status
  end;

  -- Notifica CLIENTE
  if new.client_id is not null then
    perform public.notify_user(
      new.client_id,
      'booking_status',
      'Sua reserva foi ' || v_label_new,
      'Reserva ' || coalesce(new.protocol_number, new.id::text),
      v_link,
      'booking',
      new.id,
      case when new.status in ('aprovado','confirmada','recusada','cancelada') then 'high' else 'normal' end,
      case new.status
        when 'aprovado'  then '✅'
        when 'recusada'  then '❌'
        when 'em_uso'    then '🚗'
        when 'encerrada' then '🏁'
        else '🔔'
      end
    );
  end if;

  -- Notifica OWNER
  if new.owner_id is not null and new.owner_id <> new.client_id then
    perform public.notify_user(
      new.owner_id,
      'booking_status',
      'Reserva do seu carro: ' || v_label_new,
      'Reserva ' || coalesce(new.protocol_number, new.id::text),
      v_link,
      'booking',
      new.id,
      case when new.status in ('em_uso','encerrada','cancelada') then 'high' else 'normal' end,
      case new.status
        when 'em_uso'    then '🚗'
        when 'encerrada' then '🏁'
        when 'cancelada' then '❌'
        else '🔔'
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_booking_status on public.bookings;
create trigger trg_notify_booking_status
  after update of status on public.bookings
  for each row execute function public.notify_booking_status_change();

-- =====================================
-- 5) Trigger: rental_request status mudou → notifica cliente
-- =====================================
create or replace function public.notify_rental_request_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link text;
  v_title text;
  v_icon text;
  v_prio text;
begin
  if new.status is null or new.status = coalesce(old.status, '') then
    return new;
  end if;

  v_link := '/dashboard-cliente.html#solicitacoes';

  if new.status = 'aprovado' then
    v_title := '✅ Solicitação de aluguel aprovada!';
    v_icon := '✅';
    v_prio := 'high';
  elsif new.status in ('recusado','rejeitado') then
    v_title := '❌ Solicitação não aprovada';
    v_icon := '❌';
    v_prio := 'high';
  elsif new.status = 'em_analise' then
    v_title := '⏳ Sua solicitação está em análise';
    v_icon := '⏳';
    v_prio := 'normal';
  else
    return new;  -- outras transições silenciosas
  end if;

  if new.client_id is not null then
    perform public.notify_user(
      new.client_id, 'rental_request', v_title, null, v_link,
      'rental_request', new.id, v_prio, v_icon
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_rental_request_status on public.rental_requests;
create trigger trg_notify_rental_request_status
  after update of status on public.rental_requests
  for each row execute function public.notify_rental_request_status();

-- =====================================
-- Verificação
-- =====================================
do $$
begin
  raise notice '=== Fase 57 — user_notifications criada ===';
  raise notice '✓ tabela user_notifications com RLS (user ve so as suas)';
  raise notice '✓ funcao notify_user() pra inserir via SECURITY DEFINER';
  raise notice '✓ trigger em bookings.status mudou → notifica client + owner';
  raise notice '✓ trigger em rental_requests.status mudou → notifica client';
  raise notice '';
  raise notice 'Pra inserir uma notif manual de teste (substituindo o uuid):';
  raise notice '  select notify_user(';
  raise notice '    ''<user_uuid>''::uuid,';
  raise notice '    ''test'', ''Teste do sino'',';
  raise notice '    ''Se voce esta vendo isso, o sino funciona.''';
  raise notice '  );';
end $$;
