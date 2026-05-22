-- ============================================================
-- Nomade Drive Brasil — Fase 17: unicidade de documento KYC
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente.
--
-- O PROBLEMA:
--   O Admin/KYC passou a exibir DUAS linhas de CNH para o mesmo
--   usuário. Não havia constraint única em (user_id, document_type),
--   então uma tentativa antiga de substituição deixou uma linha
--   duplicada, e o RPC não tinha como garantir unicidade.
--
-- A CORREÇÃO (3 passos, nesta ordem):
--   1. Consolida duplicados históricos — mantém só a linha MAIS
--      RECENTE de cada (user_id, document_type).
--   2. Cria índice único (user_id, document_type) — impede duplicidade
--      futura no banco.
--   3. Reescreve submit_user_document com INSERT ... ON CONFLICT DO
--      UPDATE — criação/substituição atômica, sem duplicar.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONSOLIDAR DUPLICADOS HISTÓRICOS
-- ------------------------------------------------------------
-- Mantém, por (user_id, document_type), a linha de updated_at mais
-- recente (a substituição mais nova prevalece). Remove as demais.
delete from public.user_documents ud
where ud.id not in (
  select distinct on (user_id, document_type) id
  from public.user_documents
  order by user_id, document_type, updated_at desc, created_at desc
);

-- ------------------------------------------------------------
-- 2. ÍNDICE ÚNICO — no máximo 1 documento por usuário e tipo
-- ------------------------------------------------------------
create unique index if not exists uniq_user_documents_user_type
  on public.user_documents (user_id, document_type);

-- ------------------------------------------------------------
-- 3. RPC submit_user_document — criar OU substituir (upsert atômico)
-- ------------------------------------------------------------
create or replace function public.submit_user_document(
  p_type      text,
  p_file_path text,
  p_file_name text
)
returns public.user_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_documents;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;
  if p_type is null or p_type = '' or p_file_path is null or p_file_path = '' then
    raise exception 'Parâmetros do documento inválidos.';
  end if;

  insert into public.user_documents
    (user_id, document_type, file_path, file_name, status)
  values (v_uid, p_type, p_file_path, p_file_name, 'em_analise')
  on conflict (user_id, document_type) do update
    set file_path    = excluded.file_path,
        file_name    = excluded.file_name,
        status       = 'em_analise',
        reviewed_by  = null,
        reviewed_at  = null,
        review_notes = null,
        updated_at   = now()
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_user_document(text, text, text) to authenticated;

-- ============================================================
-- Fim — Fase 17 (unicidade de documento KYC).
-- ============================================================
