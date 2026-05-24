# 💰 Análise Tributária — MEI vs ME (Setup Internacional)

> **Contexto Daniel (24/05/2026):**
> - 🇺🇸 **Daniel** — Desenvolvedor/tech/criador, **residente fiscal nos EUA**
> - 🇧🇷 **Danilo** — Vendas/operação/comercial, **residente fiscal no Brasil**, será titular único do MEI
>
> ⚠️ **Disclaimer:** este documento é orientação técnica baseada em legislação
> 2026. **Sempre consulte um contador brasileiro + tax professional americano**
> antes de qualquer decisão. O cenário Brasil+EUA tem regras específicas.

---

## 📊 Custos diretos por regime tributário (valores 2026)

### 1️⃣ MEI (Microempreendedor Individual)

| Item | Valor mensal | Anual |
|---|---|---|
| **DAS-SIMEI** (Comércio/Serviços/Indústria) | R$ 75,90 | R$ 910,80 |
| Contador (opcional, MEI não exige) | R$ 0 | R$ 0 |
| Sistema de gestão | R$ 0 (manual) | R$ 0 |
| **TOTAL básico** | **R$ 75,90** | **R$ 910,80** |

**Limite faturamento:** R$ 81.000/ano (~R$ 6.750/mês média)

**Restrições:**
- ❌ NÃO pode ter sócio
- ❌ NÃO pode ter mais que 1 funcionário CLT
- ❌ NÃO pode ter participação em outra empresa
- ❌ Atividades restritas (CNAE específico permitido)
- ❌ **CORREÇÃO 2026-05-24:** Locação de automóveis (CNAE 7711-0/00) **NÃO** é permitida em MEI (atividade regulada — exige ME/EPP)

**CNAEs MEI permitidos pra Nomade Drive (modelo plataforma):**
- ⭐ **6319-4/00** — Portais, provedores de conteúdo e outros serviços de informação na internet (RECOMENDADO)
- **6311-9/00** — Tratamento de dados, provedores de serviços de aplicação e hospedagem
- **6209-1/00** — Suporte técnico, manutenção e outros serviços em TI

**Modelo legal correto:**
Nomade Drive é **plataforma de intermediação** (não locadora). MEI recebe APENAS a comissão de 10%. O proprietário do veículo é o locador formal — recebe 90% via Stripe Connect direto. Mesmo modelo de Airbnb/Uber/iFood.

**Tributos inclusos no DAS:**
- INSS do titular (~R$ 70 = 5% salário mínimo)
- ISS R$ 5 (município)
- ICMS (zero se serviço)
- IRPJ, CSLL, PIS, COFINS (zero)

**Distribuição de lucros pro titular (Danilo):**
- Lucro presumido isento até R$ 28.560/ano (Lei 11.482/2007)
- Acima disso: IRPF na pessoa física (até 27.5%)

---

### 2️⃣ ME — Simples Nacional Anexo III (Serviços)

CNAE 7711-0/00 (locação) cai no **Anexo III** com fator R (folha) — alíquota varia conforme faturamento.

| Faturamento anual | Alíquota efetiva | Imposto/ano |
|---|---|---|
| Até R$ 180.000 | 6% | até R$ 10.800 |
| R$ 180k - 360k | 11.2% (descontando dedução) | R$ 20.160 - R$ 40.320 |
| R$ 360k - 720k | 13.5% | R$ 48.600 - R$ 97.200 |
| R$ 720k - 1.8M | 16% | R$ 115.200 - R$ 288.000 |

**Custos fixos adicionais (mensal):**
- Contador obrigatório: R$ 250-500/mês = R$ 3.000-6.000/ano
- Pró-labore (mínimo 1 SM): ~R$ 1.412/mês × 11% INSS = R$ 155/mês
- Certificado digital: ~R$ 200/ano

**Limite faturamento:** R$ 360.000/ano (ou R$ 4,8M se EPP)

**Permite:**
- ✅ Sócios (LTDA, SLU, etc.)
- ✅ Múltiplos funcionários CLT
- ✅ Pró-labore formal (com INSS)
- ✅ Distribuição de lucros isenta de IRPF (se lucros contabilizados)

---

## 📈 Cenários práticos pra Nomade Drive

### 🟢 Cenário 1: MVP atual (~R$ 5.000/mês = R$ 60k/ano)

| Item | MEI | ME Simples Nacional |
|---|---|---|
| Faturamento anual | R$ 60.000 | R$ 60.000 |
| DAS / Imposto Simples | R$ 911 | R$ 3.600 (6%) |
| Contador | R$ 0 | R$ 3.000 |
| INSS pró-labore | (incluso DAS) | R$ 1.860 |
| Outros (cert. digital) | R$ 0 | R$ 200 |
| **TOTAL fiscal/ano** | **R$ 911** | **R$ 8.660** |
| **Sobra pra distribuir** | R$ 59.089 | R$ 51.340 |

🎯 **Veredito:** MEI economiza **R$ 7.749/ano** nesse patamar. Vale ficar no MEI.

---

### 🟡 Cenário 2: Crescimento (~R$ 8.000/mês = R$ 96k/ano)

⚠️ **MEI já estourou o limite de R$ 81k!** Migração obrigatória.

| Item | ME Simples Nacional |
|---|---|
| Faturamento anual | R$ 96.000 |
| Imposto Simples (Anexo III, ~6%) | R$ 5.760 |
| Contador | R$ 3.000 |
| INSS pró-labore | R$ 1.860 |
| Outros | R$ 200 |
| **TOTAL fiscal/ano** | **R$ 10.820** |
| Sobra | R$ 85.180 |

🎯 Carga tributária real: **11.3%** do faturamento. Aceitável.

---

### 🟠 Cenário 3: Escala (~R$ 20.000/mês = R$ 240k/ano)

| Item | ME Simples Nacional |
|---|---|
| Faturamento anual | R$ 240.000 |
| Imposto Simples (~11%) | R$ 26.400 |
| Contador (talvez mais robusto) | R$ 6.000 |
| INSS pró-labore (2 sócios × 1 SM) | R$ 3.720 |
| Folha (1 funcionário CLT, R$ 3k) | R$ 36.000 |
| Encargos folha (~35%) | R$ 12.600 |
| Outros | R$ 500 |
| **TOTAL custos fiscais+RH** | **R$ 85.220** |
| Sobra pra operação + lucro | R$ 154.780 |

🎯 Hora de pensar em ME → talvez Lucro Presumido (se margem alta) — análise contador.

---

### 🔴 Cenário 4: Escala grande (~R$ 50.000/mês = R$ 600k/ano)

Já é **EPP** (Empresa de Pequeno Porte). Análise mais complexa, contador essencial.

| Regime | Carga estimada |
|---|---|
| Simples Nacional EPP | ~14% = R$ 84.000/ano |
| Lucro Presumido | ~16-20% = R$ 96.000-120.000/ano |
| Lucro Real (se margens baixas) | menos? mas complexidade alta |

---

## 🌍 ATENÇÃO ESPECIAL — Daniel mora nos EUA

### Cenário atual (MEI Danilo, Daniel informal)

**Como Daniel pode receber sem dor de cabeça:**

#### Opção A: Pix do Danilo pra conta do Daniel nos EUA
- Daniel abre conta no **Wise** (multimoeda BR + USD)
- Danilo envia Pix pro Wise BR do Daniel
- Daniel converte pra USD (taxa ~0,5%)
- **EUA:** Daniel declara como **gift** (se < US$ 18k/ano em 2026) OU como income
- **BR:** Não há tributação se Danilo já pagou IRPF na distribuição

**Problema:** Receita BR pode considerar isso "remessa internacional não declarada" se valor alto. Acima de R$ 4.000/mês, melhor formalizar.

#### Opção B: Daniel cria LLC nos EUA + presta serviço pro MEI
- Daniel registra **LLC single-member** (Delaware, Wyoming, etc.) — ~US$ 100/ano
- Empresa LLC americana presta serviço de "TI/Dev" pro MEI Brasil
- Danilo paga a LLC via **wire transfer internacional** (R$ 0 contabilizando como despesa)
- Daniel recebe na LLC, declara nos EUA como business income
- **EUA:** LLC single-member = pass-through (Schedule C no 1040)
- **BR:** Despesa dedutível pro MEI (reduz lucro tributável)

**Mais limpo legalmente.** Recomendado quando faturamento começar a justificar.

#### Opção C: Daniel vira sócio formal (só na migração pra ME/LTDA)
- LTDA com Daniel (50%) + Danilo (50%)
- Daniel como **sócio NÃO-residente** — precisa CPF mas não precisa ter visto BR
- Distribuição de lucros: isenta de IR no BR, mas **tributada nos EUA** (qualified dividends)
- Pró-labore: complicado pra não-residente (geralmente não recebe pró-labore)
- **Stripe Connect:** quando virar ME, Stripe pode pedir documentos dos sócios — Daniel precisa enviar passport US + W-8BEN (form não-residente)

---

## 💡 Estrutura RECOMENDADA pela fase

### Fase 1 — MVP (HOJE até R$ 60-80k/ano)
```
🇧🇷 MEI no nome do Danilo
   │
   ├── Recebe via Stripe Connect BR
   ├── Distribui ~R$ 2.000/mês pro Danilo (CLT informal)
   └── Pix mensal pro Daniel nos EUA (R$ 2-3k = ~US$ 400-600)
       └── Daniel declara como "foreign source income" no IRS
```
**Custo fiscal anual:** R$ 911 + IRPF Danilo + tax USA Daniel = **bem baixo**.

### Fase 2 — Crescimento (R$ 80k a R$ 300k/ano)
```
🇧🇷 LTDA Nomade Drive (CNPJ novo)
   ├── Danilo: 90% das quotas, sócio-administrador, mora BR
   └── Daniel: 10% das quotas, sócio investidor não-residente

🇺🇸 + LLC Daniel (single-member)
   └── Presta serviço de TI/Dev pra LTDA Nomade Drive
       (contrato formal, NF, wire transfer mensal)
```
**Vantagens:**
- Daniel recebe limpinho via LLC americana (mais previsível pra impostos US)
- LTDA reduz lucro tributável BR via despesa de TI
- Daniel mantém quotas pra capital gains futuro (se vender empresa)
- Stripe Connect aceita bem essa estrutura (LTDA é Standard Connect)

### Fase 3 — Escala (R$ 300k+/ano)
```
🌎 Holding (opcional)
   ├── 🇺🇸 Nomade Drive Inc. (holding Delaware C-Corp ou LLC)
   │     │
   │     └── Daniel: 50% (residente US)
   │
   └── 🇧🇷 Nomade Drive Brasil LTDA (subsidiária operacional)
         │
         ├── Holding US: 50%
         └── Danilo: 50%
```
**Vantagens:**
- Capital gains nos EUA tem treaty (evita bitributação)
- Investidores futuros entram via holding US
- Daniel pode mover-se pra outros mercados sem fricção fiscal

⚠️ Esse cenário pede **advogado tributarista internacional**. ~US$ 5k-15k setup.

---

## 📋 Comparativo direto

| Critério | MEI atual | ME LTDA (futuro) |
|---|---|---|
| 💰 Custo fiscal anual (60k fat) | R$ 911 | R$ 8.660 |
| 💰 Custo fiscal anual (200k fat) | ❌ excede limite | R$ 22.000 |
| 👥 Sócio formal Daniel | ❌ não | ✅ sim |
| 👨‍💼 Equipe CLT | 1 max | ilimitado |
| 🏦 Conta PJ | ✅ CPF | ✅ CNPJ |
| 📑 NF emissão | manual prefeitura | NotaZZ/eNotas + cert. digital |
| 🌎 Pagar Daniel EUA | informal (Pix) | formal (wire LTDA→LLC) |
| 🛡️ Responsabilidade limitada | ❌ PF responde tudo | ✅ só capital social |
| 📊 Contador | opcional | obrigatório |
| ⏱️ Setup | 5 min online (gov.br) | 7-30 dias (cartório+JUCESP) |
| 💵 Setup cost | R$ 0 | R$ 1.500-3.000 (advogado+cartório) |

---

## 🎯 Roadmap recomendado

```
HOJE
 ↓
3-6 meses    🟢 MEI ativado (Danilo titular)
              Daniel recebe via Pix mensal informal
              Faturamento crescendo até R$ 5-6k/mês
              ↓
6-9 meses    🟡 Atingir R$ 7-8k/mês — perto do limite MEI
              Daniel cria LLC nos EUA (Wyoming ~US$ 100)
              Começa contrato de serviços LLC→MEI
              ↓
9-12 meses   🟠 Faturamento R$ 8-10k/mês — MIGRAR
              Contratar contador BR (R$ 300/mês)
              Abrir LTDA Nomade Drive (Danilo + Daniel sócios)
              Migrar Stripe Connect pra LTDA
              Comunicar fornecedores (CNPJ novo)
              ↓
12+ meses    🔵 Crescimento estabilizado
              Contratar 1-2 funcionários (CLT ou PJ)
              Considerar holding US se planejar investidores
```

---

## ⚠️ Riscos importantes — Setup EUA + BR

### 1. FBAR (Foreign Bank Account Report)
Daniel precisa reportar se **agregado** de contas BR + Wise BR passar de **US$ 10.000 em qualquer momento do ano**. Formulário **FinCEN 114**. Multa por não reportar: até US$ 12.921 por conta por ano.

### 2. PFIC (Passive Foreign Investment Company)
Se Daniel virar sócio de LTDA BR sem operação ativa, IRS pode classificar como PFIC = tributação muito pesada. **Solução:** garantir que LTDA tem atividade real e Daniel participa ativamente (call mensal, decisões registradas em ata).

### 3. Form 5471
Se Daniel for >= 10% sócio de empresa estrangeira, precisa enviar **Form 5471 anual** ao IRS. Complexo. Preparar com tax pro: ~US$ 500-1.500/ano.

### 4. Bitributação dividendos
Brasil isenta dividendos (no Simples), mas EUA tributa como qualified dividends (0-20%). **Treaty Brasil-EUA** ajuda evitar bitributação mas precisa claim no 1040.

### 5. Stripe e dados de sócios
Stripe Connect Standard pede docs de **todos os sócios >= 25%**. Daniel vai precisar enviar:
- US Passport
- US Driver's License OU SSN
- Form W-9 (residente) ou W-8BEN (não-residente)

---

## 💵 Custo total estimado (ano 1 vs ano 3)

### Ano 1 (MEI fase teste)
- DAS BR: R$ 911
- Wise transfer fees: ~R$ 500/ano
- Daniel tax USA (foreign income): ~US$ 0 (pode ser isento se baixo)
- **Total: ~R$ 1.500/ano** (~US$ 300)

### Ano 3 (LTDA + LLC US estabilizadas)
- Simples Nacional BR: R$ 12.000-30.000 (depende fat)
- Contador BR: R$ 4.000
- LLC US fees: US$ 100 ($500)
- Tax pro US (Form 5471 + 1040): US$ 1.500 ($7.500)
- Wire transfer fees: R$ 2.000
- **Total: ~R$ 25.000-45.000/ano** + tempo de organização

---

## 📞 Próximos passos sugeridos

### Imediato (próximos 30 dias)
1. ✅ Abrir MEI no nome do Danilo (online gov.br/mei — 15 min)
2. ✅ CNAE principal: **7711-0/00** (Locação de automóveis sem condutor)
3. ✅ Conta PJ Inter / Nubank PJ MEI (grátis)
4. ✅ Validar emissão de NF eletrônica pela prefeitura (ou contratar NotaZZ se preferir API)

### Médio prazo (3-6 meses, se MVP der certo)
5. ✅ Daniel cria LLC nos EUA (Wyoming/Delaware via **Stripe Atlas** ou **Firstbase.io** — ~US$ 500)
6. ✅ Contrato de prestação de serviços LLC→MEI (template gov.br ou advogado)
7. ✅ Daniel abre conta no **Mercury** ou **Brex** (PJ US grátis)

### Longo prazo (6-12 meses)
8. ✅ Contratar contador brasileiro (Contabilizei tem plano R$ 99/mês pra MEI/ME)
9. ✅ Decisão: migrar pra ME LTDA com Daniel como sócio formal
10. ✅ Avaliar com tax pro americano (Form 5471 setup)

---

## 🤝 Quer que eu detalhe alguma parte?

Posso fazer:
- Comparativo NotaZZ vs eNotas vs prefeitura pra NF MEI
- Setup passo a passo do Stripe Atlas (LLC US)
- Modelo de contrato LLC US → MEI BR (template)
- Update do Cockpit pra incluir status fiscal Daniel (US) separado
- Adicionar tabela `business_settings_intl` com país dos sócios

Manda o que quer aprofundar! 🚀
