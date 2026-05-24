# Roteiro QA — Fase 35: Transparência Total de E-mails

> **Versão:** 1.0
> **Data:** 2026-05-24
> **Pra:** Time de QA Nomade Drive
> **Pré-requisito:** Deploy completo das Edge Functions `damage-capture` e `close-rental` + git push do commit `3a5a9fb`

---

## 🎭 Personagens (contas de teste — todas senha `Teste123`)

| Personagem | Conta | Papel | Veículo |
|---|---|---|---|
| **Carlos Silva Teste** | `qa-cliente@nomadedrive.com.br` | 🧍 Cliente | (aluga) Chevrolet Onix, HB20, T-Cross |
| **Marcos Pereira Teste** | `qa-proprietario@nomadedrive.com.br` | 🚗 Proprietário | Onix 2022, HB20 2021, T-Cross 2023 |
| **Equipe Proteção QA** | `qa-protecao@nomadedrive.com.br` | 🛡️ Proteção | — |
| **Oficina Teste** | `qa-oficina@nomadedrive.com.br` | 🔧 Oficina | — |
| **Parceiro Teste** | `qa-parceiro@nomadedrive.com.br` | 🤝 Parceiro | — |

📧 **Todos os e-mails caem em** `contato@nomadedrive.com.br` (webmail Hostinger) — os 5 acima são aliases redirecionando pra essa caixa única.

---

## 🌐 Setup inicial

### Antes de começar qualquer teste

1. ✅ Confirma que os deploys foram feitos:
   - `damage-capture` Edge Function (Supabase Dashboard → Edge Functions)
   - `close-rental` Edge Function (idem)
   - `send-email` Edge Function (Caminho A — deve ter `to_user_id`)
2. ✅ Confirma que o git push do commit `3a5a9fb` está no GitHub Pages (espera ~1 min após push)
3. ✅ Abre **2 abas no navegador:**
   - Aba 1: webmail Hostinger (`https://webmail.hostinger.com/`) logado em `contato@nomadedrive.com.br`
   - Aba 2: navegação anônima pra alternar contas sem conflito de sessão
4. ✅ Tem ao menos **1 reserva ativa** (status `em_uso` ou `aprovado`) entre Carlos e Marcos. Se não tem, roda `supabase-fase32-qa-reservas-cd.sql` ou cria nova manualmente.

### Cartões de teste Stripe (se precisar pagar)

- 💳 Sucesso: `4242 4242 4242 4242` (CVC `123`, data `12/30`, CEP `01310-100`)

---

## 🧪 Fluxo 1 — Proprietário aprova devolução COM avaria

**Objetivo:** validar que cliente E proprietário recebem confirmação quando avaria é registrada.

### Pré-condições
- Reserva ativa entre Carlos (cliente) e Marcos (proprietário), veículo em uso
- Cliente já solicitou devolução
- Mensalidade paga + caução autorizada (pra ter algo a capturar depois)

### Passos
1. **Aba anônima** → login `qa-proprietario@nomadedrive.com.br` (Marcos)
2. Vai pra `dashboard-proprietario.html` → seção "Vistorias" ou "Reservas"
3. Clica na reserva ativa com solicitação de devolução pendente
4. Clica **"Aprovar devolução"** → modal abre
5. Marca **"Sim, houve avaria"**
6. Preenche:
   - **Descrição:** "Risco na lateral motorista, cerca de 20cm — Fluxo QA #1"
   - **Valor sugerido:** `R$ 350,00`
   - **Fotos (opcional):** sobe 1-2 imagens dummy
7. Preenche km final (qualquer valor > km inicial)
8. Confirma

### ✅ Resultado esperado

**No app (UI):**
- Toast verde "Devolução com avaria registrada — aguardando Proteção"
- Status da reserva muda pra **"bloqueado_para_revisao"** ou similar

**No webmail Hostinger (em 30s-2 min):**

| # | Remetente | Assunto | Destino | Status |
|---|---|---|---|---|
| 1 | Nomade Drive Brasil | **"Devolução recebida — avaria em análise"** | `qa-cliente@` | ✅ Esperado |
| 2 | Nomade Drive Brasil | **"Avaria registrada — aguardando análise da Proteção"** 🆕 | `qa-proprietario@` | ✅ Esperado |

### ❌ Falha conhecida
- Se só o e-mail #1 chegar → confirma que o `close-rental` foi re-deployado com Fase 35
- Se NENHUM chegar → checa logs Supabase: Dashboard → Functions → `close-rental` → Logs

---

## 🧪 Fluxo 2 — Proteção aprova captura R$ X

**Objetivo:** validar que cliente E proprietário recebem decisão de captura.

### Pré-condições
- Avaria registrada (Fluxo 1 ou anterior) com status `pendente_revisao`
- Caução autorizada na reserva (pra ter de onde capturar)

### Passos
1. **Aba anônima** → login `qa-protecao@nomadedrive.com.br` (Proteção)
2. Vai pra `dashboard-protecao.html` → seção **"Avarias para revisar"**
3. Acha a avaria nova (filtrar por status "Pendente de revisão" se necessário)
4. No card da avaria, no campo **"Valor final (R$)"** mantém ou ajusta pra **`300`** (ou outro)
5. Preenche **"Parecer / observação"**: "Avaria confirmada pelas fotos — Fluxo QA #2"
6. Clica **"💰 Aprovar captura"**
7. Aguarda confirmação

### ✅ Resultado esperado

**No app:**
- Toast verde "Captura realizada: R$ 300,00. E-mail enviado ao cliente."
- Status da avaria muda pra **"Aprovado — captura"**
- Card mostra `Valor final: R$ 300,00`

**No webmail (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"Avaria — decisão da Proteção (captura R$ 300,00)"** | `qa-cliente@` |
| 2 | **"Decisão da Proteção — captura de R$ 300,00 aprovada"** 🆕 | `qa-proprietario@` |

**No Stripe Dashboard:**
- Vai em `https://dashboard.stripe.com/test/payments`
- Acha o PaymentIntent da caução do Carlos
- Deve ter status `Succeeded` com valor `R$ 300,00` capturado (resto liberado automaticamente)

---

## 🧪 Fluxo 3 — Proteção libera SEM cobrança

**Objetivo:** validar que cliente recebe boa notícia E proprietário sabe da decisão (antes da Fase 35 ninguém era avisado!).

### Pré-condições
- Outra avaria nova com status `pendente_revisao` (rodar Fluxo 1 com outro veículo)
- Caução autorizada

### Passos
1. **Aba anônima** → login `qa-protecao@nomadedrive.com.br`
2. Vai pra `dashboard-protecao.html` → "Avarias para revisar"
3. Acha a 2ª avaria
4. Preenche parecer: "Avaria pré-existente, não procede — Fluxo QA #3"
5. Clica **"↩ Liberar sem cobrança"**
6. Confirma

### ✅ Resultado esperado

**No app:**
- Toast "Decisão registrada: liberar sem cobrança"
- Status muda pra **"Liberado (sem cobrança)"**
- Card no painel da Proteção mostra `Valor final: R$ 0,00`

**No webmail (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"Sua avaria foi liberada sem cobrança — Nomade Drive Brasil"** 🆕 | `qa-cliente@` |
| 2 | **"Decisão da Proteção — avaria liberada sem cobrança"** 🆕 | `qa-proprietario@` |

### 🎯 Por que esse fluxo é especial

**Antes da Fase 35:** "Liberar sem cobrança" não disparava NENHUM e-mail. Ambos ficavam no escuro. Agora os dois recebem confirmação. Esse é um dos GAPs mais críticos fechados.

---

## 🧪 Fluxo 4 — Cliente contesta avaria

**Objetivo:** validar 3 e-mails simultâneos (cliente + Proteção + proprietário).

### Pré-condições
- Avaria com status `aprovado_captura` (do Fluxo 2) ou `resolvido` — **sem** `client_dispute` ainda
- Prazo de 5 dias úteis ainda válido

### Passos
1. **Aba anônima** → login `qa-cliente@nomadedrive.com.br` (Carlos)
2. Vai pra `dashboard-cliente.html` → seção **"Avarias"**
3. Acha a avaria com captura R$ 300 (Fluxo 2)
4. Clica **"Contestar"** (botão deve aparecer porque dentro dos 5 dias)
5. Preenche contestação (mín 20 chars): "Esse arranhão já estava no veículo antes da minha retirada, conforme fotos enviadas no check-in — Fluxo QA #4"
6. Clica **"Enviar contestação"**

### ✅ Resultado esperado

**No app:**
- Toast verde "Contestação enviada. A equipe Proteção fará uma 2ª análise."
- Status da avaria muda pra **"Em contestação — 2ª análise"**

**No webmail (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"Contestação registrada — Nomade Drive Brasil"** | `qa-cliente@` |
| 2 | **"[Proteção] Nova contestação de avaria — 2ª análise"** | `suporte@` (literal, sem alias) |
| 3 | **"Cliente contestou a avaria — 2ª análise da Proteção"** 🆕 | `qa-proprietario@` |

### 🎯 Por que esse fluxo é especial

Antes da Fase 35: só cliente + Proteção recebiam. Marcos (proprietário) não sabia que estava sendo contestado. Agora ele sabe e pode acompanhar.

---

## 🧪 Fluxo 5 — Cliente abre ocorrência (case)

**Objetivo:** validar 3 e-mails (cliente confirmação + Proteção team + proprietário contraparte).

### Passos
1. **Aba anônima** → login `qa-cliente@nomadedrive.com.br`
2. Vai pra `dashboard-cliente.html` → seção **"Ocorrências"** (ou similar)
3. Clica **"Registrar ocorrência"**
4. Preenche:
   - **Tipo:** "Pane mecânica" (ou "Sinistro", "Multa", etc.)
   - **Reserva:** seleciona a reserva ativa do Onix
   - **Descrição:** "Carro apresentou perda de potência no motor — Fluxo QA #5"
5. Confirma "Registrar ocorrência"

### ✅ Resultado esperado

**No app:**
- Toast "Ocorrência registrada"
- Lista de "Minhas ocorrências" mostra a nova entrada com status "Em análise"

**No webmail (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"Recebemos sua ocorrência — Nomade Drive Brasil"** | `qa-cliente@` |
| 2 | **"[Proteção] Nova ocorrência: Pane mecânica"** | `suporte@` (literal) |
| 3 | **"Ocorrência registrada sobre seu veículo — Nomade Drive Brasil"** 🆕 | `qa-proprietario@` |

### 🎯 Por que esse fluxo é especial

Antes da Fase 35: Marcos só descobria que o cliente abriu ocorrência sobre o carro dele quando ligavam pra ele. Agora ele recebe e-mail imediato.

---

## 🧪 Fluxo 6 — Proteção triagem caso (resolve)

**Objetivo:** validar que reporter E contraparte recebem decisão final da Proteção.

### Pré-condições
- Pelo menos 1 caso aberto com status `em_analise` (use o do Fluxo 5)

### Passos
1. **Aba anônima** → login `qa-protecao@nomadedrive.com.br`
2. Vai pra `dashboard-protecao.html` → seção **"Casos abertos — triagem"**
3. Acha o caso "Pane mecânica — Chevrolet Onix" do Fluxo 5
4. No dropdown **"Novo status"** seleciona: **"Aprovado com ressalvas"**
5. Preenche **"Parecer / resolução"**: "Cobertura aprovada com participação do cliente em 20% — Fluxo QA #6"
6. Clica **"💾 Salvar triagem"**

### ✅ Resultado esperado

**No app:**
- Toast verde "Triagem atualizada"
- Toast cinza + verde "Enviando e-mail 'case_resolved_client' (server-side)..."
- Status do caso muda pra **"Aprovado com ressalvas"** (pill amarela)

**No webmail (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"Triagem concluída — Aprovado com ressalvas"** | `qa-cliente@` (reporter) |
| 2 | **"Triagem concluída — Aprovado com ressalvas"** 🆕 | `qa-proprietario@` (contraparte) |

### 🎯 Por que esse fluxo é especial

Carlos foi quem abriu a ocorrência, mas o veículo é do Marcos. **Os dois precisam saber da resolução.** Antes da Fase 35 só o reporter recebia.

---

## 📋 Checklist consolidado (imprime e marca)

### Fluxo 1 — Avaria registrada
- [ ] Status reserva mudou
- [ ] 📧 E-mail "Devolução recebida — avaria em análise" no inbox
- [ ] 📧 E-mail "Avaria registrada — aguardando análise da Proteção" no inbox

### Fluxo 2 — Captura aprovada
- [ ] Status avaria = "Aprovado — captura"
- [ ] 📧 E-mail "Avaria — decisão da Proteção (captura R$ X)"
- [ ] 📧 E-mail "Decisão da Proteção — captura de R$ X aprovada"
- [ ] Stripe Dashboard mostra PaymentIntent capturado

### Fluxo 3 — Liberada sem cobrança
- [ ] Status avaria = "Liberado (sem cobrança)"
- [ ] 📧 E-mail "Sua avaria foi liberada sem cobrança"
- [ ] 📧 E-mail "Decisão da Proteção — avaria liberada sem cobrança"

### Fluxo 4 — Contestação
- [ ] Status avaria = "Em contestação"
- [ ] 📧 E-mail "Contestação registrada"
- [ ] 📧 E-mail "[Proteção] Nova contestação"
- [ ] 📧 E-mail "Cliente contestou a avaria"

### Fluxo 5 — Caso aberto
- [ ] Caso criado, status "Em análise"
- [ ] 📧 E-mail "Recebemos sua ocorrência"
- [ ] 📧 E-mail "[Proteção] Nova ocorrência"
- [ ] 📧 E-mail "Ocorrência registrada sobre seu veículo"

### Fluxo 6 — Triagem
- [ ] Status caso = decisão final escolhida
- [ ] 📧 E-mail "Triagem concluída" pro reporter (Carlos)
- [ ] 📧 E-mail "Triagem concluída" pro contraparte (Marcos)

### Total esperado: **15 e-mails distintos**

---

## 🐛 Troubleshooting comum

### Toast vermelho "FALHA case_resolved_client: email_not_found"
- Edge Function `send-email` não tem o Caminho A deployado. Re-deploya.

### E-mail não chega no webmail
- Espera até 2 min (Resend tem delay)
- Confere spam/lixeira
- Vai em Resend Dashboard (`https://resend.com/emails`) e procura por entrega/falha

### "Liberar sem cobrança" sem nenhum e-mail
- Confirma que `dashboard-protecao.html` está com cache-bust `?v=20260524c`
- Hard refresh (Ctrl+Shift+R)

### Owner não recebe nada do damage-capture
- Confirma que `damage-capture` Edge Function foi re-deployada com Fase 35
- Logs em Supabase Dashboard → Functions → `damage-capture` → Logs

### Mini-log "✉ Notificações" não aparece no card
- Hard refresh
- Confirma que `dashboard-protecao.html` foi atualizado (deve ter texto "Fase 35: mini-log")

---

## 📊 Quando terminar os 6 fluxos

Manda pro Daniel um relatório:

```markdown
# Relatório QA Fase 35 — [Data]

## Resumo
- Fluxos validados: 6/6 ✅ (ou X/6)
- E-mails recebidos: Y de 15 esperados
- Bugs encontrados: Z

## Por fluxo
[Checklist acima preenchido]

## Bugs encontrados (se houver)
[lista]
```

---

## 🚀 Bom trabalho QA!

Esse é o teste mais completo que a plataforma já teve. Se passar, a malha de comunicação tá em nível de produção pra rivalizar com qualquer marketplace sério.
