-- ============================================================
-- Nomade Drive Brasil — Fase 22b: NF (notas fiscais)
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente.
--
-- OBJETIVO:
--   Permitir admin subir o PDF de NF emitida fora (eNotas, contador
--   etc.) e disponibilizar pro cliente baixar no painel.
--
--   O RECIBO da plataforma é gerado em tempo real (recibo.html?
--   payment_id=X) — não precisa de tabela.
--
-- O QUE FAZ:
--   1. Tabela public.invoices (NF manual: id, payment_id, booking_id,
--      file_path, file_name, número, emitido_em, emitido_por).
--   2. Bucket storage "invoices" (privado, 10MB, só PDF).
--   3. RLS: cliente vê NFs das próprias reservas; super-admin vê tudo
--      e é o único que insere/deleta.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA invoices
-- ------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  number text,
  issued_at timestamptz not null default now(),
  issued_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_booking on public.invoices(booking_id);
create index if not exists idx_invoices_payment on public.invoices(payment_id);

-- ------------------------------------------------------------
-- 2. RLS
-- ------------------------------------------------------------
alter table public.invoices enable row level security;

drop policy if exists "invoices_select_client" on public.invoices;
create policy "invoices_select_client" on public.invoices
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = invoices.booking_id
        and b.client_id = auth.uid()
    )
  );

drop policy if exists "invoices_select_admin" on public.invoices;
create policy "invoices_select_admin" on public.invoices
  for select using (
    coalesce(auth.jwt() ->> 'email', '') = 'dtrodovalho40@gmail.com'
  );

drop policy if exists "invoices_insert_admin" on public.invoices;
create policy "invoices_insert_admin" on public.invoices
  for insert with check (
    coalesce(auth.jwt() ->> 'email', '') = 'dtrodovalho40@gmail.com'
  );

drop policy if exists "invoices_delete_admin" on public.invoices;
create policy "invoices_delete_admin" on public.invoices
  for delete using (
    coalesce(auth.jwt() ->> 'email', '') = 'dtrodovalho40@gmail.com'
  );

-- ------------------------------------------------------------
-- 3. BUCKET storage "invoices"
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoices', 'invoices', false,
  10485760, -- 10 MB
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies do storage: estrutura de path é "invoices/<client_id>/<file>"
-- Cliente vê o que está na própria pasta; admin vê tudo.
drop policy if exists "invoices_storage_select_client" on storage.objects;
create policy "invoices_storage_select_client" on storage.objects
  for select using (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "invoices_storage_select_admin" on storage.objects;
create policy "invoices_storage_select_admin" on storage.objects
  for select using (
    bucket_id = 'invoices'
    and coalesce(auth.jwt() ->> 'email', '') = 'dtrodovalho40@gmail.com'
  );

drop policy if exists "invoices_storage_insert_admin" on storage.objects;
create policy "invoices_storage_insert_admin" on storage.objects
  for insert with check (
    bucket_id = 'invoices'
    and coalesce(auth.jwt() ->> 'email', '') = 'dtrodovalho40@gmail.com'
  );

drop policy if exists "invoices_storage_delete_admin" on storage.objects;
create policy "invoices_storage_delete_admin" on storage.objects
  for delete using (
    bucket_id = 'invoices'
    and coalesce(auth.jwt() ->> 'email', '') = 'dtrodovalho40@gmail.com'
  );

-- ------------------------------------------------------------
-- 4. VERIFICAÇÃO
-- ------------------------------------------------------------
do $$
declare
  v_bucket integer;
  v_table  integer;
begin
  select count(*) into v_table
    from information_schema.tables
    where table_schema='public' and table_name='invoices';
  if v_table = 0 then
    raise exception 'FALHA: tabela public.invoices não foi criada.';
  end if;
  select count(*) into v_bucket
    from storage.buckets where id='invoices';
  if v_bucket = 0 then
    raise exception 'FALHA: bucket storage invoices não foi criado.';
  end if;
  raise notice 'OK — Fase 22b (NF) instalada. Tabela invoices + bucket invoices prontos.';
end $$;

-- ============================================================
-- Fim — Fase 22b (NF: tabela + bucket + RLS).
-- ============================================================
