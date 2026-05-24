-- ====================================================================
-- 🧪 SMOKE TEST — Fase 41 → 43b
-- --------------------------------------------------------------------
-- Valida que tudo está deployado e funcionando.
-- Cola TUDO no Supabase SQL Editor → Run.
-- Cada bloco retorna OK ou FALHA — vai descendo conforme os SELECTs
-- mostram resultado.
-- ====================================================================

-- ============================================================
-- TESTE 1: Schema da Fase 43 (enum, tabelas, views, funções)
-- ============================================================
select
  '✅ TESTE 1: Schema Fase 43' as teste,
  (select count(*) > 0 from pg_type where typname = 'loyalty_tier') as enum_loyalty_tier_existe,
  (select count(*) > 0 from information_schema.tables where table_name = 'loyalty_events') as tabela_loyalty_events_existe,
  (select count(*) > 0 from information_schema.views where table_name = 'client_loyalty') as view_client_loyalty_existe,
  (select count(*) > 0 from information_schema.views where table_name = 'client_loyalty_overview') as view_overview_existe,
  (select count(*) > 0 from pg_proc where proname = 'get_client_loyalty_tier') as func_get_tier_existe,
  (select count(*) > 0 from pg_proc where proname = 'clone_booking_for_renewal') as func_renewal_existe,
  (select count(*) > 0 from pg_proc where proname = 'check_loyalty_promotion') as func_trigger_existe,
  (select count(*) > 0 from pg_trigger where tgname = 'trg_check_loyalty_promotion') as trigger_ativo;

-- ============================================================
-- TESTE 2: Schema da Fase 42 (leads)
-- ============================================================
select
  '✅ TESTE 2: Schema Fase 42' as teste,
  (select count(*) > 0 from pg_type where typname = 'lead_status') as enum_lead_status_existe,
  (select count(*) > 0 from information_schema.tables where table_name = 'leads') as tabela_leads_existe,
  (select count(*) > 0 from information_schema.views where table_name = 'leads_enriched') as view_leads_enriched_existe,
  (select count(*) > 0 from pg_proc where proname = 'update_lead_status') as func_update_lead_existe;

-- ============================================================
-- TESTE 3: Schema da Fase 41 (renovação)
-- ============================================================
select
  '✅ TESTE 3: Schema Fase 41' as teste,
  (select count(*) > 0 from information_schema.views where table_name = 'renewal_opportunities') as view_renewal_existe,
  (select count(*) >= 8 from information_schema.columns
   where table_name = 'renewal_opportunities'
     and column_name in ('booking_id','client_id','vehicle_id','start_date','end_date','monthly_price','discounted_price','renewal_discount_pct')) as colunas_renewal_corretas;

-- ============================================================
-- TESTE 4: Cron de renewal reminders ativo
-- ============================================================
select
  '✅ TESTE 4: Cron renewal reminders' as teste,
  jobname,
  schedule,
  active,
  case when active then '✅ Ativo' else '❌ Inativo' end as status
from cron.job
where jobname = 'renewal_reminders_daily';

-- ============================================================
-- TESTE 5: Edge Functions respondem (via pg_net)
-- --------------------------------------------------------------------
-- Dispara chamadas pra cada function e mostra status_code.
-- 200 = OK
-- 400/403/404 = funcionando (validou body, recusou input)
-- 5xx ou timeout = problema
-- ============================================================

-- 5a) send-renewal-reminders
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-renewal-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object('source', 'smoke_test')
) as request_id_renewal;

-- 5b) submit-lead-quote (anonymous, public form)
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/submit-lead-quote',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object(
    'nome', 'SMOKE TEST',
    'contato', 'smoketest@test.com',
    'cidade', 'TESTE',
    'duracao', 1,
    'categoria', 'TESTE',
    'intent', 'SMOKE TEST — pode deletar'
  )
) as request_id_lead;

-- 5c) send-tier-promotion (deve dar 400 sem event_id válido — significa que anti-spam funciona)
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-tier-promotion',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object('client_id', '00000000-0000-0000-0000-000000000000', 'to_tier', 'silver')
) as request_id_tier;

-- 5d) create-rental-request (deve dar 401 sem auth — significa que validação funciona)
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/create-rental-request',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object('catalog_id', 'hb20-comfort', 'catalog_name', 'Hyundai HB20')
) as request_id_rental;

-- AGUARDA 3s ANTES DE RODAR O PRÓXIMO BLOCO (pg_net é async)
-- ============================================================
-- TESTE 6: Verifica respostas das Edge Functions
-- ============================================================
select
  '✅ TESTE 6: Edge Functions respostas' as teste,
  id,
  status_code,
  case
    when status_code = 200 then '✅ OK'
    when status_code = 400 then '✅ Validou body e recusou (esperado pra smoke test)'
    when status_code = 401 then '✅ Auth obrigatório (esperado)'
    when status_code = 403 then '✅ Validação anti-abuso ativa (esperado)'
    when status_code = 404 then '⚠️ Function não encontrada OU profile não existe (verifique content)'
    when status_code >= 500 then '❌ Erro interno — verificar logs'
    else '? Status inesperado'
  end as diagnostico,
  left(content::text, 200) as resposta_resumo
from net._http_response
where created >= now() - interval '2 minutes'
order by created desc
limit 4;

-- ============================================================
-- TESTE 7: Lead "SMOKE TEST" foi inserido no DB
-- ============================================================
select
  '✅ TESTE 7: Lead persistido' as teste,
  id,
  name,
  contact,
  city,
  status,
  source,
  created_at
from public.leads
where name = 'SMOKE TEST'
  and created_at >= now() - interval '2 minutes'
order by created_at desc
limit 1;

-- ============================================================
-- TESTE 8: RLS check — leads_enriched está restrito a admin
-- (essa query roda como service_role no SQL Editor então
--  vai sempre passar — só validar que view existe e responde)
-- ============================================================
select
  '✅ TESTE 8: View leads_enriched funcional' as teste,
  count(*) as total_leads,
  count(*) filter (where status = 'novo') as novos,
  count(*) filter (where status = 'contatado') as contatados,
  count(*) filter (where status = 'convertido') as convertidos,
  count(*) filter (where sla_status = 'crítico') as sla_critico_count
from public.leads_enriched;

-- ============================================================
-- TESTE 9: client_loyalty calculado corretamente
-- ============================================================
select
  '✅ TESTE 9: Loyalty tiers' as teste,
  count(*) as total_clientes,
  count(*) filter (where tier = 'bronze') as bronze,
  count(*) filter (where tier = 'silver') as silver,
  count(*) filter (where tier = 'gold') as gold,
  count(*) filter (where tier = 'platinum') as platinum
from public.client_loyalty;

-- ============================================================
-- TESTE 10: Top 5 clientes por LTV (visualiza overview admin)
-- ============================================================
select
  '✅ TESTE 10: Top clientes' as teste,
  full_name,
  tier,
  months_completed,
  total_bookings,
  estimated_ltv
from public.client_loyalty_overview
limit 5;

-- ============================================================
-- TESTE 11: Audit logs recentes (últimas 24h)
-- ============================================================
select
  '✅ TESTE 11: Audit logs últimas 24h' as teste,
  action,
  count(*) as quantas_vezes
from public.admin_audit_logs
where created_at >= now() - interval '24 hours'
group by action
order by count(*) desc;

-- ============================================================
-- 🧹 LIMPEZA (opcional — descomenta pra remover lead de smoke test)
-- ============================================================
-- delete from public.leads where name = 'SMOKE TEST';
-- delete from public.admin_audit_logs where action = 'lead_quote_submitted'
--   and metadata_json->>'nome' = 'SMOKE TEST';

-- ============================================================
-- ✅ FIM DO SMOKE TEST
-- --------------------------------------------------------------------
-- Esperado:
--   Teste 1-4: todas as colunas devem ser TRUE (✅)
--   Teste 5: 4 request_id retornados (números)
--   Teste 6: 4 respostas com diagnóstico ✅
--   Teste 7: 1 lead "SMOKE TEST" aparece (status='novo')
--   Teste 8: counts retornados
--   Teste 9: contagens por tier (provavelmente todos Bronze ainda)
--   Teste 10: top 5 clientes (pode estar vazio se sem bookings)
--   Teste 11: lista de actions com contagens
--
-- Se algum teste falhar, manda print do erro/resultado pra Claude
-- corrigir.
-- ============================================================
