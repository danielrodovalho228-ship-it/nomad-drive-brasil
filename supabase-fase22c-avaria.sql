-- ====================================================================
-- Nomade Drive Brasil — Fase 22c: Fluxo profissional de avaria (v1)
-- --------------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script IDEMPOTENTE.
--
-- OBJETIVO:
--   Estruturar avarias detectadas no check-out pelo proprietário,
--   permitir revisão pela equipe de Proteção e captura parcial da
--   caução autorizada (sem cobrar o cliente além do necessário).
--
-- O QUE CRIA:
--   1. damage_rules — catálogo de tipos de avaria com faixas de valor
--      (já vem pré-populado com os 6 tipos do roadmap).
--   2. damages — cada avaria reportada no check-out (status + fotos).
--   3. bucket storage "damages" — fotos das avarias (privado, 10MB).
--   4. RLS:
--      - Owner da reserva insere (no check-out)
--      - Proteção e admin revisam
--      - Cliente da reserva vê e pode contestar
-- ====================================================================

-- ------------------------------------------------------------
-- 1. CATÁLOGO DE TIPOS DE AVARIA (damage_rules)
-- ------------------------------------------------------------
create table if not exists public.damage_rules (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,         -- 'risco', 'amassado', etc.
  label           text not null,                -- "Risco na lataria"
  description     text,                         -- explicação curta
  amount_min      numeric(12,2) not null default 0,
  amount_max      numeric(12,2) not null default 0,
  amount_default  numeric(12,2) not null default 0,
  requires_photo  boolean not null default true,
  active          boolean not null default true,
  sort_order      int not null default 100,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Seed inicial — 6 tipos do roadmap original (idempotente via upsert)
insert into public.damage_rules
  (code, label, description, amount_min, amount_max, amount_default, sort_order)
values
  ('risco',            'Risco na lataria',
   'Arranhão superficial ou risco profundo na pintura.',
   150,  800,  300, 10),
  ('amassado',         'Amassado / batida leve',
   'Deformação na lataria sem dano estrutural.',
   400, 2500,  900, 20),
  ('vidro',            'Vidro / para-brisa',
   'Trinca, lasca ou quebra de qualquer vidro do veículo.',
   300, 1800,  700, 30),
  ('mecanico',         'Avaria mecânica',
   'Problema mecânico decorrente do uso indevido (motor, câmbio, freio).',
   500, 5000, 1200, 40),
  ('sujeira_pesada',   'Sujeira ou higienização pesada',
   'Sujeira além do uso normal — manchas, odores, fluidos derramados.',
   100,  600,  250, 50),
  ('falta_combustivel','Falta de combustível',
   'Devolução com combustível abaixo do nível combinado.',
    50,  300,  150, 60),
  ('outro',            'Outro tipo de avaria',
   'Use quando nenhum dos tipos acima se encaixa — descreva no campo livre.',
     0, 5000,    0, 99)
on conflict (code) do update set
  label           = excluded.label,
  description     = excluded.description,
  amount_default  = excluded.amount_default,
  -- preserva amount_min/max se foram editados manualmente pelo admin
  updated_at      = now();

-- ------------------------------------------------------------
-- 2. TABELA damages — cada avaria reportada
-- ------------------------------------------------------------
create table if not exists public.damages (
  id                  uuid primary key default gen_random_uuid(),
  inspection_id       uuid not null references public.rental_inspections(id) on delete cascade,
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  rule_code           text not null references public.damage_rules(code),
  description         text,                                  -- detalhe livre
  evidence_urls       jsonb not null default '[]'::jsonb,    -- ["damages/<booking>/<file>", ...]
  -- Valores
  suggested_amount    numeric(12,2),                         -- sugerido pelo sistema
  final_amount        numeric(12,2),                         -- decidido pela Proteção
  -- Fluxo
  status              text not null default 'pendente_revisao'
                      check (status in (
                        'pendente_revisao',     -- owner reportou, aguarda Proteção
                        'aprovado_captura',     -- Proteção aprovou — captura parcial OK
                        'aprovado_sem_captura', -- Proteção decidiu liberar (sem cobrança)
                        'em_contestacao',       -- cliente contestou
                        'resolvido'             -- captura feita e e-mail enviado
                      )),
  -- Captura na Stripe
  captured_payment_intent_id text,                          -- se houve captura parcial
  captured_at         timestamptz,
  -- Revisão
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  review_notes        text,
  -- Contestação do cliente
  client_dispute      text,
  client_disputed_at  timestamptz,
  -- Auditoria
  created_by          uuid references auth.users(id),       -- owner que reportou
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists damages_booking_idx on public.damages(booking_id);
create index if not exists damages_inspection_idx on public.damages(inspection_id);
create index if not exists damages_status_idx on public.damages(status);

-- trigger pra manter updated_at sem precisar setar à mão
create or replace function public.touch_damages_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_damages_touch on public.damages;
create trigger trg_damages_touch
  before update on public.damages
  for each row execute function public.touch_damages_updated_at();

-- ------------------------------------------------------------
-- 3. RLS — damages
-- ------------------------------------------------------------
alter table public.damage_rules enable row level security;
alter table public.damages      enable row level security;

-- damage_rules: leitura pública (catálogo); escrita só admin
drop policy if exists damage_rules_select_all on public.damage_rules;
create policy damage_rules_select_all on public.damage_rules
  for select using (true);

drop policy if exists damage_rules_admin_write on public.damage_rules;
create policy damage_rules_admin_write on public.damage_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- damages SELECT: cliente, owner, proteção, admin
drop policy if exists damages_select on public.damages;
create policy damages_select on public.damages
  for select using (
    public.is_admin()
    or public.is_protection_partner()
    or public.booking_is_client(booking_id)
    or public.booking_is_owner(booking_id)
  );

-- damages INSERT: owner da reserva (no check-out) ou admin
drop policy if exists damages_insert_owner on public.damages;
create policy damages_insert_owner on public.damages
  for insert with check (
    public.is_admin()
    or public.booking_is_owner(booking_id)
  );

-- damages UPDATE — separado em dois cenários:
--   (a) Proteção/admin revisa (muda status, final_amount, review_notes)
--   (b) Cliente contesta (preenche client_dispute, muda status p/ em_contestacao)
drop policy if exists damages_update_review on public.damages;
create policy damages_update_review on public.damages
  for update using (
    public.is_admin()
    or public.is_protection_partner()
    or public.booking_is_client(booking_id)
  ) with check (
    public.is_admin()
    or public.is_protection_partner()
    or public.booking_is_client(booking_id)
  );

-- DELETE: só admin (auditoria preservada)
drop policy if exists damages_delete_admin on public.damages;
create policy damages_delete_admin on public.damages
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 4. BUCKET storage "damages"
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'damages', 'damages', false,
  10485760, -- 10 MB por arquivo
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path layout: damages/<booking_id>/<inspection_id>/<file>
-- Quem pode ver: cliente da reserva, owner da reserva, proteção, admin.
-- Quem pode inserir: owner da reserva (no check-out) ou admin.
drop policy if exists damages_storage_select on storage.objects;
create policy damages_storage_select on storage.objects
  for select using (
    bucket_id = 'damages'
    and (
      public.is_admin()
      or public.is_protection_partner()
      or exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and (b.client_id = auth.uid() or b.owner_id = auth.uid())
      )
    )
  );

drop policy if exists damages_storage_insert on storage.objects;
create policy damages_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'damages'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and b.owner_id = auth.uid()
      )
    )
  );

drop policy if exists damages_storage_delete_admin on storage.objects;
create policy damages_storage_delete_admin on storage.objects
  for delete using (
    bucket_id = 'damages'
    and public.is_admin()
  );

-- ------------------------------------------------------------
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ------------------------------------------------------------
comment on table public.damage_rules is
  'Catálogo de tipos de avaria com faixas de valor sugerido. Editável pelo admin.';
comment on table public.damages is
  'Avarias reportadas pelo proprietário no check-out. Revisadas pela Proteção e ligadas à captura parcial da caução na Stripe.';
comment on column public.damages.status is
  'pendente_revisao → aprovado_captura | aprovado_sem_captura | em_contestacao → resolvido';
comment on column public.damages.captured_payment_intent_id is
  'PaymentIntent da caução que sofreu captura parcial via stripe.paymentIntents.capture({ amount_to_capture }).';

-- ------------------------------------------------------------
-- 6. VERIFICAÇÃO
-- ------------------------------------------------------------
do $$
declare
  v_rules    int;
  v_table    int;
  v_bucket   int;
  v_seedcnt  int;
begin
  select count(*) into v_rules
    from information_schema.tables
    where table_schema='public' and table_name='damage_rules';
  if v_rules = 0 then
    raise exception 'FALHA: tabela public.damage_rules não foi criada.';
  end if;
  select count(*) into v_table
    from information_schema.tables
    where table_schema='public' and table_name='damages';
  if v_table = 0 then
    raise exception 'FALHA: tabela public.damages não foi criada.';
  end if;
  select count(*) into v_bucket
    from storage.buckets where id='damages';
  if v_bucket = 0 then
    raise exception 'FALHA: bucket storage damages não foi criado.';
  end if;
  select count(*) into v_seedcnt from public.damage_rules where active = true;
  raise notice 'OK — Fase 22c.1 instalada. damage_rules: % regras ativas. Tabela damages + bucket damages prontos.',
    v_seedcnt;
end $$;

-- ====================================================================
-- Fim — Fase 22c.1 (schema + storage da avaria)
-- Próximos: 22c.2 (form check-out) → 22c.3 (UI Proteção) →
--           22c.4 (Edge Function captura) → 22c.5 (contestação cliente)
-- ====================================================================
