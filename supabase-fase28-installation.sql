-- ====================================================================
-- Nomade Drive Brasil — Fase 28: Marketplace de Instalação de Rastreador
-- --------------------------------------------------------------------
-- Suporta o fluxo:
--   1. Cliente fecha reserva → status "aguardando_rastreador"
--   2. Cliente vê lista de oficinas parceiras, escolhe, paga via Stripe
--   3. Oficina aceita ordem, instala, sobe fotos + NF
--   4. Admin valida → libera reserva
--   5. Split Stripe Connect: 10% plataforma, 90% oficina
--
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query
--   2. Cole este arquivo inteiro e clique em Run
-- Idempotente — pode rodar mais de uma vez.
-- ====================================================================

-- ------------------------------------------------------------
-- 1. TABELA installation_orders
-- ------------------------------------------------------------
-- Cada veículo que entra na frota Nomade Drive precisa de UMA ordem
-- de instalação concluída ANTES de poder ser locado.
-- Estados:
--   pending_payment      — cliente escolheu oficina, aguarda Stripe paid
--   aguardando_instalacao — pago, oficina precisa aceitar/agendar
--   em_instalacao        — oficina aceitou, instalação em andamento
--   aguardando_validacao — oficina marcou concluído, subiu evidências, admin precisa aprovar
--   concluida            — admin aprovou, rastreador OK → reserva liberada
--   rejeitada            — admin rejeitou (evidências insuficientes), volta pra oficina
--   cancelada            — cliente desistiu antes de pagar
create table if not exists public.installation_orders (
  id                          uuid primary key default gen_random_uuid(),
  booking_id                  uuid references public.bookings(id) on delete cascade,
  vehicle_id                  uuid not null references public.vehicles(id) on delete cascade,
  client_id                   uuid not null references auth.users(id) on delete cascade,
  workshop_id                 uuid not null references public.workshops(id),
  amount                      numeric(12,2) not null,
  status                      text not null default 'pending_payment'
                              check (status in (
                                'pending_payment','aguardando_instalacao','em_instalacao',
                                'aguardando_validacao','concluida','rejeitada','cancelada'
                              )),
  -- Stripe
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  stripe_transfer_id          text,           -- ID da Stripe transfer pra oficina
  -- Evidências (preenchidas pela oficina)
  evidence_photos             jsonb not null default '[]'::jsonb,  -- paths no storage
  evidence_invoice_path       text,           -- NF (PDF)
  installer_notes             text,
  -- Validação (preenchida pelo admin)
  validated_by                uuid references auth.users(id),
  validated_at                timestamptz,
  rejection_reason            text,
  -- Auditoria de datas-chave
  accepted_at                 timestamptz,    -- oficina aceitou
  completed_at                timestamptz,    -- oficina marcou concluído
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists installation_orders_booking_idx  on public.installation_orders(booking_id);
create index if not exists installation_orders_vehicle_idx  on public.installation_orders(vehicle_id);
create index if not exists installation_orders_client_idx   on public.installation_orders(client_id);
create index if not exists installation_orders_workshop_idx on public.installation_orders(workshop_id);
create index if not exists installation_orders_status_idx   on public.installation_orders(status);

-- Trigger pra updated_at
create or replace function public.touch_installation_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_installation_orders_touch on public.installation_orders;
create trigger trg_installation_orders_touch
  before update on public.installation_orders
  for each row execute function public.touch_installation_orders_updated_at();

-- ------------------------------------------------------------
-- 2. COLUNAS NOVAS EM workshops
-- ------------------------------------------------------------
-- Pra cliente filtrar oficinas que fazem instalação de rastreador
-- e ver o preço sugerido.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='workshops'
      and column_name='offers_tracker_install'
  ) then
    alter table public.workshops
      add column offers_tracker_install boolean not null default false,
      add column tracker_install_price  numeric(12,2),
      add column tracker_install_notes  text;
  end if;
end $$;

comment on column public.workshops.offers_tracker_install is
  'Oficina oferece serviço de instalação de rastreador GPS (Fase 28)';
comment on column public.workshops.tracker_install_price is
  'Preço cobrado pela instalação do rastreador (R$). Definido pela oficina, validado pelo admin.';

-- ------------------------------------------------------------
-- 3. COLUNA NOVA EM vehicles
-- ------------------------------------------------------------
-- Marca se o veículo já tem rastreador instalado (gate de locação).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='vehicles'
      and column_name='tracker_installed'
  ) then
    alter table public.vehicles
      add column tracker_installed       boolean not null default false,
      add column tracker_installed_at    timestamptz,
      add column tracker_installation_id uuid references public.installation_orders(id);
  end if;
end $$;

comment on column public.vehicles.tracker_installed is
  'Veículo tem rastreador GPS instalado e validado (Fase 28). Gate de locação.';

-- ------------------------------------------------------------
-- 4. RLS
-- ------------------------------------------------------------
alter table public.installation_orders enable row level security;

-- SELECT: cliente da ordem, oficina dona, admin, proteção
drop policy if exists installation_orders_select on public.installation_orders;
create policy installation_orders_select on public.installation_orders
  for select using (
    client_id = auth.uid()
    or workshop_id in (select id from public.workshops where user_id = auth.uid())
    or public.is_admin()
    or public.is_protection_partner()
  );

-- INSERT: só admin cria (no fluxo: cliente seleciona, sistema cria via Edge Function admin)
drop policy if exists installation_orders_insert_admin on public.installation_orders;
create policy installation_orders_insert_admin on public.installation_orders
  for insert with check (public.is_admin());

-- UPDATE: oficina (próprias ordens) ou admin
drop policy if exists installation_orders_update on public.installation_orders;
create policy installation_orders_update on public.installation_orders
  for update using (
    public.is_admin()
    or workshop_id in (select id from public.workshops where user_id = auth.uid())
  ) with check (
    public.is_admin()
    or workshop_id in (select id from public.workshops where user_id = auth.uid())
  );

-- DELETE: só admin
drop policy if exists installation_orders_delete_admin on public.installation_orders;
create policy installation_orders_delete_admin on public.installation_orders
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 5. BUCKET STORAGE "installations"
-- ------------------------------------------------------------
-- Path layout: installations/<order_id>/photos/<file>
--              installations/<order_id>/invoice/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'installations', 'installations', false,
  10485760, -- 10 MB
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update set
  public          = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- SELECT: quem pode ler arquivos? cliente da ordem, oficina dona, admin, proteção
drop policy if exists installations_storage_select on storage.objects;
create policy installations_storage_select on storage.objects
  for select using (
    bucket_id = 'installations'
    and (
      public.is_admin()
      or public.is_protection_partner()
      or exists (
        select 1 from public.installation_orders io
        where io.id::text = (storage.foldername(name))[1]
          and (
            io.client_id = auth.uid()
            or io.workshop_id in (select id from public.workshops where user_id = auth.uid())
          )
      )
    )
  );

-- INSERT: oficina dona ou admin
drop policy if exists installations_storage_insert on storage.objects;
create policy installations_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'installations'
    and (
      public.is_admin()
      or exists (
        select 1 from public.installation_orders io
        where io.id::text = (storage.foldername(name))[1]
          and io.workshop_id in (select id from public.workshops where user_id = auth.uid())
      )
    )
  );

drop policy if exists installations_storage_delete_admin on storage.objects;
create policy installations_storage_delete_admin on storage.objects
  for delete using (
    bucket_id = 'installations'
    and public.is_admin()
  );

-- ------------------------------------------------------------
-- 6. AUDIT TRAIL (action novo)
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='audit_actions'
  ) then
    insert into public.audit_actions (action, label, severity)
    values
      ('installation_order_created',  'Ordem de instalação criada',     'media'),
      ('installation_order_paid',     'Ordem de instalação paga',       'alta'),
      ('installation_order_accepted', 'Oficina aceitou instalação',     'media'),
      ('installation_completed',      'Oficina concluiu instalação',    'alta'),
      ('installation_validated',      'Admin validou instalação',       'critica'),
      ('installation_rejected',       'Admin rejeitou instalação',      'critica')
    on conflict (action) do nothing;
  end if;
end $$;

-- ------------------------------------------------------------
-- 7. COMENTÁRIOS
-- ------------------------------------------------------------
comment on table public.installation_orders is
  'Ordens de instalação de rastreador GPS — Fase 28 (marketplace cliente↔oficina).';
comment on column public.installation_orders.status is
  'pending_payment → aguardando_instalacao → em_instalacao → aguardando_validacao → concluida (ou rejeitada/cancelada)';
comment on column public.installation_orders.stripe_transfer_id is
  'Stripe Transfer ID quando a plataforma faz o payout dos 90% pra oficina (após admin validar).';

-- ------------------------------------------------------------
-- 8. VERIFICAÇÃO
-- ------------------------------------------------------------
do $$
declare
  v_table  int;
  v_bucket int;
  v_col_w  int;
  v_col_v  int;
begin
  select count(*) into v_table
    from information_schema.tables
    where table_schema='public' and table_name='installation_orders';
  if v_table = 0 then
    raise exception 'FALHA: tabela installation_orders não foi criada.';
  end if;

  select count(*) into v_bucket from storage.buckets where id='installations';
  if v_bucket = 0 then
    raise exception 'FALHA: bucket installations não foi criado.';
  end if;

  select count(*) into v_col_w
    from information_schema.columns
    where table_schema='public' and table_name='workshops' and column_name='offers_tracker_install';
  if v_col_w = 0 then
    raise exception 'FALHA: workshops.offers_tracker_install não foi criada.';
  end if;

  select count(*) into v_col_v
    from information_schema.columns
    where table_schema='public' and table_name='vehicles' and column_name='tracker_installed';
  if v_col_v = 0 then
    raise exception 'FALHA: vehicles.tracker_installed não foi criada.';
  end if;

  raise notice 'OK — Fase 28.2 instalada. installation_orders + workshops.tracker + vehicles.tracker + bucket installations.';
end $$;

-- ====================================================================
-- Fim — Fase 28.2 (schema marketplace de instalação)
-- Próximos: 28.3 (Edge Function checkout) → 28.4 (UI oficina) →
--           28.5 (UI cliente) → 28.6 (UI admin validação)
-- ====================================================================
