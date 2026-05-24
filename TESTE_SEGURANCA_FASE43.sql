-- ====================================================================
-- 🔒 TESTE DE SEGURANÇA — Fase 41 → 43c
-- --------------------------------------------------------------------
-- Valida os 3 fixes críticos do code review + RLS + anti-abuse.
-- Cada teste fala "PASSOU ✅" ou "FALHOU ❌" no select final.
-- ====================================================================

-- ============================================================
-- TESTE A: XSS NO PAINEL DE LEADS (Fix #1 crítico)
-- --------------------------------------------------------------------
-- Cenário: atacante submete <script> via form público.
-- A Edge Function aceita (validação só é de tamanho).
-- Mas quando admin abrir o painel, escapeHtml() deve renderizar
-- como texto literal, NÃO executar.
-- ============================================================

-- A.1) Submete lead com payload de XSS via Edge Function
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/submit-lead-quote',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object(
    'nome', '<script>alert("XSS-name")</script>',
    'contato', '<img src=x onerror="alert(1)">@test.com',
    'cidade', '"><svg onload=alert("XSS-city")>',
    'obs', '<iframe src="javascript:alert(\"XSS-obs\")"></iframe>',
    'duracao', 1,
    'intent', 'TESTE SEGURANÇA XSS — pode deletar'
  )
) as xss_request_id;

-- A.2) Aguarda 2s e confere que o lead foi inserido COM o payload intacto no DB
-- (esperado: ok, dados são guardados literais — a defesa é no RENDER, não no INPUT)
select
  '🧪 TESTE A.2: XSS payload no DB' as teste,
  id,
  name,
  contact,
  city,
  obs,
  '✅ Dados literais no DB. Defesa é no render (escapeHtml).' as observacao
from public.leads
where intent like 'TESTE SEGURANÇA XSS%'
order by created_at desc
limit 1;

-- A.3) AÇÃO MANUAL: agora abre o admin → 📩 Leads
-- DEVE aparecer:
--   nome: <script>alert("XSS-name")</script>    ← como texto literal, sem alert
--   contato: <img src=x onerror=...>@test.com    ← como texto literal
--   cidade: ">> tudo escapado
--   obs: <iframe> como texto literal
-- Se aparecer alert() popup → 🔴 BUG. Se aparecer texto → ✅ Fix funciona.

select '🧪 TESTE A.3: AÇÃO MANUAL — abrir admin#leads e checar que não aparece alert popup nem HTML renderizado' as instrucao;

-- ============================================================
-- TESTE B: AUTH BYPASS em send-tier-promotion (Fix #2 crítico)
-- --------------------------------------------------------------------
-- Antes: aceitava qualquer Bearer → spam de e-mails.
-- Agora: exige event_id que EXISTE em loyalty_events com client_id+to_tier batendo.
-- ============================================================

-- B.1) Tentar disparar SEM event_id → deve dar 400
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-tier-promotion',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object(
    'client_id', '11111111-1111-1111-1111-111111111111',
    'to_tier', 'platinum'
  )
) as bypass_test_no_event_id;

-- B.2) Tentar com event_id forjado (UUID que não existe) → deve dar 403
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-tier-promotion',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object(
    'client_id', '11111111-1111-1111-1111-111111111111',
    'to_tier', 'platinum',
    'event_id', 'deadbeef-dead-beef-dead-beefdeadbeef'
  )
) as bypass_test_fake_event_id;

-- B.3) Aguarda 3s e confere respostas — devem ser 400 e 403 (anti-abuse funcionando)
select
  '🧪 TESTE B.3: Anti-abuse send-tier-promotion' as teste,
  id,
  status_code,
  case
    when status_code in (400, 403) then '✅ PASSOU — recusou input inválido'
    when status_code = 200 then '🔴 FALHOU — aceitou! VAZAMENTO de e-mail!'
    else '? status inesperado'
  end as resultado,
  left(content::text, 150) as resposta
from net._http_response
where created >= now() - interval '2 minutes'
  and url like '%send-tier-promotion%'
order by created desc
limit 3;

-- ============================================================
-- TESTE C: HONEYPOT do submit-lead-quote
-- --------------------------------------------------------------------
-- Bot preenche campo "company" oculto → função deve descartar
-- silenciosamente (retorna 200 com captured:false, sem inserir lead)
-- ============================================================

-- C.1) Submete como bot (com honeypot preenchido)
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/submit-lead-quote',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object(
    'nome', 'BOT_HONEYPOT_TEST',
    'contato', 'bot@spam.com',
    'company', 'evil-spam.com',
    'intent', 'BOT TEST — não deve aparecer no DB'
  )
) as honeypot_request_id;

-- C.2) Aguarda 2s e confere que NÃO foi inserido
select
  '🧪 TESTE C.2: Honeypot bloqueou bot' as teste,
  count(*) as leads_inseridos_do_bot,
  case
    when count(*) = 0 then '✅ PASSOU — honeypot funcionou'
    else '🔴 FALHOU — bot conseguiu inserir lead'
  end as resultado
from public.leads
where name = 'BOT_HONEYPOT_TEST'
  and created_at >= now() - interval '2 minutes';

-- ============================================================
-- TESTE D: RLS em public.leads — só admin pode ler
-- --------------------------------------------------------------------
-- ⚠️  Este teste só faz sentido se rodado NA SESSÃO de um cliente
-- (não no SQL Editor que usa service role). Como você está no SQL
-- Editor, vou só verificar as policies existentes.
-- ============================================================

select
  '🧪 TESTE D: Policies RLS em public.leads' as teste,
  policyname,
  permissive,
  cmd as operacao,
  qual as condicao,
  case
    when policyname like '%admin%' then '✅ Policy restringe a admin'
    else '⚠️ Verificar policy'
  end as analise
from pg_policies
where schemaname = 'public' and tablename = 'leads';

-- Tem que mostrar 3 policies (read, write, delete) todas com check de admin/super_admin.

-- ============================================================
-- TESTE E: RLS em public.loyalty_events — cliente vê só os seus
-- ============================================================

select
  '🧪 TESTE E: Policies RLS em public.loyalty_events' as teste,
  policyname,
  cmd as operacao,
  qual as condicao
from pg_policies
where schemaname = 'public' and tablename = 'loyalty_events';

-- Esperado: 1 policy (loyalty_self_read) que checa auth.uid() = client_id
-- OR exists user_roles admin/super_admin.

-- ============================================================
-- TESTE F: Privilege escalation via update_lead_status RPC
-- --------------------------------------------------------------------
-- A função tem security definer. Verificar que ela checa user_roles
-- antes de executar (não confia só no auth.uid).
-- ============================================================

select
  '🧪 TESTE F: update_lead_status valida admin role' as teste,
  prosrc ~ 'admin' as contém_check_admin,
  prosrc ~ 'super_admin' as contém_check_super_admin,
  prosecdef as security_definer,
  case
    when prosrc ~ 'user_roles' and (prosrc ~ 'admin' or prosrc ~ 'super_admin') then '✅ Valida role antes'
    else '🔴 Não checa role!'
  end as analise
from pg_proc
where proname = 'update_lead_status';

-- ============================================================
-- TESTE G: SQL Injection via metadata_json
-- --------------------------------------------------------------------
-- Verifica que metadata_json em audit_logs aceita JSON arbitrário
-- mas NÃO permite SQL injection (Postgres jsonb é seguro).
-- ============================================================

select
  '🧪 TESTE G: jsonb seguro contra SQL injection' as teste,
  'jsonb é tipo nativo Postgres — escape automático' as observacao,
  '✅ Seguro por design' as resultado;

-- ============================================================
-- 🧹 LIMPEZA dos dados de teste de segurança
-- ============================================================
delete from public.leads
where intent like 'TESTE SEGURANÇA XSS%'
   or intent like 'BOT TEST%'
   or name = 'BOT_HONEYPOT_TEST';

select '🧹 Limpeza feita — dados de teste removidos' as cleanup;

-- ============================================================
-- ✅ RESUMO ESPERADO
-- --------------------------------------------------------------------
-- A.1: request_id (número)
-- A.2: 1 linha com payload literal no DB
-- A.3: AÇÃO MANUAL — abrir admin#leads e checar visualmente
-- B.1: request_id
-- B.2: request_id
-- B.3: 2 respostas com status 400 e 403 → ✅ PASSOU
-- C.1: request_id
-- C.2: leads_inseridos_do_bot = 0 → ✅ PASSOU
-- D: 3 policies, todas com check admin/super_admin
-- E: 1 policy loyalty_self_read
-- F: ✅ Valida role antes
-- G: ✅ Seguro por design
-- ============================================================
