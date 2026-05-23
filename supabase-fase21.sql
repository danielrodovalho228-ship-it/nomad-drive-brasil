-- ============================================================
-- Nomade Drive Brasil — Fase 21: mensalidade recorrente
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente.
--
-- OBJETIVO:
--   Suportar cobrança RECORRENTE mensal via Stripe Subscriptions
--   (cartão salvo, próxima mensalidade cobrada automaticamente),
--   sem quebrar o fluxo one-off existente.
--
-- O QUE FAZ:
--   1. profiles.stripe_customer_id — 1 customer Stripe por usuário.
--   2. bookings.stripe_subscription_id + billing_mode — controla se
--      a reserva é cobrança única ('one_off') ou recorrente ('monthly').
--   3. payments.stripe_invoice_id + installment_number — cada
--      invoice mensal vira uma linha em payments.
--   4. Índices para lookup rápido por subscription/invoice.
--
-- BACKWARD COMPAT:
--   Reservas antigas ficam com billing_mode = 'one_off' (default).
--   Stripe-checkout continua tratando elas como antes.
--   Novas reservas podem ser criadas com billing_mode = 'monthly'.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles: customer Stripe por usuário
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists uniq_profiles_stripe_customer
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ------------------------------------------------------------
-- 2. bookings: subscription tracking + modo de cobrança
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'billing_mode' and n.nspname = 'public'
  ) then
    create type public.billing_mode as enum ('one_off', 'monthly');
  end if;
end $$;

alter table public.bookings
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_mode public.billing_mode not null default 'one_off';

create unique index if not exists uniq_bookings_stripe_subscription
  on public.bookings (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_bookings_billing_mode
  on public.bookings (billing_mode);

-- ------------------------------------------------------------
-- 3. payments: invoice tracking
-- ------------------------------------------------------------
alter table public.payments
  add column if not exists stripe_invoice_id text,
  add column if not exists installment_number integer;

create unique index if not exists uniq_payments_stripe_invoice
  on public.payments (stripe_invoice_id)
  where stripe_invoice_id is not null;

create index if not exists idx_payments_booking_installment
  on public.payments (booking_id, kind, installment_number)
  where installment_number is not null;

-- ------------------------------------------------------------
-- 4. VERIFICAÇÃO
-- ------------------------------------------------------------
do $$
declare
  v_missing text[];
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='stripe_customer_id'
  ) then v_missing := array_append(v_missing, 'profiles.stripe_customer_id'); end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='bookings' and column_name='stripe_subscription_id'
  ) then v_missing := array_append(v_missing, 'bookings.stripe_subscription_id'); end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='bookings' and column_name='billing_mode'
  ) then v_missing := array_append(v_missing, 'bookings.billing_mode'); end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='payments' and column_name='stripe_invoice_id'
  ) then v_missing := array_append(v_missing, 'payments.stripe_invoice_id'); end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='payments' and column_name='installment_number'
  ) then v_missing := array_append(v_missing, 'payments.installment_number'); end if;

  if array_length(v_missing, 1) > 0 then
    raise exception 'FALHA — colunas ausentes: %', v_missing;
  end if;
  raise notice 'OK — Fase 21 instalada (mensalidade recorrente).';
end $$;

-- ============================================================
-- Fim — Fase 21 (mensalidade recorrente).
-- ============================================================
