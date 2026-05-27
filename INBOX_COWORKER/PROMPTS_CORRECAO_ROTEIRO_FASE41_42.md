# 🛠️ Prompts de correção — Roteiro QA Fase 41/41b/42 + Backlog Mobile (24/05/2026)

> QA: Claude (lado navegador). Consolidação de tudo que a rodada do `ROTEIRO_QA_FASE41_42_BACKLOG_MOBILE.md` encontrou.
> Legenda: 🔴 aberto · 🟡 fix no código, falta deploy · ✅ resolvido nesta sessão.

---

## ✅ RESOLVIDOS nesta sessão (pro histórico)

### A. Tabela `leads` + view `leads_enriched` não existiam → leads se perdiam
- **Prompt detalhado:** `BUG_fase42_leads_tabela_nao_existe.md`
- **Era:** `submit-lead-quote` mandava e-mail mas o `insert` em `leads` falhava silencioso (try/catch sem throw) porque a migração nunca tinha rodado. Lead sumia do pipeline.
- **Fix aplicado:** Daniel rodou `supabase-fase42-painel-leads.sql` (tabela + view + RPC `update_lead_status`). ✅

### B. Edge Function `submit-lead-quote` deployada estava desatualizada (não inseria)
- **Era:** versão no ar só mandava e-mail; retornava `{ok:true,captured:true}` sem `lead_id`; audit sem `lead_inserted`.
- **Fix aplicado:** Daniel re-deployou `submit-lead-quote`. ✅ Reteste OK: lead persiste, retorna `lead_id`, `leads_enriched` enriquece (SLA/contact_type).

---

## 🔴 ABERTO — bloqueia o Bloco 6

### C. Painel de Leads no admin não carrega — SyntaxError no `admin.html` deployado
- **Prompt detalhado:** `BUG_fase42_admin_leads_panel_syntax_error.md`
- **Sintoma:** `admin.html#leads` preso em "Carregando leads..."; KPIs "—"; "Atualizar" não dispara request.
- **Causa-raiz (confirmada):** o `admin.html` **deployado** (3902 linhas) tem um **`)` sobrando**. O bloco `<script>` inline **#2 (linhas 1179–2058)** não compila → erro `Unexpected token ')'` (browser mostra "Unexpected end of input" @2057:45). Com o bloco quebrado, `loadLeadsRich`/`_leadsCache`/handler do "Atualizar" ficam `undefined`. Parênteses no arquivo: **2423 `(` vs 2426 `)`** (3 a mais).
- **Backend está OK** — a própria client da página lê `leads_enriched` (rowCount=1, lead "QA Teste 42 PosDeploy"). É 100% frontend.
- **Fix:** achar e remover o `)` extra no bloco ~1179–2058 (região `loadLeadsRich`). Método: rodar `new Function(scriptBody)` em cada `<script>` sem `src` até o bloco #2 compilar limpo. Depois redeploy.
- **Reteste (eu faço):** painel lista o lead real, KPIs contam, filtros + transições novo→contatado→qualificado→convertido + SLA crítico + audit + RLS.

### D. [OPS] Divergência repo local ↔ deploy do `admin.html` (e padrão recorrente)
- **Era/é:** `admin.html` local que eu enxergo = ~1730 linhas e **compila limpo**; o deployado = **3902 linhas** e tem o `)` quebrado. Idem o `submit-lead-quote` que estava velho no ar. Já tínhamos visto isso com o handler do saque e o JS de renovação.
- **Risco:** corrigir/re-deployar a partir da base errada reintroduz bugs.
- **Fix:** confirmar qual fonte gera o `admin.html` de produção, sincronizar local↔origin/main antes de editar, e padronizar o build/deploy do admin.html.

---

## ⏳ PENDENTE DE SETUP (não são bugs — falta condição pra validar)

### E. Bloco 2 (e-mail D-7) — 2.2/2.3/2.4 não validados
- Função `send-renewal-reminders` responde **200 `{ok:true,eligible_count:0,sent:0}`** ✅ (deployada, sem reserva na janela agora).
- Falta: **semear uma reserva terminando em 7/3/1 dias** pra um cliente de teste (validar e-mail bonito + anti-spam) e conferir o cron no SQL editor (`select * from cron.job where jobname='renewal_reminders_daily'` → esperado `0 9 * * *`, ativo).

### F. Bloco 5 (Quero alugar este carro) — 5.4–5.7 não validados
- Lógica do `car.js` revisada e **correta** nos 4 ramos (não logado→cadastro, rascunho→onboarding, em_análise→status, aprovado→`create-rental-request`). Função `create-rental-request` **deployada** ✅; tabela `rental_requests` responde 200.
- Falta: **logar como cliente APROVADO** no browser (eu não digito senha) pra disparar a solicitação real e validar os 2 e-mails + gravação em `rental_requests`.

---

## 📋 Pendências herdadas (de antes desta rodada — ainda abertas)
- 🔴 **Saque "Sacar agora" — `withdrawal_id ausente`** → `BUG_saque_withdrawal_id_ausente.md` (crítico, coração da Sprint 2).
- 🟡 **Rodapé "📋 Protocolo" nos e-mails** → redeploy Edge `damage-capture` + `liberar-saque-parcial` (`BUG_fase36_rodape_protocolo_nao_aparece.md`).
- 🟡 **E-mail "vistoria concluída → proprietário"** → git push do fix `notifyByUserId` em `dashboard-oficina.html` (`BUG_email_vistoria_concluida_oficina.md`).

---

## ✅ Blocos já fechados nesta rodada
- **Bloco 1** Renovação 1-clique — ✅
- **Bloco 3** Banner clicável — ✅
- **Bloco 4** Form orçamento — ✅ (e-mail/honeypot/validação; 4.3/4.5 fecham junto com o Bloco 6)

---

## 🎯 Ordem sugerida pro deploy
1. **Fix C** (`)` no admin.html) + **D** (sincronizar base) → re-deploy admin.html → eu fecho Bloco 6 + 4.3/4.5.
2. Saque `withdrawal_id` (crítico herdado).
3. Redeploys do rodapé protocolo + git push vistoria.
4. Setup E/F (booking D-7 + login cliente aprovado) → eu fecho Blocos 2 e 5.

> Depois de cada deploy/setup, me avisa "feito X" que eu reteto na hora.
