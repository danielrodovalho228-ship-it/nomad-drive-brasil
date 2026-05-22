-- ============================================================
-- Nomade Drive Brasil — Fase 16: envio/substituição de documentos KYC
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente.
--
-- O PROBLEMA:
--   Substituir um documento já enviado falhava — o front-end inseria
--   uma 2ª linha do mesmo tipo e só depois apagava a antiga.
--
-- A CORREÇÃO:
--   A função submit_user_document() faz "criar OU substituir" de forma
--   segura: se já existe documento daquele tipo para o usuário, ATUALIZA
--   a linha no lugar; senão, cria. Sempre volta para 'em_analise' e zera
--   a revisão (reviewed_by/at/notes). É SECURITY DEFINER e só mexe nos
--   documentos do próprio usuário (auth.uid()) — o cliente não consegue
--   se auto-aprovar, pois o status é forçado pelo servidor.
-- ============================================================

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

  -- substituição: atualiza no lugar o documento existente do mesmo tipo
  update public.user_documents
     set file_path    = p_file_path,
         file_name    = p_file_name,
         status       = 'em_analise',
         reviewed_by  = null,
         reviewed_at  = null,
         review_notes = null,
         updated_at   = now()
   where user_id = v_uid and document_type = p_type;

  if found then
    select * into v_row from public.user_documents
     where user_id = v_uid and document_type = p_type
     order by updated_at desc
     limit 1;
  else
    -- documento novo
    insert into public.user_documents
      (user_id, document_type, file_path, file_name, status)
    values (v_uid, p_type, p_file_path, p_file_name, 'em_analise')
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.submit_user_document(text, text, text) to authenticated;

-- ============================================================
-- Fim — Fase 16 (envio/substituição de documentos KYC).
-- ============================================================
