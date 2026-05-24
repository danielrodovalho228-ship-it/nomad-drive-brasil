-- ====================================================================
-- Nomade Drive Brasil — Fase 40b: Fix growth_funnel sem documents
-- --------------------------------------------------------------------
-- BUG (Daniel ao rodar fase40):
--   ERROR: relation "public.documents" does not exist
--
-- CAUSA:
--   View growth_funnel referenciava public.documents que não existe.
--   O coalesce/wrap não previne erro de parser SQL — view é compilada
--   na criação e checa as referências.
--
-- FIX:
--   Recria growth_funnel SEM a referência a documents.
--   Substitui "enviaram_documentos" por "verificados_em_analise"
--   (profiles com verification_status >= em_analise — proxy bom).
--
-- Idempotente. Pode rodar mesmo se a view antiga não existir.
-- ====================================================================

-- Recria growth_funnel sem documents
create or replace view public.growth_funnel as
select
  -- 1. Cadastros (qualquer profile criado)
  (select count(*) from public.profiles)::int as total_cadastros,

  -- 2. Verificação iniciada (status != rascunho)
  (select count(*) from public.profiles
    where verification_status != 'rascunho')::int as iniciaram_verificacao,

  -- 3. Em análise / documentos pendentes (proxy pra "enviou docs")
  --    (substitui referência a tabela documents que não existe)
  (select count(*) from public.profiles
    where verification_status in (
      'em_analise', 'documentos_pendentes', 'aprovado',
      'aprovado_com_ressalvas', 'recusado'
    ))::int as enviaram_documentos,

  -- 4. Aprovados
  (select count(*) from public.profiles
    where verification_status in ('aprovado','aprovado_com_ressalvas'))::int as aprovados,

  -- 5. Solicitaram reserva
  coalesce((
    select count(distinct client_id)
    from public.rental_requests
  ), 0)::int as solicitaram_reserva,

  -- 6. Reservaram (bookings)
  (select count(distinct client_id) from public.bookings)::int as reservaram,

  -- 7. Reservaram + pagaram
  (select count(distinct b.client_id)
   from public.bookings b
   where exists (
     select 1 from public.payments p
     where p.booking_id = b.id and p.status in ('pago','capturado')
   ))::int as pagaram;

comment on view public.growth_funnel is
  'Funil de aquisição: cadastro → verificação → docs (em análise+) → aprovado → reservou → pagou. Sem dependência da tabela documents.';

-- Verificação
do $$
declare
  total int;
begin
  select total_cadastros into total from public.growth_funnel;
  raise notice '=== Fase 40b — Fix growth_funnel ===';
  raise notice 'growth_funnel.total_cadastros: %', total;
  raise notice 'View recriada SEM referência a public.documents';
  raise notice '';
  raise notice 'Agora rode o restante da fase40 (se ainda não rodou):';
  raise notice '  - growth_by_period, top_owners, quality_summary, nps_responses';
end $$;
