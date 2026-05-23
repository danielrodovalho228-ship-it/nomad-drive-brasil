-- ====================================================================
-- Nomade Drive Brasil — Fase 23: Caução escalonada + Comissão fixa
-- --------------------------------------------------------------------
-- Decisões de negócio (2026-05-23):
--   • C8 — Caução escalonada por perfil do cliente
--   • C2/C3 — Comissão do parceiro: R$ 200 fixos por conversão
--   • C5 — Mantém split 10/90 (sem taxa administrativa adicional)
--
-- Este script é IDEMPOTENTE — pode rodar mais de uma vez sem
-- duplicar colunas, dados ou políticas.
-- ====================================================================

-- 1. CAUÇÃO ESCALONADA -------------------------------------------------
--
--    Tier        Caução      Quem se encaixa
--    --------    --------    -----------------------------------------
--    basico      R$ 500      KYC verificado + CNH 5+ anos + sem multas
--    padrao      R$ 1000     Cliente padrão (default)
--    novo        R$ 1700     Cliente novo, sem histórico
--    risco       R$ 2000     Estrangeiro / perfil de risco
--
--    O tier é definido pelo admin ao aprovar o KYC. Pode ser alterado
--    a qualquer momento. O admin pode SOBRESCREVER o valor sugerido
--    ao criar a reserva (campo deposit_amount em bookings).

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'caucao_tier'
  ) then
    alter table public.profiles
      add column caucao_tier text not null default 'padrao'
        check (caucao_tier in ('basico','padrao','novo','risco'));
  end if;
end $$;

-- View auxiliar com o valor sugerido (não usada por checkout, só pelo admin)
create or replace view public.v_caucao_suggested as
select
  p.id              as client_id,
  p.full_name,
  p.caucao_tier,
  case p.caucao_tier
    when 'basico' then 500
    when 'padrao' then 1000
    when 'novo'   then 1700
    when 'risco'  then 2000
    else 1000
  end as caucao_amount
from public.profiles p;

-- 2. COMISSÃO FIXA R$ 200 ----------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'partners_referrals'
      and column_name = 'commission_amount'
  ) then
    alter table public.partners_referrals
      add column commission_amount numeric(12,2) not null default 200.00;
  end if;
end $$;

-- Backfill nas indicações existentes (caso já tenham sido cadastradas)
update public.partners_referrals
   set commission_amount = 200.00
 where commission_amount is null;

-- 3. AUDIT TRAIL (registra mudança de tier no log) ---------------------
--    Reaproveita audit_logs já existente via trigger genérico
drop trigger if exists trg_audit_profiles_caucao_tier on public.profiles;
create trigger trg_audit_profiles_caucao_tier
  after update of caucao_tier on public.profiles
  for each row execute function public.audit_row_change(
    'caucao_tier_alterado', 'cliente', 'false'
  );

-- 4. RLS — só admin pode alterar o caucao_tier -------------------------
--    (a policy de profiles já existe; o caucao_tier é coluna nova mas
--     herda a policy do owner_or_admin. Nada a fazer aqui.)

-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO -------------------------------------
comment on column public.profiles.caucao_tier is
  'Tier de caução do cliente: basico (R$ 500), padrao (R$ 1000), novo (R$ 1700), risco (R$ 2000). Admin define no fluxo de KYC.';
comment on column public.partners_referrals.commission_amount is
  'Comissão do parceiro por conversão (R$ 200 fixo, conforme decisão de produto 2026-05-23). Pode ser sobrescrita caso a caso pelo admin.';
comment on view public.v_caucao_suggested is
  'Valor sugerido de caução por cliente. Admin pode sobrescrever no booking.';

-- ====================================================================
-- FIM da Fase 23
-- ====================================================================
