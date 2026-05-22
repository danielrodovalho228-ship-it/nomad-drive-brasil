-- ============================================================
-- Nomade Drive Brasil — Fase 12: pagamentos (Stripe — modo de teste)
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente: pode ser executado novamente com segurança.
--
-- O QUE ESTE SCRIPT FAZ:
--   - Adiciona bookings.deposit_amount (valor da caução).
--   - Cria a tabela payments (uma linha por cobrança da Stripe).
--   - Cria a tabela stripe_events (idempotência do webhook).
--   - Aplica RLS: cliente e proprietário da reserva veem os pagamentos;
--     admin vê tudo. A ESCRITA é feita só pelas Edge Functions, que
--     usam a service_role e contornam o RLS — o front-end só lê.
-- ============================================================

-- ------------------------------------------------------------
-- 1. COLUNA deposit_amount EM bookings (valor da caução)
-- ------------------------------------------------------------
alter table public.bookings
  add column if not exists deposit_amount numeric(12,2);

-- ------------------------------------------------------------
-- 2. TABELA payments
-- ------------------------------------------------------------
create table if not exists public.payments (
  id                          uuid primary key default gen_random_uuid(),
  booking_id                  uuid references public.bookings(id) on delete cascade,
  client_id                   uuid references auth.users(id) on delete set null,
  kind                        text not null,                    -- 'mensalidade' | 'caucao'
  amount                      numeric(12,2),
  currency                    text not null default 'brl',
  status                      text not null default 'pendente', -- pendente, pago, autorizado, capturado, liberado, falhou, expirado, estornado
  stripe_checkout_session_id  text,
  stripe_payment_intent_id    text,
  receipt_url                 text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_payments_booking on public.payments(booking_id);
create index if not exists idx_payments_session on public.payments(stripe_checkout_session_id);

drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated
  before update on public.payments
  for each row execute function public.set_updated_at();

-- auditoria das mudanças de status de pagamento (reusa a função da Fase 11)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'audit_row_change') then
    drop trigger if exists trg_audit_payments on public.payments;
    create trigger trg_audit_payments
      after insert or update on public.payments
      for each row execute function public.audit_row_change('status', 'pagamento', 'true');
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. TABELA stripe_events (idempotência do webhook)
-- ------------------------------------------------------------
create table if not exists public.stripe_events (
  id          text primary key,   -- id do evento Stripe (evt_...)
  type        text,
  received_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.payments enable row level security;

-- cliente e proprietário envolvidos veem os pagamentos; admin vê tudo.
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (
    public.is_admin()
    or client_id = auth.uid()
    or public.is_booking_party(booking_id)
  );
-- Sem policy de INSERT/UPDATE: a escrita é feita pelas Edge Functions
-- com a service_role, que contorna o RLS. O front-end nunca escreve aqui.

-- stripe_events: RLS ligado e SEM policy => só a service_role acessa.
alter table public.stripe_events enable row level security;

-- ============================================================
-- Fim — Fase 12 (pagamentos / Stripe modo de teste).
-- ============================================================
