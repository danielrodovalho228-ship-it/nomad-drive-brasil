# 🧪 Prompt QA — Transições de status + mudanças da sessão 05/06/2026

**Autor:** Claude (dev) → para time de QA
**Sessão coberta:** 05/06/2026 (commits `28309e3` até `ae47ffe` + migration `fix_rental_request_kyc_trigger_use_client_id`)
**Site:** https://nomadedrive.com.br
**Banco:** Supabase project `zeexmbgacvsaciojcrwr`

---

## 🎯 Objetivo

Validar end-to-end as **alterações de status** entre painel admin e dashboard cliente (comunicação bidirecional), confirmar que cada transição **dispara o e-mail correto** com **protocolo no rodapé**, e regredir as 7 mudanças visuais desta sessão. Se algum passo falhar, abrir BUG seguindo o template de `TEMPLATE_BUG_REPORT.md`.

---

## 📦 Mudanças desta sessão que precisam ser regredidas

| # | Commit | O que mudou | Onde validar |
|---|---|---|---|
| 1 | `28309e3` | P0: 1 carro lançamento (Cronos abaixo Localiza) — HB20 removido | `/`, `/frota.html`, `/precos.html`, `/reservar.html`, `/carros/popular.html` (redirect), `/faq.html` |
| 2 | `4377eaf` | P2: esconder KPI Connect ativos + bloco Stripe Connect breakdown no admin | `admin.html#saude` |
| 3 | `a0895f9` | P4: esconder Oficinas + Parceiros B2B do menu admin (depois religado em #6) | `admin.html` sidebar |
| 4 | `cfceba7` | P5: limpar 13 jargões dev visíveis no UI do admin | `admin.html` (textos: sem "rental_requests", "Edge Function", "Sprint E", "Backlog #3", "Fase 41") |
| 5 | `1ad368d` | P6: nova linha "Quilometragem — Limite Total" no comparativo + box destaque em /precos | `/#comparativo` e `/precos.html` (box verde sage abaixo dos planos) |
| 6 | `2e0d49e` | Religar parceiros admin + redesign dashboard cliente Nubank-style | `admin.html` sidebar (grupo "FROTA E PARCEIROS"), `dashboard-cliente.html` |
| 7 | `85c273b` | Hierarquia dashboard cliente + admin sem "MEI"/"Edge Function" | dashboard saudação no topo, admin Fiscal mostra "LTDA / Lucro Presumido" |
| 8 | `9c7728c` | Fix espaço em branco topo (`.dash`, `.hero`, `.car-page` paddings 94px→16px) | `/dashboard-cliente.html` topo sem 200px de branco |
| 9 | `25fdd77` | signup-cliente retorna `emails: {cliente, equipe, team_env_set}` no response | curl no endpoint signup retorna campo `emails` |
| 10 | migration | Trigger `trg_guard_rental_request_kyc` agora usa `client_id` | cliente conseguir criar rental_request |
| 11 | `ae47ffe` | Seção "Códigos de protocolo" adicionada ao `PLANO_QA_E2E.md` | doc no repo |

---

## 🔐 Credenciais

```
CLIENTE TESTE QA:
  URL:    https://nomadedrive.com.br/login.html
  E-mail: danielrodovalho228@gmail.com
  Senha:  TesteQa1234!
  Status: em_analise (KYC pendente)

ADMIN (super_admin):
  URL:    https://nomadedrive.com.br/login.html
  E-mail: dtrodovalho40@gmail.com
  Senha:  (pedir ao Daniel)
```

---

## 📊 Estado atual do banco (snapshot 05/06/2026 22:20 UTC)

| Tabela | Total | O que tem |
|---|---|---|
| `vehicles` | 1 | Fiat Cronos 2024 (único da frota) |
| `leads` | 4 | Daniel signup + Maria Silva (família) + Dr João Mendes (médico) + Carlos Oliveira (executivo) |
| `bookings` | 1 | **RS-2026-0007** (cliente Daniel, plano Estendido 30d, R$ 3.740, 08/06 → 08/07) |
| `rental_requests` | 1 | `d25c0d42-...` (cliente Daniel, motivo família-mudança, status `aprovado`) |
| `user_documents` | 6 | CNH frente do cliente Daniel (status `aprovado`) + 5 anteriores |
| `partners` | 2 | Auto Service UDI (workshop, prospect) + HC-UFU (hospital, negotiating) |
| `profiles.cliente_qa` | — | `verification_status = em_analise` |

---

## 🧪 SUITE A — Transições de status do **cliente**

Pra cada transição, validar **3 coisas**:
- (a) admin consegue mudar o status pelo painel
- (b) cliente vê a mudança na próxima carga do dashboard (RLS funciona)
- (c) e-mail correto dispara automaticamente (verificar Resend dashboard + Gmail)

### A.1 — KYC: `em_analise` → `aprovado`

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | Logar como cliente, ir em `#documentos` | Status do perfil: "em análise" |
| 2 | (admin) `admin.html#documentos` → KYC pra revisar | Cliente Daniel aparece com 1 doc anexado (cnh_frente) |
| 3 | (admin) Aprovar o doc | Status do doc muda pra `aprovado` |
| 4 | (admin) Mudar `verification_status` do cliente pra `aprovado` | Visualmente: status do cliente vira verde |
| 5 | (cliente) Recarregar dashboard | Status muda pra "✅ Aprovado". Quick action "Reservar agora" deve liberar (era "Após aprovação dos docs") |
| 6 | Conferir Gmail do cliente | E-mail "Documentos aprovados ✓ — vamos pro contrato" chegou |
| 7 | Conferir rodapé do e-mail | Tem linha cinza monospace com protocolo (`NDB-2026-######` da application) |

### A.2 — KYC: `em_analise` → `documentos_pendentes` (admin pede mais docs)

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | (admin) Mudar status pra `documentos_pendentes` | Salvo no banco |
| 2 | (cliente) Recarregar dashboard | Status mostra "📤 Documentos pendentes" + lista do que falta |
| 3 | Conferir Gmail | E-mail "Falta o envio dos documentos" chegou |

### A.3 — KYC: `em_analise` → `recusado`

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | (admin) Mudar status pra `recusado` + preencher motivo | Salvo no banco |
| 2 | (cliente) Recarregar dashboard | Mostra "Cadastro não aprovado" + motivo |
| 3 | Conferir Gmail | E-mail "Não conseguimos aprovar seu cadastro" com `{{rejection_reason}}` preenchido |

### A.4 — Reverter cliente pra `em_analise` (pra próxima rodada de teste)

```sql
UPDATE profiles SET verification_status = 'em_analise'
WHERE id = (SELECT id FROM auth.users WHERE email = 'danielrodovalho228@gmail.com');
```

---

## 🧪 SUITE B — Transições de **rental_request**

### B.1 — Cliente cria nova solicitação (regressão do BUG corrigido hoje)

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | (cliente aprovado) Reservar → escolher Cronos plano Estendido 30d | Submit funciona (era bug: trigger quebrado) |
| 2 | Conferir resposta | Status: `em_analise` |
| 3 | (admin) Ver em `#leads` ou `#rental_requests` | Nova solicitação aparece com perfil escolhido |

**🚨 Atenção:** este fluxo estava 100% quebrado antes da migration `fix_rental_request_kyc_trigger_use_client_id`. Erro era genérico: `record "new" has no field "user_id"`. Se voltar a aparecer, ABRIR BUG IMEDIATAMENTE.

### B.2 — Admin aprova: `em_analise` → `aprovado`

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | (admin) Mover rental_request pra `aprovado` | Salvo |
| 2 | (cliente) Recarregar | Status mostra "Aprovado — gerando reserva" |
| 3 | Verificar se booking foi criada automaticamente | Nova `RS-2026-####` em bookings (se Edge Function `approve-rental-request` rodar) |

### B.3 — Admin recusa: `em_analise` → `recusado`

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | (admin) Marcar como recusado + motivo | Salvo |
| 2 | (cliente) Dashboard mostra "Pedido recusado · {motivo}" | OK |

---

## 🧪 SUITE C — Transições de **booking** (RS-2026-####)

### C.1 — Aprovado → Em uso (entrega marcada)

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | (admin) Booking RS-2026-0007 → mudar status pra `em_uso` | Salvo |
| 2 | (cliente) Dashboard mostra "Locação ativa" em "Retirada e devolução" | OK |
| 3 | Conferir Gmail | E-mail "Entrega agendada — DD/MM às HH:MM" chegou com `RS-2026-0007` no rodapé |

### C.2 — Em uso → Encerrada

| Passo | O que fazer | Esperado |
|---|---|---|
| 1 | (admin) `em_uso → encerrada` | Salvo |
| 2 | E-mail "Devolução confirmada" dispara | Cliente recebe |
| 3 | Rodapé do e-mail mostra `RS-2026-0007` | OK (Fase 36) |

---

## 🧪 SUITE D — **Parceiros** (cadastro manual)

Como a decisão foi "sem porta pública pra parceiros se cadastrarem", validar só fluxo admin:

| # | Passo | Esperado |
|---|---|---|
| D.1 | (admin) ir em `#oficinas` | Vê **Auto Service UDI** (prospect) |
| D.2 | (admin) ir em `#parceiros` | Vê **HC-UFU** (hospital, negotiating, comissão 10%, desconto 5%) |
| D.3 | (admin) Cadastrar nova oficina via UI: trade_name + city + commission + status `negotiating` | Aparece na lista, sem erro |
| D.4 | (admin) Mover Auto Service UDI: `prospect → negotiating → active` | Cada step salva, ordenação por status correta |
| D.5 | (cliente logado) Tentar acessar `/admin.html#parceiros` | Redirect pra dashboard cliente (role mismatch) |
| D.6 | (curl como cliente JWT) `GET /rest/v1/partners` | Retorna `[]` (RLS bloqueia) |

---

## 🧪 SUITE E — **E-mails transacionais** com protocolo no rodapé

Pra cada e-mail abaixo, validar **3 coisas**:
- (a) e-mail chegou no Gmail do destinatário em até 30s
- (b) remetente é `Nomade Drive Brasil <noreply@nomadedrive.com.br>`
- (c) rodapé tem linha cinza monospace com protocolo do tipo `XX-AAAA-####` (Fase 36)

| Trigger | E-mail | Destinatário | Protocolo esperado |
|---|---|---|---|
| Signup cliente | "Recebemos sua solicitação" | Cliente | (sem protocolo, é antes de qualquer entidade) |
| Signup cliente | "[Equipe] Novo lead" | `TEAM_EMAIL_RECIPIENTS` | (sem protocolo) |
| Aprovar KYC | "Documentos aprovados ✓" | Cliente | `NDB-2026-######` (rodapé) |
| Recusar KYC | "Não conseguimos aprovar" | Cliente | `NDB-2026-######` |
| Pagamento confirmado | "Mensalidade confirmada" | Cliente | `RS-2026-####` + `PG-2026-####` |
| Entrega agendada | "Entrega agendada — DD/MM" | Cliente | `RS-2026-####` |
| Devolução concluída | "Devolução confirmada" | Cliente | `RS-2026-####` + `VS-2026-####` (vistoria) |

⚠️ **Antes de rodar Suite E**, confirme com Daniel se `TEAM_EMAIL_RECIPIENTS` foi setada nos Supabase Edge Function Secrets. Se não, e-mails de equipe **não** chegam (fato conhecido — não é bug do código, é config faltando).

---

## 🧪 SUITE F — **Regressão visual** das 7 mudanças desta sessão

### F.1 — Site público (não logado)

| # | Passo | Esperado |
|---|---|---|
| F.1.1 | Abrir `/` no celular | Hero verde, foto **Fiat Cronos** (não HB20), badge "A partir de **R$ 3.690**/30 dias" |
| F.1.2 | Comparativo "Por que mensal Nomade vs locadora tradicional" | Tem nova linha "Quilometragem — **Limite Total**". Última linha "Preço mensal sedan compacto: R$ 3.820+ vs R$ 3.690" |
| F.1.3 | `/frota.html` | **Só 1 carro** (Cronos), sem HB20 |
| F.1.4 | `/precos.html` | Sem toggle de carro. Box verde "Diferença pra locadora tradicional" no fim |
| F.1.5 | `/reservar.html` | Cronos auto-selecionado (1 carro só) |
| F.1.6 | `/carros/popular.html` | Redireciona pra `/carros/sedan.html` |
| F.1.7 | `/faq.html` | Pergunta caução diz "R$ 2.000 no Fiat Cronos" (sem HB20) |

### F.2 — Dashboard cliente (logado)

| # | Passo | Esperado |
|---|---|---|
| F.2.1 | Hard refresh `/dashboard-cliente.html` | Header **colado** com conteúdo, sem 200px de espaço branco |
| F.2.2 | Above-the-fold | **Saudação "Olá Daniel" + status pill** no topo (não hero institucional) |
| F.2.3 | Quick actions row | 4 cards: 📤 Enviar documentos (verde gradient destacado) · 🚗 Reservar · 💬 Suporte · 🥉 Programa Gold |
| F.2.4 | DOM | **Apenas 1 `<h1>`** na página (era 2 antes) |
| F.2.5 | Mobile | Hamburger funciona, drawer com 2 seções (Meu painel / Site) |

### F.3 — Admin

| # | Passo | Esperado |
|---|---|---|
| F.3.1 | Sidebar | Grupo "FROTA E PARCEIROS" (não "FROTA" sozinho). Itens: Frota, Oficinas, Parceiros B2B |
| F.3.2 | `grep -ci "MEI" admin.html` | 0 ocorrências |
| F.3.3 | `grep -c "Edge Function" admin.html` | 0 ocorrências |
| F.3.4 | Seção Fiscal | Cabeçalho diz "LTDA / Lucro Presumido". Não tem "R$ 81.000" nem "DAS MEI" |
| F.3.5 | Topbar mobile | Verde escura com hambúrguer + atalho home |
| F.3.6 | Drawer mobile | Sidebar vira drawer overlay quando tocar hambúrguer |
| F.3.7 | Seção `#saude` | KPI "Connect ativos" e bloco "Stripe Connect breakdown" **escondidos** |

---

## 🧪 SUITE G — **Comunicação bidirecional cliente↔admin**

Validar que cada mudança feita pelo admin reflete no cliente, e vice-versa.

| # | Mudança admin | Cliente vê em tempo real? |
|---|---|---|
| G.1 | `profile.verification_status: em_analise → aprovado` | ✅ esperado |
| G.2 | `user_document.status: em_analise → aprovado` | ✅ esperado |
| G.3 | `rental_request.status: em_analise → aprovado` | ✅ esperado |
| G.4 | `booking.status: aprovado → em_uso` | ✅ esperado |
| G.5 | RLS: cliente NÃO vê partners | ✅ esperado (`[]`) |
| G.6 | RLS: cliente NÃO vê profile de outros clientes | ✅ esperado (`[]`) |
| G.7 | RLS: cliente NÃO vê bookings de outros clientes | ✅ esperado (`[]`) |

**Como testar G.5 a G.7 rapidamente via curl:**

```bash
ANON_KEY="<copiar de supabase-config.js>"
API="https://zeexmbgacvsaciojcrwr.supabase.co"
CLIENT_JWT=$(curl -sS -X POST "$API/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"danielrodovalho228@gmail.com","password":"TesteQa1234!"}' \
  | grep -oE '"access_token":"[^"]*"' | sed 's/"access_token":"//; s/"$//')

# G.5
curl -s "$API/rest/v1/partners?select=trade_name" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $CLIENT_JWT"
# Esperado: []

# G.6 — cliente tenta ler outro profile
curl -s "$API/rest/v1/profiles?select=full_name&main_role=eq.admin" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $CLIENT_JWT"
# Esperado: [] (RLS bloqueia)

# G.7 — cliente tenta ler bookings de outros
curl -s "$API/rest/v1/bookings?client_id=neq.<seu_uuid>" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $CLIENT_JWT"
# Esperado: []
```

---

## 🐞 Bugs conhecidos (não testar — já documentados)

| # | Severidade | Bug | Status |
|---|---|---|---|
| 1 | P1 | `TEAM_EMAIL_RECIPIENTS` não setada → equipe não recebe e-mail de novo lead/signup | aguardando Daniel setar a secret no Supabase |
| 2 | P3 | Nomes em `profiles` trocados entre `dtrodovalho40` (super_admin) e `danieltomazrodovalho` (sócio) | aguardando confirmação de quem é quem |
| 3 | P3 | `qa_bookings` legados geram e-mails `[QA] QA-YYMMDD-####` que poluem inbox | decisão de Daniel: arquivar manual no Gmail OK |

---

## 🛠 Como reportar bug encontrado nesta rodada

Usar `TEMPLATE_BUG_REPORT.md` do repo. Preencher:
- **Severidade**: 🚨 P0 (trava fluxo) · ⚠️ P1 (impede ação) · 📋 P2 (incômodo) · ✨ P3 (polish)
- **Suite + número**: ex: `Suite A.2 passo 3`
- **Passos**: numerados
- **Esperado vs Obtido**
- **Print/vídeo** (se visual)
- **Browser/device** (Safari iOS 17, Chrome Android, etc.)
- **Timestamp UTC** (pra cruzar com logs Supabase: https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/logs/explorer)

Salvar no `INBOX_COWORKER/` com prefixo `BUG_`.

---

## 📊 Critério de aceite da sessão

A sessão **passa** se:
- ✅ 100% das Suites A, B, C, D passarem
- ✅ Suite E passa pra cliente (equipe pode ficar pendente até TEAM_EMAIL_RECIPIENTS)
- ✅ 100% da Suite F (regressão visual) passar
- ✅ 100% da Suite G (bidirecional + RLS) passar

A sessão **reprova** se:
- 🚨 Qualquer P0 ou P1 novo for encontrado (especialmente no fluxo de rental_request — esse foi o bug crítico fixado hoje)
- 🚨 Regressão visual derrubar algum item já validado (hero Cronos, preço R$ 3.690, sem MEI no admin, dashboard sem espaço em branco)

---

**Boa rodada.** Quando terminar, manda relatório consolidado tipo `RELATORIO_QA_TRANSICOES_05_06.md` na pasta `INBOX_COWORKER/`.
