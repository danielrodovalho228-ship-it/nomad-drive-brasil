-- ============================================================
-- Nomade Drive Brasil — Fase 13: auditoria das indicações de parceiro
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente. Requer que a Fase 11 já tenha sido rodada
-- (usa a função public.audit_row_change).
--
-- O QUE FAZ:
--   Liga gatilhos em partners_referrals para registrar em
--   admin_audit_logs:
--     - criação de indicação            -> indicacao_criado
--     - mudança de status da indicação  -> indicacao_status_alterado
--     - mudança de etapa da comissão    -> comissao_status_alterado
-- ============================================================

do $$
begin
  if exists (select 1 from pg_proc where proname = 'audit_row_change')
     and to_regclass('public.partners_referrals') is not null then

    -- criação + mudança de status da indicação
    drop trigger if exists trg_audit_partners_referrals on public.partners_referrals;
    create trigger trg_audit_partners_referrals
      after insert or update on public.partners_referrals
      for each row execute function public.audit_row_change('status', 'indicacao', 'true');

    -- mudança de etapa da comissão (apenas update — não duplica a criação)
    drop trigger if exists trg_audit_partners_commission on public.partners_referrals;
    create trigger trg_audit_partners_commission
      after update on public.partners_referrals
      for each row execute function public.audit_row_change('commission_status', 'comissao', 'false');

  else
    raise notice 'Rode a Fase 11 (auditoria) antes desta. Nenhum gatilho criado.';
  end if;
end $$;

-- ============================================================
-- Fim — Fase 13 (auditoria das indicações de parceiro).
-- ============================================================
