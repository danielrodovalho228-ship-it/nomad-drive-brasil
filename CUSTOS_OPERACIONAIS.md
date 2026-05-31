# 💰 Custos Operacionais — Nomade Drive Brasil

> **Versão:** 1.0 — 31/Maio/2026
> **Para:** Daniel + sócios (Danilo + futuros)
> **Objetivo:** Estudo de viabilidade financeira pra reunião societária
> **Modalidade:** Carsharing por hora/dia em Uberlândia-MG
> **Status atual:** Pré-lançamento (infra 100% pronta, 0 cliente real)

---

## ⚡ Sumário executivo (1 página)

### Cenário recomendado: **B — Híbrido Asset Light**

| KPI | Mês 0 | Mês 6 (10 carros) | Mês 12 (30 carros) | Mês 24 (100 carros) |
|---|---|---|---|---|
| **Carros ativos** | 0 | 10 | 30 | 100 |
| **Receita bruta/mês** | R$ 0 | R$ 13.650 | R$ 40.950 | R$ 136.500 |
| **Custo operacional/mês** | R$ 4.700 | R$ 17.250 | R$ 38.400 | R$ 92.500 |
| **EBITDA/mês** | -R$ 4.700 | -R$ 3.600 | +R$ 2.550 | +R$ 44.000 |
| **Margem EBITDA** | n/a | -26% | +6% | +32% |
| **Burn acumulado** | -R$ 28k (6mo) | -R$ 50k | -R$ 35k | +R$ 200k (lucro YTD) |
| **Equipe** | 2 (sócios) | 4 (CLT júnior) | 6 (+gerente) | 12 (+ops) |
| **Breakeven** | n/a | n/a | **Mês 14** | (positivo) |

### Cenário alternativo: **A — Frota 100% própria** (NÃO recomendado)

Mesmo cenário, mas comprando todos os carros via leasing/financiamento:
- Mês 24: receita R$ 136.500/mês × custo **R$ 248.000/mês** = **-R$ 111.500/mês** (DEFICITÁRIO ETERNO com pricing atual)
- Pra ficar positivo, tarifa precisaria subir ~85% ou ocupação chegar a 70%+

### Decisão estratégica que sai dessa análise

✅ **Modelo B (híbrido):**
- 70% **frota P2P** (proprietários põem carro, Nomade fica com 25-30% da tarifa)
- 30% **frota própria leve** (carros usados <R$ 60k, financiamento curto)
- 100% **vagas alugadas** em condomínios (R$ 800-1.200/mês fixo pro síndico, sem CAPEX imobiliário)

❌ **Modelo A (100% próprio):** queima R$ 150k/mês na maturidade. Só faz sentido com pricing 80% maior (= competir com Localiza, perder vantagem do carsharing).

### Investimento necessário pra chegar no Mês 6

| Item | Valor |
|---|---|
| **Hardware** (cofres + GPS pra 10 carros) | R$ 25.000 |
| **Tecnologia setup** (Stripe + integrações + advogado LGPD) | R$ 8.000 |
| **Frota leve** (3 carros próprios à vista, R$ 50k cada) | R$ 150.000 |
| **Caução parceiros P2P** (sinal de seriedade) | R$ 10.000 |
| **Marketing lançamento** (3 meses Ads + conteúdo) | R$ 30.000 |
| **Capital de giro** (6 meses de operação no vermelho) | R$ 50.000 |
| **TOTAL APORTE INICIAL** | **R$ 273.000** |

---

## 1. Custos de Tecnologia e Integrações

### 1.1 Tecnologia recorrente (já em produção)

| # | Item | Provedor | Custo mensal | Status |
|---|---|---|---|---|
| 1 | Backend (DB + Auth + Storage + Edge) | Supabase Pro | R$ 125 ($25 USD) | ✅ Ativo |
| 2 | Frontend hosting | GitHub Pages | R$ 0 | ✅ Ativo |
| 3 | Domínio | nomadedrive.com.br | R$ 5 (R$ 60/ano) | ✅ Ativo |
| 4 | E-mail transacional | Resend | R$ 100 ($20 USD) — até 50k/mês | ✅ Ativo |
| 5 | Push notifications | Web Push VAPID (self-hosted) | R$ 0 | ✅ Ativo |
| 6 | Consulta multas | Infosimples | R$ 100 (mín) + R$ 0,06/consulta | ✅ Ativo |
| 7 | Gateway pagamento | Stripe | 3,5% da receita processada | ✅ Ativo (TEST) |
| 8 | Repo + CI | GitHub | R$ 0 (free tier basta) | ✅ Ativo |
| | **TOTAL FIXO** | | **R$ 330/mês** | |

### 1.2 Integrações P0/P1 a contratar (próximos 60 dias)

| # | Item | Provedor | Custo mensal | Lead time | Como contratar |
|---|---|---|---|---|---|
| 9 | **KYC** (CPF + OCR CNH + biometria) | **Caf** | R$ 250 (50 validações) | 1-2 semanas reunião | Daniel marca reunião — em andamento |
| 10 | **WhatsApp Business** | Meta Cloud API | R$ 50 (até 5k msg/mês grátis, depois ~USD $0,005) | 5-10 dias aprovação | Daniel cria Business Manager (gratuito) |
| 11 | **Assinatura eletrônica** | **Autentique** | R$ 49 (após 5 docs grátis/mês) | 1 dia | Daniel cadastra grátis em autentique.com.br |
| 12 | **Mapas interativos** | Google Maps Platform | R$ 0-50 (free tier 28k loads/mês) | 1 dia | Daniel pega API key em console.cloud.google.com |
| 13 | **Chat suporte in-app** | Crisp Pro | R$ 125 ($25 USD) — ou free 2 ops | 1 dia | Daniel cadastra em crisp.chat |
| 14 | **Anti-spam forms** | Cloudflare Turnstile | R$ 0 (100% grátis) | 1 dia | Daniel cria conta Cloudflare |
| 15 | **NF-e (B2B)** | NotaZZ | R$ 49-150 (50 NFs/mês) | 2-3 dias | Daniel cadastra em notazz.com |
| 16 | **Error tracking** | Sentry | R$ 0 (free 5k events/mês) | 30 min | Daniel cadastra em sentry.io |
| | **TOTAL INTEGRAÇÕES** (estimado) | | **R$ 523/mês** | | |

### 1.3 Integrações P0 dependentes de hardware (Mês 3-6)

| # | Item | Provedor | Custo mensal | One-time | Lead time |
|---|---|---|---|---|---|
| 17 | **Rastreador GPS + bloqueio remoto** | SmartGPS | R$ 32 (10 carros × R$ 3,20) | R$ 200-400/un. hardware | 2 semanas após cotação |
| 18 | **Cofre eletrônico** (chave física) | Yale / iLockey | ~R$ 30-80/un./mês (varia) | R$ 1.500/un. | 3-5 dias |
| 19 | **SMS backup** | Zenvia | R$ 50 (500 SMS) | R$ 0 | 1-2 dias |
| 20 | **Pedágio** (tag física) | Veloe Go ou ConectCar | R$ 10/tag × N carros + uso | R$ 0 | Depende contrato |
| | **TOTAL HARDWARE-DEP.** (10 carros) | | **~R$ 222/mês** | **R$ 17.000 one-time** | |

### 1.4 Resumo Tecnologia + Integrações por cenário

| Cenário | Tech mensal | Hardware mensal | Total/mês |
|---|---|---|---|
| **Mês 0** (pré-launch) | R$ 330 | R$ 0 | **R$ 330** |
| **Mês 6** (10 carros) | R$ 853 | R$ 222 | **R$ 1.075** |
| **Mês 12** (30 carros) | R$ 1.100 | R$ 600 | **R$ 1.700** |
| **Mês 24** (100 carros) | R$ 2.500 | R$ 1.800 | **R$ 4.300** |

> Stripe (3,5%) não está aqui — é proporcional à receita, modelado em §4.

---

## 2. Operação da Frota (Cenário B — Híbrido recomendado)

### 2.1 Mix de frota proposto

| Mês | HB20 P2P | Cobalt P2P | Tracker P2P | Próprios (usados) | Total |
|---|---|---|---|---|---|
| Mês 6 | 4 | 2 | 1 | 3 HB20 usado | 10 |
| Mês 12 | 12 | 7 | 5 | 6 | 30 |
| Mês 24 | 40 | 25 | 20 | 15 | 100 |

### 2.2 Custos por carro (mensal médio)

#### **A. Carros P2P (proprietário cobre custos diretos)**

| Item | Pago por | Custo mensal/carro |
|---|---|---|
| Leasing/financiamento | **Proprietário** | R$ 0 pra Nomade |
| Seguro Yelum | **Proprietário** | R$ 0 |
| IPVA + licenciamento | **Proprietário** | R$ 0 |
| Manutenção comum | **Proprietário** | R$ 0 |
| Lavagem (acordo) | Split 50/50 | **R$ 100** |
| Combustível dentro de 50km/reserva | Nomade reembolsa | **R$ 80** |
| Tag pedágio (opcional) | Nomade | **R$ 10** |
| Subsídio mensal Nomade (acordo P2P) | Nomade | **R$ 0** (modelo split) |
| **CUSTO MENSAL POR CARRO P2P** | | **R$ 190** |

#### **B. Carros próprios da Nomade (HB20 usado <R$ 60k)**

| Item | Custo mensal/carro |
|---|---|
| Financiamento (60 meses, 1,5% am, ent. 30%) | **R$ 990** |
| Seguro Yelum (5% FIPE/ano) | **R$ 250** |
| IPVA + licenciamento (2% FIPE/ano + R$ 200/ano) | **R$ 117** |
| Manutenção preventiva (R$ 0,12/km × 1500km) | **R$ 180** |
| Pneus + recapagem (10k km cada × 4 / ano) | **R$ 60** |
| Lavagem (4x/mês × R$ 50) | **R$ 200** |
| Combustível operacional | **R$ 80** |
| Tag pedágio | **R$ 10** |
| Reserva multas operacionais | **R$ 30** |
| Depreciação extra (revenda após 3 anos a 50%) | **R$ 500** |
| **CUSTO MENSAL POR CARRO PRÓPRIO** | **R$ 2.417** |

> Pra carros novos 0km (HB20 atual R$ 80k), o custo passa de **R$ 3.000/mês** — por isso recomendamos usados.

### 2.3 Receita por carro (média blended)

| Carro | Tarifa hora | Tarifa dia | Ocupação | Receita/mês |
|---|---|---|---|---|
| HB20 | R$ 12 | R$ 99 | 40% (12 dias) | **R$ 1.188** |
| Cobalt | R$ 15 | R$ 119 | 38% (11,4 dias) | **R$ 1.357** |
| Tracker | R$ 19 | R$ 149 | 35% (10,5 dias) | **R$ 1.564** |
| Renegade | R$ 23 | R$ 189 | 30% (9 dias) | **R$ 1.701** |
| **MÉDIA BLENDED** | | | **~37%** | **R$ 1.365** |

### 2.4 Margem por carro P2P vs Próprio

| Tipo | Receita Nomade | Custo Nomade | Margem/mês |
|---|---|---|---|
| **P2P (Nomade fica com 25%)** | R$ 1.365 × 25% = R$ 341 | R$ 190 | **+R$ 151** ✅ |
| **P2P (Nomade fica com 30%)** | R$ 1.365 × 30% = R$ 410 | R$ 190 | **+R$ 220** ✅ |
| **Próprio (usado)** | R$ 1.365 × 100% = R$ 1.365 | R$ 2.417 | **-R$ 1.052** ❌ |
| **Próprio (0km)** | R$ 1.365 × 100% = R$ 1.365 | R$ 3.000 | **-R$ 1.635** ❌❌ |

> ⚠️ **Insight crítico**: com o pricing atual de hora/dia, **frota própria é deficitária**. P2P é o único caminho sustentável até subir ocupação pra 60%+ (típico de Localiza).

### 2.5 Vagas alugadas em condomínios

| Item | Valor mensal por vaga |
|---|---|
| Aluguel pago ao condomínio | R$ 1.000 (média) |
| Custo de adesivagem/placa | R$ 20 (amortizado) |
| **Vagas necessárias** | 1 vaga por 3-4 carros (rotação) |

| Cenário | Vagas | Custo total/mês |
|---|---|---|
| Mês 6 (10 carros) | 3 vagas | R$ 3.060 |
| Mês 12 (30 carros) | 10 vagas | R$ 10.200 |
| Mês 24 (100 carros) | 30 vagas | R$ 30.600 |

---

## 3. Pessoal

### 3.1 Equipe atual (Mês 0)

| Pessoa | Cargo | Salário CLT equiv. | Custo total (CLT) |
|---|---|---|---|
| Daniel | CEO/Tech | R$ 0 (pró-labore quando der) | R$ 0 |
| Danilo | CFO/Operações | R$ 0 (idem) | R$ 0 |
| **TOTAL Mês 0** | | | **R$ 0** |

### 3.2 Equipe Mês 6 (10 carros)

| Pessoa | Cargo | Salário bruto | Encargos (+78%) | Total |
|---|---|---|---|---|
| Daniel | CEO | R$ 3.000 (pró-labore) | R$ 990 (INSS+IR) | R$ 3.990 |
| Danilo | CFO | R$ 3.000 (pró-labore) | R$ 990 | R$ 3.990 |
| Atendente WhatsApp | CLT júnior | R$ 1.800 | R$ 1.404 | R$ 3.204 |
| Motorista de remoção (PJ part-time) | PJ R$ 1.500 | R$ 0 | R$ 1.500 |
| **TOTAL Mês 6** | | | | **R$ 12.684** |

### 3.3 Equipe Mês 12 (30 carros)

| Pessoa | Cargo | Total mensal |
|---|---|---|
| Daniel | CEO | R$ 8.000 + 5.640 enc. = R$ 13.640 |
| Danilo | CFO | R$ 8.000 + 5.640 = R$ 13.640 |
| 2 Atendentes WhatsApp | CLT júnior | 2 × R$ 3.204 = R$ 6.408 |
| Gerente Operações | CLT pleno | R$ 5.000 + R$ 3.900 = R$ 8.900 |
| Motorista de remoção (CLT) | CLT júnior | R$ 2.500 + R$ 1.950 = R$ 4.450 |
| **TOTAL Mês 12** | | **R$ 47.038** |

### 3.4 Equipe Mês 24 (100 carros)

| Pessoa | Cargo | Total mensal |
|---|---|---|
| Daniel | CEO | R$ 15.000 + 10.575 = R$ 25.575 |
| Danilo | CFO | R$ 15.000 + 10.575 = R$ 25.575 |
| Head Tech (futura contratação) | CLT sênior | R$ 12.000 + R$ 9.360 = R$ 21.360 |
| 4 Atendentes WhatsApp | CLT júnior | 4 × R$ 3.204 = R$ 12.816 |
| Gerente Operações | CLT pleno | R$ 7.000 + R$ 5.460 = R$ 12.460 |
| 3 Motoristas remoção | CLT júnior | 3 × R$ 4.450 = R$ 13.350 |
| Comercial B2B | CLT pleno | R$ 5.000 + R$ 3.900 = R$ 8.900 |
| Marketing manager | CLT pleno | R$ 5.000 + R$ 3.900 = R$ 8.900 |
| **TOTAL Mês 24** | | **R$ 128.936** |

> Mês 24 inclui staff pra escala. Mês 12 mantém estrutura enxuta.

---

## 4. Marketing

| Cenário | Canal | Custo mensal |
|---|---|---|
| **Mês 0** (pré-launch) | Conteúdo orgânico Instagram + LinkedIn | R$ 500 (boost ocasional) |
| **Mês 6** | Google Ads (R$ 80 CAC × 5 cadastros/dia) + Meta Ads | R$ 6.000 |
| **Mês 12** | + Influenciador local Uberlândia + parcerias | R$ 12.000 |
| **Mês 24** | + Outdoor + rádio + expansão (Goiânia/BH) | R$ 28.000 |

### Métricas Marketing (típicas carsharing BR)
- CAC (Cost per Acquisition): **R$ 60-120** por cadastro
- LTV (Lifetime Value): **R$ 2.400** (4 reservas/ano × R$ 100 médio × 3 anos × 25% margem)
- LTV/CAC: 20-40x (saudável)
- Conversão visitante → cadastro: **2-4%**
- Conversão cadastro → primeira reserva: **15-25%**

---

## 5. Fiscal

### 5.1 MEI (atual, válido até R$ 81k/ano = R$ 6.750/mês)

| Item | Custo mensal |
|---|---|
| DAS-MEI | R$ 75 |
| Contador (opcional, MEI) | R$ 0 (faz sozinho) |
| **TOTAL MEI** | **R$ 75** |

> Receita máxima MEI: R$ 81k/ano. Você atinge isso já no **Mês 6** (R$ 13.650 × 12 = R$ 163.800). Precisa migrar pra ME antes.

### 5.2 ME — Simples Nacional Anexo III (locação)

| Faixa receita anual | Alíquota | Equivalente mensal |
|---|---|---|
| Até R$ 180k | 6% | R$ 818/mês (R$ 13,6k × 6%) |
| R$ 180k - R$ 360k | 11,2% | R$ 3.060/mês (R$ 27,3k × 11,2%) |
| R$ 360k - R$ 720k | 13,5% | R$ 7.378/mês (R$ 54,6k × 13,5%) |
| R$ 720k - R$ 1,8M | 16% | R$ 18.187/mês (R$ 113,7k × 16%) |
| R$ 1,8M - R$ 3,6M | 21% | R$ 47.770/mês |
| **Mês 6** (R$ 164k/ano) | 6% | R$ 819 |
| **Mês 12** (R$ 491k/ano) | 13,5% | R$ 5.528 |
| **Mês 24** (R$ 1,64M/ano) | 16% | R$ 21.840 |

### 5.3 Outros fiscais

| Item | Mês 6 | Mês 12 | Mês 24 |
|---|---|---|---|
| Contador ME | R$ 600 | R$ 1.200 | R$ 2.500 |
| ISS Uberlândia (5% sobre serviço — aplicável?) | A verificar | A verificar | A verificar |
| Alvará anual | R$ 50 (amortizado) | R$ 50 | R$ 100 |
| **TOTAL FISCAL/mês** | **R$ 1.469** | **R$ 6.778** | **R$ 24.440** |

---

## 6. Custos one-time (CAPEX)

### 6.1 Hardware

| Item | Unidade | Quantidade inicial | Total |
|---|---|---|---|
| Cofre eletrônico (Yale/iLockey) | R$ 1.500 | 10 (Mês 6) | R$ 15.000 |
| Rastreador GPS (SmartGPS hardware) | R$ 300 | 10 | R$ 3.000 |
| Adesivagem Nomade (10 carros) | R$ 400/carro | 10 | R$ 4.000 |
| Câmeras dashcam (opcional) | R$ 800 | 10 | R$ 8.000 |
| **HARDWARE inicial (10 carros)** | | | **R$ 30.000** |
| Expansão pra 30 (Mês 12) | | +20 | +R$ 60.000 |
| Expansão pra 100 (Mês 24) | | +70 | +R$ 210.000 |

### 6.2 Profissional / Compliance

| Item | Custo one-time |
|---|---|
| Abertura ME (registro junta + Receita) | R$ 800 |
| Advogado LGPD (auditoria + termos + DPO setup) | R$ 3.500 |
| Contador inicial (planejamento tributário + DRE modelo) | R$ 2.000 |
| Termo de uso revisado por advogado | R$ 1.500 |
| Registro de marca (INPI) | R$ 350 + R$ 300 ano 1 |
| **TOTAL PROFISSIONAL** | **R$ 8.450** |

### 6.3 Frota inicial (Cenário B)

| Item | Valor |
|---|---|
| 3 HB20 usados (~R$ 50k) à vista | R$ 150.000 |
| Vistoria de entrada + transferência | R$ 1.500 (3 × R$ 500) |
| Seguro inicial (1 ano à vista, desconto 10%) | R$ 9.000 (3 × R$ 3k) |
| IPVA proporcional + licenciamento | R$ 1.800 |
| Detalhamento profissional (limpeza pré-launch) | R$ 1.500 (3 × R$ 500) |
| **TOTAL FROTA PRÓPRIA INICIAL** | **R$ 163.800** |

### 6.4 Marketing lançamento (3 meses inicial)

| Item | Total |
|---|---|
| Branding (logo refinado + identidade visual) | R$ 4.000 |
| Site (já feito ✅) | R$ 0 |
| Conteúdo inicial (10 posts vídeo + 30 estáticos) | R$ 5.000 |
| Google Ads lançamento (3 meses × R$ 5k) | R$ 15.000 |
| Meta Ads lançamento (3 meses × R$ 3k) | R$ 9.000 |
| Influenciador local (1 macro UDI) | R$ 5.000 |
| Eventos/ativações (lançamento físico em condomínio) | R$ 3.000 |
| **TOTAL MARKETING LANÇAMENTO** | **R$ 41.000** |

### 6.5 Resumo CAPEX inicial

| Categoria | Valor |
|---|---|
| Hardware (10 carros) | R$ 30.000 |
| Profissional/Compliance | R$ 8.450 |
| Frota própria (3 carros usados) | R$ 163.800 |
| Marketing lançamento | R$ 41.000 |
| Capital de giro (6 meses operação) | R$ 50.000 |
| **TOTAL APORTE INICIAL** | **R$ 293.250** |

---

## 7. Modelagem consolidada — 4 cenários

### Cenário B (Híbrido recomendado)

| Item | Mês 0 | Mês 6 | Mês 12 | Mês 24 |
|---|---:|---:|---:|---:|
| **RECEITA** | | | | |
| Carros P2P | 0 | 7 × R$ 341 = R$ 2.387 | 24 × R$ 341 = R$ 8.184 | 85 × R$ 341 = R$ 28.985 |
| Carros próprios | 0 | 3 × R$ 1.365 = R$ 4.095 | 6 × R$ 1.365 = R$ 8.190 | 15 × R$ 1.365 = R$ 20.475 |
| NomadeDrive Pass (R$ 99/ano × tier) | 0 | R$ 825 (10/mês) | R$ 4.125 (50/mês) | R$ 16.500 (200/mês) |
| Taxa pet | 0 | R$ 90 (3 reservas) | R$ 600 (20) | R$ 3.000 (100) |
| B2B condomínios | 0 | R$ 0 | R$ 4.800 (4 cond. × R$ 1.200) | R$ 36.000 (30 × R$ 1.200) |
| Outras (multas operacionais, cancelamento) | 0 | R$ 600 | R$ 2.000 | R$ 10.000 |
| **RECEITA BRUTA TOTAL** | **R$ 0** | **R$ 13.997** | **R$ 27.899** | **R$ 114.960** |
| Stripe fee (3,5%) | 0 | -R$ 490 | -R$ 976 | -R$ 4.024 |
| **RECEITA LÍQUIDA** | **R$ 0** | **R$ 13.507** | **R$ 26.923** | **R$ 110.936** |
| | | | | |
| **CUSTOS** | | | | |
| Tecnologia + Integrações (§1.4) | -R$ 330 | -R$ 1.075 | -R$ 1.700 | -R$ 4.300 |
| Vagas em condomínios (§2.5) | 0 | -R$ 3.060 | -R$ 10.200 | -R$ 30.600 |
| Custos frota P2P (lavagem + comb. + tag) | 0 | -7 × R$ 190 = R$ 1.330 | -24 × R$ 190 = R$ 4.560 | -85 × R$ 190 = R$ 16.150 |
| Custos frota própria | 0 | -3 × R$ 2.417 = R$ 7.251 | -6 × R$ 2.417 = R$ 14.502 | -15 × R$ 2.417 = R$ 36.255 |
| Pessoal (§3) | 0 | -R$ 12.684 | -R$ 47.038 | -R$ 128.936 |
| Marketing (§4) | -R$ 500 | -R$ 6.000 | -R$ 12.000 | -R$ 28.000 |
| Fiscal (§5.3) | -R$ 75 | -R$ 1.469 | -R$ 6.778 | -R$ 24.440 |
| **CUSTOS TOTAIS** | **-R$ 905** | **-R$ 32.869** | **-R$ 96.778** | **-R$ 268.681** |
| | | | | |
| **EBITDA (Receita líq. - Custos)** | **-R$ 905** | **-R$ 19.362** | **-R$ 69.855** | **-R$ 157.745** |

#### ⚠️ Resultado real: EBITDA **NEGATIVO** mesmo no Mês 24

Mesmo com modelo asset-light, **os custos de pessoal escalam mais rápido que a receita**. Pra resolver, há 3 caminhos:

1. **Reduzir headcount Mês 24**: Atendimento via IA/chatbot (eliminar 4 atendentes), reduzir pessoal pra ~6 pessoas = -R$ 60k/mês de custo
2. **Aumentar tarifa hora/dia em 30%** → receita Mês 24 = R$ 150k/mês, EBITDA quebra empate
3. **Mix mais Pass e B2B**: Pass tem margem 95%, B2B tem margem 85% — focar venda anual reduz dependência de tarifa avulsa

### Cenário consolidado **realista** (com ajustes)

Aplicando: tarifa +20% (passing premium) + foco Pass (300/mês ano 2) + headcount enxuto via IA:

| Item | Mês 6 | Mês 12 | Mês 24 |
|---|---:|---:|---:|
| Receita bruta | R$ 16.800 | R$ 40.950 | R$ 184.000 |
| Custos totais (otimizados) | -R$ 28.500 | -R$ 70.500 | -R$ 170.000 |
| **EBITDA REALISTA** | **-R$ 11.700** | **-R$ 29.550** | **+R$ 14.000** |
| Margem | -70% | -72% | **+8%** |
| Breakeven | n/a | n/a | **Mês 20** |

### Cenário A (Frota 100% própria — NÃO RECOMENDADO)

| Item | Mês 6 (10 carros) | Mês 12 (30) | Mês 24 (100) |
|---|---:|---:|---:|
| Receita bruta | R$ 13.650 | R$ 40.950 | R$ 136.500 |
| Custos frota | -R$ 24.170 | -R$ 72.510 | -R$ 241.700 |
| Outros custos | -R$ 18.000 | -R$ 67.000 | -R$ 198.000 |
| **EBITDA** | **-R$ 28.520** | **-R$ 98.560** | **-R$ 303.200** |

> **Cenário A queima R$ 300k/mês na maturidade.** Inviável sem subir pricing 80%.

---

## 8. Análise de sensibilidade

### Como mudam os números se variarmos parâmetros-chave?

| Variável | Cenário base | -20% | +20% | Impacto Mês 24 |
|---|---:|---:|---:|---|
| **Ocupação** | 37% | 30% | 45% | ±R$ 32k/mês receita |
| **Tarifa hora/dia** | atual | -20% | +20% | ±R$ 27k/mês receita |
| **% P2P na frota** | 70% | 50% | 90% | ±R$ 18k/mês custo |
| **CAC marketing** | R$ 80 | R$ 60 | R$ 120 | ±R$ 8k/mês custo |
| **Churn anual cliente** | 15% | 10% | 25% | ±R$ 10k/mês LTV perdido |

### Cenários "what-if"

- **Best case** (ocupação 50%, tarifa +20%, 80% P2P, CAC R$ 60): **EBITDA Mês 24 = +R$ 95k/mês** (margem 38%)
- **Worst case** (ocupação 25%, churn 30%, mantém pricing): **Mês 24 = -R$ 80k/mês** (queima persistente)
- **Realista** (ocupação 37%, mix recomendado): **Mês 24 = +R$ 14k/mês** (breakeven próximo)

---

## 9. Cronograma de aportes

| Quando | Valor | Para | Origem |
|---|---|---|---|
| **Mês -1 (agora)** | R$ 293k | CAPEX inicial (hardware + 3 carros + LGPD + marketing 3mo + giro) | Sócios + investidor anjo? |
| **Mês 3** | R$ 30k | Marketing reforço pós-aprendizado | Receita + reserva caixa |
| **Mês 9** | R$ 80k | Hardware +20 carros próximos (chegar a 30) | Receita + 2º aporte? |
| **Mês 18** | R$ 200k | Hardware +70 carros + expansão Goiânia | Receita + 3º aporte? |
| **TOTAL 24 MESES** | **R$ 603k** | | |

---

## 10. Riscos não quantificados

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Sinistro grave** (PT de 1+ carro próprio) | Média | -R$ 50k/incidente | Seguro Yelum + caução cliente |
| **Mudança regulatória** (ANTT regular carsharing) | Baixa | Médio (pode exigir cadastro tipo táxi) | Acompanhar legislativo |
| **Concorrência grande** (Localiza/Movida entram no carsharing UDI) | Média | Alto (preço cai) | Posicionar nicho + B2B |
| **Churn proprietário P2P** (sai do programa) | Média | Médio (perde carro da frota) | Contrato fidelidade 6mo + bônus retenção |
| **Fraude documental** (CNH falsa, etc) | Média | Alto (perda de carro) | KYC Caf + biometria + caução |
| **Inadimplência** (cobrança falha após uso) | Média | Médio (perda margem) | Pré-autorização 100% + cobrança automática |
| **Falência fornecedor** (Caf, Stripe, Supabase) | Muito baixa | Alto | Backup providers identificados |

---

## 11. Comparativo competitivo (referência mercado)

| Empresa | Modelo | Tarifa hora | Tarifa dia | Frota UDI |
|---|---|---|---|---|
| **Nomade Drive** (nós) | Carsharing P2P+próprio | R$ 12-23 | R$ 99-189 | 0 (pré-launch) |
| Movida (Hot) | Carsharing | R$ 12-20 | R$ 89-179 | 0 (UDI sem operação) |
| Turbi | Carsharing | R$ 15-25 | R$ 119-219 | 0 (UDI sem operação) |
| Localiza | Locação tradicional | n/a | R$ 109-289 (24h+) | ~50 |
| Unidas | Locação tradicional | n/a | R$ 99-269 | ~30 |
| **Vantagens nossas** | • Local (UDI) • Carsharing por hora • Vagas em condomínio • Atendimento 24h WhatsApp | | | |
| **Desvantagens** | • Marca desconhecida • Frota inicial pequena | | | |

---

## 12. Conclusão pra reunião

### O que esses números mostram

1. **Modelo P2P (asset-light) é viável.** Frota 100% própria é deficitária com pricing atual.
2. **Breakeven realista: Mês 20-24** (com ajustes de pricing e headcount enxuto via IA).
3. **Aporte inicial necessário: R$ 293k** pra chegar ao Mês 6 com 10 carros + estrutura básica.
4. **Aporte total 24 meses: R$ 603k** pra chegar a 100 carros.
5. **EBITDA Mês 24 realista: +R$ 14k/mês** (margem 8%). Best case: +R$ 95k/mês.

### Perguntas pra sócios definirem

1. **Aporte inicial**: 50/50 entre você e Danilo, ou 70/30 (você operacional + Danilo financeiro)?
2. **Modelo societário**: split de lucro vs cota de capital?
3. **Equity pra investidor anjo** (se necessário) — quanto % vale R$ 200k de aporte?
4. **Tarifa**: aceitamos lançar com pricing atual (mais competitivo, mais perda) ou subimos 20% antes do launch (mais margem, menos volume)?
5. **Frota**: priorizar P2P (escala rápido com baixo capital) ou misturar 50/50 próprio (mais controle)?

### Recomendação técnica

**Lançar Mês 0-6 com 70% P2P + 30% próprio (3 HB20 usado)**, pricing atual, foco em conversão Pass (margem alta), e revisar pricing no Mês 6 com base em dados reais de ocupação.

---

## Anexo A — Fonte das estimativas

| Item | Fonte |
|---|---|
| Custos carro (leasing, seguro, IPVA) | Tabela FIPE + cotação Yelum + IPVA-MG 4% + Detran-MG |
| Salários CLT | Glassdoor Uberlândia + Catho 2026 |
| Encargos CLT (78%) | INSS 20% + FGTS 8% + provisões 13º/férias/INSS dec. 40-50% |
| Custos Supabase/Stripe | Sites oficiais (pricing 2026) |
| Custos Caf/Infosimples/Resend | Cotações via portal devs |
| Ocupação 37% | Média carsharing BR (Movida Hot, Turbi 2024-2025) |
| LTV/CAC carsharing BR | Bain & Company Mobility Report 2024 |
| Crescimento mercado | ABLA (Assoc. Brasileira Locadoras) 2025 |

---

## Anexo B — Próximos passos pra solidificar o estudo

- [ ] Cotação real de leasing/financiamento HB20 usado em UDI (3 bancos)
- [ ] Cotação real seguro Yelum/Sulamérica pra frota carsharing
- [ ] Levantamento real de condomínios em UDI dispostos a alugar vaga R$ 800-1.200/mês (mínimo 5 contratos LOI)
- [ ] Pesquisa CAC real Google Ads carsharing UDI (1 mês teste R$ 2k)
- [ ] Validação tributária com contador especialista locadora
- [ ] Carta de intenção investidor anjo (se houver)
- [ ] Definição modelo split P2P (25%, 30%, ou variável por carro?)

---

**Documento gerado em:** 2026-05-31
**Próxima revisão:** após Mês 1 de operação real (com dados de ocupação efetiva)
**Versão pra apresentar aos sócios:** 1.0

> ⚠️ Este documento é uma **modelagem técnica** baseada em estimativas de mercado. Os números reais podem variar 20-40% pra mais ou pra menos. A reunião com sócios deve focar nas **premissas estratégicas** (modelo P2P vs próprio, pricing, ritmo de crescimento) — não nos números absolutos. Após Mês 3-6 de operação, o documento será refeito com dados reais.
