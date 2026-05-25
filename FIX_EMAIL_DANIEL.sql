-- ====================================================================
-- 🔓 FIX RAPIDO: Confirma manualmente o email do Daniel
-- --------------------------------------------------------------------
-- Como rodar (3 cliques):
--   1. Abre https://supabase.com → seu projeto
--   2. Menu esquerdo → "SQL Editor" (icone </>)
--   3. Cola TUDO isso na area de codigo → clica "Run" (canto sup direito)
--
-- Vai aparecer "Success. No rows returned" + as 2 linhas de NOTICE
-- abaixo dizendo o que aconteceu.
-- ====================================================================

do $$
declare
  v_user_id uuid;
  v_already_confirmed boolean;
begin
  -- 1) Busca o usuario
  select id, email_confirmed_at is not null
  into v_user_id, v_already_confirmed
  from auth.users
  where lower(email) = lower('danieltomazrodovalho@gmail.com')
  limit 1;

  -- 2) Casos:
  if v_user_id is null then
    raise notice '❌ Usuario "danieltomazrodovalho@gmail.com" NAO existe em auth.users.';
    raise notice '   Isso significa que o cadastro pelo site nao chegou a criar o usuario.';
    raise notice '   Possiveis causas:';
    raise notice '   - O signup deu erro silencioso (Supabase Auth retornou erro mas UI nao mostrou)';
    raise notice '   - Voce cadastrou outro email — confira a tela e me passe o exato';
    raise notice '   - O projeto Supabase apontado em supabase-config.js nao e o mesmo que voce checou';
    return;
  end if;

  if v_already_confirmed then
    raise notice '✅ Email "danieltomazrodovalho@gmail.com" JA estava confirmado.';
    raise notice '   User ID: %', v_user_id;
    raise notice '   Pode fazer login normalmente em /login.html com a senha que voce criou.';
    return;
  end if;

  -- 3) Confirma manualmente
  update auth.users
  set email_confirmed_at = now(),
      confirmed_at = now()       -- alias deprecated, mas garante compatibilidade
  where id = v_user_id;

  raise notice '✅ Email "danieltomazrodovalho@gmail.com" CONFIRMADO manualmente.';
  raise notice '   User ID: %', v_user_id;
  raise notice '   Agora vai em https://nomadedrive.com.br/login.html';
  raise notice '   e faz login com a senha que voce usou no cadastro.';
end $$;


-- ====================================================================
-- BONUS: funcao utilitaria pra confirmar QUALQUER email no futuro
-- (so admin chama via SQL Editor — nao expoe pra cliente)
-- ====================================================================
create or replace function public.admin_confirm_email(p_email text)
returns text
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmed_at       = coalesce(confirmed_at, now())
  where lower(email) = lower(p_email)
  returning id into v_id;

  if v_id is null then
    return 'NAO ENCONTRADO: ' || p_email;
  end if;
  return 'OK confirmado: ' || p_email || ' (id ' || v_id::text || ')';
end $$;

revoke all on function public.admin_confirm_email(text) from public, authenticated, anon;
-- ↑ NINGUEM consegue chamar do client. So voce via SQL Editor (service_role).

-- Pra confirmar outro email manualmente no futuro, e so rodar:
--   select admin_confirm_email('email@exemplo.com');


-- ====================================================================
-- VERIFICACAO FINAL — mostra status atual do seu usuario
-- ====================================================================
select
  id,
  email,
  case when email_confirmed_at is null
    then '❌ NAO confirmado'
    else '✅ confirmado em ' || to_char(email_confirmed_at, 'DD/MM HH24:MI')
  end as status_confirmacao,
  to_char(created_at, 'DD/MM/YYYY HH24:MI') as criado_em,
  raw_user_meta_data->>'initial_role' as papel_inicial,
  raw_user_meta_data->>'full_name'    as nome
from auth.users
where lower(email) = lower('danieltomazrodovalho@gmail.com');
