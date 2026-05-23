-- ====================================================================
-- Nomade Drive Brasil — QA: troca e-mails de teste por aliases reais
-- --------------------------------------------------------------------
-- COMO USAR:
--   1. Crie os 5 aliases no Hostinger (Emails → Email Alias):
--      qa-cliente@nomadedrive.com.br        → contato@nomadedrive.com.br
--      qa-proprietario@nomadedrive.com.br   → contato@nomadedrive.com.br
--      qa-parceiro@nomadedrive.com.br       → contato@nomadedrive.com.br
--      qa-oficina@nomadedrive.com.br        → contato@nomadedrive.com.br
--      qa-protecao@nomadedrive.com.br       → contato@nomadedrive.com.br
--   2. Cole este arquivo no SQL Editor do Supabase e Run.
--   3. Verifica o resultado no final.
--
-- O QUE FAZ:
--   - Substitui o prefixo "teste-" por "qa-" e força domínio
--     nomadedrive.com.br nos 5 usuários teste em auth.users
--   - Triggers da Fase 24 sincronizam profiles.email automaticamente
--   - Atualiza applications.email (não tem trigger)
--   - Confirma o e-mail automaticamente (sem precisar verificação)
--
-- IDEMPOTENTE: rodar 2x não causa problema (a 2ª passa não encontra
-- registros com prefixo "teste-" e não faz nada).
-- ====================================================================

-- 1. auth.users: troca prefixo teste- por qa- e força domínio
do $$
declare
  v_row record;
  v_new_email text;
  v_count int := 0;
begin
  for v_row in
    select id, email from auth.users
     where email ~ '^teste-(cliente|proprietario|parceiro|oficina|protecao)@'
  loop
    -- pega o "username" sem o teste- e monta com qa- + domínio fixo
    v_new_email :=
      'qa-' ||
      substring(v_row.email from 'teste-([a-z]+)@') ||
      '@nomadedrive.com.br';

    update auth.users
       set email              = v_new_email,
           email_confirmed_at = coalesce(email_confirmed_at, now())
     where id = v_row.id;

    raise notice 'Atualizado: % → %', v_row.email, v_new_email;
    v_count := v_count + 1;
  end loop;
  raise notice '----- Total: % usuários teste atualizados.', v_count;
end $$;

-- 2. applications.email: mesma transformação
update public.applications
   set email = 'qa-' ||
               substring(email from 'teste-([a-z]+)@') ||
               '@nomadedrive.com.br'
 where email ~ '^teste-(cliente|proprietario|parceiro|oficina|protecao)@';

-- 3. Confere o resultado
select 'auth.users' as origem, email, email_confirmed_at is not null as confirmado
  from auth.users
 where email like 'qa-%@nomadedrive.com.br'
 order by email
union all
select 'profiles' as origem, email, null as confirmado
  from public.profiles
 where email like 'qa-%@nomadedrive.com.br'
 order by email;

-- Mostra applications recentes que mudaram
select protocol, email, status
  from public.applications
 where email like 'qa-%@nomadedrive.com.br'
 order by created_at desc
 limit 10;

-- ====================================================================
-- Fim — QA: aliases reais de teste
-- ====================================================================
