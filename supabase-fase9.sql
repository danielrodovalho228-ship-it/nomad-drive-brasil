-- ============================================================
-- Nomade Drive Brasil — Fase 9 (KYC): documentos do usuário
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente: pode ser executado novamente com segurança.
--
-- O QUE ESTE SCRIPT FAZ:
--   - Cria o bucket PRIVADO "kyc-docs" no Storage (imagem ou PDF, até 8 MB).
--     Você não precisa criar o bucket à mão — este script já cria.
--   - Cria a tabela user_documents (uma linha por documento enviado).
--   - Aplica RLS: cada usuário só vê/gerencia os próprios documentos;
--     o admin vê todos e é o único que aprova ou recusa.
--   - Aplica políticas de Storage: cada usuário só acessa a própria pasta
--     (<user_id>/...) dentro do bucket; o admin acessa todas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. BUCKET DE STORAGE (privado)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-docs', 'kyc-docs', false, 8388608,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. TABELA user_documents
-- ------------------------------------------------------------
create table if not exists public.user_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  document_type text not null,   -- cnh, identidade, comprovante_residencia, comprovante_renda
  file_path     text not null,   -- caminho dentro do bucket kyc-docs
  file_name     text,
  status        entity_status not null default 'em_analise',
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  review_notes  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_user_documents_user on public.user_documents(user_id);

-- updated_at automático (reusa a função public.set_updated_at do esquema base)
drop trigger if exists trg_user_documents_updated on public.user_documents;
create trigger trg_user_documents_updated
  before update on public.user_documents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. RLS — user_documents
-- ------------------------------------------------------------
alter table public.user_documents enable row level security;

-- o usuário vê os próprios documentos; o admin vê todos
drop policy if exists user_documents_select on public.user_documents;
create policy user_documents_select on public.user_documents
  for select using (user_id = auth.uid() or public.is_admin());

-- o usuário cria documentos apenas para si mesmo
drop policy if exists user_documents_insert on public.user_documents;
create policy user_documents_insert on public.user_documents
  for insert with check (user_id = auth.uid());

-- o usuário pode remover os próprios documentos; o admin também
drop policy if exists user_documents_delete on public.user_documents;
create policy user_documents_delete on public.user_documents
  for delete using (user_id = auth.uid() or public.is_admin());

-- apenas o admin aprova ou recusa (update de status/parecer)
drop policy if exists user_documents_admin_update on public.user_documents;
create policy user_documents_admin_update on public.user_documents
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 4. POLÍTICAS DE STORAGE — bucket kyc-docs
-- ------------------------------------------------------------
-- Convenção de caminho: <user_id>/<arquivo>. A primeira pasta do caminho
-- precisa ser o id do usuário — assim cada um só acessa a própria área.
drop policy if exists kyc_docs_insert on storage.objects;
create policy kyc_docs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kyc-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists kyc_docs_select on storage.objects;
create policy kyc_docs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kyc-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists kyc_docs_delete on storage.objects;
create policy kyc_docs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kyc-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ============================================================
-- Fim — Fase 9 (KYC: documentos do usuário).
-- ============================================================
