-- ============================================================
-- Nomade Drive Brasil — Fase 1: protocolo e rastreamento de cadastros
-- Rode no Supabase SQL Editor (idempotente — pode rodar de novo).
-- ============================================================

-- 1. TABELA DE CADASTROS (intake unificado, com protocolo)
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  protocol     text unique,
  profile_type text,
  user_id      uuid references auth.users(id) on delete set null,
  full_name    text,
  email        text,
  phone        text,
  city         text,
  status       text not null default 'em_analise',
  source       text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 2. TABELA DE NOTIFICAÇÕES DO ADMIN
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text,
  title       text,
  message     text,
  entity_type text,
  entity_id   uuid,
  status      text not null default 'unread',
  priority    text not null default 'normal',
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

-- 3. PROTOCOLO AUTOMÁTICO — NDB-AAAA-000000
create sequence if not exists public.app_protocol_seq;

create or replace function public.set_application_protocol()
returns trigger language plpgsql as $$
begin
  if new.protocol is null or new.protocol = '' then
    new.protocol := 'NDB-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('public.app_protocol_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_app_protocol on public.applications;
create trigger trg_app_protocol before insert on public.applications
  for each row execute function public.set_application_protocol();

drop trigger if exists trg_app_updated on public.applications;
create trigger trg_app_updated before update on public.applications
  for each row execute function public.set_updated_at();

-- 4. NOTIFICA O ADMIN A CADA NOVO CADASTRO
create or replace function public.notify_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (type, title, message, entity_type, entity_id)
  values ('novo_cadastro',
          'Novo cadastro — ' || coalesce(new.profile_type,'perfil'),
          coalesce(new.full_name,'Sem nome') || ' (protocolo ' || new.protocol || ')',
          'application', new.id);
  return new;
end;
$$;
drop trigger if exists trg_notify_new_application on public.applications;
create trigger trg_notify_new_application after insert on public.applications
  for each row execute function public.notify_new_application();

-- 5. CONSULTA PÚBLICA DE STATUS POR PROTOCOLO (não expõe dados pessoais)
create or replace function public.application_status_by_protocol(p text)
returns table (protocol text, status text, profile_type text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.protocol, a.status, a.profile_type, a.updated_at
  from public.applications a
  where a.protocol = upper(trim(p))
  limit 1;
$$;
grant execute on function public.application_status_by_protocol(text) to anon, authenticated;

-- 6. ROW LEVEL SECURITY
alter table public.applications  enable row level security;
alter table public.notifications enable row level security;

drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists applications_admin_update on public.applications;
create policy applications_admin_update on public.applications
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists notifications_admin on public.notifications;
create policy notifications_admin on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Fim — Fase 1.
-- ============================================================
