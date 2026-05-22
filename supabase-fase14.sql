-- ============================================================
-- Nomade Drive Brasil — Fase 14: Stripe Connect (Fase A)
-- Contas conectadas para RECEBIMENTO (repasse/comissão/serviço)
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente.
--
-- O QUE FAZ:
--   - Cria a tabela payout_accounts (1 linha por usuário que recebe:
--     proprietário, parceiro, oficina).
--   - RLS: o usuário vê só a própria conta; o admin vê todas. A escrita
--     é feita pela Edge Function connect-onboard (service role).
-- ============================================================

create table if not exists public.payout_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  role              text,                              -- owner | referral_partner | workshop
  stripe_account_id text,
  status            text not null default 'pendente',  -- pendente | em_analise | ativo | restrito
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_payout_accounts_acct
  on public.payout_accounts(stripe_account_id);

drop trigger if exists trg_payout_accounts_updated on public.payout_accounts;
create trigger trg_payout_accounts_updated
  before update on public.payout_accounts
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.payout_accounts enable row level security;

-- o usuário vê apenas a própria conta de recebimento; o admin vê todas.
drop policy if exists payout_accounts_select on public.payout_accounts;
create policy payout_accounts_select on public.payout_accounts
  for select using (user_id = auth.uid() or public.is_admin());
-- Sem policy de INSERT/UPDATE: a escrita é da Edge Function connect-onboard
-- (service role), que contorna o RLS. O front-end só lê.

-- ============================================================
-- Fim — Fase 14 (Stripe Connect — Fase A: contas conectadas).
-- ============================================================
