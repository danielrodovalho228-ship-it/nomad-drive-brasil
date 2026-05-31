-- ============================================================================
-- FASE 82 — security_invoker=on em 15 views públicas
-- ============================================================================
-- Aplicada em produção em: 2026-05-30
-- Registrada no remoto como: supabase_migrations.schema_migrations
--   versão: (auto-gerada por apply_migration)
--   nome:   fase_82_security_invoker_views
--
-- CONTEXTO:
-- Antes desta migration, 15 views no schema public eram owned by `postgres`
-- (superuser) e sem o option security_invoker=on. Resultado: quando chamadas
-- via REST API com a chave anon, as views BYPASSAVAM as RLS policies das
-- tabelas-base e retornavam dados pessoais (leads, clients, owners, etc.)
-- pra qualquer cliente HTTP com a anon key (que está hardcoded em todos os
-- arquivos HTML do site público).
--
-- IMPACTO ANTES DO FIX (medido em 30/05/2026):
--   - anon vê 12 leads completos (nome, email, telefone, cidade, intenção)
--   - anon vê 4 damages, 8 protection cases, 4 owner earnings, etc.
--   - Total: 15 views vazando dados sensíveis
--
-- IMPACTO DEPOIS DO FIX (confirmado via REST com anon key real):
--   - 11/15 views: anon retorna 0 rows
--   - 4/15 views (agregação pura): anon retorna 1 row com valores zerados
--   - super_admin (Daniel) continua vendo tudo (zero quebra de funcionalidade)
--   - cliente/owner continuam vendo só os próprios dados via policies das
--     tabelas-base (bookings_parties_select, vehicles_owner, etc.)
--
-- IDEMPOTÊNCIA:
-- ALTER VIEW SET (security_invoker = on) é idempotente. Re-aplicar não tem efeito.
-- O ALTER VIEW IF EXISTS protege contra falhar em ambientes onde alguma view
-- foi renomeada/removida.
-- ============================================================================

ALTER VIEW IF EXISTS public.client_loyalty              SET (security_invoker = on);
ALTER VIEW IF EXISTS public.client_loyalty_overview     SET (security_invoker = on);
ALTER VIEW IF EXISTS public.damages_full                SET (security_invoker = on);
ALTER VIEW IF EXISTS public.growth_by_period            SET (security_invoker = on);
ALTER VIEW IF EXISTS public.growth_funnel               SET (security_invoker = on);
ALTER VIEW IF EXISTS public.leads_enriched              SET (security_invoker = on);
ALTER VIEW IF EXISTS public.owner_dashboard_summary     SET (security_invoker = on);
ALTER VIEW IF EXISTS public.owner_earnings              SET (security_invoker = on);
ALTER VIEW IF EXISTS public.protection_cases_full       SET (security_invoker = on);
ALTER VIEW IF EXISTS public.protection_dashboard_stats  SET (security_invoker = on);
ALTER VIEW IF EXISTS public.quality_summary             SET (security_invoker = on);
ALTER VIEW IF EXISTS public.renewal_opportunities       SET (security_invoker = on);
ALTER VIEW IF EXISTS public.top_owners                  SET (security_invoker = on);
ALTER VIEW IF EXISTS public.v_caucao_suggested          SET (security_invoker = on);
ALTER VIEW IF EXISTS public.vehicle_health_latest       SET (security_invoker = on);

-- ============================================================================
-- ROLLBACK (caso necessário — NÃO recomendado, reabre o vazamento):
--   ALTER VIEW public.<viewname> SET (security_invoker = off);
-- ============================================================================

-- ============================================================================
-- VERIFICAÇÃO PÓS-MIGRATION:
-- Esta query deve retornar 'security_invoker=on' nas 15 linhas:
--
--   SELECT viewname, array_to_string(reloptions, ',') AS opts
--   FROM pg_views v JOIN pg_class c ON c.relname = v.viewname
--   WHERE schemaname='public' AND v.viewname IN (
--     'client_loyalty','client_loyalty_overview','damages_full',
--     'growth_by_period','growth_funnel','leads_enriched',
--     'owner_dashboard_summary','owner_earnings','protection_cases_full',
--     'protection_dashboard_stats','quality_summary','renewal_opportunities',
--     'top_owners','v_caucao_suggested','vehicle_health_latest'
--   );
--
-- Teste de pen-test (deve retornar 0 rows pra cada view):
--   ANON='<sua-anon-key>'
--   curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
--     -H "Prefer: count=exact" -I \
--     "https://zeexmbgacvsaciojcrwr.supabase.co/rest/v1/leads_enriched?select=*"
--   # Esperado: content-range: 0-0/0
-- ============================================================================

-- ============================================================================
-- DEVS: criando uma nova view? Sempre adicione SET (security_invoker = on):
--   CREATE VIEW public.minha_view WITH (security_invoker = on) AS
--     SELECT ... FROM ...;
-- ============================================================================
