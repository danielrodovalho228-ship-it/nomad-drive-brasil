-- ====================================================================
-- Nomade Drive Brasil — Fase 35a (HOTFIX)
-- Fix: triagem de ocorrência não notifica a contraparte
-- --------------------------------------------------------------------
-- BUG (encontrado pelo cowork em QA do Fluxo 6):
--   Quando Proteção triagem um caso, só o reporter recebe "Triagem
--   concluída". A cópia pra contraparte (proprietário se cliente abriu,
--   ou vice-versa) NÃO dispara.
--
-- CAUSA-RAIZ:
--   O JS em dashboard-protecao.html tenta ler `bookings` pra descobrir
--   client_id/owner_id e resolver quem é a "contraparte". Mas a sessão
--   da Proteção não tem permissão RLS pra ler `bookings` (Proteção não
--   é parte da reserva). A query volta vazia → counterpartyId = null →
--   sem e-mail.
--
-- FIX:
--   Função SECURITY DEFINER `get_case_counterparty(case_id)` que retorna
--   o user_id da contraparte. Roda com privilégios elevados (bypassa
--   RLS) sem expor a tabela bookings toda.
--
-- COMO RODAR:
--   Supabase SQL Editor → cola TUDO de uma vez → Run.
--
-- DEPENDÊNCIA:
--   Nenhuma — só usa tabelas existentes.
-- ====================================================================

create or replace function public.get_case_counterparty(case_id_in uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  -- Retorna:
  --   * owner_id se reporter for o client da reserva
  --   * client_id se reporter for o owner da reserva
  --   * NULL se reporter for outra pessoa (admin abriu? sem booking?)
  --     ou se a reserva não tiver booking_id vinculado
  select case
    when pc.reported_by = b.client_id then b.owner_id
    when pc.reported_by = b.owner_id then b.client_id
    else null
  end
  from public.protection_cases pc
  left join public.bookings b on b.id = pc.booking_id
  where pc.id = case_id_in
  limit 1;
$$;

-- Quem pode chamar essa função? Qualquer usuário autenticado.
-- (a função em si só revela 1 uuid — não é dado sensível)
grant execute on function public.get_case_counterparty(uuid) to authenticated;

comment on function public.get_case_counterparty(uuid) is
  'Fase 35a: resolve user_id da contraparte de uma ocorrência. SECURITY DEFINER pra Proteção poder chamar (não tem RLS em bookings). Usada pelo dashboard-protecao na triagem pra notificar reporter + contraparte.';

-- ---------- Verificação rápida ----------

do $$
declare
  test_id uuid;
  result_id uuid;
begin
  -- Pega um caso existente pra testar
  select id into test_id from public.protection_cases limit 1;
  if test_id is null then
    raise notice 'OK — função criada (sem casos pra testar)';
    return;
  end if;
  select public.get_case_counterparty(test_id) into result_id;
  raise notice 'OK — função get_case_counterparty(%) retornou: %', test_id, coalesce(result_id::text, '(null — admin abriu ou sem booking)');
end $$;

-- ====================================================================
-- ROLLBACK (se precisar reverter)
-- ====================================================================
-- drop function if exists public.get_case_counterparty(uuid);
-- ====================================================================
