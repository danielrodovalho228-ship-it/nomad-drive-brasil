-- ============================================================
-- Nomade Drive Brasil — Fase 18: eliminar de vez a duplicidade KYC
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente e reexecutável.
--
-- POR QUE A FASE 17 NÃO BASTOU:
--   A Fase 17 deduplicava por (user_id, document_type) exato. Se as
--   duas linhas de CNH tinham o tipo gravado de forma divergente
--   (ex.: 'cnh' e 'CNH', ou com espaços), elas caíam em grupos
--   diferentes e NÃO eram consolidadas — e o índice único também não
--   reclamava, pois os valores eram "distintos".
--
-- ESTA FASE:
--   1. DIAGNÓSTICO — lista os duplicados reais (rode e veja o retorno).
--   2. NORMALIZA document_type para a forma canônica (minúsculo, sem
--      espaços) — colapsa 'CNH'/'cnh'/' cnh ' em 'cnh'.
--   3. CONSOLIDA — mantém 1 linha por (user_id, document_type): a de
--      status 'em_analise' tem prioridade; senão, a mais recente.
--   4. ÍNDICE ÚNICO sobre o tipo já normalizado.
--   5. VERIFICAÇÃO — RAISE EXCEPTION se ainda houver duplicado (o
--      script NÃO conclui "com sucesso" se a duplicidade persistir).
--   6. RPC submit_user_document normaliza o tipo no servidor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. DIAGNÓSTICO (informativo — veja o resultado desta query)
-- ------------------------------------------------------------
select user_id,
       document_type            as tipo_atual,
       lower(trim(document_type)) as tipo_normalizado,
       count(*)                 as linhas
from public.user_documents
group by user_id, document_type
having count(*) > 0
order by user_id, tipo_normalizado;

-- ------------------------------------------------------------
-- 2. NORMALIZAR document_type para a forma canônica
-- ------------------------------------------------------------
update public.user_documents
   set document_type = lower(trim(document_type))
 where document_type is distinct from lower(trim(document_type));

-- ------------------------------------------------------------
-- 3. CONSOLIDAR duplicados — mantém 1 linha por (user_id, tipo)
-- ------------------------------------------------------------
with ranked as (
  select id,
         row_number() over (
           partition by user_id, document_type
           order by
             case when status = 'em_analise' then 0 else 1 end,
             coalesce(updated_at, created_at) desc,
             created_at desc,
             id desc
         ) as rn
  from public.user_documents
)
delete from public.user_documents d
using ranked r
where d.id = r.id and r.rn > 1;

-- ------------------------------------------------------------
-- 4. ÍNDICE ÚNICO (user_id, document_type)
-- ------------------------------------------------------------
drop index if exists public.uniq_user_documents_user_type;
create unique index uniq_user_documents_user_type
  on public.user_documents (user_id, document_type);

-- ------------------------------------------------------------
-- 5. VERIFICAÇÃO — falha se ainda houver duplicado ativo
-- ------------------------------------------------------------
do $$
declare
  v_dups integer;
begin
  select count(*) into v_dups from (
    select 1 from public.user_documents
    group by user_id, document_type
    having count(*) > 1
  ) x;
  if v_dups > 0 then
    raise exception 'FALHA: ainda existem % par(es) (user_id, document_type) duplicado(s).', v_dups;
  end if;
  raise notice 'OK — nenhum documento KYC duplicado. Unicidade garantida.';
end $$;

-- ------------------------------------------------------------
-- 6. RPC submit_user_document — normaliza o tipo no servidor
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
  v_uid  uuid := auth.uid();
  v_type text := lower(trim(coalesce(p_type, '')));
  v_row  public.user_documents;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;
  if v_type = '' or p_file_path is null or p_file_path = '' then
    raise exception 'Parâmetros do documento inválidos.';
  end if;

  insert into public.user_documents
    (user_id, document_type, file_path, file_name, status)
  values (v_uid, v_type, p_file_path, p_file_name, 'em_analise')
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
-- Fim — Fase 18 (unicidade KYC com normalização de tipo).
-- ============================================================
