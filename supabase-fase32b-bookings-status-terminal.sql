-- ====================================================================
-- Nomade Drive Brasil — Fase 32b
-- Status terminais para bookings: 'em_uso' e 'encerrada'
-- --------------------------------------------------------------------
-- PROBLEMA (encontrado no QA — cowork report MELHORIAS_code.md #4):
--   close-rental cancela subscription + libera caução + envia e-mail
--   mas NÃO atualiza bookings.status. O pill do topo da reserva fica
--   "Aprovado" mesmo após o check-out aprovado. A timeline em
--   reserva-detalhe mostra "Locação encerrada — Concluído" corretamente,
--   então é só cosmético no pill — mas piora UX e quebra filtros futuros.
--
-- DESCOBERTA ADICIONAL (Claude code-side, ao investigar):
--   bookings.status usa o enum `entity_status` (compartilhado com
--   profiles, workshops, etc.). Os valores 'em_uso' e 'encerrada' NÃO
--   existem nesse enum hoje.
--
-- DECISÃO:
--   Adicionar 'em_uso' e 'encerrada' ao entity_status (ADD VALUE é
--   ADITIVO — não quebra nada existente). Tabelas que não usam esses
--   valores semanticamente (profiles, workshops) simplesmente não vão
--   recebê-los nos UPDATEs.
--
-- ALTERNATIVA REJEITADA:
--   Criar enum novo `booking_lifecycle_status` separado — exigiria
--   migração de coluna (drop + add com cast), mais arriscado.
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run. É idempotente.
--
-- DEPOIS DE RODAR:
--   Re-deploy a Edge Function close-rental (já atualizada pra setar
--   bookings.status = 'encerrada' no fim do fluxo).
-- ====================================================================

-- ---------- 1. Adicionar valores ao enum (idempotente) ----------

do $$ begin
  alter type entity_status add value if not exists 'em_uso';
exception when others then
  raise notice 'em_uso já existe ou erro: %', sqlerrm;
end $$;

do $$ begin
  alter type entity_status add value if not exists 'encerrada';
exception when others then
  raise notice 'encerrada já existe ou erro: %', sqlerrm;
end $$;

-- ---------- 2. Atualizar a.statusLabel mapping no frontend ----------
-- Não é SQL — fica como TODO pro statuses.js mostrar label bonito
-- dos novos status. Sugestão:
--   'em_uso'    → "Em uso"
--   'encerrada' → "Encerrada"

-- ---------- 3. Verificação ----------
-- IMPORTANTE: usamos pg_enum (system catalog) em vez de enum_range
-- porque o PostgreSQL bloqueia uso de valor de enum recém-adicionado
-- DENTRO DA MESMA TRANSAÇÃO ("unsafe use of new value"). Lendo o
-- catálogo direto evita esse problema.

do $$
declare
  has_em_uso boolean;
  has_encerrada boolean;
begin
  select exists(
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'entity_status' and e.enumlabel = 'em_uso'
  ) into has_em_uso;

  select exists(
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'entity_status' and e.enumlabel = 'encerrada'
  ) into has_encerrada;

  if has_em_uso and has_encerrada then
    raise notice 'OK — enum entity_status agora inclui em_uso e encerrada.';
  else
    raise exception 'FALHA — em_uso=% encerrada=%', has_em_uso, has_encerrada;
  end if;
end $$;

-- ---------- 4. (opcional) Backfill bookings com check-out aprovado ----------
-- Identifica reservas que JÁ tiveram check-out aprovado mas continuam
-- com status='aprovado' por causa do bug original. Roda só em casos
-- comprovados pra evitar marcar errado.
--
-- Descomenta se quiser fazer:
--
-- update public.bookings b
--    set status = 'encerrada', updated_at = now()
--  where status = 'aprovado'
--    and exists (
--      select 1
--      from public.rental_inspections ri
--      where ri.booking_id = b.id
--        and ri.kind = 'checkout'
--        and ri.status = 'aprovado'
--    );
-- returning id, vehicle_id;

-- ====================================================================
-- Fim — Fase 32b.
-- ====================================================================
