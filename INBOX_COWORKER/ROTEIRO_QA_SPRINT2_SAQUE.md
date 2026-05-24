# Roteiro QA — Sprint 2: Saque Parcial Real (Stripe Manual Payouts)

> **Autor:** Claude (code-side) — 2026-05-24
> **Pra:** Cowork (QA)
> **Pré-requisitos:** Daniel já vai rodar antes:
>   - SQL `supabase-fase35a-fix-triagem-counterparty.sql` (desbloqueia Flow 6 da Fase 35)
>   - Configurar conta Stripe do Marcos em modo MANUAL payouts (instruções abaixo)

Esse roteiro fecha 3 frentes:
1. **Flow 3 Fase 35** — "Liberada sem cobrança" (pendente do seu QA)
2. **Flow 6 Fase 35** — Retest após hotfix 35a
3. **Sprint 2 Fase 32** — Saque parcial real via Stripe Connect

---

## 🎭 Personagens

- **Carlos Silva Teste** — `qa-cliente@nomadedrive.com.br` / `Teste123`
- **Marcos Pereira Teste** — `qa-proprietario@nomadedrive.com.br` / `Teste123`
- **Equipe Proteção** — `qa-protecao@nomadedrive.com.br` / `Teste123`
- **Daniel (admin)** — sua conta admin

📧 Webmail Hostinger (`contato@nomadedrive.com.br`) recebe todos.

---

## 🟢 Frente 1 — Flow 3 Fase 35: Liberar sem cobrança (pela UI da Proteção)

### Por que esse é o gap mais crítico
Antes da Fase 35, "Liberar sem cobrança" **não disparava nenhum e-mail** — cliente e proprietário ficavam no escuro. Agora dispara 2.

### Setup: criar avaria nova de teste (1 SQL)

Use reserva que ainda não foi consumida (qualquer com booking ativo). Cria avaria nova manualmente:

```sql
-- Pega o ID da reserva ativa de teste que ainda não tem avaria pendente
with target as (
  select b.id as booking_id
    from public.bookings b
    join public.profiles c on c.id = b.client_id
    join public.profiles o on o.id = b.owner_id
   where c.email = 'qa-cliente@nomadedrive.com.br'
     and o.email = 'qa-proprietario@nomadedrive.com.br'
     and b.status in ('aprovado','em_uso','encerrada')
     and not exists (
       select 1 from public.damages d
       where d.booking_id = b.id and d.status = 'pendente_revisao'
     )
   order by b.created_at desc
   limit 1
)
insert into public.damages (
  booking_id, rule_code, description, suggested_amount,
  evidence_urls, status
)
select booking_id, 'risco_lateria',
  'Avaria de TESTE — Flow 3 (Liberar sem cobrança) — pode liberar sem cobrar',
  150.00, '[]'::jsonb, 'pendente_revisao'
from target
returning id, booking_id, status;
```

⚠️ Se retornar zero linhas: ou não tem reserva sem avaria pendente, ou avise o Daniel pra criar nova.

### Passos
1. Login como `qa-protecao@nomadedrive.com.br`
2. Vai pro `dashboard-protecao.html` → seção **"Avarias para revisar"**
3. Acha a avaria de teste recém-criada (descrição "Avaria de TESTE — Flow 3")
4. Preenche **Parecer/observação**: "Avaria pré-existente conforme fotos check-in — sem cobrança (Flow 3 QA)"
5. Clica **"↩ Liberar sem cobrança"**
6. Confirma

### ✅ Esperado

**No app:**
- Toast "Decisão registrada: liberar sem cobrança"
- Status da avaria muda pra **"Liberado (sem cobrança)"** (pill cinza)
- Card mostra "Valor final: R$ 0,00"

**No Resend / webmail (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"Sua avaria foi liberada sem cobrança — Nomade Drive Brasil"** 🆕 | `qa-cliente@` |
| 2 | **"Decisão da Proteção — avaria liberada sem cobrança"** 🆕 | `qa-proprietario@` |

### ❌ Se nada saiu
- Confirma que `dashboard-protecao.html` tá com cache-bust `?v=20260524d` (último push commit 9d87d42)
- Hard refresh (Ctrl+Shift+R)
- F12 → Console → procura erro

---

## 🟢 Frente 2 — Flow 6 Fase 35 RETEST: triagem notifica contraparte

### Pré-requisito (Daniel já fez)
- `supabase-fase35a-fix-triagem-counterparty.sql` rodado (cria função RPC `get_case_counterparty`)

### Setup: usar ocorrência aberta existente OU criar nova

Já tem várias ocorrências do Flow 5 (Roubo, Multa, Pane mecânica). Se alguma ainda está `em_analise`, use ela. Se todas já foram triadas, cria nova rapidão:

1. Login `qa-cliente@nomadedrive.com.br`
2. Dashboard → "Registrar ocorrência"
3. Tipo: qualquer · Reserva: qualquer ativa · Descrição: "Nova ocorrência QA Flow 6 retest"
4. Confirma

### Passos
1. Logout → Login `qa-protecao@nomadedrive.com.br`
2. `dashboard-protecao.html` → seção **"Casos abertos — triagem"**
3. Acha a ocorrência
4. **Novo status:** "Aprovado com ressalvas" (ou "Recusado")
5. Parecer: "Retest Flow 6 — pós hotfix 35a"
6. Clica **"💾 Salvar triagem"**

### ✅ Esperado

**No app:**
- Toast verde "Triagem atualizada"
- 2 toasts "Enviando e-mail 'case_resolved_client' (server-side)..." aparecem em sequência (um pro reporter, um pra contraparte)
- Toast verde "E-mail enviado para qa-cliente@..." (reporter)
- Toast verde "E-mail enviado para qa-proprietario@..." (contraparte) 🆕

**No Resend (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"Triagem concluída — Aprovado com ressalvas"** | `qa-cliente@` (reporter) |
| 2 | **"Triagem concluída — Aprovado com ressalvas"** 🆕 | `qa-proprietario@` (contraparte) |

### ❌ Se só 1 e-mail
- Verifica no Console se aparece warning "get_case_counterparty RPC falhou"
- Se sim, o SQL não foi rodado ainda — pede pro Daniel

---

## 🟢 Frente 3 — Sprint 2 Fase 32: SAQUE PARCIAL REAL

> 🎯 **Esse é o teste mais importante do projeto.** Confirma que dinheiro real (test mode) flui da plataforma pra conta do proprietário.

### Pré-requisitos (Daniel já fez)
- ✅ Edge Function `liberar-saque-parcial` deployada
- ✅ Edge Function `stripe-webhook` re-deployada (handlers payout.paid/failed)
- ✅ Marcos com Connected Account ativa
- ✅ Marcos com **payout schedule = MANUAL** no Stripe Dashboard

### Setup pré-teste: confirmar conta Stripe + forçar marco `available`

#### Passo 0a — Confirma Connected Account do Marcos:

```sql
select pa.stripe_account_id, pa.status,
       pa.payouts_enabled, pa.charges_enabled
  from public.payout_accounts pa
  join public.profiles p on p.id = pa.user_id
 where p.email = 'qa-proprietario@nomadedrive.com.br';
```

**Esperado:** 1 linha com `status='ativo'`, `payouts_enabled=true`.

Se vazio/inativo: avisar Daniel — Marcos precisa onboardar Stripe Connect primeiro.

#### Passo 0b — Confirma modo MANUAL payouts no Stripe Dashboard:

Manualmente:
1. https://dashboard.stripe.com/test/connect/accounts/overview
2. Acha conta do `qa-proprietario@` (pega o `acct_xxx` do passo 0a)
3. Clica → **Settings** → **Payouts** → **Schedule**
4. Deve estar **"Manual"** (se estiver "Daily", pedir Daniel pra mudar)

Se não tem como você acessar Stripe Dashboard pelo navegador (RLS/policy), avisa Daniel.

#### Passo 0c — Força 1 marco como `available`:

```sql
-- Marca o primeiro marco pending do qa-cliente como available
update public.withdrawals
   set status = 'available', updated_at = now()
 where id = (
   select w.id
     from public.withdrawals w
     join public.bookings b on b.id = w.booking_id
     join public.profiles p on p.id = b.client_id
    where p.email = 'qa-cliente@nomadedrive.com.br'
      and w.status = 'pending'
    order by w.milestone_date
    limit 1
 )
 returning id, booking_id, milestone_number, amount_net, status;
```

**Esperado:** 1 linha retornada com `status='available'`. Anota o `booking_id` retornado.

Se vazio: ou todos já estão `available`/`paid`, ou não existe withdrawal pra esse cliente. Roda `select * from withdrawals` pra investigar.

### Passos do teste

1. **Logout** → Login `qa-proprietario@nomadedrive.com.br` / `Teste123`
2. **Hard refresh** (Ctrl+Shift+R) em `https://nomadedrive.com.br/reserva-detalhe.html?id=<BOOKING_ID_DO_PASSO_0C>`
3. Rola até a seção **"📅 Linha do tempo da locação"**
4. ✅ Esperado ver:
   - Track horizontal com bolinhas
   - 1 bolinha amarela pulsante (o marco que viramos pra `available`)
   - Card amarelo embaixo: **"💰 Saque disponível agora — R$ X,XX"**
5. Clica **"💸 Sacar agora"**
6. Confirm modal aparece com detalhes → clica **OK**
7. Botão vira **"⏳ Liberando saque..."** por 2-5s

### ✅ Esperado (sucesso)

**No app:**
- Alert popup:
  ```
  💰 Saque liberado!

  Valor: R$ 1.125,00
  Previsão depósito: 26/05/2026 (ou próximo)
  Stripe ID: po_xxxxx

  Você recebe e-mail de confirmação em alguns segundos.
  ```
- Botão fica "✅ Saque liberado" (estado outline)
- Timeline auto-refresh: marco vira **verde "✓ Pago"**

**No Resend (em 30s-2 min):**

| # | Assunto | Destino |
|---|---|---|
| 1 | **"💰 Saque liberado — R$ 1.125,00 — Nomade Drive Brasil"** 🆕 | `qa-proprietario@` |

E-mail tem layout verde com:
- Valor grande "R$ 1.125,00"
- "Marco N de M"
- Previsão depósito
- Stripe ID em `<code>`
- CTA "Ver no meu painel"

**No Stripe Dashboard (depois do teste):**

1. https://dashboard.stripe.com/test/connect/accounts (lista de Connected Accounts)
2. Clica na conta do `qa-proprietario@`
3. Aba **"Payouts"** — deve ter 1 payout novo:
   - `R$ 1.125,00`
   - Status: `In transit` (ou `Pending`)
   - `arrival_date` em 1-2 dias úteis
   - Description: `Nomade Drive — Saque parcial marco N`
   - Metadata: `withdrawal_id`, `booking_id`, `milestone_number`

**No DB (pra confirmar persistência):**

```sql
select id, milestone_number, amount_net, status, stripe_payout_id, paid_at
  from public.withdrawals
 where status = 'paid'
   and stripe_payout_id is not null
 order by paid_at desc
 limit 5;
```

Deve ter 1 linha nova com `stripe_payout_id` preenchido.

### ❌ Cenários de erro possíveis

| Erro | Causa provável | Fix |
|---|---|---|
| "Proprietário ainda não conectou conta Stripe" | Passo 0a vazio | Daniel onboarda Stripe Connect |
| "Conta Stripe do proprietário não está habilitada para payouts" | `payouts_enabled=false` | Onboarding incompleto |
| "Saque não disponível pra liberação" (current_status: pending) | Marco ainda não venceu | Passo 0c forçar pra available |
| "Saque não disponível" (current_status: paid) | Já foi pago | Pega outro marco |
| Stripe: "Insufficient funds" | Connected Account sem saldo | Garantir que mensalidade foi paga ANTES (assim o split rotou pra conta dele) |
| Stripe: "schedule_disabled" / similar | Payout schedule não está manual | Passo 0b — configurar manual |
| Alert "Erro de rede" | Função não foi deployada ou JWT off | Daniel re-deploya `liberar-saque-parcial` |

### Bônus: testar webhook (`payout.paid`)

No modo Test do Stripe, payouts processam rápido (segundos). Espera ~1 min e verifica:

```sql
select id, milestone_number, status, stripe_payout_id, paid_at, updated_at
  from public.withdrawals
 where stripe_payout_id is not null
 order by updated_at desc
 limit 5;
```

`paid_at` deve refletir a data real de arrival do Stripe (ou now() do nosso lado, dependendo de qual webhook chegou primeiro).

---

## 📋 Relatório final esperado (modelo)

Quando terminar, dropa em `INBOX_COWORKER/RELATORIO_SPRINT2_SAQUE.md`:

```markdown
# Relatório QA — Sprint 2 + Fase 35 fechamento

## Frente 1 — Flow 3 (Liberar sem cobrança)
- [ ] Avaria de teste criada via SQL
- [ ] Liberada pela UI da Proteção
- [ ] 📧 E-mail "Sua avaria foi liberada sem cobrança" → cliente
- [ ] 📧 E-mail "Decisão da Proteção — avaria liberada sem cobrança" → proprietário

## Frente 2 — Flow 6 retest
- [ ] Ocorrência triada
- [ ] 📧 "Triagem concluída" → reporter
- [ ] 📧 "Triagem concluída" → contraparte 🆕

## Frente 3 — Sprint 2 Saque Real
- [ ] Setup OK (Stripe Connect ativo + manual + marco available)
- [ ] Botão "Sacar agora" funcionou
- [ ] Alert de sucesso
- [ ] 📧 "Saque liberado — R$ X"
- [ ] Stripe Dashboard mostra payout
- [ ] DB tem withdrawals.status='paid' com stripe_payout_id

## Bugs encontrados
- [lista se houver]

## Pendências pro Daniel
- [se houver]
```

---

## 🚀 Quando terminar, escreve "Sprint 2 fechado" no inbox

Aí o Daniel sabe que pode partir pra próxima fase (Sprint 3 NotaZZ ou Fase 33 Painel verde).

Bom trabalho! 🎯
