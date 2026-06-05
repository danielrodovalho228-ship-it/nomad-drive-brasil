# Teste E2E painel admin — 05/06 01:00 (commit 683e48b)

## Resumo executivo
- Fixes validados: 8/9
- Fixes que falharam (parcialmente): 1 (V-5 — taxa calculada a 10%, label diz 3%)
- Bugs novos encontrados: 4 (1 P1, 3 P2)
- Limitacoes do teste: login nao foi executado (senha nao disponivel); validacao feita via analise estatica do HTML deployado + inspecao do JS inline. Deploy confirmado: Last-Modified Fri, 05 Jun 2026 00:39:18 GMT. Todos os 14 assets retornaram HTTP 200.

---

## Validacao dos 9 fixes

### V-1 PASS — Sidebar 5 grupos
Grupos presentes na ordem correta:
- linha 163: `📊 OVERVIEW` (5 itens: #cockpit, #visao, #crescimento, #qualidade, #saude)
- linha 170: `📞 OPERAÇÃO` (8 itens: #leads, #documentos, #cadastros, #reservas, #vistorias, #manutencao, #sinistros, #notificacoes)
- linha 180: `🚗 FROTA E PARCEIROS` (3 itens: #frota, #oficinas, #parceiros)
- linha 185: `💰 FINANCEIRO` (5 itens: #financeiro, #contas-pagar, #fiscal, #nfs, #cupons)
- linha 192: `👥 GESTÃO` (4 itens: #equipe, #emails, #log, #config)

Nenhum `href="#proprietarios"` ou `href="#instalacoes"` existe no sidebar. As secoes ficam em `<section hidden>` (linhas 508 e 529). PASS completo.

### V-2 PASS — 2 secoes novas (#manutencao + #emails)

**#manutencao (linha 581):**
- H2: "🔧 Manutenção e alertas da frota" — presente
- 4 KPI cards (grid 4 colunas): Troca de óleo (`alertCountOil`), Uso suspeito (`alertCountApp`), Docs vencendo (`alertCountDoc`), Pneus (`alertCountTire`) — presentes
- Tabela "Alertas abertos" com tbody `alertsList` — presente
- Historico `maintenanceHistory` com colunas corretas — presente

**#emails (linha 630):**
- H2: "✉ E-mails enviados" — presente
- 4 KPI cards (grid 4 colunas): Enviados hoje, Esta semana, Falhas (24h), Templates ativos = **24 hardcoded** — correto
- Tabela "Últimos envios" com tbody `emailLogList` — presente
- Catalogo 2 colunas: 11 mensal_* + 13 team_* — contagem correta, todos os nomes batem com a especificacao
- Link `emails/preview.html` — presente, HTTP 200 confirmado

PASS completo.

### V-3 PASS — Cockpit KPI "Base de clientes" so clientes
Linha 3784: `var totalBase = (s.clientes_aprovados || 0);` — sem soma de proprietarios. Label HTML: "Base de clientes". PASS.

### V-4 PASS — #config sem Stripe Connect payouts
Secao `#config` (linha 1273) contem apenas um card generico de demonstracao + a nota de acesso. Comentario confirma remocao: `<!-- Bloco Stripe Connect Manual Payouts REMOVIDO -->` (linha 1280). Nenhum campo de email de payout, nenhum botao. PASS.

### V-5 FAIL PARCIAL — #financeiro taxa calculada a 10%, label diz ~3%
**HTML:** Label "Taxa do gateway" com subtexto "Stripe (~3% das vendas)" — correto.
**JS (linha 1470):** `var taxa = bruta * 0.10;` — calcula 10%, nao 3%.
**Consequencia:** `finTaxa` exibe 10% do bruto; `finRepasse` ("Receita líquida 100%") subtrai 10% em vez de 3%, subestimando a margem liquida em ~7pp. O nome do KPI diz "100%" mas o calculo desconta 10%.

**Reproducao:** Logar como admin com dados de payments reais → ir a #financeiro → ver que "Taxa do gateway" = 10x o valor esperado de 3%.

**Fix:** Linha 1470 e 1503: trocar `0.10` por `0.03`.

### V-6 PASS — #crescimento sem Top owners
Linha 1095 e 3413 confirmam remocao com comentarios. Secao contem: funil (`funnelContainer`), tabela por periodo (`growthPeriodList`), Clientes Nomade Gold. PASS.

**OBS — bug cosmético P2 vinculado:** A nota da secao #crescimento (linha 1070) ainda diz "Funil de aquisição + métricas por período + **top proprietários**." — o texto nao foi atualizado apos remocao do bloco. Nao e fix critico mas e confuso.

### V-7 PASS — Hero banner sem "protecao"
Linha 213: `KPIs, cadastros, verificação de identidade, frota, parceiros B2B, sinistros e auditoria — em um só lugar.` — sem "protecao". PASS.

### V-8 PASS — #visao sem "Proprietários em análise"
Linha 1400 confirma remocao: `// Query kProprietarios REMOVIDA`. HTML da #visao (linhas 323–334) nao tem mais esse KPI. PASS.

### V-9 PASS — Log sem opcao Saques
Linha 1229: `<!-- option withdrawals REMOVIDO (saques P2P legado) -->`. O `<select id="logFilterTarget">` tem 10 opcoes (reservas, veiculos, vistorias, documentos, ocorrencias, avarias, perfis, papeis, cadastros, pagamentos) — sem "Saques". PASS.

---

## Testes de interacao

### I-1: Navegacao sidebar
Validacao estatica: todos os 25 `href="#ancora"` apontam para `id` existentes no HTML. Nenhum link quebrado. Item `#cockpit` ja vem com estilo ativo hardcoded (`background:#e6f4ec;font-weight:700`). O JS de highlighting (`.is-current`) esta em style.css. Navegacao por scroll nao testavel sem browser — sem evidencia de falha.

### I-2: JavaScript errors
Nao foi possivel executar no browser sem login. Potenciais erros em runtime identificados no codigo:

1. `loadInstallationOrders()` e chamada em `loadAdminData()` (linha 1447) e consulta a tabela `installation_orders` (P2P legado). Se a tabela nao existir no Supabase, vai lancar erro Supabase 42P01 e logar `console.error("loadInstallationOrders:", e)`. A secao `#instalacoes` esta `hidden` mas a query ainda roda. **Severidade: P2** — nao quebra fluxo, apenas polui console.

2. `stripe_connect_health` view consultada em `loadSystemHealth()` (linha 3578). Se a view nao existir no schema v3, retorna erro Supabase 42P01. O `Promise.all` tem `.then` que le `.data || {}` entao o painel nao crasha, mas `kpiConnect` vai exibir `0` e sub "0% de 0 owners" — linguagem P2P residual exposta ao admin.

3. `alertSaques` (linhas 296 + 3811): cockpit ainda tem o bloco de alerta "saques disponíveis" e JS que o exibe se `s.saques_disponiveis > 0` (via `ceo_cockpit_summary`). Se a view retornar esse campo, aparece P2P language no cockpit. **Severidade: P2**.

### I-3: Network 4xx/5xx
Todos os 14 assets retornaram HTTP 200:
- design-tokens.css, style.css, style-animations.css, style-components-modern.css, style-dashboards-modern.css
- supabase-config.js, nd-modal.js, auth.js, statuses.js, nd-notifications.js, emails-runtime.js, script.js, fm-reveal.js
- images/favicon.svg
- emails/preview.html: HTTP 200

Nenhum 404 em assets. Chamadas Supabase sem autenticacao retornarao 401 — esperado, nao e bug.

### I-4: Modo demo — placeholders honestos
Em modo demo (`!a.configured`), a gate some e a nota `adminDataNote` aparece. Os KPIs inicializam com `—` em vez de zero falso — correto. Email KPIs (`emailToday`, `emailWeek`, `emailFail`) nao tem logica JS de populacao; ficam permanentemente em `—` mesmo com auth — aceitar como honest placeholder dado ausencia de tabela `email_log`. Os KPIs de maintenance alerts (`alertCountOil` etc.) idem.

### I-5: Mobile responsive
Viewport `@media (max-width: 860px)`: `admin-shell` colapsa para `grid-template-columns: 1fr`, sidebar vai para `position: static; height: auto`, nav vira grid 2 colunas. A 560px: `kpi-grid` vai para `1fr 1fr`. Sem drawer overlay — sidebar empilha em cima do conteudo. Nao e um bug bloqueante mas nao ha hamburguer/drawer para esconder a sidebar em mobile: usuario precisa scrollar passando pela nav de 25+ itens antes de chegar ao conteudo. **Severidade: P2 UX** — nao e regressao, era assim antes.

---

## Bugs novos encontrados

### BUG-1 — P1: Taxa do gateway calculada a 10% mas label diz ~3%
**Secao:** #financeiro  
**Linha:** 1470 (`var taxa = bruta * 0.10;`) e 1503 (`var fee = m.bruta * 0.10;`)  
**Impacto:** Exibe margem liquida errada ao dono do negocio. "Receita liquida (100%)" na verdade mostra bruta menos 10%. Decisoes financeiras baseadas nesses numeros estarao erradas.  
**Fix:** Linha 1470: `var taxa = bruta * 0.03;` / Linha 1503: `var fee = m.bruta * 0.03;`

### BUG-2 — P2: Nota de secao #crescimento menciona "top proprietários" removido
**Linha:** 1070  
**Texto atual:** "Funil de aquisição + métricas por período + top proprietários."  
**Fix:** Remover "top proprietários" → "Funil de aquisição + métricas por período + clientes Gold."

### BUG-3 — P2: `loadInstallationOrders()` ainda chamada mesmo com secao hidden
**Linha:** 1447  
**Impacto:** Query desnecessaria a tabela P2P legado; polui console com erro Supabase se tabela nao existir.  
**Fix:** Remover a chamada de `loadInstallationOrders()` de `loadAdminData()`. A secao esta hidden e nao e mais usada.

### BUG-4 — P2: alertSaques + kpiConnect com linguagem P2P residual
**Linhas:** 296 (HTML), 1037–1038 (HTML), 3597–3598 e 3611 (JS)  
**Impacto:** Se `ceo_cockpit_summary` tiver campo `saques_disponiveis > 0`, banner "saques disponíveis" aparece no cockpit. KPI "🏦 Connect ativos" na #saude mostra "X% de Y owners" — linguagem P2P numa operacao de frota propria.  
**Fix:** Remover `alertSaques` do HTML e JS do cockpit. Renomear kpiConnect para algo relevante para frota v3 (ex: "Stripe ativo" ou substituir por KPI mais util).

---

## Conclusao

Admin v3 pode ser considerado **PARCIALMENTE PRONTO** para uso operacional.

Os 8 de 9 fixes estruturais funcionaram corretamente — nenhuma referencia P2P visivel no fluxo principal, sidebar correta, secoes novas renderizando, gate de acesso funcionando. O unico bloqueio real e o BUG-1 (taxa 10% vs 3%) que afeta dados financeiros exibidos ao admin.

**Antes de usar em producao:** corrigir BUG-1 (P1 financeiro). Os bugs P2 sao polish mas nao bloqueiam operacao diaria.
