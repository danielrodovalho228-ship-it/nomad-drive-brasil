# 🚀 Proposta de Melhorias — Timeline + Saques Parciais + Painel de Status

> **Autor:** Claude (assistente do Daniel)
> **Data:** 2026-05-23
> **Status:** Proposta inicial pra discussão
> **Daniel:** lê com calma amanhã, me chama pra ajustar o que quiser

---

## 📝 Resumo executivo

Duas features novas que aumentam **confiança**, **transparência** e **engajamento** dos 2 lados (cliente + proprietário):

1. **Timeline da locação com saques parciais a cada 15 dias** — proprietário vê dinheiro entrando antes do fim do mês, cliente vê progresso visual da reserva
2. **Painel de status do veículo "tudo verde"** — proprietário vê que o carro tá OK sem violar privacidade do cliente (LGPD-safe), com notificações configuráveis

Mais 5 bônus de ideias no fim.

---

## ⭐ Feature 1 — Timeline + Saques Parciais a cada 15 dias

### 💡 Conceito

Hoje: cliente paga R$ 2.500 → 30 dias depois o proprietário recebe os R$ 2.250 (90%).

Proposta: cliente paga normalmente, mas **o proprietário pode sacar antecipado a cada 15 dias** (R$ 1.125 por janela), conforme o cliente vai "ganhando confiança" (sem avarias, sem multas, sem atrasos).

**Por que isso é poderoso:**
- ✅ Proprietário tem **fluxo de caixa antecipado** (importante pra quem tira sustento do carro)
- ✅ Cliente sente o **progresso da reserva** (não é só "uma fatura mensal", é um relacionamento ativo)
- ✅ **Gamificação leve**: "você liberou R$ 1.125 pro proprietário porque está cuidando bem!"
- ✅ Diferenciação clara vs. concorrência

### 💎 Adição: "Seu veículo já rendeu R$..." (dopamine loop)

> **Decisão do Daniel (23/05/2026):** incluir um contador grande e vivo de quanto o veículo já rendeu, atualizando em tempo real (acréscimo diário). Cria hábito de checagem ("igual app de investimento") → reduz churn brutalmente.

**Como funciona:**
- Cada dia da locação acumula proporcionalmente: `R$ 2.250/mês ÷ 30 dias = R$ 75/dia`
- Contador grande no topo do dashboard do proprietário: **"💰 Seu Onix já rendeu R$ 1.872,50"**
- Mostra próximo saque, projeção pra fim do contrato, comparação com período anterior
- Anima ao carregar (count-up de 0 até o valor — efeito visual)

**Mockup do contador (topo do dashboard-proprietario.html):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Bem-vindo de volta, João! 👋                                   │
│                                                                 │
│              ╭──────────────────────────────────╮               │
│              │                                  │               │
│              │   💰 Sua frota já rendeu         │               │
│              │                                  │               │
│              │      R$ 1.872,50 ▴               │               │
│              │   ━━━━━━━━━━━━━━━━━━━━━━━━━      │               │
│              │   +R$ 75 hoje  ·  +R$ 525 esta semana            │
│              │                                  │               │
│              ╰──────────────────────────────────╯               │
│                                                                 │
│  📊 Disponível pra saque agora ............ R$ 1.125,00         │
│  📅 Próximo saque liberado .................. em 8 dias         │
│  📈 Projeção fim do contrato ............... R$ 4.500,00        │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ 1 veículo locado    │  │ 0 avarias no período│               │
│  │ 🚗 Onix 2022        │  │ ⭐⭐⭐⭐⭐         │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Múltiplos veículos** (proprietário com mais de 1 carro na frota):

```
┌─────────────────────────────────────────────────────────────────┐
│   💰 Sua frota já rendeu R$ 5.430,00 ▴ +R$ 225 hoje             │
├─────────────────────────────────────────────────────────────────┤
│  🚗 Chevrolet Onix 2022      R$ 1.872,50 ▴   Carlos Silva       │
│  🚗 Hyundai HB20 2023        R$ 2.430,00 ▴   Mariana Costa      │
│  🚗 VW T-Cross 2024          R$ 1.127,50 ▴   Pedro Oliveira     │
└─────────────────────────────────────────────────────────────────┘
```

**Detalhes técnicos do contador:**

```javascript
// dashboard-proprietario.html — script novo
async function loadEarningsCounter() {
  const { data } = await sb.from('owner_earnings').select('*').eq('owner_id', user.id);
  const total = data.reduce((sum, row) => sum + row.accrued_amount, 0);

  // Animação count-up de 0 até total
  const el = document.getElementById('earnings-total');
  let current = 0;
  const step = total / 60; // 60 frames pra completar
  const tick = setInterval(() => {
    current += step;
    if (current >= total) { current = total; clearInterval(tick); }
    el.textContent = current.toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL'
    });
  }, 16); // ~60fps
}

// Refresh leve a cada 30s pra simular "tempo real" (na verdade DB calcula em real-time)
setInterval(loadEarningsCounter, 30000);
```

**Comparações motivacionais** (rotativas, mostra 1 por refresh):
- "+R$ 75 hoje · subiu como sempre 📈"
- "Seu carro vai render mais que sua poupança no semestre"
- "Faltam R$ 627 pra próximo saque"
- "78% do contrato concluído — ⭐⭐⭐⭐⭐"
- "Você está no top 20% de proprietários ativos"
- "Seu carro trabalhou enquanto você dormia 💤"

**Por que isso funciona** (psicologia):
- **Variable reward** (Hooked, Nir Eyal): cada visita mostra um número um pouco maior
- **Loss aversion**: depois que vê o saldo, "perder" é cancelar a locação
- **Anchoring**: vê que rende mais que outras alternativas (poupança, etc.)
- **Sense of progress**: barra de progresso visível em direção a saque/fim contrato

---

### 🎨 Mockup da Timeline (UI no app)

**Pro cliente** (em `reserva-detalhe.html`):

```
┌─────────────────────────────────────────────────────────────────┐
│  Sua locação — Chevrolet Onix 2022                              │
│  60 dias • 24/mai até 22/jul                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   24/mai   8/jun     23/jun    8/jul    22/jul                  │
│    🚗 ━━━━━━●━━━━━━━━●━━━━━━━━●━━━━━━━━🏁                       │
│    │       │         │         │        │                       │
│  Início  Marco 1   Marco 2   Marco 3   Fim                      │
│   ✅      ✅ R$1k    ⏳        ⏳        ⏳                       │
│  Pago    Avaliado   Em curso                                    │
│  R$2.5k  ⭐⭐⭐⭐⭐                                              │
│                                                                 │
│  💬 Você está em ótimo padrão! Continue assim e nas próximas    │
│     semanas o proprietário libera novos saques. Isso significa  │
│     que você está sendo um cliente exemplar 🎉                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pro proprietário** (em `dashboard-proprietario.html`):

```
┌─────────────────────────────────────────────────────────────────┐
│  Locação ativa — Carlos Silva alugando seu Onix                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   24/mai   8/jun     23/jun    8/jul    22/jul                  │
│    🚗 ━━━━━━●━━━━━━━━●━━━━━━━━●━━━━━━━━🏁                       │
│    │       │         │         │        │                       │
│  Início  Saque #1   Saque #2  Saque #3  Final                   │
│           R$1.125    R$1.125   R$1.125   R$1.125                │
│           ✅ Pago    💰 Hoje!  ⏳ em 15d  ⏳ em 30d              │
│           24/mai     08/jun                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  💰 Saque disponível agora                              │   │
│  │  R$ 1.125,00 (já descontada comissão Nomade Drive 10%)  │   │
│  │  Carlos está com 0 avarias, 0 multas, 0 atrasos ⭐⭐⭐⭐⭐│   │
│  │                                                         │   │
│  │  [ 💸 Sacar agora ]  [ ⏸ Acumular pro próximo marco ]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 🏗️ Como configurar no Stripe (3 opções)

**OPÇÃO A — Manual Payouts (recomendada)** ⭐

> **Conceito:** Mantém subscription mensal como tá hoje. Configurar a **Connected Account do proprietário como "manual payouts"**. A plataforma controla quando libera o dinheiro pra ele.

**Como funciona:**
1. Subscription mensal continua igual (R$ 2.500 a cada 30 dias)
2. Stripe processa o split automaticamente (10% pra plataforma via `application_fee_amount`, 90% pra conta do proprietário)
3. **Mas o dinheiro fica retido na conta Connect do proprietário** (`payouts_enabled: false`)
4. A cada 15 dias, **se o cliente está em bom padrão**, a plataforma chama `stripe.payouts.create()` na conta do proprietário pra liberar R$ 1.125
5. No 30º dia, mesmo processo pra liberar o segundo R$ 1.125

**Prós:**
- ✅ Estrutura simples — não muda nada na subscription
- ✅ Plataforma tem controle total sobre liberação
- ✅ Se rolar avaria/multa, pode segurar o saque
- ✅ Stripe já tem API pronta (`Account Update` + `Payouts API`)

**Contras:**
- ⚠️ Precisa configurar Connected Account com `settings.payouts.schedule.interval: 'manual'` na onboarding
- ⚠️ Plataforma assume "fiel depositário" → implicação fiscal a validar com contador

**Stripe API (exemplo):**
```typescript
// Setup inicial da conta do proprietário (no onboarding):
await stripe.accounts.update(connectedAccountId, {
  settings: {
    payouts: { schedule: { interval: 'manual' } }
  }
});

// A cada 15 dias (Cron job ou Edge Function agendada):
await stripe.payouts.create(
  { amount: 112500, currency: 'brl' }, // R$ 1.125 em centavos
  { stripeAccount: connectedAccountId }
);
```

---

**OPÇÃO B — Subscription quinzenal (R$ 1.250 a cada 15 dias)**

> **Conceito:** Em vez de R$ 2.500/mês, cobra R$ 1.250 a cada 15 dias. Split automático funciona normal.

**Prós:**
- ✅ Mais "natural" — pagamento e payout sincronizados
- ✅ Cliente sente a cobrança menor (psicologicamente leve)
- ✅ Cancelamento mais granular (cliente pode sair com 15d, não 30d)

**Contras:**
- ⚠️ **Dobra a quantidade de NFs** (2/mês em vez de 1)
- ⚠️ **Dobra o risco de falha de cobrança** (mais charge = mais chance de declínio)
- ⚠️ Em PIX Automático: cada cobrança gera 1 prompt no banco do cliente (chato)
- ⚠️ Quebra o modelo mental de "mensalidade"

**Stripe:**
```typescript
// Criar Price com interval biweekly
const price = await stripe.prices.create({
  unit_amount: 125000,
  currency: 'brl',
  recurring: { interval: 'day', interval_count: 15 },
  product: productId
});
```

---

**OPÇÃO C — Split + Hold + Liberação manual**

> **Conceito:** Cobra R$ 2.500 mensal, mas configura `transfer_data.destination` com flag de hold. A cada 15d, faz `stripe.transfers.create()` pro proprietário.

**Prós:**
- ✅ Máximo controle por evento (não por payout)

**Contras:**
- ⚠️ Mais complexo de implementar
- ⚠️ Diff com Opção A pequeno na prática

---

### 📊 Comparação rápida

| Aspecto | Opção A (Manual Payout) | Opção B (Quinzenal) | Opção C (Hold + Transfer) |
|---|---|---|---|
| Esforço de implementação | 🟢 Médio | 🟢 Baixo | 🔴 Alto |
| Impacto fiscal (NF) | 🟢 1 NF/mês | 🔴 2 NF/mês | 🟢 1 NF/mês |
| UX do cliente | 🟢 Padrão | 🟡 Cobranças mais frequentes | 🟢 Padrão |
| Controle da plataforma | 🟢 Total | 🟡 Limitado | 🟢 Total |
| Compatível com Pix Auto | 🟢 Sim | 🟡 Cada PIX = prompt | 🟢 Sim |
| **Recomendado?** | ⭐ **Sim** | Não pra MVP | Talvez v2 |

---

### 🧾 Geração de NF parcial

Quando o proprietário saca R$ 1.125, **2 NFs precisam ser emitidas**:

1. **NF do proprietário pra plataforma** (de prestação de serviço) — valor: R$ 125 (10% comissão)
2. **NF da plataforma pro cliente** (referente à parcela do aluguel) — valor: R$ 1.250 proporcional

**Opções de integração:**

| Serviço | Preço | API | Observação |
|---|---|---|---|
| **NotaZZ** | R$ 0,40/NF | REST ✅ | + barato, ABRASF |
| **eNotas** | R$ 0,99/NF | REST ✅ | + popular, vários municípios |
| **NFe.io** | R$ 0,49/NF | REST ✅ | + flexível |
| **Bling** | R$ 36/mês + R$0,30/NF | REST ✅ | + completo (gestão integrada) |

**Recomendação:** começar com **NotaZZ** ou **eNotas** (mais barato, integração direta).

**Edge Function nova:** `emitir-nf-parcial` chamada quando saque é confirmado.

```typescript
// supabase/functions/emitir-nf-parcial/index.ts
async function emitirNFParcial(saqueId: string) {
  const saque = await getSaque(saqueId);

  // NF 1: plataforma → cliente (aluguel parcial)
  await notaZZ.emitir({
    cliente: saque.cliente,
    servico: `Aluguel mensal — Marco ${saque.marco} de ${saque.total_marcos}`,
    valor: saque.valor_bruto, // R$ 1.250
    iss: 0.05 // 5% ISS Uberlândia
  });

  // NF 2: proprietário → plataforma (comissão)
  await notaZZ.emitir({
    cliente: NOMADE_DRIVE_CNPJ,
    prestador: saque.proprietario_cnpj,
    servico: `Disponibilização de veículo — Marco ${saque.marco}`,
    valor: saque.valor_proprietario // R$ 1.125
  });
}
```

---

### 📧 E-mails automáticos da timeline

Novos e-mails a adicionar (todos via Resend):

| # | Quando dispara | Pra quem | Assunto |
|---|---|---|---|
| 15 | D-2 do marco | Proprietário | "Faltam 2 dias pro seu próximo saque (R$ 1.125)" |
| 16 | Dia do marco | Proprietário | "💰 Saque disponível! R$ 1.125 prontos pra você" |
| 17 | D+3 se não sacou | Proprietário | "Lembrete: você tem R$ 1.125 acumulado" |
| 18 | Saque confirmado | Proprietário | "Saque confirmado — NF emitida" (anexa PDF da NF) |
| 19 | Marco atingido (qualquer) | Cliente | "Você completou Marco #N! Continue cuidando bem 🎉" |
| 20 | Avaria/multa no período | Proprietário | "Saque pausado: avaria registrada — em análise" |

---

### 🗓️ Roll-out em fases

**Fase 1 (MVP — 1 semana):**
- Schema SQL: tabela `withdrawals` (saques) com FK pra `bookings`
- Lógica de cálculo de marcos (a cada 15d a partir de `start_date`)
- Botão "Sacar" no dashboard proprietário (manual, sem automação ainda)
- Timeline visual básica (sem mockup completo, só lista)

**Fase 2 (Stripe — 2 semanas):**
- Configurar Connected Accounts pra `manual payouts`
- Edge Function `liberar-saque-parcial` que chama `stripe.payouts.create()`
- Webhook handler pra `payout.paid` e `payout.failed`

**Fase 3 (NF — 1 semana):**
- Integração com NotaZZ ou eNotas
- Edge Function `emitir-nf-parcial`
- Upload do PDF da NF no bucket `documents`
- Link de download no card de saque

**Fase 4 (UI premium — 1 semana):**
- Timeline visual completa (SVG ou Canva)
- Animação de progresso
- Gamificação ("⭐⭐⭐⭐⭐ Cliente Exemplar")
- E-mails branded com a timeline embarcada

**Tempo total estimado:** ~5 semanas.

---

## ⭐ Feature 2 — Painel de Status do Veículo "Tudo Verde"

### 💡 Conceito

Hoje: proprietário aluga o carro, "perde de vista" e só sabe se algo deu errado quando a Nomade Drive notifica.

Proposta: **um painel visual que diz "tudo bem" todo dia**, sem revelar dados privados do cliente (LGPD-safe).

**Por que isso é poderoso:**
- ✅ **Paz de espírito** pro proprietário (vê que o carro tá OK)
- ✅ **Diferencial vs. concorrência** (transparência operacional)
- ✅ **LGPD-safe** (só agregados, não localização)
- ✅ **Reforça a marca** ("Nomade Drive cuida do seu carro")

### 🎨 Mockup do Painel

```
┌──────────────────────────────────────────────────────────────────┐
│  🚗 Chevrolet Onix 2022 · Placa BRA-1234           ⚙ Configurar │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│              ╭──────────────────────╮                            │
│              │                      │      ╔═════════════════╗   │
│              │   ┌────────┐         │      ║                 ║   │
│              │   │  🚗    │         │      ║   🟢 TUDO OK    ║   │
│              │   │        │         │      ║                 ║   │
│              │   └────────┘         │      ║  Operando bem   ║   │
│              │                      │      ║                 ║   │
│              ╰──────────────────────╯      ╚═════════════════╝   │
│                                                                  │
│              Última atualização: agora há pouco                  │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                  │
│  │ 🟢 Rastreador      │  │ 🟢 Sem alertas     │                  │
│  │    Conectado       │  │    críticos        │                  │
│  └────────────────────┘  └────────────────────┘                  │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                  │
│  │ 🟢 Bateria GPS     │  │ 🟢 Manutenção      │                  │
│  │    98%             │  │    Em dia          │                  │
│  └────────────────────┘  └────────────────────┘                  │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                  │
│  │ 🟢 Em uso          │  │ 🟢 Sem multas      │                  │
│  │    autorizado      │  │    pendentes       │                  │
│  └────────────────────┘  └────────────────────┘                  │
│                                                                  │
│  ────────────────────────────────────────────────────────────    │
│                                                                  │
│  📍 Região: Triângulo Mineiro                                    │
│     (área de uso autorizada — localização exata só em            │
│     emergências, conforme termo de privacidade)                  │
│                                                                  │
│  💬 "Seu veículo está sendo bem cuidado por Carlos Silva.        │
│     Próxima revisão agendada para 12/jun (5.000km)"              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 🔒 LGPD: O que mostrar vs. o que esconder

**✅ MOSTRAR pro proprietário** (agregados, privacy-safe):

| Indicador | Fonte | Tipo |
|---|---|---|
| 🟢 Rastreador conectado | Cobli API | boolean |
| 🟢 Bateria do GPS | Cobli API | percentual |
| 🟢 Sem alertas críticos | Cobli + interno | boolean |
| 🟢 Em uso autorizado | DB interno | boolean |
| 🟢 Sem multas pendentes | Infosimples | boolean |
| 🟢 Manutenção em dia | DB interno (km baseline) | boolean |
| 📍 Região (não cidade exata) | Cobli (geofence agregada) | região |
| 📅 Próxima manutenção | DB interno | data |

**❌ ESCONDER pro proprietário** (privado, só plataforma vê):

| Dado | Por quê |
|---|---|
| ❌ Localização GPS exata | Privacidade do cliente |
| ❌ Rotas percorridas | Vigilância comportamental |
| ❌ Velocidade instantânea | Estranho/intrusivo |
| ❌ Horários específicos de uso | Pode inferir rotina pessoal |
| ❌ Endereço residencial do cliente | Já protegido |
| ❌ Padrões de uso | Não tem propósito legítimo |

**Plataforma usa só em:**
- 🚨 Sinistro/colisão (acionamento automático Cobli)
- 🚨 Roubo/furto (BO + acionamento policial)
- ⚠️ Alerta de área não-autorizada (cliente saiu da região contratada)
- ⚠️ Investigação de avaria (correlacionar com data/hora do incidente)

---

### 🔔 Sistema de notificações configurável

**Página de configuração** (em `dashboard-proprietario.html` → "Configurar notificações"):

```
┌──────────────────────────────────────────────────────────────┐
│  🔔 Como você quer ser notificado?                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 STATUS PERIÓDICO (veículo OK)                            │
│                                                              │
│  ⚪ Não me notificar (só alertas críticos)                   │
│  ⚪ Diariamente, às 09:00                                    │
│  🔘 Semanalmente, segunda 09:00       ← selecionado          │
│  ⚪ Quinzenalmente (alinhado com saques)                     │
│  ⚪ Mensalmente, dia 1º                                      │
│                                                              │
│  📱 CANAIS                                                   │
│  ☑ E-mail (qa-proprietario@nomadedrive.com.br)               │
│  ☑ Push no navegador (PWA)                                   │
│  ☐ WhatsApp (em breve)                                       │
│  ☐ SMS (plano premium)                                       │
│                                                              │
│  🚨 ALERTAS CRÍTICOS (sempre ativados, não desabilita)       │
│  ✓ Saída de região autorizada                                │
│  ✓ Bateria GPS abaixo de 20%                                 │
│  ✓ Avaria reportada                                          │
│  ✓ Multa nova detectada                                      │
│  ✓ Acionamento de seguro/sinistro                            │
│                                                              │
│  💰 NOTIFICAÇÕES FINANCEIRAS                                 │
│  ☑ Saque disponível                                          │
│  ☑ NF emitida                                                │
│  ☑ Próxima manutenção em 7 dias                              │
│                                                              │
│  [ 💾 Salvar preferências ]                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 🏗️ Implementação técnica

**Backend:**

1. **Tabela nova `notification_preferences`:**
```sql
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status_frequency text check (status_frequency in ('off','daily','weekly','biweekly','monthly')),
  channels jsonb default '["email"]'::jsonb,  -- ['email','push','whatsapp','sms']
  financial_alerts boolean default true,
  critical_alerts boolean default true,  -- não desabilita
  last_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index on public.notification_preferences(user_id);
```

2. **Tabela nova `vehicle_status_snapshots`** (agrega dados periodicamente):
```sql
create table public.vehicle_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  tracker_connected boolean,
  tracker_battery_pct int,
  has_critical_alerts boolean,
  in_authorized_region boolean,
  pending_fines_count int,
  maintenance_status text, -- 'em_dia', 'proxima', 'atrasada'
  overall_status text,     -- 'green', 'yellow', 'red'
  raw_data jsonb,          -- payload completo da Cobli
  created_at timestamptz default now()
);

create index on public.vehicle_status_snapshots(vehicle_id, created_at desc);
```

3. **Edge Function `sync-vehicle-status`** (chamada a cada 5 min via cron):
   - Pega lista de veículos com locação ativa
   - Chama Cobli API pra cada um
   - Calcula `overall_status`
   - Salva snapshot no DB
   - Se mudou pra `yellow`/`red`, dispara alerta crítico

4. **Edge Function `send-periodic-status`** (chamada diária 9h via cron):
   - Lê `notification_preferences` de todos os proprietários
   - Filtra quem deve receber hoje (`weekly`: só segunda, `monthly`: só dia 1, etc.)
   - Pega último snapshot do veículo deles
   - Dispara e-mail/push com resumo

**Frontend:**

5. **Página `painel-veiculo.html`** (ou seção em `dashboard-proprietario.html`):
   - SVG do carro com indicadores ao redor
   - Cards de status (rastreador, bateria, etc.)
   - Botão "Configurar notificações" → modal/página

6. **Service Worker já existe** (PWA) — só precisa registrar Push Subscription e fazer backend dispatch.

**Bibliotecas sugeridas:**
- **SVG do carro:** podemos desenhar inline ou usar [DiceBear](https://www.dicebear.com/) ou ícones SVG abertos
- **Push notifications:** [web-push](https://www.npmjs.com/package/web-push) (Node) ou implementar VAPID no Deno
- **Cron jobs:** Supabase tem `pg_cron` extension ou usar Vercel Cron / GitHub Actions

---

## 🎁 Bônus — 5 ideias extras

### 1️⃣ Score de Confiança Bidirecional ⭐⭐⭐⭐⭐

- **Cliente score:** pontualidade pagamento + cuidado com veículo + km dentro do contrato
- **Proprietário score:** entrega no horário + manutenção em dia + responsividade
- Aparece no perfil público, vira diferencial competitivo
- Inspiração: Airbnb, Uber

### 2️⃣ Renovação Automática Sugerida ⭐⭐⭐⭐

- D-7 do fim da locação → e-mail "Quer renovar por mais 60 dias com 10% off?"
- Botão "Renovar com 1 clique" (usa subscription existente)
- Reduz fricção, aumenta LTV

### 3️⃣ Marketplace de Serviços Extras ⭐⭐⭐

- Igual marketplace de instalação de rastreador (já feito)
- Mas pra: lavagem, troca de óleo, alinhamento, película, etc.
- Cliente pede, oficina parceira atende, plataforma fica com 10%
- **Receita adicional sem desenvolvimento pesado**

### 4️⃣ Chat Interno Limitado ⭐⭐⭐

- Cliente-Proprietário podem trocar mensagens **só durante locação ativa**
- Útil pra: combinar horário de retirada/devolução, avisar de leve incidente, etc.
- Tudo logado (proteção de ambos os lados em caso de disputa)
- Stack simples: tabela `messages` + Realtime do Supabase

### 5️⃣ Programa de Fidelidade "Nomade Gold" ⭐⭐⭐⭐

- **Cliente:** 3 renovações sem avaria → 5% off recorrente
- **Proprietário:** 5⭐ por 6 meses → fee de 10% vira 8% (incentivo a manter qualidade)
- Aparece como badge no perfil
- Cria moat — fica caro pro cliente/proprietário sair pra concorrência

---

## 📅 Roadmap proposto (prioridade)

| Sprint | Feature | Esforço | Impacto |
|---|---|---|---|
| **Sprint 1 (2 sem)** | Timeline visual (Fase 1) | 🟢 Médio | 🔥 Alto |
| **Sprint 2 (2 sem)** | Saques parciais Stripe (Fase 2) | 🟡 Alto | 🔥 Muito alto |
| **Sprint 3 (1 sem)** | NF parcial (NotaZZ ou eNotas) | 🟢 Médio | 🔥 Alto |
| **Sprint 4 (1 sem)** | Painel status verde (mockup + cards) | 🟢 Médio | 🔥 Alto |
| **Sprint 5 (2 sem)** | Notificações configuráveis + push | 🟡 Alto | 🟡 Médio |
| **Sprint 6 (1 sem)** | Integração Cobli (depende da API key) | 🟢 Médio | 🔥 Alto |
| **Sprint 7 (1 sem)** | Bônus #2 (renovação automática) | 🟢 Baixo | 🔥 Alto |

**Total:** ~10 semanas de roadmap.

---

## 🎯 Próximo passo sugerido

Daniel, quando você acordar:

1. **Lê esse doc** com calma (~15 min)
2. Me diz:
   - **Opção A:** "Bora! Começa pela timeline" → eu te passo SQL + UI mockup detalhado
   - **Opção B:** "Quero começar pelo painel verde" → eu detalho a integração Cobli
   - **Opção C:** "Mistura X com Y" → ajusto a proposta
   - **Opção D:** "Antes preciso entender melhor X" → te explico

Também posso:
- Detalhar implementação Stripe (Opção A — Manual Payout) passo a passo
- Pesquisar mais sobre NotaZZ vs eNotas vs NFe.io
- Desenhar SVG real do carro pra painel
- Listar tudo que precisa configurar na Cobli quando você fechar com eles

---

## 💭 Reflexão estratégica

O que você descreveu é uma mudança de posicionamento sutil mas poderosa:

- **Antes:** "Plataforma que conecta cliente e proprietário"
- **Depois:** "Plataforma que **acompanha** cliente e proprietário durante toda a jornada"

A timeline + painel verde transformam Nomade Drive de um **marketplace** num **gestor de relacionamento contínuo**. Isso muda:

- ✅ **Pricing power** — você cobra mais porque entrega mais
- ✅ **Retention** — proprietários e clientes não saem porque dependem da plataforma
- ✅ **Differentiation** — concorrência fica focada só em "conectar"
- ✅ **Trust** — primeira plataforma a tratar privacidade do cliente com seriedade (LGPD-safe)

É exatamente o tipo de feature que a turma do MIT Sloan classifica como **"trust infrastructure"** — uma das defesas mais duráveis pra MVPs de marketplace.

**Tem visão, Daniel.** Vamos construir? 🚀
