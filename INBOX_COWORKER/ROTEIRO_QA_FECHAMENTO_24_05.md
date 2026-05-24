# Roteiro QA — Fechamento de validação 24/05/2026

> **Pra:** Time de QA Nomade Drive (cowork + outros)
> **Objetivo:** Validar tudo que foi entregue nas últimas 24h antes de partir
> pras próximas features (Fase 33 Painel Verde, Sprint 3 NotaZZ, etc.)
> **Tempo estimado:** ~45 min total
> **Status:** Code 100% deployado. Falta só execução de testes.

---

## 🎭 Personagens (todos senha `Teste123`)

| Personagem | Email | Papel |
|---|---|---|
| **Carlos Silva Teste** | `qa-cliente@nomadedrive.com.br` | 🧍 Cliente |
| **Marcos Pereira Teste** | `qa-proprietario@nomadedrive.com.br` | 🚗 Proprietário |
| **Equipe Proteção** | `qa-protecao@nomadedrive.com.br` | 🛡 Proteção |
| **Oficina** | `qa-oficina@nomadedrive.com.br` | 🔧 Oficina |
| **Daniel (super-admin)** | `dtrodovalho40@gmail.com` | 👑 Admin |

📧 Webmail Hostinger (`contato@nomadedrive.com.br`) recebe TODOS.

---

## ✅ Pré-requisitos (Daniel já confirmou)

- ✅ Deploys feitos: stripe-checkout, liberar-saque-parcial, send-email,
  close-rental, damage-capture, stripe-webhook, setup-manual-payouts
- ✅ SQLs rodados: fase31, 32, 32b, 32c, 34, 35a, 36
- ✅ Git push commits até `2dd156d`
- ✅ Cache-bust HTMLs `?v=20260524f`

---

## 🎯 4 frentes de teste

### Frente 1: Sprint 2 Fase 32 — Saque parcial REAL (BR refatorado)
### Frente 2: Fase 36 — Protocolo nos e-mails + UI
### Frente 3: Fase 36b — Log de atividades com filtros
### Frente 4: Re-validar Fluxos 1-4 Fase 35 (avaria/captura/liberação/contestação)

---

# 🧪 FRENTE 1 — Sprint 2 Saque Parcial Real

> **🔥 CRÍTICO:** Sprint 2 inteira depende disso. Se passar, a feature mais
> importante do projeto está validada end-to-end.

## Setup (10 min)

### Passo 1.1 — Confirmar Stripe Connect do Marcos

Roda no SQL Editor:

```sql
select pa.stripe_account_id, pa.status, pa.payouts_enabled,
       pa.charges_enabled, pa.details_submitted, p.email
  from public.payout_accounts pa
  join public.profiles p on p.id = pa.user_id
 where p.email = 'qa-proprietario@nomadedrive.com.br';
```

**Esperado:** 1 linha com `details_submitted=true`.

**Se vazio:** Marcos precisa onboardar Stripe Connect:
1. Login `qa-proprietario@` → `dashboard-proprietario.html#recebimentos`
2. Clica "Configurar conta de recebimento"
3. Completa onboarding Stripe Express (dados teste BR)

### Passo 1.2 — Criar reserva NOVA (importante!)

⚠️ **Por que reserva nova:** as cobranças antigas tinham `transfer_data` —
dinheiro já foi direto pra conta do Marcos, plataforma sem saldo. Reserva
nova vai usar o fluxo refatorado (dinheiro fica na plataforma).

```sql
-- Cria reserva nova com Fiat Argo (ou outro veículo aprovado livre)
insert into public.bookings (
  client_id, owner_id, vehicle_id,
  start_date, end_date,
  monthly_price, platform_fee, owner_estimated_amount, deposit_amount,
  status, billing_mode
)
select
  c.id, o.id,
  (select v.id from public.vehicles v
    join public.profiles op on op.id = v.owner_id
   where op.email = 'qa-proprietario@nomadedrive.com.br'
     and v.status = 'aprovado'
   order by v.created_at desc limit 1),
  current_date, current_date + interval '90 days',
  2500.00, 250.00, 2250.00, 1000.00,
  'aprovado', 'monthly'
from public.profiles c, public.profiles o
where c.email = 'qa-cliente@nomadedrive.com.br'
  and o.email = 'qa-proprietario@nomadedrive.com.br'
returning id, vehicle_id, monthly_price;
```

**Esperado:** 1 linha com novo `id` da reserva. **Anota esse UUID** — vai precisar.

### Passo 1.3 — Pagar mensalidade da reserva nova

1. Login `qa-cliente@nomadedrive.com.br`
2. Vai pra `https://nomadedrive.com.br/reserva-detalhe.html?id=<UUID_RESERVA_NOVA>`
3. Clica **"Pagar mensalidade"**
4. Stripe Checkout abre — paga com `4242 4242 4242 4242` (CVC 123, data 12/30, CEP 01310-100)
5. **Esperado:** confirmação de pagamento, dashboard mostra "Mensalidade paga"

> 💡 **Validação técnica:** verificar no Stripe Dashboard
> [https://dashboard.stripe.com/test/balance](https://dashboard.stripe.com/test/balance)
> que **saldo da plataforma aumentou +R$ 2.500** (não foi direto pra Connected
> Account como antes — esse é o teste real do refactor BR).

### Passo 1.4 — Forçar marco como `available`

Cron diário ainda não promoveu nenhum (reserva nova). Força manualmente:

```sql
update public.withdrawals
   set status = 'available', updated_at = now()
 where booking_id = '<UUID_RESERVA_NOVA>'
   and milestone_number = 1
 returning id, milestone_number, amount_net, status;
```

**Esperado:** 1 linha com `status='available'`.

## Teste de fato (5 min)

### Passo 1.5 — Logar como Marcos e sacar

1. Logout do Carlos → Login `qa-proprietario@nomadedrive.com.br`
2. Abre a reserva nova: `reserva-detalhe.html?id=<UUID>`
3. Hard refresh (Ctrl+Shift+R)
4. Rola até **"📅 Linha do tempo da locação"**
5. Card amarelo "💰 Saque disponível agora — R$ 1.125,00"
6. Clica **"💸 Sacar agora"**
7. Confirma modal

### ✅ Resultado esperado

**Alert popup:**
```
💰 Saque liberado!
Valor: R$ 1.125,00
Previsão depósito: 1-2 dias úteis (depósito automático Stripe BR)
Stripe ID: tr_xxxxx
```

🔥 **Atenção:** o ID começa com `tr_` (Transfer) — não mais `po_` (Payout).
Esse é a confirmação visual do refactor BR funcionando.

**Stripe Dashboard:**
- [https://dashboard.stripe.com/test/connect/transfers](https://dashboard.stripe.com/test/connect/transfers)
- Deve ter 1 transfer novo: `R$ 1.125,00` → conta do Marcos
- Description: "Nomade Drive — Saque parcial marco 1"

**Webmail Hostinger:**
- 📧 E-mail "💰 Saque liberado — R$ 1.125,00 — Nomade Drive Brasil"
- Recebido em ~30s-2min
- Rodapé deve ter: **📋 Protocolo: RS-2026-####** (Fase 36)

**Banco de dados:**
```sql
select id, milestone_number, amount_net, status, stripe_payout_id, paid_at
  from public.withdrawals
 where status = 'paid' and stripe_payout_id is not null
 order by paid_at desc limit 3;
```

Esperado: linha nova com `stripe_payout_id` começando com `tr_`.

### ❌ Possíveis erros

| Erro | Causa | Fix |
|---|---|---|
| "Insufficient funds" | Pagamento não foi feito ou foi com transfer_data antigo | Refazer passo 1.3, conferir saldo da plataforma cresceu |
| "Conta com onboarding incompleto" | `details_submitted=false` | Refazer passo 1.1 |
| "Saque não disponível" | Marco não está `available` | Refazer passo 1.4 |

---

# 🧪 FRENTE 2 — Fase 36 Protocolo nos e-mails + UI

## Setup
Use ocorrência/contestação que já tiver no sistema OU cria nova rapidão.

## Teste 2.1 — KPI Protocolo na reserva-detalhe

1. Abre qualquer reserva: `reserva-detalhe.html?id=<UUID>`
2. Hard refresh
3. **Esperado:** no cabeçalho aparece KPI "Protocolo" com valor `RS-2026-####`
   (não mais "—" — porque SQL Fase 36 já rodou)

✅ Confirma — se mostra "RS-2026-NNNN" → backfill funcionou.

## Teste 2.2 — Rodapé "📋 Protocolo" em e-mail de triagem

1. Login `qa-protecao@` → `dashboard-protecao.html` → seção **Casos abertos**
2. Triagem qualquer caso (status final: Aprovado/Recusado/etc)
3. Clica **"💾 Salvar triagem"**
4. Toast verde aparece
5. Espera 1 min, abre webmail Hostinger
6. Abre o e-mail "Triagem concluída — ..."
7. **Esperado no rodapé:**
   ```
   Nomade Drive Brasil · Uberlândia/MG
   nomadedrive.com.br · Para tirar dúvidas...
   📋 Protocolo: PR-2026-####    ← LINHA NOVA (fonte monospace)
   Disponibilidade, proteção, caução...
   ```

✅ Se vê a linha "📋 Protocolo:" — está funcionando.

## Teste 2.3 — Rodapé em e-mail de contestação

1. Login `qa-cliente@` → `dashboard-cliente.html` → seção **Avarias**
2. Acha avaria com botão "Contestar" disponível (status aprovado_captura ou resolvido, sem client_dispute)
3. Preenche contestação (mín 20 chars) → enviar
4. Espera 1 min, abre webmail
5. Abre "Contestação registrada — Nomade Drive Brasil"
6. **Esperado:** rodapé com **📋 Protocolo: AV-2026-####**

✅ Confirma se aparece AV-####.

---

# 🧪 FRENTE 3 — Fase 36b Log de atividades com filtros

## Teste 3.1 — Colapsar/expandir

1. Login admin (`dtrodovalho40@gmail.com`)
2. `admin.html#log`
3. Vê botão **"▲ Colapsar"** no canto direito do h2
4. Clica → tabela some, botão vira "▼ Expandir"
5. Clica de novo → tabela volta

## Teste 3.2 — Filtros

Toolbar tem:
- Dropdown "Alvo" (Reservas, Veículos, Vistorias, etc.)
- Dropdown "Ação" (Criação, Mudança de status, Bloqueios, Outros)
- Dropdown "Período" (Hoje, 7d, 30d, Tudo)
- Input busca por texto
- Botão "↺ Limpar"

### Subtestes

| # | Ação | Esperado |
|---|---|---|
| 3.2.a | Seleciona "Reservas" no Alvo | Lista filtra só registros de bookings, contador "X de Y" |
| 3.2.b | + Seleciona "Mudança de status" na Ação | Lista filtra ainda mais |
| 3.2.c | Seleciona "Hoje" no Período | Mostra só de hoje |
| 3.2.d | Digite "Onix" na busca | Filtra por texto |
| 3.2.e | Clica "↺ Limpar" | Volta todos os filtros pro default, lista mostra tudo |

✅ Se todos os 5 subtestes passam → filtros OK.

## Teste 3.3 — NÃO tem botão de apagar

(Garantia de compliance — auditoria não pode ser apagada)

- ✅ Sem checkbox em cada linha
- ✅ Sem botão "Apagar selecionados"
- ✅ Sem botão 🗑 individual em cada linha

---

# 🧪 FRENTE 4 — Re-validar Fluxos 1-4 Fase 35

> Esses ficaram pendentes na sua última sessão por falta de avaria/caução nova.
> Agora que tem reserva nova (frente 1) com caução autorizada, dá pra validar.

## Pré-req: autorizar caução da reserva nova

1. Login `qa-cliente@` → reserva nova (mesma da frente 1)
2. Seção Pagamentos → "Autorizar caução"
3. Stripe Checkout → cartão 4242 → confirma
4. ✅ "Caução autorizada" no app

## Fluxo 1 (Avaria registrada)

1. Login `qa-cliente@` → solicita devolução
2. Login `qa-proprietario@` → aprova devolução COM avaria
3. Preenche: "Risco no para-choque QA fluxo 1" / valor R$ 280 / sem foto
4. Confirma

### ✅ Esperado: 2 e-mails
- "Devolução recebida — avaria em análise" → `qa-cliente@`
- "Avaria registrada — aguardando análise da Proteção" → `qa-proprietario@`

## Fluxo 2 (Captura aprovada)

1. Login `qa-protecao@` → "Avarias para revisar"
2. Acha a avaria do fluxo 1
3. Valor final: 280 / Parecer: "Confirmado pelas fotos / QA fluxo 2"
4. Clica **"💰 Aprovar captura"**

### ✅ Esperado: 2 e-mails
- "Avaria — decisão da Proteção (captura R$ 280)" → `qa-cliente@`
- "Decisão da Proteção — captura de R$ 280 aprovada" → `qa-proprietario@`

E no Stripe: PaymentIntent da caução capturada parcialmente.

## Fluxo 3 (Liberar sem cobrança) — gap mais crítico

1. Cria avaria nova via SQL pra ter outra disponível:

```sql
with target as (
  select b.id as booking_id
    from public.bookings b
    join public.profiles c on c.id = b.client_id
   where c.email = 'qa-cliente@nomadedrive.com.br'
   order by b.created_at desc limit 1
)
insert into public.damages (
  booking_id, rule_code, description, suggested_amount,
  evidence_urls, status
)
select booking_id, 'risco_lateria',
  'Avaria TESTE — Flow 3 — pode liberar sem cobrar',
  150.00, '[]'::jsonb, 'pendente_revisao'
from target returning id, booking_id;
```

2. Login `qa-protecao@` → acha avaria nova
3. Parecer: "Avaria pré-existente, sem cobrança / QA fluxo 3"
4. Clica **"↩ Liberar sem cobrança"**

### ✅ Esperado: 2 e-mails NOVOS
- "Sua avaria foi liberada sem cobrança" → `qa-cliente@` (azul, antes não saía nada!)
- "Decisão da Proteção — avaria liberada sem cobrança" → `qa-proprietario@`

## Fluxo 4 (Contestação)

1. Login `qa-cliente@` → seção Avarias → acha a que foi capturada no fluxo 2
2. Botão "Contestar" → preenche (mín 20 chars): "Avaria pré-existente conforme fotos check-in / QA fluxo 4"
3. Enviar

### ✅ Esperado: 3 e-mails
- "Contestação registrada — Nomade Drive Brasil" → `qa-cliente@`
- "[Proteção] Nova contestação de avaria — 2ª análise" → `suporte@`
- "Cliente contestou a avaria — 2ª análise da Proteção" → `qa-proprietario@`

---

# 📋 Checklist final (imprima e marque)

## Frente 1 — Sprint 2 Saque
- [ ] Setup: Stripe Connect Marcos OK + reserva nova criada + paga
- [ ] Saldo da plataforma cresceu +R$ 2.500 no Stripe Dashboard
- [ ] Marco forçado pra `available`
- [ ] Botão "Sacar agora" funcionou
- [ ] Alert "Stripe ID: tr_xxx" (não po_)
- [ ] Transfer visível no Stripe Dashboard
- [ ] 📧 E-mail "💰 Saque liberado" recebido
- [ ] Rodapé do e-mail mostra "📋 Protocolo: RS-..."
- [ ] DB withdrawals: 1 linha `status=paid` com `stripe_payout_id` tr_*

## Frente 2 — Fase 36 Protocolo
- [ ] KPI "Protocolo" RS-#### aparece em reserva-detalhe
- [ ] E-mail triagem: rodapé com 📋 PR-####
- [ ] E-mail contestação: rodapé com 📋 AV-####

## Frente 3 — Log com filtros
- [ ] Botão Colapsar/Expandir funciona
- [ ] Filtro Alvo funciona
- [ ] Filtro Ação funciona
- [ ] Filtro Período funciona
- [ ] Busca livre funciona
- [ ] Botão "↺ Limpar" reseta
- [ ] SEM botões de apagar (compliance OK)

## Frente 4 — Fluxos 1-4 Fase 35
- [ ] Fluxo 1: 2 e-mails (avaria registrada)
- [ ] Fluxo 2: 2 e-mails + captura no Stripe
- [ ] Fluxo 3: 2 e-mails NOVOS (liberar sem cobrança)
- [ ] Fluxo 4: 3 e-mails (contestação)

---

# 📊 Modelo de relatório final

Quando terminar TODAS as frentes, dropa em `INBOX_COWORKER/RELATORIO_QA_24_05_FECHAMENTO.md`:

```markdown
# Relatório QA Fechamento — 24/05/2026

## Score
- Frente 1 (Sprint 2 Saque): X/9 itens ✅/⚠️/❌
- Frente 2 (Fase 36 Protocolo): X/3 ✅/⚠️/❌
- Frente 3 (Log filtros): X/7 ✅/⚠️/❌
- Frente 4 (Fluxos 1-4 Fase 35): X/4 ✅/⚠️/❌
- **TOTAL: XX/23 itens (XX%)**

## Frente 1
[checklist preenchido + observações]

## Frente 2
...

## Frente 3
...

## Frente 4
...

## Bugs encontrados
- [lista se houver, com Issue.md correspondente]

## Pendências pro Daniel
- [se houver]
```

---

# 🚀 Quando terminar

Escreve "QA fechamento OK" no inbox que o Daniel sabe que pode partir pra **Fase 33 (Painel Verde)** ou **Sprint 3 (NotaZZ)** com segurança.

Se algo der errado, dropa um `BUG_<feature>.md` que eu (code-side) fixo.

Bom trabalho! 🎯
