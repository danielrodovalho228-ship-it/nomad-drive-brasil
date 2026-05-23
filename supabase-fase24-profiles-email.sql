-- ====================================================================
-- Nomade Drive Brasil — Fase 24: profiles.email espelhado de auth.users
-- --------------------------------------------------------------------
-- Permite o front (admin.html) ler o e-mail do cliente direto da
-- tabela profiles, sem precisar de auth.admin.getUserById (que falha
-- silenciosamente em alguns ambientes Deno).
--
-- Necessário para os e-mails da Fase 25 (notificações: KYC aprovado,
-- perfil aprovado, reserva confirmada, comissão paga, etc.)
--
-- Idempotente.
-- ====================================================================

-- 1. Coluna nova em profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'email'
  ) then
    alter table public.profiles add column email text;
  end if;
end $$;

-- 2. Backfill: preenche email pra todos os profiles existentes
update public.profiles p
   set email = u.email
  from auth.users u
 where p.id = u.id
   and p.email is null
   and u.email is not null;

-- 3. Trigger: novo usuário → email gravado no profile
--    (Reaproveita o handle_new_user existente, só estende.)
create or replace function public.sync_profile_email_on_user_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set email = new.email
   where id = new.id and (email is null or email <> new.email);
  return new;
end $$;

drop trigger if exists trg_sync_profile_email_insert on auth.users;
create trigger trg_sync_profile_email_insert
  after insert on auth.users
  for each row execute function public.sync_profile_email_on_user_insert();

-- 4. Trigger: usuário troca o email → profile fica sincronizado
create or replace function public.sync_profile_email_on_user_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = new.email
     where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_profile_email_update on auth.users;
create trigger trg_sync_profile_email_update
  after update of email on auth.users
  for each row execute function public.sync_profile_email_on_user_update();

-- 5. Índice para lookup rápido (admin filtra/busca por email às vezes)
create index if not exists idx_profiles_email on public.profiles(email);

-- 6. Comentário
comment on column public.profiles.email is
  'E-mail do usuário. Espelhado automaticamente de auth.users.email via triggers. Permite consulta direta pelo front quando autorizado por RLS.';

-- 7. Verificação
do $$
declare
  v_col int;
  v_bf  int;
begin
  select count(*) into v_col
    from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='email';
  if v_col = 0 then
    raise exception 'FALHA: profiles.email não foi criada.';
  end if;
  select count(*) into v_bf from public.profiles where email is not null;
  raise notice 'OK — Fase 24 instalada. profiles.email criada e % linha(s) já preenchidas.', v_bf;
end $$;

-- ====================================================================
-- Fim — Fase 24 (profiles.email espelhado)
-- ====================================================================
