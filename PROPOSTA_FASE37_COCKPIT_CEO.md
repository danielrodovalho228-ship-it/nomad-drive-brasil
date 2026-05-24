# 🚀 Proposta Fase 37+ — Cockpit do CEO

> **Autor:** Claude (code-side) — 2026-05-24
> **Daniel:** lê com calma. Tem decisões importantes antes de codar.
> **Inspiração:** Stripe Dashboard + Conta Azul + Bling + QuickBooks + ContaBoa

---

## 🎯 Conceito

Transformar o `admin.html` num **cockpit executivo** — você abre o painel e em 10 segundos sabe:
- 💰 Quanto faturou hoje/mês/ano
- 🔴 Quantas contas a pagar vencem essa semana
- 📈 Quantos novos clientes/proprietários/veículos chegaram
- ⚠️ Quais alertas críticos da operação (rastreadores, multas, sinistros)
- 🧾 Status das obrigações fiscais (DAS MEI, NFs emitidas)
- ⭐ Métricas de qualidade (NPS, churn, SLA cumprimento)
- 👥 Custos com equipe (quando tiver)

Tudo **em tempo real** — sem precisar planilhas paralelas.

---

## 📐 Estrutura proposta (5 módulos)

### 🏠 1. Hero "Visão geral do CEO" (sempre no topo)

```
┌─────────────────────────────────────────────────────────────────┐
│  💼 Olá, Daniel — Nomade Drive Brasil em números                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💰 RECEITA          ⏳ CONTAS         🚗 FROTA       👥 BASE  │
│  R$ 7.500            R$ 1.250 a pagar   3 ativos    5 clientes │
│  ▴ +R$ 2.500 mês     em 5 dias          de 4 total   2 novos   │
│                                                                 │
│  🚨 3 alertas críticos        🧾 DAS MEI: vence em 12 dias     │
│  ⭐ 4.8/5 satisfação clientes  📈 Crescimento 60% MoM           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 💰 2. Financeiro

#### 2.1 Receita consolidada
- Tabela mês a mês: receita bruta, comissão (10%), líquido pra repasse
- Gráfico de evolução (Chart.js ou similar)
- Breakdown por fonte: mensalidades, cauções capturadas, instalação rastreador, taxa de cancelamento

#### 2.2 Contas a pagar
- Hospedagem (Hostinger): R$ XX/mês — vence dia Y
- Stripe: variável (taxas) — R$ XX no último mês
- Resend: R$ XX (free tier ou paid)
- Infosimples: R$ 100/mês mínimo + consumo
- NotaZZ/eNotas: R$ X/NF
- Cobli: R$ XX/veículo/mês (quando integrar)
- Marketing: variável (Google/Meta ads)
- Domínio (.com.br): R$ 40/ano
- **Possibilidade:** marcar como "Pago" → vai pra histórico

#### 2.3 Pro-labore (se PJ) / Distribuição (se MEI)
- Quanto você "retirou" da empresa esse mês
- Quanto disponível pra retirar (com base no caixa)

#### 2.4 Fluxo de caixa projetado
- Próximos 30/60/90 dias
- Receitas conhecidas (subscriptions ativas)
- Despesas recorrentes (hosting, ferramentas)
- Investimentos planejados (marketing, equipamentos)

### 🧾 3. Fiscal/Contábil

#### 3.1 MEI (atual)
- **DAS mensal** — valor fixo (~R$ 75 em 2026), vencimento dia 20
- **Limite de faturamento MEI** — barra de progresso (R$ 81 mil/ano)
- ⚠️ Alerta automático: se faturamento > 75% do limite → "considere migrar pra ME"
- **DASN anual** — declaração anual simplificada (janeiro)
- **NFs emitidas** — contador + link pra detalhe

#### 3.2 Imposto de Renda Pessoa Física
- Resumo de retiradas/distribuição (até R$ 28.560/ano isento MEI)
- Excedente sujeito à tributação
- Lembrete: declaração IRPF (março/abril)

#### 3.3 Quando virar ME/EPP (futuro)
- Simples Nacional anexo (Anexo III — serviços)
- DAS variável (4-15% conforme faturamento)
- Contabilidade obrigatória
- Pró-labore + INSS

### 📈 4. Crescimento (tempo real)

#### 4.1 Funil de aquisição
- Visitantes site (precisaria Google Analytics)
- Cadastros iniciados
- Cadastros aprovados
- Reservas solicitadas
- Reservas ativas
- Renovações

#### 4.2 Novos hoje / esta semana / este mês
- Tipo: cliente / proprietário / parceiro / oficina
- Origem (se rastrear UTM): orgânico / Google Ads / Meta / Indicação parceiro

#### 4.3 Top contribuintes
- Proprietário com mais carros ativos
- Parceiro com mais indicações
- Oficina com mais vistorias

### 👥 5. Qualidade

#### 5.1 NPS / Satisfação
- Pesquisa pós-locação automática (futuro)
- Score atual + evolução
- Comentários destacados

#### 5.2 SLA da Proteção
- Tempo médio de triagem de ocorrência
- % dentro do SLA (24h alta, 48h média, 72h baixa)
- Cases vencendo SLA agora

#### 5.3 Churn
- Cancelamentos por mês
- Motivos (se coletar no cancelamento)
- Cliente / proprietário

#### 5.4 Reclamações
- Contestações de avaria (volume + taxa de aprovação)
- Suporte (e-mails recebidos em suporte@)

### 👨‍💼 6. RH (quando tiver equipe)

#### 6.1 Funcionários
- Lista: nome, cargo, salário, data admissão
- Total de folha mensal
- Encargos (FGTS, INSS, férias provisionadas)

#### 6.2 Pró-labore
- Histórico de retiradas suas
- Comparativo com salário do mercado

---

## 🗄️ Schema SQL necessário

Tabelas novas (proposta):

```sql
-- 💰 Despesas
create table public.expenses (
  id uuid primary key,
  category text,           -- 'hosting', 'stripe', 'resend', 'infosimples', 'cobli', 'marketing', 'salario', 'pro_labore', 'outros'
  vendor text,
  description text,
  amount numeric(12,2),
  due_date date,
  paid_at timestamptz,
  payment_method text,
  recurrence text,         -- 'monthly', 'yearly', 'one_off'
  invoice_url text,        -- NF do fornecedor
  category_label text,
  created_at timestamptz,
  created_by uuid
);

-- 🧾 Obrigações fiscais
create table public.tax_obligations (
  id uuid primary key,
  kind text,               -- 'das_mei', 'dasn', 'irpf', 'iss', 'inss'
  reference_period text,   -- '2026-05', '2026'
  amount numeric(12,2),
  due_date date,
  paid_at timestamptz,
  receipt_url text,
  notes text
);

-- 📊 Métricas de qualidade (calculadas/cacheadas)
create table public.quality_metrics (
  id uuid primary key,
  metric text,             -- 'nps', 'sla_avg_hours', 'churn_rate', 'satisfaction'
  period text,             -- '2026-05', 'all_time'
  value numeric(10,2),
  sample_size int,
  computed_at timestamptz
);

-- 👥 Funcionários (quando tiver equipe)
create table public.employees (
  id uuid primary key,
  full_name text,
  cpf_masked text,
  email text,
  role text,
  salary numeric(12,2),
  benefits numeric(12,2),  -- vale-refeição, plano saúde, etc
  contract_type text,      -- 'clt', 'pj', 'estagio', 'aprendiz'
  hire_date date,
  termination_date date,
  notes text,
  active boolean default true
);

-- 💸 Receita consolidada (view materializada — agrega bookings + payments)
create materialized view public.revenue_by_month as
select
  date_trunc('month', p.created_at) as month,
  count(distinct b.id) as bookings_count,
  sum(p.amount) filter (where p.kind = 'mensalidade' and p.status = 'pago') as gross_monthly,
  sum(p.amount) filter (where p.kind = 'caucao' and p.status = 'capturado') as captured_caucao,
  sum(p.amount * 0.10) filter (where p.kind = 'mensalidade' and p.status = 'pago') as platform_commission,
  sum(p.amount * 0.90) filter (where p.kind = 'mensalidade' and p.status = 'pago') as owner_payouts
from public.payments p
left join public.bookings b on b.id = p.booking_id
group by 1
order by 1 desc;

-- View "Cockpit do CEO" — agrega tudo pro hero
create view public.ceo_cockpit_summary as
select
  (select count(*) from public.bookings where status = 'em_uso') as bookings_ativos,
  (select count(*) from public.vehicles where status = 'aprovado') as veiculos_aprovados,
  (select count(*) from public.profiles where main_role = 'client' and verification_status = 'aprovado') as clientes_aprovados,
  (select count(*) from public.profiles where created_at >= date_trunc('month', now())) as novos_usuarios_mes,
  (select coalesce(sum(amount), 0) from public.payments
    where status = 'pago' and created_at >= date_trunc('month', now())) as receita_mes,
  (select coalesce(sum(amount), 0) from public.expenses
    where paid_at is null and due_date <= now() + interval '7 days') as contas_pagar_7d,
  (select count(*) from public.protection_cases_full
    where status in ('em_analise','documentos_pendentes')
      and sla_remaining_hours is not null and sla_remaining_hours < 6) as cases_vencendo_sla;
```

---

## 🔌 Integrações externas (decisões necessárias)

### Decisão #1: Contabilidade
| Opção | Custo | Esforço integração |
|---|---|---|
| **Manual** (você lança despesas/receitas no painel) | R$ 0 | 0 (já tá no escopo) |
| **Conta Azul** | R$ 99/mês | ~6h (API rica) |
| **Contabilizei** | ~R$ 250/mês inclui contador | ~4h (API simples) |
| **Bling** | R$ 36/mês | ~8h (ERP completo) |

**Recomendação inicial:** Manual. Quando você quiser delegar pra contador, integra Contabilizei.

### Decisão #2: Notas fiscais
- **NotaZZ** R$ 0,40/NF (já planejado pra saques)
- Integra também nas NFs de despesa pra ler XML automaticamente

### Decisão #3: Open Banking (saldo bancário ao vivo)
- **Belvo** / **Pluggy** — APIs de Open Finance Brasil
- Conecta sua conta PJ Stripe/Nubank/Inter
- Custo: R$ 50-200/mês conforme volume
- Permite o cockpit mostrar saldo real, não só projeção
- **Recomendação:** v2, depois que o cockpit manual já estiver no ar

### Decisão #4: Marketing tracking
- Google Analytics 4 (free) — funil de aquisição
- Meta Pixel (free) — conversões Facebook/Insta
- UTM params nas URLs (free)
- **Recomendação:** começar simples com GA4 — adiciono o snippet quando você quiser

### Decisão #5: RH (folha de pagamento)
- **Sólides** / **Convenia** / **Pontotel** — quando tiver equipe
- Hoje: você sozinho ou poucos. Lança manual no painel.

---

## 🗓️ Faseamento sugerido

| Fase | Escopo | Tempo | Pré-req |
|---|---|---|---|
| **Fase 37** | Cockpit Hero + Schema básico (expenses + tax_obligations) | 3h | — |
| **Fase 38** | Painel Financeiro completo (receita + contas a pagar + fluxo caixa) | 4h | Fase 37 |
| **Fase 39** | Painel Fiscal MEI (DAS + DASN + alertas) | 2h | Fase 37 |
| **Fase 40** | Painel Crescimento + Qualidade (métricas calculadas) | 3h | Fase 37 |
| **Fase 41** | Painel RH (quando tiver equipe) | 2h | Decisão MEI vs PJ |
| **Fase 42** | Integração Open Banking (Belvo/Pluggy) | 6h | Conta PJ ativa |
| **Fase 43** | Integração Conta Azul (delega contabilidade) | 6h | Decisão Conta Azul |

**Total enxuto (Fases 37-40):** ~12h de código  
**Total com integrações:** +18h variáveis

---

## 🤔 Decisões necessárias do Daniel ANTES de eu começar

### Bloqueantes (impactam schema)
1. **MEI ou PJ?** → Define se mostro DAS fixo ou Simples Nacional
2. **Tem equipe agora?** → Define se faço módulo RH agora ou depois
3. **Quer integração contábil agora ou manual primeiro?**

### Não-bloqueantes (podem decidir depois)
4. Open Banking quando?
5. GA4 / Meta Pixel quando?
6. Quais despesas recorrentes você quer pré-cadastrar? (Hostinger, Stripe, Resend, Infosimples, etc.)

---

## 💡 Minha recomendação de ordem

**Fase 37 + 38 + 39 (12h total).** Por quê:
- Tira você das planilhas Excel/Google
- Já te dá visão executiva real
- Suficiente pra próximos 6 meses (até crescer pra ter equipe)
- Não exige integrações externas pagas
- Você lança despesas manualmente (15 min/mês — barato)

Fase 40 (qualidade) pode esperar até ter mais clientes pra ter sample size.
Fase 41 (RH) só quando contratar 1ª pessoa.
Fases 42-43 (integrações) só quando volume justificar.

---

## 🚀 Como decidir

**Me responde 3 coisas:**

### A. Modelo tributário atual:
- [ ] MEI (faturamento até R$ 81k/ano)
- [ ] MEI mas planejando virar ME logo
- [ ] Já é ME / EPP no Simples
- [ ] Outro

### B. Equipe:
- [ ] Só eu (CEO)
- [ ] Eu + 1-2 pessoas (PJ ou CLT)
- [ ] 3+ pessoas com folha estruturada

### C. Caminho preferido:
- [ ] **Caminho 1:** Fase 37 só (Cockpit hero + esquema) — 3h, validamos antes de seguir
- [ ] **Caminho 2:** Fases 37+38+39 de uma vez — 12h, te entrega cockpit completo MVP
- [ ] **Caminho 3:** Roadmap completo (37-43) — 30h, integrações inclusas

Manda A/B/C respondidos! 🎯
