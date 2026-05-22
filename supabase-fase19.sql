-- ============================================================
-- Nomade Drive Brasil — Fase 19: pagamento sem duplicidade
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente e reexecutável.
--
-- O PROBLEMA:
--   Cada clique em "Pagar mensalidade" inseria uma NOVA linha pendente
--   em payments — gerando linhas duplicadas para a mesma reserva.
--
-- ESTA FASE:
--   1. Consolida pendentes duplicados — mantém 1 pendente por
--      (booking_id, kind), o mais recente.
--   2. Cria índice único PARCIAL — no máximo 1 pagamento pendente por
--      (booking_id, kind). Pagamentos já concluídos (pago, autorizado,
--      etc.) não são afetados — o histórico é preservado.
--   3. Verificação: RAISE EXCEPTION se ainda restar duplicado.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONSOLIDAR pendentes duplicados
-- ------------------------------------------------------------
delete from public.payments p
where p.status = 'pendente'
  and p.id <> (
    select p2.id from public.payments p2
    where p2.booking_id = p.booking_id
      and p2.kind = p.kind
      and p2.status = 'pendente'
    order by p2.created_at desc, p2.id desc
    limit 1
  );

-- ------------------------------------------------------------
-- 2. ÍNDICE ÚNICO PARCIAL — 1 pendente por (booking_id, kind)
-- ------------------------------------------------------------
drop index if exists public.uniq_payments_pending_booking_kind;
create unique index uniq_payments_pending_booking_kind
  on public.payments (booking_id, kind)
  where status = 'pendente';

-- ------------------------------------------------------------
-- 3. VERIFICAÇÃO
-- ------------------------------------------------------------
do $$
declare
  v_dups integer;
begin
  select count(*) into v_dups from (
    select 1 from public.payments
    where status = 'pendente'
    group by booking_id, kind
    having count(*) > 1
  ) x;
  if v_dups > 0 then
    raise exception 'FALHA: ainda existem % par(es) com pagamento pendente duplicado.', v_dups;
  end if;
  raise notice 'OK — nenhum pagamento pendente duplicado.';
end $$;

-- ============================================================
-- Fim — Fase 19 (pagamento sem duplicidade).
-- ============================================================
