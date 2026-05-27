# [BUG Fase 42] Tabela `leads` + view `leads_enriched` NÃO existem no banco — leads não persistem, painel admin sempre vazio

**Autor:** Claude (QA) — 2026-05-24
**Severidade:** Alta (perda de leads — vão só pro e-mail e somem do pipeline)
**Não é bug de código — é DEPLOY:** a migração `supabase-fase42-painel-leads.sql` nunca foi rodada no Supabase.

## O que testei (ROTEIRO_QA_FASE41_42, Bloco 4 + Bloco 6)
- **4.1/4.2 ✅** Submeti lead válido pela landing ("QA Teste 41 — Confort"). `submit-lead-quote` retornou 200/ok e o e-mail **"Lead landing — QA Teste 41 — Confort"** chegou em `contato@` (confirmado no Resend).
- **4.4/4.6 ✅** Honeypot (`company`) e validação de nome/contato funcionando.
- **4.3/Bloco 6 ⚠️ FALHA** O lead **NÃO aparece** no painel `admin.html#leads`. Investiguei a rede:

```
GET .../rest/v1/leads_enriched?select=*&order=created_at.desc&limit=200  → 404
```

Consultei via REST com a anon key + sessão admin:
```
GET /rest/v1/leads            → 404  {"code":"PGRST205","message":"Could not find the table 'public.leads' in the schema cache"}
GET /rest/v1/leads_enriched   → 404  {"code":"PGRST205", ... 'public.leads_enriched' ...}
```

## Causa-raiz
**Nem a tabela `public.leads` nem a view `public.leads_enriched` existem no banco.** A migração `supabase-fase42-painel-leads.sql` (que cria enum `lead_status`, tabela `leads`, RLS admin-only, view `leads_enriched`, RPC `update_lead_status`) **nunca foi aplicada**.

Por que o e-mail saiu mas o lead sumiu: em `submit-lead-quote/index.ts` (linhas ~204-281) o `insert` em `leads` está dentro de `try/catch` que **engole o erro** (`if (leadErr) console.error(...)` — não dá throw). Então o e-mail é enviado, a função retorna `ok:true, captured:false` (leadId null), e ninguém percebe que o lead não foi salvo.

## Fix (DEPLOY — Daniel/cowork, eu não rodo migração com RLS/SECURITY DEFINER)
1. Rodar **`supabase-fase42-painel-leads.sql`** no SQL editor do Supabase (é idempotente: `create table if not exists`, `create or replace view/function`).
2. Conferir no NOTICE final: "Tabela leads criada", "View leads_enriched criada", "Função update_lead_status criada".
3. (Opcional, recomendado) Em `submit-lead-quote/index.ts`, fazer o `lead_inserted:false` ficar mais visível — hoje o erro só vai pro `console.error`. Sugestão: incluir `lead_inserted` no retorno (já vai no audit log `metadata_json.lead_inserted`), mas como já loga no audit, o mínimo é rodar a migração.

## Critério de aceite (eu reteto)
Após rodar o SQL: submeter um lead novo pela landing → ele aparece no `admin.html#leads` como 🆕 Novo, com SLA "ok", e mover status (contatado/qualificado) funciona via `update_lead_status`.

---

## 🔁 UPDATE — reteste pós-migração (2026-05-24, Claude QA)

Daniel rodou `supabase-fase42-painel-leads.sql`. **Tabela + view + RPC agora existem** (`GET /leads_enriched` → 200 `[]`, antes 404). ✅

**MAS os leads ainda NÃO persistem** — falta a 2ª metade do fix. Submeti 2 leads de teste (`QA Teste 42 Pipeline`, `QA Teste 42b`) via `submit-lead-quote`:
- Resposta: `{"ok":true,"captured":true}` — **sem `lead_id`**.
- `GET /leads` (raw, como admin) → `[]` (nada inserido).
- `admin_audit_logs` (`action=lead_quote_submitted`) gravou os 2, mas com `target_id: null` e `metadata_json = {nome,cidade,source,contato,categoria,email_sent}` — **sem** `lead_inserted`, `is_duplicate`, `email_error`.

### Conclusão: a Edge Function `submit-lead-quote` DEPLOYADA está DESATUALIZADA
O `index.ts` no repo (linhas ~204-281, Fase 42) já tem o insert em `leads` + retorna `lead_id` + grava `metadata_json` rico (`lead_inserted`, `is_duplicate`). Mas a versão no ar é a **antiga** (só manda e-mail, retorna `{ok:true,captured:true}` sem lead_id, audit sem `lead_inserted`).

### Fix restante (DEPLOY — cowork/Daniel):
**Re-deploy da Edge Function `submit-lead-quote`** com o código atual do repo. Não dá pra semear lead manualmente pra testar o painel porque a migração (de propósito) não tem policy de INSERT — só service-role insere. Então até o redeploy, o Bloco 6 fica sem dados.

Critério: após redeploy, submeter lead → resposta vem com `lead_id` → aparece em `admin.html#leads` como 🆕 Novo. Aí eu fecho o Bloco 6.

---

## Observação extra (não relacionado — heads-up)
Na aba do admin no meu browser apareceram 2 scripts externos de `infird.com/cdn/...` carregados na página. Pode ser injeção de uma **extensão do Chrome** instalada no teu navegador (provável), não necessariamente do site deployado. Vale conferir as extensões / olhar o HTML servido direto pra garantir que não é supply-chain no site. Não bloqueia o QA.
