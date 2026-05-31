# 💰 Custos Operacionais — Nomade Drive Brasil

> **Versão:** 2.0 — 31/Maio/2026
> **Para:** Daniel + sócios (Danilo + futuros)
> **Objetivo:** Estudo de viabilidade financeira pra reunião societária
> **Modalidade:** Carsharing por hora/dia em Uberlândia-MG
> **Status atual:** Pré-lançamento (infra 100% pronta, 0 cliente real)
> **Plano de crescimento:** 2 carros → 5 → 10 → 20 (Mês 1-18)

---

## ⚡ Sumário executivo (1 página)

### Tabela consolidada — 4 fases de crescimento

| KPI | **Fase 1**<br/>2 carros<br/>(Mês 1-3) | **Fase 2**<br/>5 carros<br/>(Mês 4-6) | **Fase 3**<br/>10 carros<br/>(Mês 7-12) | **Fase 4**<br/>20 carros<br/>(Mês 13-18) |
|---|---:|---:|---:|---:|
| **Receita bruta/mês** | R$ 1.706 | R$ 4.050 | R$ 8.807 | R$ 19.839 |
| **Custos totais/mês** | R$ 11.420 | R$ 18.490 | R$ 28.860 | R$ 45.300 |
| **EBITDA/mês** | -R$ 9.714 | -R$ 14.440 | -R$ 20.053 | -R$ 25.461 |
| **Margem** | -569% | -357% | -228% | -128% |
| **Queima mensal** | R$ 10k | R$ 14,4k | R$ 20k | R$ 25,5k |
| **Equipe** | 2 sócios | 2 + 1 atendente PT | 3 + 1 motorista PJ | 5 + ops |
| **CAPEX acumulado** | R$ 75k | R$ 145k | R$ 245k | R$ 425k |
| **Burn acumulado** (CAPEX + queima) | -R$ 105k | -R$ 188k | -R$ 365k | -R$ 670k |

### 🔴 Realidade dura: **Mesmo com modelo P2P o app fica deficitário até 20+ carros**

Com pricing atual (R$ 12-23/hora, R$ 99-189/dia) e ocupação realista 35-40%, **a operação é estruturalmente deficitária na escala 2-20 carros**. Pra virar lucro:

| Caminho pra lucro | Quando vira positivo |
|---|---|
| Manter pricing + crescer até **50+ carros** com headcount enxuto | Mês 22-30 |
| **Subir pricing 30%** (R$ 16-30/hora) + manter mix P2P | Mês 16-18 (com 20 carros) |
| **Subir pricing 50%** + focar Pass anual + B2B condomínios | Mês 12-14 (com 15 carros) |
| Combinação: +20% pricing + Pass +30% + B2B agressivo | Mês 14-16 |

### 💰 Investimento total nas 4 fases

| Item | Valor |
|---|---|
| **CAPEX (one-time)** | R$ 425.000 |
| **Burn operacional (18 meses)** | R$ 245.000 |
| **TOTAL APORTE 18 MESES** | **R$ 670.000** |

### O que esse documento te diz

✅ **Modelo é viável** com escala (50+ carros) **OU** ajuste de pricing (+30%)
✅ **P2P é melhor que próprio** na fase de validação (menos CAPEX, menos risco)
⚠️ **Você precisa de R$ 670k de runway** pra chegar a 20 carros operacionais
⚠️ **Pricing atual subestima custos reais** — revisar antes do launch
✅ **Headcount enxuto é fundamental** — automatizar atendimento via IA reduz custo R$ 8-15k/mês

---

## 1. CUSTOS DETALHADOS — todos os itens

### 1.1 Tecnologia recorrente (mês 1+)

| # | Item | Provedor | F1 (2 carros) | F2 (5) | F3 (10) | F4 (20) |
|---|---|---|---:|---:|---:|---:|
| 1 | Backend DB+Auth+Storage+Edge | Supabase Pro | R$ 125 | R$ 125 | R$ 125 | R$ 250 (escala) |
| 2 | Frontend hosting | GitHub Pages | R$ 0 | R$ 0 | R$ 0 | R$ 0 |
| 3 | Domínio + DNS | Registro.br | R$ 5 | R$ 5 | R$ 5 | R$ 5 |
| 4 | E-mail transacional | Resend | R$ 0 (free 100/dia) | R$ 100 | R$ 100 | R$ 100 |
| 5 | Push notifications | VAPID self-hosted | R$ 0 | R$ 0 | R$ 0 | R$ 0 |
| 6 | Consulta multas | Infosimples | R$ 100 (mín) | R$ 100 | R$ 100 | R$ 150 |
| 7 | Stripe (3,5% sobre receita) | Stripe | R$ 60 | R$ 142 | R$ 308 | R$ 694 |
| 8 | Sentry error tracking | Sentry free | R$ 0 | R$ 0 | R$ 50 | R$ 130 |
| | **Subtotal tech recorrente** | | **R$ 290** | **R$ 472** | **R$ 688** | **R$ 1.329** |

### 1.2 Integrações P0/P1 a contratar

| # | Item | F1 | F2 | F3 | F4 |
|---|---|---:|---:|---:|---:|
| 9 | **KYC Caf** (CPF+OCR+biometria) | R$ 0 (manual) | R$ 250 | R$ 250 | R$ 500 (volume) |
| 10 | **WhatsApp Business Meta** | R$ 0 (links wa.me) | R$ 50 | R$ 100 | R$ 250 |
| 11 | **Autentique** assinatura digital | R$ 0 (free 5/mês) | R$ 49 | R$ 49 | R$ 149 (volume) |
| 12 | **Google Maps** | R$ 0 (free 28k loads) | R$ 0 | R$ 50 | R$ 80 |
| 13 | **Crisp chat** (Pro 2 ops) | R$ 0 (free básico) | R$ 125 | R$ 125 | R$ 250 |
| 14 | **Cloudflare Turnstile** | R$ 0 | R$ 0 | R$ 0 | R$ 0 |
| 15 | **NF-e NotaZZ** | R$ 0 (sem B2B) | R$ 0 | R$ 49 | R$ 99 |
| 16 | **SMS backup Zenvia** | R$ 0 | R$ 50 | R$ 50 | R$ 100 |
| | **Subtotal integrações** | **R$ 0** | **R$ 524** | **R$ 673** | **R$ 1.428** |

### 1.3 Hardware mensal (rastreador + cofre por carro)

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Rastreador SmartGPS (R$ 3,20/un.) | R$ 7 (2 carros) | R$ 16 (5) | R$ 32 (10) | R$ 48 (15 próprios) |
| Cofre eletrônico (API mensal ~R$ 50/un.) | R$ 100 | R$ 250 | R$ 500 | R$ 750 |
| Veloe/ConectCar pedágio (R$ 10/tag opcional) | R$ 0 (manual) | R$ 30 (3 tags) | R$ 80 | R$ 200 |
| **Subtotal hardware/mês** | **R$ 107** | **R$ 296** | **R$ 612** | **R$ 998** |

### 1.4 OPERAÇÃO DA FROTA — modelo híbrido (70% P2P + 30% próprio)

#### Distribuição da frota por cenário

| Cenário | Próprios | P2P | Total |
|---|---:|---:|---:|
| Fase 1 (2 carros) | 1 (HB20 usado) | 1 (parceiro UDI) | 2 |
| Fase 2 (5 carros) | 2 | 3 | 5 |
| Fase 3 (10 carros) | 3 | 7 | 10 |
| Fase 4 (20 carros) | 6 | 14 | 20 |

#### Custo mensal por carro PRÓPRIO (HB20 usado R$ 50k)

| Item | Mensal |
|---|---:|
| Financiamento (60m, 1,5%am, ent. 30%) | R$ 990 |
| Seguro Yelum (5% FIPE/ano) | R$ 250 |
| IPVA + licenciamento (2% FIPE/ano + R$ 200) | R$ 117 |
| Manutenção preventiva (R$ 0,12/km × 1500km) | R$ 180 |
| Pneus + recapagem | R$ 60 |
| Lavagem (4x/mês × R$ 50) | R$ 200 |
| Combustível operacional (50km grátis por reserva) | R$ 80 |
| Tag pedágio | R$ 10 |
| Reserva multas (média) | R$ 30 |
| Depreciação extra (revenda 50% em 3 anos) | R$ 500 |
| **TOTAL por carro próprio** | **R$ 2.417** |

#### Custo mensal por carro P2P (split 25% pra Nomade)

| Item | Pago por | Mensal Nomade |
|---|---|---:|
| Leasing/seguro/IPVA/manutenção | Proprietário | R$ 0 |
| Lavagem (acordo 50/50) | Split | R$ 100 |
| Combustível 50km grátis (Nomade reembolsa) | Nomade | R$ 80 |
| Tag pedágio | Nomade | R$ 10 |
| **TOTAL por carro P2P** | | **R$ 190** |

#### Custo total frota por cenário

| Cenário | Próprios × R$ 2.417 | P2P × R$ 190 | TOTAL frota/mês |
|---|---:|---:|---:|
| F1 (1+1) | R$ 2.417 | R$ 190 | **R$ 2.607** |
| F2 (2+3) | R$ 4.834 | R$ 570 | **R$ 5.404** |
| F3 (3+7) | R$ 7.251 | R$ 1.330 | **R$ 8.581** |
| F4 (6+14) | R$ 14.502 | R$ 2.660 | **R$ 17.162** |

### 1.5 VAGAS em condomínios (aluguel)

Modelo: 1 vaga atende 3-4 carros (rotação dinâmica).

| Cenário | Vagas | Custo mensal |
|---|---:|---:|
| F1 (2 carros) | 1 vaga × R$ 1.000 | **R$ 1.000** |
| F2 (5 carros) | 2 vagas × R$ 1.000 | **R$ 2.000** |
| F3 (10 carros) | 3 vagas × R$ 1.000 | **R$ 3.000** |
| F4 (20 carros) | 6 vagas × R$ 1.000 | **R$ 6.000** |

### 1.6 PESSOAL

#### Fase 1 (2 carros, Mês 1-3): só sócios

| Pessoa | Cargo | Pró-labore | Encargos INSS | Total |
|---|---|---:|---:|---:|
| Daniel | CEO/Tech | R$ 1.500 | R$ 165 (11%) | R$ 1.665 |
| Danilo | CFO | R$ 1.500 | R$ 165 | R$ 1.665 |
| **TOTAL F1** | | | | **R$ 3.330** |

> Pró-labore baixo na validação. Quando entrar receita, sobe.

#### Fase 2 (5 carros, Mês 4-6): + 1 atendente part-time

| Pessoa | Cargo | Bruto | Encargos | Total |
|---|---|---:|---:|---:|
| Daniel | CEO | R$ 2.500 | R$ 275 | R$ 2.775 |
| Danilo | CFO | R$ 2.500 | R$ 275 | R$ 2.775 |
| Atendente WhatsApp PT | PJ 4h/dia | R$ 1.500 | R$ 0 | R$ 1.500 |
| **TOTAL F2** | | | | **R$ 7.050** |

#### Fase 3 (10 carros, Mês 7-12): + atendente CLT + motorista PJ

| Pessoa | Cargo | Bruto | Encargos (78%) | Total |
|---|---|---:|---:|---:|
| Daniel | CEO | R$ 4.000 | R$ 440 | R$ 4.440 |
| Danilo | CFO | R$ 4.000 | R$ 440 | R$ 4.440 |
| Atendente WhatsApp | CLT júnior | R$ 1.800 | R$ 1.404 | R$ 3.204 |
| Motorista remoção | PJ part-time | R$ 1.500 | R$ 0 | R$ 1.500 |
| **TOTAL F3** | | | | **R$ 13.584** |

#### Fase 4 (20 carros, Mês 13-18): + gerente operações + 1 atendente

| Pessoa | Cargo | Bruto | Encargos | Total |
|---|---|---:|---:|---:|
| Daniel | CEO | R$ 6.000 | R$ 660 | R$ 6.660 |
| Danilo | CFO | R$ 6.000 | R$ 660 | R$ 6.660 |
| 2 Atendentes WhatsApp | CLT júnior | 2 × R$ 1.800 | R$ 2.808 | R$ 6.408 |
| Motorista remoção | CLT júnior | R$ 2.500 | R$ 1.950 | R$ 4.450 |
| Gerente Operações | CLT pleno | R$ 4.500 | R$ 3.510 | R$ 8.010 |
| **TOTAL F4** | | | | **R$ 32.188** |

### 1.7 INFRAESTRUTURA DE ESCRITÓRIO

#### Fase 1-2: Home office (deduções proporcionais)

| Item | Mensal |
|---|---:|
| Internet residencial (100% trabalho) | R$ 150 |
| Conta de luz proporcional (estimado 20%) | R$ 80 |
| Celular trabalho (Daniel + Danilo) | R$ 200 (2 × R$ 100) |
| Notebook (amortização 36 meses, R$ 5k cada) | R$ 280 (2 × R$ 140) |
| Cadeira ergo / setup home office | R$ 150 (amortização) |
| **TOTAL F1-2** | **R$ 860** |

#### Fase 3-4: Mini coworking ou sala alugada

| Item | F3 | F4 |
|---|---:|---:|
| Sala coworking (4 pessoas) | R$ 1.800 | R$ 2.500 (6 pessoas) |
| Internet dedicada | R$ 200 | R$ 250 |
| Energia + condomínio | R$ 0 (incluso) | R$ 0 |
| Celular corporativo | R$ 400 (4 linhas) | R$ 700 (7 linhas) |
| Notebooks novos | R$ 420 (3 × R$ 140) | R$ 700 (5 × R$ 140) |
| Material escritório | R$ 100 | R$ 200 |
| **TOTAL** | **R$ 2.920** | **R$ 4.350** |

### 1.8 SOFTWARE / FERRAMENTAS

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Google Workspace (e-mail @nomadedrive) | R$ 30 (2 × R$ 15) | R$ 45 | R$ 60 | R$ 105 |
| Figma / Canva Pro | R$ 60 | R$ 60 | R$ 60 | R$ 60 |
| ChatGPT Plus (atendimento, redação) | R$ 100 (1 conta) | R$ 100 | R$ 200 (2) | R$ 400 (4) |
| Antivírus + backup | R$ 50 | R$ 80 | R$ 130 | R$ 200 |
| Senhas (1Password / Bitwarden) | R$ 0 (free) | R$ 50 | R$ 80 | R$ 150 |
| **Subtotal software** | **R$ 240** | **R$ 335** | **R$ 530** | **R$ 915** |

### 1.9 SERVIÇOS PROFISSIONAIS recorrentes

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Contador (MEI → ME) | R$ 200 | R$ 400 | R$ 700 | R$ 1.200 |
| Advogado on-demand (1-2h/mês) | R$ 200 | R$ 300 | R$ 500 | R$ 800 |
| Designer freelance (peças marketing) | R$ 500 | R$ 800 | R$ 1.200 | R$ 2.000 |
| **Subtotal profissional** | **R$ 900** | **R$ 1.500** | **R$ 2.400** | **R$ 4.000** |

### 1.10 BANCÁRIO / FINANCEIRO

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Conta PJ (Inter, Bradesco, BB) | R$ 50 | R$ 60 | R$ 80 | R$ 120 |
| Taxa cartão crédito empresarial | R$ 30 | R$ 40 | R$ 60 | R$ 100 |
| Antecipação recebíveis Stripe (2% sobre 50% receita) | R$ 17 | R$ 41 | R$ 88 | R$ 198 |
| Tarifas TED/PIX corporativo | R$ 30 | R$ 50 | R$ 80 | R$ 150 |
| Conciliação automática (Conta Azul básico) | R$ 0 (manual) | R$ 80 | R$ 130 | R$ 200 |
| **Subtotal bancário** | **R$ 127** | **R$ 271** | **R$ 438** | **R$ 768** |

### 1.11 SEGUROS adicionais (além do veicular)

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| RC profissional empresarial (cobertura R$ 200k) | R$ 80 | R$ 120 | R$ 200 | R$ 350 |
| Seguro patrimonial (cofres + equipamentos) | R$ 50 | R$ 90 | R$ 150 | R$ 280 |
| Seguro vida sócios (opcional) | R$ 0 | R$ 150 (2 × R$ 75) | R$ 150 | R$ 300 |
| **Subtotal seguros** | **R$ 130** | **R$ 360** | **R$ 500** | **R$ 930** |

### 1.12 BENEFÍCIOS funcionários CLT (Fase 3+)

| Item | F3 (1 CLT) | F4 (3 CLT) |
|---|---:|---:|
| Vale refeição/alimentação (R$ 600/pessoa) | R$ 600 | R$ 1.800 |
| Vale transporte (R$ 200) | R$ 200 | R$ 600 |
| Plano de saúde (Unimed básico, R$ 350) | R$ 350 | R$ 1.050 |
| **Subtotal benefícios** | **R$ 1.150** | **R$ 3.450** |

### 1.13 MARKETING

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Google Ads (CAC R$ 80) | R$ 1.500 | R$ 3.500 | R$ 6.000 | R$ 10.000 |
| Meta Ads (Instagram + FB) | R$ 800 | R$ 2.000 | R$ 3.500 | R$ 6.000 |
| Produção conteúdo (vídeo/foto) | R$ 500 | R$ 1.000 | R$ 1.500 | R$ 2.500 |
| Influenciador local (UDI) | R$ 0 | R$ 500 | R$ 1.000 | R$ 2.000 |
| Eventos/ativações | R$ 200 | R$ 500 | R$ 1.000 | R$ 1.500 |
| Email marketing (já no Resend) | R$ 0 | R$ 0 | R$ 0 | R$ 0 |
| Brindes/material físico (cartão, adesivo) | R$ 100 | R$ 200 | R$ 400 | R$ 800 |
| **Subtotal marketing** | **R$ 3.100** | **R$ 7.700** | **R$ 13.400** | **R$ 22.800** |

### 1.14 FISCAL (impostos sobre receita)

#### MEI (vale até R$ 81k/ano = R$ 6.750/mês)

| Item | F1 (R$ 1.706/mês) |
|---|---:|
| DAS-MEI | R$ 75 |
| **TOTAL** | **R$ 75** |

> ⚠️ MEI vai estourar quando receita anual passar R$ 81k. Isso acontece quando receita mensal supera R$ 6.750. Pelo modelo, isso é na transição **F2 → F3** (Mês 7).

#### ME — Simples Nacional Anexo III (locação de bens)

| Cenário | Receita anual | Alíquota | Imposto/mês |
|---|---:|---:|---:|
| F2 transição (R$ 48k/ano) | R$ 48.600 | 6% | R$ 243 |
| F3 (R$ 105k/ano) | R$ 105.680 | 6% | R$ 528 |
| F4 (R$ 238k/ano) | R$ 238.068 | 11,2% | R$ 2.222 |

### 1.15 CUSTOS COMUNICACIONAIS

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| WhatsApp Business número dedicado | R$ 30 | R$ 30 | R$ 50 | R$ 80 |
| Telefone fixo VoIP (atendimento) | R$ 0 | R$ 80 | R$ 80 | R$ 150 |
| SMS notificações urgentes (Zenvia) | R$ 0 | R$ 50 | R$ 80 | R$ 150 |
| **Subtotal comunicação** | **R$ 30** | **R$ 160** | **R$ 210** | **R$ 380** |

### 1.16 COMPLIANCE / AUDITORIA (anual amortizado)

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| DPO LGPD (consultoria mensal) | R$ 0 | R$ 200 | R$ 400 | R$ 800 |
| Auditoria fiscal anual (amortizado) | R$ 50 | R$ 100 | R$ 200 | R$ 400 |
| Renovação alvará anual + INPI marca | R$ 30 | R$ 30 | R$ 50 | R$ 80 |
| **Subtotal compliance** | **R$ 80** | **R$ 330** | **R$ 650** | **R$ 1.280** |

### 1.17 RESERVAS / CONTINGÊNCIAS (provisão mensal)

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Sinistro não coberto (franquia, etc) | R$ 200 | R$ 500 | R$ 800 | R$ 1.500 |
| Cobrança jurídica (inadimplência) | R$ 100 | R$ 200 | R$ 400 | R$ 800 |
| Imprevistos técnicos (hardware, troca) | R$ 100 | R$ 200 | R$ 400 | R$ 700 |
| **Subtotal contingência** | **R$ 400** | **R$ 900** | **R$ 1.600** | **R$ 3.000** |

### 1.18 TREINAMENTOS E EVENTOS

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Cursos online (Hotmart, etc) | R$ 50 | R$ 100 | R$ 150 | R$ 250 |
| Eventos setor (feiras, networking) | R$ 0 | R$ 100 | R$ 200 | R$ 400 |
| Coaching/mentoria startup (opcional) | R$ 0 | R$ 0 | R$ 500 | R$ 800 |
| **Subtotal treinamento** | **R$ 50** | **R$ 200** | **R$ 850** | **R$ 1.450** |

---

## 2. RESUMO CUSTOS TOTAIS por fase

| Categoria | F1 (2 carros) | F2 (5 carros) | F3 (10 carros) | F4 (20 carros) |
|---|---:|---:|---:|---:|
| 1.1 Tecnologia recorrente | R$ 290 | R$ 472 | R$ 688 | R$ 1.329 |
| 1.2 Integrações P0/P1 | R$ 0 | R$ 524 | R$ 673 | R$ 1.428 |
| 1.3 Hardware mensal | R$ 107 | R$ 296 | R$ 612 | R$ 998 |
| 1.4 Operação da frota | R$ 2.607 | R$ 5.404 | R$ 8.581 | R$ 17.162 |
| 1.5 Vagas em condomínios | R$ 1.000 | R$ 2.000 | R$ 3.000 | R$ 6.000 |
| 1.6 Pessoal | R$ 3.330 | R$ 7.050 | R$ 13.584 | R$ 32.188 |
| 1.7 Infra escritório | R$ 860 | R$ 860 | R$ 2.920 | R$ 4.350 |
| 1.8 Software/ferramentas | R$ 240 | R$ 335 | R$ 530 | R$ 915 |
| 1.9 Serviços profissionais | R$ 900 | R$ 1.500 | R$ 2.400 | R$ 4.000 |
| 1.10 Bancário/financeiro | R$ 127 | R$ 271 | R$ 438 | R$ 768 |
| 1.11 Seguros (não veicular) | R$ 130 | R$ 360 | R$ 500 | R$ 930 |
| 1.12 Benefícios CLT | R$ 0 | R$ 0 | R$ 1.150 | R$ 3.450 |
| 1.13 Marketing | R$ 3.100 | R$ 7.700 | R$ 13.400 | R$ 22.800 |
| 1.14 Fiscal (imposto receita) | R$ 75 | R$ 243 | R$ 528 | R$ 2.222 |
| 1.15 Comunicação | R$ 30 | R$ 160 | R$ 210 | R$ 380 |
| 1.16 Compliance | R$ 80 | R$ 330 | R$ 650 | R$ 1.280 |
| 1.17 Contingências | R$ 400 | R$ 900 | R$ 1.600 | R$ 3.000 |
| 1.18 Treinamento/eventos | R$ 50 | R$ 200 | R$ 850 | R$ 1.450 |
| **TOTAL CUSTOS/MÊS** | **R$ 13.326** | **R$ 28.605** | **R$ 52.314** | **R$ 104.650** |

> ⚠️ **Custos cresceram bastante** comparado à versão 1.0 do doc. Agora estão completos: cada centavo previsível.

---

## 3. RECEITA detalhada por fase

### 3.1 Receita por carro (recapitulando)

| Tipo | Receita Nomade/mês |
|---|---:|
| Carro próprio (100% da tarifa) | R$ 1.365 |
| Carro P2P (split 25% Nomade) | R$ 341 |
| Carro P2P (split 30%) | R$ 410 |

### 3.2 Receita base de carros por fase

| Cenário | Próprios | P2P (25%) | TOTAL |
|---|---:|---:|---:|
| F1 (1+1) | R$ 1.365 | R$ 341 | **R$ 1.706** |
| F2 (2+3) | R$ 2.730 | R$ 1.023 | **R$ 3.753** |
| F3 (3+7) | R$ 4.095 | R$ 2.387 | **R$ 6.482** |
| F4 (6+14) | R$ 8.190 | R$ 4.774 | **R$ 12.964** |

### 3.3 Receita ADICIONAL (Pass + B2B + extras)

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| NomadeDrive Pass (R$ 99/ano ÷ 12) | R$ 0 (sem vendas) | R$ 99 (12 vendas/ano) | R$ 495 (60/ano) | R$ 1.485 (180/ano) |
| B2B condomínios (R$ 1.200/mês cada) | R$ 0 | R$ 0 | R$ 1.200 (1 contrato) | R$ 3.600 (3 contratos) |
| Taxa pet (R$ 30/reserva) | R$ 0 | R$ 30 (1) | R$ 180 (6) | R$ 600 (20) |
| Extras (cancelamento, KM extra, multas) | R$ 0 | R$ 168 | R$ 450 | R$ 1.190 |
| **Subtotal extras** | **R$ 0** | **R$ 297** | **R$ 2.325** | **R$ 6.875** |

### 3.4 RECEITA TOTAL por fase

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Receita base carros | R$ 1.706 | R$ 3.753 | R$ 6.482 | R$ 12.964 |
| Receita extras | R$ 0 | R$ 297 | R$ 2.325 | R$ 6.875 |
| **RECEITA BRUTA TOTAL** | **R$ 1.706** | **R$ 4.050** | **R$ 8.807** | **R$ 19.839** |

---

## 4. RESULTADO consolidado por fase

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| **RECEITA BRUTA** | R$ 1.706 | R$ 4.050 | R$ 8.807 | R$ 19.839 |
| **CUSTOS TOTAIS** | -R$ 13.326 | -R$ 28.605 | -R$ 52.314 | -R$ 104.650 |
| **EBITDA mensal** | **-R$ 11.620** | **-R$ 24.555** | **-R$ 43.507** | **-R$ 84.811** |
| Margem % | -681% | -606% | -494% | -428% |
| **Queima acumulada (período)** | -R$ 35k (3 meses) | -R$ 74k (3 meses) | -R$ 261k (6 meses) | -R$ 509k (6 meses) |
| **Queima acumulada TOTAL (Mês 1-18)** | | | | **R$ 879k** |

### 🔴 Conclusão dura: nessa modelagem realista, **chega a R$ 879k de queima nos 18 meses**

Isso é uma operação muito mais cara do que parecia na v1.0 do doc. Pra fazer essa modelagem fechar, precisaria pelo menos **um destes 4 ajustes radicais**:

| Ajuste | Impacto | Difícil? |
|---|---|---|
| **A) Subir pricing 50%** (R$ 18-35/hora, R$ 149-285/dia) | Receita +50%, breakeven Mês 14-16 | Médio — pode reduzir conversão 20-30% |
| **B) Triplicar volume (60 carros até Mês 12)** | Diluiu overhead | Alto — exige R$ 800k+ aporte |
| **C) Equipe enxuta via IA** (1 atendente + bots) | -R$ 8-15k/mês CLT | Médio — IA não substitui 100% |
| **D) Mix 90% P2P + 10% próprio** | -R$ 6-12k/mês custo frota | Médio — depende ter proprietários |
| **Combinação A+C+D** | Breakeven Mês 12-14 | Recomendado |

### 4.1 Cenário OTIMIZADO (combinação A+C+D)

| Item | F1 (2 carros) | F2 (5) | F3 (10) | F4 (20) |
|---|---:|---:|---:|---:|
| **Receita +50% pricing + 90% P2P** | R$ 1.876 | R$ 4.692 | R$ 9.866 | R$ 22.150 |
| Custos otimizados (frota -30%, pessoal -25%) | -R$ 10.500 | -R$ 21.500 | -R$ 39.500 | -R$ 75.000 |
| **EBITDA otimizado** | -R$ 8.624 | -R$ 16.808 | -R$ 29.634 | **-R$ 52.850** |

Ainda deficitário. Pra realmente fechar, é necessário **chegar a 30-40 carros** com esse modelo otimizado. Isso é **Mês 18-22**.

---

## 5. CAPEX (one-time) por fase

### Fase 1 — pre-launch (Mês 0)

| Item | Valor |
|---|---:|
| Abertura ME (junta + Receita) | R$ 800 |
| Contador inicial (setup tributário) | R$ 2.000 |
| Advogado LGPD inicial | R$ 3.500 |
| Termo de uso revisado por advogado | R$ 1.500 |
| Registro INPI marca | R$ 650 |
| Branding refinado (logo + identidade visual) | R$ 4.000 |
| 1 carro próprio HB20 usado (entrada 30%) | R$ 15.000 |
| Caução fiança leasing | R$ 5.000 |
| Vistoria + transferência + IPVA pro-rata | R$ 1.500 |
| Seguro anual 1° carro | R$ 3.000 |
| Cofre eletrônico (2 unidades) | R$ 3.000 |
| Rastreador GPS hardware (2) | R$ 600 |
| Adesivagem 2 carros | R$ 800 |
| Notebook adicional sócio | R$ 5.000 |
| Marketing pré-lançamento (1 mês) | R$ 5.000 |
| Capital giro (3 meses operação) | R$ 40.000 |
| **TOTAL CAPEX Fase 1** | **R$ 91.350** |

### Fase 2 — expansão pra 5 carros (Mês 4)

| Item | Valor |
|---|---:|
| +1 carro próprio HB20 (entrada 30%) | R$ 15.000 |
| Caução + seguro + transferência | R$ 5.500 |
| +3 cofres eletrônicos | R$ 4.500 |
| +3 rastreadores GPS | R$ 900 |
| Adesivagem 3 carros | R$ 1.200 |
| Marketing campanha 5 carros | R$ 10.000 |
| Capital giro adicional | R$ 30.000 |
| **TOTAL CAPEX Fase 2** | **R$ 67.100** |

### Fase 3 — expansão pra 10 carros (Mês 7)

| Item | Valor |
|---|---:|
| +1 carro próprio (já tinham 2, fica 3) | R$ 15.000 |
| Caução + seguro + transferência | R$ 5.500 |
| +5 cofres eletrônicos (chega a 10) | R$ 7.500 |
| +5 rastreadores GPS | R$ 1.500 |
| Adesivagem 5 carros novos | R$ 2.000 |
| Setup coworking inicial (caução + sinal) | R$ 5.000 |
| Notebooks novos (3) | R$ 15.000 |
| Marketing campanha scale | R$ 25.000 |
| Capital giro 6 meses | R$ 80.000 |
| **TOTAL CAPEX Fase 3** | **R$ 156.500** |

### Fase 4 — expansão pra 20 carros (Mês 13)

| Item | Valor |
|---|---:|
| +3 carros próprios (chega a 6) | R$ 45.000 (entradas) |
| Caução + seguro + transferência | R$ 16.500 |
| +10 cofres eletrônicos | R$ 15.000 |
| +10 rastreadores GPS | R$ 3.000 |
| Adesivagem 10 carros | R$ 4.000 |
| Sala física definitiva (sinal + caução) | R$ 15.000 |
| Móveis + equipamentos escritório | R$ 10.000 |
| Equipe nova: contratação + 13°/férias | R$ 8.000 |
| Marketing scale (ads pesados) | R$ 50.000 |
| Capital giro 6 meses | R$ 50.000 |
| **TOTAL CAPEX Fase 4** | **R$ 216.500** |

### 5.5 CAPEX ACUMULADO

| Fase | CAPEX desta fase | CAPEX acumulado |
|---|---:|---:|
| Fase 1 (Mês 0) | R$ 91.350 | **R$ 91.350** |
| Fase 2 (Mês 4) | R$ 67.100 | **R$ 158.450** |
| Fase 3 (Mês 7) | R$ 156.500 | **R$ 314.950** |
| Fase 4 (Mês 13) | R$ 216.500 | **R$ 531.450** |

---

## 6. APORTES totais necessários (CAPEX + BURN)

### Cenário pessimista (sem ajustes — números brutos do doc)

| Fase | CAPEX desta fase | Queima esta fase | TOTAL fase | Acumulado |
|---|---:|---:|---:|---:|
| F1 (Mês 1-3) | R$ 91.350 | R$ 34.860 (3 × R$ 11.620) | R$ 126.210 | **R$ 126.210** |
| F2 (Mês 4-6) | R$ 67.100 | R$ 73.665 (3 × R$ 24.555) | R$ 140.765 | **R$ 266.975** |
| F3 (Mês 7-12) | R$ 156.500 | R$ 261.042 (6 × R$ 43.507) | R$ 417.542 | **R$ 684.517** |
| F4 (Mês 13-18) | R$ 216.500 | R$ 508.866 (6 × R$ 84.811) | R$ 725.366 | **R$ 1.409.883** |

> 🚨 **R$ 1,4 milhão é o aporte total no cenário SEM ajustes.** Inviável pra MEI/ME bootstrap.

### Cenário OTIMIZADO (pricing +50%, equipe enxuta, 90% P2P)

| Fase | CAPEX | Queima | Acumulado |
|---|---:|---:|---:|
| F1 | R$ 91.350 | R$ 25.872 (3 × R$ 8.624) | **R$ 117.222** |
| F2 | R$ 67.100 | R$ 50.424 (3 × R$ 16.808) | **R$ 234.746** |
| F3 | R$ 156.500 | R$ 177.804 (6 × R$ 29.634) | **R$ 569.050** |
| F4 | R$ 216.500 | R$ 317.100 (6 × R$ 52.850) | **R$ 1.102.650** |

Ainda alto. **Realisticamente, projeto exige R$ 700k-1,1M de runway pra chegar a 20 carros operacionais e ainda assim não atingir breakeven.**

---

## 7. CAMINHOS pra reduzir a necessidade de aporte

### Opção A — Pivotar pra 100% P2P (sem carro próprio)

- **Elimina CAPEX de carros** (-R$ 81k em 4 fases)
- **Elimina custo operacional fixo de frota própria** (-R$ 14.502/mês em F4)
- **Reduz receita** (perde R$ 8.190 receita carros próprios em F4 = perde R$ 6.825 líquido)
- **Saldo líquido positivo**: -R$ 14.502 (custo) + (-R$ 6.825) receita perdida = **-R$ 7.677/mês a favor**
- **Total Aporte cai pra R$ 850k-1M**

### Opção B — Esperar Mês 6 pra entrar B2B agressivo

- B2B condomínio paga R$ 1.200/mês fixo MESMO sem reserva
- 5 contratos B2B = R$ 6.000/mês de receita garantida
- Mas exige equipe comercial dedicada
- ROI: positivo se conseguir 5+ contratos em <6 meses

### Opção C — Bootstrap puro com 2-3 carros próximos 12 meses

- Cresce só conforme receita permite (organic)
- Sem necessidade de aporte grande inicial
- Crescimento mais lento (talvez 10 carros em 24 meses em vez de 18)
- **Aporte necessário: R$ 200-300k** (mais factível pra sócios sem investidor externo)

### Opção D — Buscar investidor anjo R$ 500k → 30% equity

- Aporte inicial 500k cobre F1+F2+grande parte F3
- Pressão por crescimento mais rápido
- Diluição: 70% Daniel/Danilo, 30% investidor

---

## 8. ANÁLISE DE RISCOS (não quantificados)

| Risco | Probabilidade | Impacto financeiro | Mitigação |
|---|---|---|---|
| **Sinistro grave** (PT carro próprio) | Média | -R$ 30-50k/incidente | Seguro Yelum + caução R$ 200 cliente |
| **Mudança regulatória** (ANTT regular) | Baixa | Médio (custo compliance) | Acompanhar legislativo, lobby ABLA |
| **Concorrência grande entrar UDI** (Localiza Hot) | Alta | Alto (preço cai 20-30%) | Posicionar nicho + B2B + relação local |
| **Churn proprietário P2P** (sai do programa) | Média | Médio (perde carro frota) | Contrato fidelidade 6mo + bônus retenção R$ 200/mês |
| **Fraude documental** (CNH falsa, etc) | Média | Alto (perda carro) | KYC Caf + biometria + caução |
| **Inadimplência cobrança** | Média | Médio (perda margem 5-10%) | Pré-autorização 100% + cobrança automática |
| **Falência fornecedor crítico** (Supabase, Stripe) | Muito baixa | Crítico | Backup providers identificados |
| **Sócio desistir** (Danilo) | Baixa | Alto (perda 50% trabalho) | Acordo societário cláusula vesting + buyout |
| **Recessão econômica** (carsharing é discricionário) | Média | Alto (-30-50% receita) | Diversificar B2B (recurring) |
| **Carro roubado/furtado** | Média (UDI tem) | Alto (-R$ 50k) | Seguro + GPS + bloqueio remoto |

---

## 9. COMPARATIVO competitivo (referência mercado UDI)

| Empresa | Modelo | Tarifa hora | Tarifa dia | Frota UDI |
|---|---|---:|---:|---:|
| **Nomade Drive** (nós) | Carsharing P2P+próprio | R$ 12-23 | R$ 99-189 | 0 (pré-launch) |
| Movida (Hot) | Carsharing | R$ 12-20 | R$ 89-179 | 0 (UDI sem op.) |
| Turbi | Carsharing | R$ 15-25 | R$ 119-219 | 0 |
| Localiza | Locação tradicional | n/a | R$ 109-289 | ~50 |
| Unidas | Locação tradicional | n/a | R$ 99-269 | ~30 |

**Vantagens nossas:**
- Local UDI (ninguém faz carsharing por hora aqui)
- Tarifa competitiva
- Vagas em condomínio (último km)
- Atendimento 24h WhatsApp

**Desvantagens:**
- Marca desconhecida (vs Localiza)
- Frota inicial pequena
- Sem capital pra concorrer com grandes

---

## 10. CONCLUSÃO pra reunião com sócios

### 10.1 Verdade dura sobre o negócio

1. **Custo total é maior do que parecia.** Modelagem v1.0 deixou de fora muitos itens (escritório, software, benefícios, contingências, banco, comunicação, treinamento). Versão 2.0 mostra **R$ 13-105k/mês** de custos conforme escala.

2. **Receita com pricing atual NÃO cobre custos** mesmo no modelo P2P. Margem unit é positiva (P2P) mas overhead engole tudo.

3. **Breakeven realista exige uma destas 3 mudanças:**
   - Subir pricing 30-50% (vira mais caro que Localiza por hora — perde vantagem)
   - Chegar a 30-50+ carros (precisa R$ 700k-1M de runway)
   - Modelo radicalmente enxuto (1 pessoa + IA + 100% P2P)

4. **O aporte real pra chegar a 20 carros é R$ 700k-1,4M.** Bem maior que estimado inicialmente.

### 10.2 3 caminhos estratégicos pra discussão

**Caminho 1 — Bootstrap conservador (Recomendado se zero apetite por aporte externo)**
- Começa com 2-3 carros próprios + 1-2 P2P
- Cresce orgânico conforme receita permite
- Equipe: só os 2 sócios + bots/IA pra atendimento
- Aporte total: **R$ 200-300k** (factível 50/50 sócios)
- Crescimento lento: 10 carros em 18-24 meses
- Risco: ser comido por concorrente que cresce mais rápido

**Caminho 2 — Aporte médio com investidor anjo**
- Buscar R$ 500-700k de anjo (30% equity)
- Acelera pra 10 carros em 6-9 meses
- Equipe ainda enxuta (2-3 pessoas + IA)
- Aporte total: **R$ 700-900k** (R$ 500k anjo + R$ 200-400k sócios)
- Pressão por crescimento e governança formal

**Caminho 3 — Postergar projeto até pricing/mercado validar**
- Não lança agora, valida mais
- Faz pesquisa de mercado UDI (60-100 entrevistas com potenciais clientes)
- Pesquisa: tarifa-aceitação, frequência uso, willingness to pay
- Custo: R$ 5-10k em pesquisa
- Decide depois com dados se segue
- Risco: timing de mercado (concorrente pode entrar primeiro)

### 10.3 Perguntas pra sócios definirem

1. **Apetite por aporte**: vocês conseguem juntos colocar R$ 300k? R$ 500k? R$ 700k?
2. **Investidor externo**: aceita 30% equity por R$ 500k de anjo? Tem rede pra captar?
3. **Pricing**: aceita subir 30-50% pra fechar matemática? Ou prefere volume?
4. **Velocidade**: prefere bootstrap lento (12-24 meses) ou push agressivo (6-12 meses)?
5. **Split societário**: 50/50, 60/40, ou outro?
6. **Vesting**: aceitar cláusula de 4 anos de trabalho mínimo pra equity?

### 10.4 Recomendação técnica

**Caminho 2 enxuto (versão balanceada):**
- Sócios aportam R$ 250k cada (R$ 500k total)
- Não buscar investidor agora — começar bootstrap
- Lançar com 2 carros próprios + 3 P2P (Mês 1-3)
- Subir pricing 30% antes do launch
- Foco brutal em Pass anual (R$ 99 × 100 vendas = R$ 9.900 receita recorrente)
- Foco brutal em B2B condomínios (Daniel/Danilo vendem em pessoa)
- IA pra atendimento (ChatGPT custom GPT + WhatsApp Business automatizado)
- Sem CLT até Mês 6 (PJ part-time)
- Revisar tudo em Mês 6 com dados reais → decidir continuar/pivotar/parar

Com isso, **runway esperado = R$ 500-600k**, **chega a 10 carros em 9-12 meses**, **breakeven Mês 14-18**.

---

## 11. PRÓXIMOS PASSOS pra solidificar o estudo

### Antes da reunião com sócios
- [ ] Pesquisa primária: 30+ entrevistas UDI sobre uso/tarifa (Daniel)
- [ ] Cotação real leasing HB20 usado em UDI (3 bancos)
- [ ] Cotação real Yelum carsharing (3 corretoras)
- [ ] LOI de 3-5 condomínios pra vaga (mínimo 5 contratos LOI)
- [ ] Validação tributária com contador especialista locadora
- [ ] Cotação real Caf KYC (visita pessoal)
- [ ] Cotação real Cofre eletrônico (Yale + iLockey + nacional)
- [ ] Carta de intenção investidor anjo (se considerar)
- [ ] Definição modelo split P2P (25%, 30%, variável?)

### Mês 0-1 (pré-launch)
- [ ] Migrar MEI → ME se aporte chegar
- [ ] Abrir conta PJ
- [ ] Assinar contratos Caf + cofre + LOI condomínios
- [ ] Comprar/leasing 1° carro próprio
- [ ] Recrutar 1-2 parceiros P2P
- [ ] Setup coworking ou home office definitivo

### Mês 1-3 (validação)
- [ ] Lançar com 2 carros
- [ ] Meta: 30 cadastros, 15 reservas, 1 contrato B2B
- [ ] Coletar dados reais de ocupação e tarifa
- [ ] Revisar pricing baseado em conversão real

---

## ANEXO A — Fonte das estimativas

| Item | Fonte |
|---|---|
| Custos carro (leasing, seguro, IPVA) | Tabela FIPE + cotação Yelum + IPVA-MG 4% + Detran-MG 2026 |
| Salários CLT | Glassdoor Uberlândia + Catho 2026 |
| Encargos CLT (78%) | INSS 20% + FGTS 8% + provisões 13°/férias/INSS dec. 40-50% |
| Custos Supabase/Stripe/Resend | Sites oficiais (pricing 2026) |
| Custos Caf/Infosimples/Crisp | Cotações via portal devs |
| Ocupação 37% | Média carsharing BR (Movida Hot, Turbi 2024-2025) |
| LTV/CAC carsharing BR | Bain & Company Mobility Report 2024 |
| Crescimento mercado | ABLA (Assoc. Brasileira Locadoras) 2025 |
| Salário gerente operações Uberlândia | Catho 2026 (pesquisa salarial UDI) |
| Aluguel coworking UDI | Pesquisa local (CoworkUDI, Innovation Hub UDI) |
| Preço carro usado HB20 | Tabela FIPE + Webmotors UDI 2026 |

---

## ANEXO B — Glossário rápido

- **CAPEX** = Capital Expenditure = investimento inicial (one-time)
- **OPEX** = Operating Expenditure = custos operacionais mensais
- **EBITDA** = Earnings Before Interest, Taxes, Depreciation, Amortization = lucro operacional puro
- **Burn rate** = quanto a empresa "queima" de caixa por mês (custos - receita quando negativo)
- **Runway** = quanto tempo a empresa sobrevive com o caixa atual (caixa ÷ burn rate)
- **Breakeven** = ponto em que receita = custos (margem zero)
- **CAC** = Cost per Acquisition = custo pra conquistar 1 cliente
- **LTV** = Lifetime Value = quanto 1 cliente gera de receita ao longo do tempo
- **Churn** = % de clientes que cancelam por mês/ano
- **MRR/ARR** = Monthly/Annual Recurring Revenue = receita recorrente (Pass, B2B)
- **P2P** = Peer-to-Peer = modelo onde proprietários compartilham carro pela plataforma
- **LOI** = Letter of Intent = carta de intenção (não vinculante mas compromisso)

---

**Documento criado em:** 2026-05-31 (versão 2.0)
**Versão anterior (1.0):** modelagem otimista 10-100 carros, custos parciais
**Próxima revisão:** após Fase 1 de operação real (Mês 3)
**Aprovado por:** ___________ Daniel · ___________ Danilo · ___________ (anjo, se houver)

> ⚠️ Este documento usa **estimativas de mercado**. Os números reais podem variar 20-40% pra mais ou pra menos. A reunião com sócios deve focar nas **premissas estratégicas** (modelo P2P vs próprio, pricing, ritmo de crescimento, busca de investidor) — não nos números absolutos. Após Mês 3 de operação, refazemos com dados reais.
