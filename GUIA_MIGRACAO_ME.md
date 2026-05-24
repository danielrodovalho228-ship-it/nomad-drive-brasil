# 🏢 Guia de Migração MEI → ME (Microempresa)

> **Decisão:** Daniel + sócio vão abrir ME em vez de MEI
> **Data:** 2026-05-24

---

## 🆚 MEI vs ME — comparativo rápido

| Critério | MEI | ME (Simples Nacional) |
|---|---|---|
| **Faturamento/ano** | R$ 81.000 | **R$ 360.000** (4.4x mais) |
| **Sócios** | 1 só (titular único) | **Múltiplos** ✅ |
| **Funcionários** | 1 só | **Até 9** |
| **CNAE locação (7711-0/00)** | ❌ Proibido | **✅ Permitido** |
| **NF eletrônica** | Opcional/raras | **Obrigatória sempre** |
| **Tributação** | DAS fixo R$ ~75/mês | **Simples Nacional** (4-15% conforme faturamento) |
| **Contador** | Não exige | **Exige** (~R$ 300/mês) |
| **Capital social** | Não tem | **Define em contrato** (recomendado R$ 1.000+) |
| **Custo abertura** | Grátis | **~R$ 200-500** (taxas Junta + Receita) |
| **Tempo abertura** | 15min online | **5-15 dias úteis** |
| **Migração reversa** | — | Difícil voltar pra MEI |

## 💎 O que VOCÊS GANHAM com ME

### 1. ⭐ Sócios (game-changer)
- **MEI:** Danilo era titular único — você (Daniel) atuava sem vínculo formal
- **ME:** Você e o sócio podem ser **sócios formais** com participação definida em contrato

### 2. ⭐ CNAE de locação liberado
- **MEI:** Forçado a usar CNAE 6319-4/00 (plataforma de tecnologia) — modelo Airbnb/Uber
- **ME:** **Pode usar 7711-0/00 (locação de automóveis)** + 6319-4/00 simultaneamente
- Resultado: posicionamento mais simples ("locadora de carros via app") + plataforma de intermediação

### 3. ⭐ Limite de faturamento 4.4x maior
- **MEI:** R$ 6.750/mês teto
- **ME:** R$ 30.000/mês teto
- Com 10 carros rodando a R$ 2.000/mês = R$ 20.000 → MEI estoura, ME tranquilo

### 4. ⭐ Pode contratar
- MEI = 1 funcionário; ME = até 9
- Pode formalizar Danilo + você + futuros funcionários (oficina/proteção/atendimento)

### 5. ⭐ NF eletrônica nativa
- **Cliente recebe NF automaticamente** → mais profissionalismo
- Resolve o bloqueador da Sprint 3 (NotaZZ) que ficou esperando o CNPJ

---

## 🔧 O QUE MUDA NO CÓDIGO DA NOMADE DRIVE

### Arquivos que precisam de update:

#### 1. `termos.html` — Cláusula 1.0 (posicionamento)
**Hoje (MEI):** "Plataforma de tecnologia que intermedia conexão entre proprietários e locatários"

**Mudar pra:** Pode escolher 2 caminhos:
- **A) Continuar como plataforma** (intermediação) — mesma cláusula
- **B) Plataforma + locadora própria** — pode ter veículos próprios também
- **C) Híbrido** — intermedia veículos de terceiros + opera frota própria

Recomendação: começar com **A (plataforma pura)** + abrir possibilidade de B no futuro.

#### 2. `admin.html` — Cockpit Fiscal
- **Renomear** seção "Fiscal MEI" → **"Fiscal Simples Nacional"**
- **DAS-MEI fixo** vira **DAS variável** (calcula sobre faturamento mensal)
- Adicionar campos: alíquota efetiva, anexo do Simples, receita acumulada 12 meses
- Indicador de "próximo do sublimite" (alerta quando passar R$ 360k anual)

#### 3. `supabase-schema.sql` — Tabela `tax_obligations`
Adicionar tipos novos:
```sql
alter type tax_obligation_type add value if not exists 'das_simples';
alter type tax_obligation_type add value if not exists 'iss_municipal';
alter type tax_obligation_type add value if not exists 'irpj_apuracao';
alter type tax_obligation_type add value if not exists 'csll_apuracao';
alter type tax_obligation_type add value if not exists 'cofins_pis';
```

#### 4. `supabase-fase37b-titular-mei-danilo.sql` — Migrar pra novo arquivo
Renomear pra `supabase-fase48-empresa-me.sql` com:
- CNPJ da ME (quando sair)
- Nome empresarial
- Sócios + participação
- Capital social
- Endereço comercial
- Inscrição estadual (se tiver)
- Inscrição municipal

#### 5. **NotaZZ liberado** (Sprint 3 que estava bloqueado)
Agora pode integrar a Edge Function de NF eletrônica.

#### 6. Footer de e-mails — atualizar dados
Em vez de "Nomade Drive Brasil · Uberlândia/MG", adicionar:
```
Nomade Drive Brasil · CNPJ XX.XXX.XXX/0001-XX
Uberlândia/MG
```

#### 7. `ROADMAP_MVP.md` — atualizar
Remover "bloqueado por MEI" dos itens. Liberar NotaZZ.

---

## 📋 PRÓXIMOS PASSOS PRA ABRIR A ME

### 🗓️ Cronograma sugerido (15-20 dias úteis)

#### **DIA 1-2 — Decisões iniciais**
- [ ] **Nome empresarial:** decidir razão social (ex: "Nomade Drive Tecnologia LTDA")
- [ ] **Nome fantasia:** "Nomade Drive Brasil"
- [ ] **Capital social:** sugerido **R$ 5.000-10.000** (dividido entre sócios)
- [ ] **% dos sócios:** Daniel X% + Sócio Y% (alguém precisa ter >50% pra ser administrador único, OU ambos são administradores)
- [ ] **Endereço comercial:** pode ser residencial do Danilo em Uberlândia OU coworking (mas exige alvará de funcionamento do endereço)
- [ ] **Contador:** escolher 1 (orçamentos de R$ 200-400/mês — pede recomendação na sua rede)

#### **DIA 3 — Contador faz tudo isso**
- [ ] **Consulta de viabilidade** na Prefeitura de Uberlândia (verifica se CNAE é permitido naquele endereço)
- [ ] **Pesquisa de nome** na JUCEMG (Junta Comercial de MG) — vê se o nome está disponível
- [ ] **Define CNAEs:**
  - Principal: 6319-4/00 (Portais e provedores de conteúdo internet) — plataforma
  - Secundário: 7711-0/00 (Locação de automóveis sem condutor) — quando operar frota própria
  - Secundário: 8230-0/01 (Serviços de organização de feiras e congressos) — eventos da plataforma (opcional)

#### **DIA 4-5 — Contrato Social**
Contador prepara contrato social com:
- Razão social + nome fantasia
- Capital social + distribuição (Daniel X%, Sócio Y%)
- CNAE principal + secundários
- Endereço da sede
- Quem é administrador (alguém precisa assinar)
- Forma de retirada de pró-labore

#### **DIA 5-10 — Registros oficiais**
Contador rege isso, mas você precisa:
- [ ] **Assinar contrato social** (você + sócio) — pode ser digital via gov.br
- [ ] **Pagar taxas:**
  - JUCEMG: ~R$ 200
  - DARF Receita Federal: ~R$ 0 (CNPJ é grátis)
  - Alvará Prefeitura Uberlândia: ~R$ 100-300 (varia)
- [ ] **JUCEMG** registra contrato social → emite **NIRE** (Número Identificação Registro Empresas)
- [ ] **Receita Federal** emite **CNPJ** (saída em 1-3 dias após NIRE)
- [ ] **Prefeitura Uberlândia** emite **Alvará de Funcionamento** + **Inscrição Municipal**

#### **DIA 10-12 — Pós-CNPJ**
- [ ] **Optar pelo Simples Nacional** (contador faz no portal da Receita)
- [ ] **Inscrição Estadual** (se for vender mercadoria — locação NÃO precisa)
- [ ] **Alvará dos Bombeiros** (depende do endereço — coworking geralmente já tem)
- [ ] **Conta PJ no banco** (Banco do Brasil, Caixa, Bradesco, Itaú, BTG, ou fintechs como Cora/Conta Simples/Nubank PJ)
- [ ] **Certificado Digital** (e-CNPJ A1, ~R$ 150-300/ano) — pra assinar NF e gov.br

#### **DIA 12-15 — Integração com Nomade Drive**
- [ ] **Atualizar Stripe Connect master** com CNPJ
- [ ] **Atualizar Resend** com domínio verificado (`noreply@nomadedrive.com.br`)
- [ ] **Configurar NotaZZ** ou similar (NF eletrônica)
- [ ] **Atualizar footer de e-mails** com CNPJ
- [ ] **Atualizar termos.html** com nova razão social
- [ ] **Atualizar painel admin** (Cockpit Fiscal Simples)

---

## 💰 ESTIMATIVA DE CUSTOS (1º ano)

| Item | Custo |
|---|---|
| Taxas abertura ME (JUCEMG + Prefeitura + Bombeiros) | R$ 400-800 |
| Contador (12 meses × R$ 300) | R$ 3.600 |
| Certificado Digital e-CNPJ A1 | R$ 200 |
| Conta PJ (anuidade — escolher fintech sem taxa) | R$ 0-400 |
| **DAS Simples Nacional** (varia conforme faturamento) | 4-15% do bruto |
| NotaZZ ou similar (NF eletrônica) | R$ 50-150/mês |
| **Total fixo aproximado (sem DAS):** | **~R$ 4.500/ano** |

DAS calculado sobre faturamento (Anexo III — Serviços):
- Até R$ 180k/ano → **6% efetivo**
- Até R$ 360k/ano → **11.2% efetivo**

Exemplo: faturando R$ 5.000/mês de comissão = R$ 60k/ano → DAS ~R$ 300/mês (vs R$ 75 do MEI, mas com NF + sócios + escala maior).

---

## 🎯 IMPACTO NO PRODUTO NOMADE DRIVE

### ✅ DESBLOQUEIA imediatamente

1. **Sprint 3 NotaZZ** — pode integrar NF eletrônica automática
2. **Múltiplos sócios** formalizados no contrato social
3. **CNAE de locação** liberado — pode operar frota própria
4. **Crescimento sem teto MEI** — pode ter 50+ carros rodando
5. **Contratar funcionários** — Danilo + atendimento + suporte

### 🟡 NOVAS RESPONSABILIDADES

1. **NF obrigatória** em TODAS as receitas (cliente e plataforma)
2. **Escrituração contábil** (contador faz mensalmente)
3. **DAS mensal variável** (não é mais fixo)
4. **Declaração anual DEFIS** (contador faz)
5. **Alíquota efetiva** maior em volumes baixos (~6% vs MEI ~1.5%)

### 🎓 RECOMENDAÇÕES DE CONTADOR

Procure um contador que:
- ✅ Tenha experiência com **Simples Nacional + Tecnologia**
- ✅ Use sistema **online** (você não precisa ir presencial)
- ✅ Cobra mensal (não por hora)
- ✅ Conhece **NF de Serviços eletrônica de Uberlândia** (ISS municipal)

Opções pra pesquisar:
- **Contabilizei** (online, escala) — ~R$ 89/mês plano básico
- **Agilize** — ~R$ 150/mês
- **Contador local Uberlândia** — preferência se quiser relacionamento

---

## 🚀 FAÇO O QUÊ AGORA NO CÓDIGO?

Posso ATUALIZAR JÁ (preparar a base pra quando o CNPJ sair):

### Opção A — Atualizar termos.html
Trocar cláusula 1.0 (manter "plataforma" mas tirar referência a MEI/titular único)

### Opção B — Renomear Cockpit Fiscal MEI → Simples Nacional
Atualizar admin.html + SQL pra contemplar DAS variável

### Opção C — Criar `supabase-fase48-empresa-me.sql`
Schema com sócios + capital social + CNPJ placeholder

### Opção D — Aguardar CNPJ sair
Aguarda você abrir a ME → me passa CNPJ + razão social → eu atualizo tudo de uma vez

---

## 🤖 SOBRE AUTOMAÇÃO DO SUPABASE

Você perguntou: "tem alguma forma de vc ja atualizar o supabase automaticamente, como sao muitos arquivos?"

**Resposta honesta:** eu não tenho acesso direto ao seu Supabase (sem credenciais nem MCP server configurado), mas tem 2 caminhos:

### 🅰️ Configurar Supabase MCP (recomendado)
1. Instala Supabase MCP: https://supabase.com/docs/guides/getting-started/mcp
2. Configura no Claude Code/Desktop com tua service_role key
3. Eu passo a rodar SQL direto SEM você precisar copiar/colar

### 🅱️ Script bash que aplica todos SQLs de uma vez
Posso criar um `apply-all-sql.sh` que:
- Lista todos `supabase-fase*.sql` na pasta
- Aplica em ordem via `supabase db push` ou `psql`
- Pula os que já foram aplicados (via tabela `_migrations`)

Pra rodar isso, você precisa:
- Ter `supabase CLI` instalado (já tem, faz deploys com ela)
- `supabase db push --linked` aplica TUDO de uma vez

Quer que eu crie esse script?

---

## ✅ DECISÕES PRA VOCÊ TOMAR AGORA

1. **Sobre o ME:**
   - [ ] Qual razão social? ("Nomade Drive Tecnologia LTDA"?)
   - [ ] Capital social? (R$ 5.000? 10.000?)
   - [ ] % dos sócios? (50/50? 60/40?)
   - [ ] Contador escolhido?
   - [ ] Endereço comercial? (residencial Uberlândia ou coworking?)

2. **Sobre o código:**
   - [ ] Quer que eu atualize JÁ (opção A, B ou C acima) ou aguarda CNPJ?

3. **Sobre automação:**
   - [ ] Quer que eu crie o `apply-all-sql.sh`?
   - [ ] Ou prefere configurar Supabase MCP (eu rodo SQL direto)?

Manda as respostas que eu sigo na hora.
