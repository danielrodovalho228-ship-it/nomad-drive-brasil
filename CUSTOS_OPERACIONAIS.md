# 💰 Custos Operacionais — Nomade Drive Brasil

> **Versão:** 2.1 — 31/Maio/2026
> **Para:** Daniel + sócios (Danilo + futuros)
> **Objetivo:** Estudo de viabilidade financeira pra reunião societária
> **Modalidade:** Carsharing por hora/dia em Uberlândia-MG
> **Status atual:** Pré-lançamento (infra 100% pronta, 0 cliente real)
> **Plano de crescimento:** 2 → 5 → 10 → 20 carros (Mês 1-18)
>
> **Mudanças v2.1:** Adicionada Seção 0 (Inventário completo de TODAS as APIs com preços reais, incluindo Supabase, igloohome, Caf, Stripe, etc) + pesquisa de cofres eletrônicos referenciada.

---

## ⚡ Sumário executivo (1 página)

### Tabela consolidada — 4 fases de crescimento

| KPI | **Fase 1**<br/>2 carros<br/>(Mês 1-3) | **Fase 2**<br/>5 carros<br/>(Mês 4-6) | **Fase 3**<br/>10 carros<br/>(Mês 7-12) | **Fase 4**<br/>20 carros<br/>(Mês 13-18) |
|---|---:|---:|---:|---:|
| **Receita bruta/mês** | R$ 1.706 | R$ 4.050 | R$ 8.807 | R$ 19.839 |
| **Custos totais/mês** | R$ 13.326 | R$ 28.605 | R$ 52.314 | R$ 104.650 |
| **EBITDA/mês** | -R$ 11.620 | -R$ 24.555 | -R$ 43.507 | -R$ 84.811 |
| **Equipe** | 2 sócios | 2 + 1 atendente PT | 3 + motorista PJ | 5 + ops |
| **CAPEX acumulado** | R$ 91k | R$ 158k | R$ 315k | R$ 531k |
| **APORTE TOTAL** (CAPEX + burn) | **R$ 126k** | **R$ 267k** | **R$ 685k** | **R$ 1,4M** |

### 💰 Investimento mínimo pra cada fase

- **Pra começar (2 carros)**: R$ 126k
- **Pra chegar a 5 carros**: R$ 267k acumulado
- **Pra chegar a 10 carros**: R$ 685k acumulado
- **Pra chegar a 20 carros**: R$ 1,4M acumulado

> ⚠️ **Realidade**: pricing atual (R$ 12-23/hora) NÃO sustenta operação até 30-50 carros. Breakeven exige uma das 4 mudanças: subir pricing 30-50%, escalar pra 50+ carros, equipe enxuta com IA, OU mix 90% P2P.

---

## 0. INVENTÁRIO COMPLETO DE APIS — todas as integrações (NOVO v2.1)

Esta é a tabela master de **TODAS** as integrações que o app usa ou vai usar — cada centavo, com fornecedor real, preço atual e link de contratação.

### 0.1 INFRAESTRUTURA TÉCNICA (já em produção)

| # | Serviço | Provedor | Custo mensal (atual) | Custo F4 (20 carros) | Where to pay | Status |
|---|---|---|---:|---:|---|---|
| 1 | Banco de dados + Auth + Storage + Edge Functions | **Supabase** (Pro plan) | R$ 125 ($25 USD) | R$ 125-250 (escala uso) | https://supabase.com/pricing | ✅ Pago |
| 2 | Hospedagem frontend | **GitHub Pages** | R$ 0 (free) | R$ 0 (free até 100GB/mês) | https://pages.github.com | ✅ Free |
| 3 | Domínio | Registro.br | R$ 5 (R$ 60/ano) | R$ 5 | https://registro.br | ✅ Pago |
| 4 | DNS adicional (opcional) | Cloudflare | R$ 0 (free) | R$ 0 | https://cloudflare.com | ✅ Free |
| 5 | Repositório Git | GitHub | R$ 0 (free) | R$ 0 (free até 5 colaboradores) | https://github.com | ✅ Free |
| 6 | Email transacional | **Resend** | R$ 0 (free 100/dia) ou R$ 100 ($20) | R$ 100 | https://resend.com | ✅ Configurado |
| 7 | Push notifications (web) | Web Push VAPID (self-hosted) | R$ 0 | R$ 0 | (auto) | ✅ Implementado |
| 8 | Push notifications (app nativo futuro) | **Firebase Cloud Messaging** | R$ 0 (free ilimitado) | R$ 0 | https://firebase.google.com | ⏸ Quando app sair |
| | **SUBTOTAL INFRA** | | **R$ 130** | **R$ 230** | | |

### 0.2 PAGAMENTOS

| # | Serviço | Provedor | Custo mensal | Notas | Where to pay | Status |
|---|---|---|---:|---|---|---|
| 9 | Gateway cartão de crédito (3,5% + R$ 0,39 por trans.) | **Stripe** | R$ 60 F1 / R$ 694 F4 | Fee variável sobre receita | https://stripe.com/br | ✅ TEST configurado |
| 10 | Stripe Connect (split marketplace) | Stripe | Incluso no fee | Já configurado | (mesmo) | ✅ Connect ativo |
| 11 | PIX (Pay-by-Bank) | Stripe Brasil | 0,99% por transação | Pix mais barato que cartão | (mesmo) | ✅ Implementado |
| 12 | Stripe Subscriptions (Pass anual) | Stripe | Incluso no fee | Cobrança anual recorrente | (mesmo) | ✅ Implementado |
| 13 | Cobrança pré-autorizada (caução) | Stripe Manual Capture | Incluso no fee | Não há custo extra pra hold | (mesmo) | ✅ Implementado |
| 14 | NF-e B2B (não Stripe) | **NotaZZ** | R$ 49 (até 50 NFs/mês) | Pra cobrar empresas | https://notazz.com | ⏸ Mês 7 |
| 15 | Boleto B2B (opcional alternativo) | **Asaas** | R$ 1,99 por boleto emitido | Pra condomínios que preferem boleto | https://asaas.com | ⏸ Mês 7 |
| | **SUBTOTAL PAGAMENTOS** | | **R$ 60-694** | | | |

### 0.3 KYC / VALIDAÇÃO DE IDENTIDADE

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 16 | OCR CNH + biometria facial + valida CPF | **Caf** | R$ 250/mês (50 validações) — R$ 5 por validação extra | Daniel precisa reunião | https://caf.io | ⚠️ Daniel agendar reunião |
| 17 | Validação CPF gratuita (alternativa básica) | **BrasilAPI** | R$ 0 (free, dados públicos Receita) | Só valida formato e existência, não confiabilidade | https://brasilapi.com.br | ✅ Pode usar agora |
| 18 | Consulta antecedentes criminais (futuro) | Caf "Background Check" | R$ 15-30 por consulta | Opcional, P3 | (mesmo Caf) | ⏸ P3 |
| 19 | Verificação de score crédito | Serasa Experian | R$ 3-8 por consulta | Opcional, pra caução reduzida cliente Gold | https://www.serasaexperian.com.br | ⏸ Mês 12+ |

### 0.4 COMUNICAÇÃO COM CLIENTE

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 20 | WhatsApp Business API oficial | **Meta Cloud API** | R$ 0 (até 1.000 conversas/mês) — $0,005-0,01/msg após | Lead time 5-10 dias aprovação | https://developers.facebook.com/docs/whatsapp/cloud-api | ⏸ Daniel cadastrar |
| 21 | WhatsApp não-oficial (rápido) | **Z-API** | R$ 99/mês plano básico | Pode quebrar (Meta bloqueia chips não oficiais às vezes) | https://z-api.io | ⏸ Alternativa |
| 22 | SMS backup | **Zenvia** | R$ 0,08-0,15 por SMS — R$ 50/mês 500 SMS | Pra notificações urgentes (cofre, geofence) | https://zenvia.com | ⏸ Mês 4+ |
| 23 | Chat de suporte in-app | **Crisp** | R$ 0 (free 2 ops) ou R$ 125 ($25 USD) Pro | Recomendado: free no início | https://crisp.chat | ⏸ Daniel cadastrar |
| 24 | Chat alternativo | **Tawk.to** | R$ 0 (100% free ilimitado) | Mais simples que Crisp | https://www.tawk.to | ⏸ Alternativa free |

### 0.5 MAPAS E LOCALIZAÇÃO

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 25 | Mapas interativos | **Google Maps Platform** | R$ 0-50 (free tier 28k carregamentos/mês) | Após free, $7 USD por 1k loads | https://console.cloud.google.com/google/maps-apis | ⏸ Daniel pegar API key |
| 26 | Mapas alternativa (mais barata) | **Mapbox** | R$ 0-30 (free 50k loads/mês) | Design mais moderno | https://www.mapbox.com | ⏸ Alternativa |
| 27 | Geocoding (endereço → coordenada) | Google Geocoding API | $5 USD por 1k requests | Pra cadastrar endereços de retirada | (mesmo Maps) | ⏸ Junto com Maps |

### 0.6 RASTREAMENTO E TELEMETRIA DOS VEÍCULOS

| # | Serviço | Provedor | Custo hardware | Custo mensal | Notas | Where to contratar | Status |
|---|---|---|---:|---:|---|---|---|
| 28 | Rastreamento GPS + bloqueio remoto + geofence | **SmartGPS** | R$ 200-400 por dispositivo (one-time) | R$ 3,20/un./mês (1-100 disp.) — escala pra R$ 2,20 acima de 100 | Recomendado pra MVP | https://www.smartgps.com.br | ⏸ Daniel cotar |
| 29 | Rastreamento premium (alternativa) | **Cobli** | Preço sob consulta (R$ 200-500/un) | R$ 30-60/un./mês | Plataforma completa, overkill MVP | https://www.cobli.co | ⏸ Mês 24+ |
| 30 | Rastreamento low-cost | **Seu Rastreio** | R$ 150-250/un | R$ 25-40/un./mês | Plano B se SmartGPS não atender | https://seurastreio.com.br | ⏸ Alternativa |

### 0.7 COFRE ELETRÔNICO (NOVO v2.1 — pesquisa completa)

> **Ver detalhamento completo em**: `PESQUISA_COFRES_ELETRONICOS.md`

| # | Serviço | Provedor | Custo hardware | Custo mensal | Offline? | Notas | Where to contratar |
|---|---|---|---:|---:|---|---|---|
| 31 | **Cofre eletrônico para chave do carro** ⭐ | **igloohome KeyBox 3** | R$ 1.700-2.200/un | R$ 0 (algoPIN offline) ou R$ 180/mês Cloud Pro (10+ cofres) | ✅ Sim | API REST + PIN time-based criptografado | https://www.igloohome.co |
| 32 | Cofre nacional alternativo | **iLockey KS101** | R$ 800-1.200/un | R$ 0 | ✅ Sim | API limitada, mais código custom necessário | https://ilockey.com.br |
| 33 | Cofre premium enterprise | **Master Lock Vault Enterprise** | R$ 1.500-2.000/un | R$ 30/mês/cofre | ⚠️ Bluetooth | Mais caro, marca conhecida | https://www.masterlock.com.br |
| 34 | Solução enterprise carsharing | **KeyTracker KT-Pro** | R$ 2.500-3.500/un | R$ 80-200/mês/cofre | ✅ Sim | Overkill MVP, considerar Mês 24+ | https://www.keytracker.com |

### 0.8 PEDÁGIO (opcional, depende modelo)

| # | Serviço | Provedor | Custo hardware | Custo mensal | Notas | Where to contratar | Status |
|---|---|---|---:|---:|---|---|---|
| 35 | Tag pedágio frota | **Veloe Go (Edenred)** | R$ 0 (tag gratuita) | R$ 10/tag/mês + uso real do pedágio | Recomendado, API completa | https://veloe.com.br/veloego/gestao-de-frota | ⏸ Mês 12+ |
| 36 | Tag pedágio alternativa | **ConectCar Frotas** | R$ 0 | R$ 0 mensalidade + uso real | Sem mensalidade da tag (só cobra uso) | https://lp.conectcar.com/frotas | ⏸ Alternativa |

### 0.9 ASSINATURA ELETRÔNICA DE CONTRATOS

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 37 | Assinatura eletrônica contratos | **Autentique** | R$ 0 (free 5 docs/mês) ou R$ 49/mês plano starter | Conformidade ICP-Brasil | https://www.autentique.com.br | ⏸ Daniel cadastrar |
| 38 | Alternativa premium | **D4Sign** | R$ 80-150/mês | Mais robusta legalmente | https://www.d4sign.com.br | ⏸ Alternativa |
| 39 | Alternativa internacional | **DocuSign** | $10-25 USD/mês | Caro, marca premium | https://www.docusign.com.br | ⏸ Pra B2B internacional |

### 0.10 CONSULTAS GOVERNAMENTAIS

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 40 | Consulta multas Senatran | **Infosimples** | R$ 100/mês (mínimo) + R$ 0,06/consulta | Já implementado | https://infosimples.com/consultas/senatran-infracoes | ✅ Pago |
| 41 | Consulta CNH suspensa real-time | Infosimples (mesmo) | Incluso | Validar antes de cada locação | (mesmo) | ✅ Acessível |
| 42 | IPVA / licenciamento | Detran-MG (consulta gratuita) ou Infosimples | R$ 0 ou R$ 0,06/consulta | Manual via site Detran-MG | https://www.detran.mg.gov.br | ✅ Manual |
| 43 | Validação CNPJ (B2B) | BrasilAPI | R$ 0 (free) | Pra validar condomínios parceiros | https://brasilapi.com.br | ✅ Pode usar agora |

### 0.11 ANTI-FRAUDE E SEGURANÇA

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 44 | Anti-spam forms | **Cloudflare Turnstile** | R$ 0 (100% free) | Substitui reCAPTCHA, melhor UX | https://dash.cloudflare.com/?to=/:account/turnstile | ⏸ Daniel cadastrar |
| 45 | Detecção fraude pagamento | **Stripe Radar** | Incluso no Stripe | Já incluído | (Stripe) | ✅ Ativo |
| 46 | Error tracking (bugs em produção) | **Sentry** | R$ 0 (free 5k events/mês) | Importante pra produção | https://sentry.io | ⏸ Daniel cadastrar |

### 0.12 IA / AUTOMAÇÃO

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 47 | Chatbot atendimento (substituir atendente CLT) | **ChatGPT API (GPT-4o)** | R$ 0,02-0,30 por conversa | Pode automatizar 60-80% dos atendimentos | https://platform.openai.com | ⏸ Mês 6+ |
| 48 | OCR de fotos vistoria (detectar avarias) | OpenAI Vision API | R$ 0,03-0,10 por par de fotos | Comparar foto inicial × final | (mesmo OpenAI) | ⏸ Mês 12+ |
| 49 | Análise sentimentos NPS | OpenAI Embeddings | R$ 0,01 por 1k tokens | Pra entender feedback aberto | (mesmo) | ⏸ Mês 12+ |

### 0.13 ANALYTICS E MARKETING

| # | Serviço | Provedor | Custo | Notas | Where to contratar | Status |
|---|---|---|---:|---|---|---|
| 50 | Analytics web | **Google Analytics 4** | R$ 0 (free) | Padrão indústria | https://analytics.google.com | ⏸ Configurar |
| 51 | Heatmaps + recording | **Hotjar** ou **Microsoft Clarity** | R$ 0 (free) ou R$ 200 (Hotjar Pro) | Clarity é 100% free | https://clarity.microsoft.com | ⏸ Mês 3+ |
| 52 | E-mail marketing (newsletters) | **Resend** (mesmo) ou **Mailchimp** | R$ 100 ou R$ 75 ($15) free 500 contacts | Já temos Resend | (mesmo) | ✅ Resend cobre |
| 53 | Pixel Meta Ads | Facebook | R$ 0 (free) | Tracking conversões | https://business.facebook.com | ⏸ Mês 1+ |
| 54 | Google Ads (gestão) | Google | R$ 0 (taxa só sobre CPC) | Pagar só CPC dos anúncios | https://ads.google.com | ⏸ Mês 1+ |

### 0.14 ESTATÍSTICA TOTAL POR FASE

| Categoria | Fase 1 (2 carros) | Fase 4 (20 carros) |
|---|---:|---:|
| 0.1 Infra técnica | R$ 130 | R$ 230 |
| 0.2 Pagamentos | R$ 60 | R$ 694 |
| 0.3 KYC | R$ 0 (manual) | R$ 500 |
| 0.4 Comunicação | R$ 30 | R$ 280 |
| 0.5 Mapas | R$ 0 | R$ 80 |
| 0.6 Telemetria GPS | R$ 7 | R$ 48 |
| 0.7 Cofre eletrônico | R$ 0 (algoPIN offline) | R$ 180 (Cloud Pro 20 cofres) |
| 0.8 Pedágio | R$ 0 | R$ 200 |
| 0.9 Assinatura | R$ 0 (free 5/mês) | R$ 149 |
| 0.10 Consultas gov | R$ 100 | R$ 150 |
| 0.11 Anti-fraude | R$ 0 | R$ 130 |
| 0.12 IA/automação | R$ 0 | R$ 200 |
| 0.13 Analytics/marketing | R$ 0 (free) | R$ 0 (free) |
| **TOTAL APIS/INTEGRAÇÕES** | **R$ 327** | **R$ 2.841** |

---

## 1. CUSTOS DETALHADOS — todos os itens (recapitulação v2.0)

### 1.1 Operação da frota (modelo híbrido 70% P2P + 30% próprio)

#### Distribuição da frota
| Fase | Próprios | P2P | Total |
|---|---:|---:|---:|
| F1 (Mês 1-3) | 1 (HB20 usado) | 1 (P2P) | 2 |
| F2 (Mês 4-6) | 2 | 3 | 5 |
| F3 (Mês 7-12) | 3 | 7 | 10 |
| F4 (Mês 13-18) | 6 | 14 | 20 |

#### Custo por carro PRÓPRIO (HB20 usado R$ 50k)
| Item | Mensal |
|---|---:|
| Financiamento (60m, 1,5%am, ent. 30%) | R$ 990 |
| Seguro Yelum (5% FIPE/ano) | R$ 250 |
| IPVA + licenciamento | R$ 117 |
| Manutenção preventiva | R$ 180 |
| Pneus + recapagem | R$ 60 |
| Lavagem (4×/mês × R$ 50) | R$ 200 |
| Combustível operacional | R$ 80 |
| Tag pedágio | R$ 10 |
| Reserva multas | R$ 30 |
| Depreciação extra | R$ 500 |
| **TOTAL por carro próprio** | **R$ 2.417** |

#### Custo por carro P2P (split 25% pra Nomade)
| Item | Mensal Nomade |
|---|---:|
| Lavagem (split 50/50) | R$ 100 |
| Combustível 50km grátis | R$ 80 |
| Tag pedágio | R$ 10 |
| **TOTAL por carro P2P** | **R$ 190** |

### 1.2 Vagas em condomínios
1 vaga atende 3-4 carros (rotação dinâmica). R$ 1.000/mês cada.

| Fase | Vagas | Custo |
|---|---:|---:|
| F1 | 1 | R$ 1.000 |
| F2 | 2 | R$ 2.000 |
| F3 | 3 | R$ 3.000 |
| F4 | 6 | R$ 6.000 |

### 1.3 Pessoal (Salários + Encargos CLT 78%)

| Fase | Pessoas | Custo total/mês |
|---|---|---:|
| F1 | 2 sócios (pró-labore R$ 1.500 cada) | R$ 3.330 |
| F2 | + 1 atendente PJ part-time | R$ 7.050 |
| F3 | + atendente CLT + motorista PJ | R$ 13.584 |
| F4 | + gerente operações + 1 atendente | R$ 32.188 |

### 1.4 Infraestrutura escritório

| Fase | Tipo | Custo/mês |
|---|---|---:|
| F1-F2 | Home office (internet + luz + celular + amortização) | R$ 860 |
| F3 | Coworking 4 pessoas | R$ 2.920 |
| F4 | Coworking 6 pessoas / sala dedicada | R$ 4.350 |

### 1.5 Software / ferramentas

| Item | F1 | F4 |
|---|---:|---:|
| Google Workspace (e-mail @nomadedrive) | R$ 30 | R$ 105 |
| Figma / Canva Pro | R$ 60 | R$ 60 |
| ChatGPT Plus | R$ 100 | R$ 400 |
| Antivirus + backup | R$ 50 | R$ 200 |
| Bitwarden / 1Password | R$ 0 | R$ 150 |
| **TOTAL** | **R$ 240** | **R$ 915** |

### 1.6 Serviços profissionais

| Item | F1 | F4 |
|---|---:|---:|
| Contador (MEI → ME) | R$ 200 | R$ 1.200 |
| Advogado on-demand | R$ 200 | R$ 800 |
| Designer freelance | R$ 500 | R$ 2.000 |
| **TOTAL** | **R$ 900** | **R$ 4.000** |

### 1.7 Bancário / financeiro

| Item | F1 | F4 |
|---|---:|---:|
| Conta PJ | R$ 50 | R$ 120 |
| Cartão crédito empresarial | R$ 30 | R$ 100 |
| Antecipação recebíveis Stripe (2%) | R$ 17 | R$ 198 |
| Tarifas TED/PIX | R$ 30 | R$ 150 |
| Conta Azul / Conciliação | R$ 0 | R$ 200 |
| **TOTAL** | **R$ 127** | **R$ 768** |

### 1.8 Seguros (não veicular)

| Item | F1 | F4 |
|---|---:|---:|
| RC profissional empresarial | R$ 80 | R$ 350 |
| Seguro patrimonial (cofres + equipamentos) | R$ 50 | R$ 280 |
| Seguro vida sócios | R$ 0 | R$ 300 |
| **TOTAL** | **R$ 130** | **R$ 930** |

### 1.9 Benefícios CLT (a partir de F3)

| Item | F3 (1 CLT) | F4 (3 CLT) |
|---|---:|---:|
| Vale refeição (R$ 600/pessoa) | R$ 600 | R$ 1.800 |
| Vale transporte | R$ 200 | R$ 600 |
| Plano saúde Unimed básico | R$ 350 | R$ 1.050 |
| **TOTAL** | **R$ 1.150** | **R$ 3.450** |

### 1.10 Marketing

| Item | F1 | F4 |
|---|---:|---:|
| Google Ads | R$ 1.500 | R$ 10.000 |
| Meta Ads | R$ 800 | R$ 6.000 |
| Produção conteúdo | R$ 500 | R$ 2.500 |
| Influenciador local | R$ 0 | R$ 2.000 |
| Eventos/ativações | R$ 200 | R$ 1.500 |
| Brindes físicos | R$ 100 | R$ 800 |
| **TOTAL** | **R$ 3.100** | **R$ 22.800** |

### 1.11 Fiscal (impostos sobre receita)

| Fase | Regime | Receita anual | Imposto/mês |
|---|---|---:|---:|
| F1 | MEI | R$ 20k | R$ 75 |
| F2 | ME Simples 6% | R$ 48k | R$ 243 |
| F3 | ME Simples 6% | R$ 105k | R$ 528 |
| F4 | ME Simples 11,2% | R$ 238k | R$ 2.222 |

### 1.12 Comunicação operacional (números dedicados)

| Item | F1 | F4 |
|---|---:|---:|
| WhatsApp Business número dedicado | R$ 30 | R$ 80 |
| Telefone VoIP | R$ 0 | R$ 150 |
| SMS Zenvia | R$ 0 | R$ 150 |
| **TOTAL** | **R$ 30** | **R$ 380** |

### 1.13 Compliance / auditoria anual amortizado

| Item | F1 | F4 |
|---|---:|---:|
| DPO LGPD (consultoria) | R$ 0 | R$ 800 |
| Auditoria fiscal anual | R$ 50 | R$ 400 |
| Renovação alvará + INPI | R$ 30 | R$ 80 |
| **TOTAL** | **R$ 80** | **R$ 1.280** |

### 1.14 Contingências (provisão mensal)

| Item | F1 | F4 |
|---|---:|---:|
| Sinistro não coberto (franquia) | R$ 200 | R$ 1.500 |
| Cobrança jurídica | R$ 100 | R$ 800 |
| Imprevistos técnicos | R$ 100 | R$ 700 |
| **TOTAL** | **R$ 400** | **R$ 3.000** |

### 1.15 Treinamento e eventos

| Item | F1 | F4 |
|---|---:|---:|
| Cursos online | R$ 50 | R$ 250 |
| Eventos setor | R$ 0 | R$ 400 |
| Coaching/mentoria | R$ 0 | R$ 800 |
| **TOTAL** | **R$ 50** | **R$ 1.450** |

---

## 2. RESUMO CUSTOS TOTAIS por fase (TUDO consolidado)

| Categoria | F1 (2 carros) | F2 (5 carros) | F3 (10 carros) | F4 (20 carros) |
|---|---:|---:|---:|---:|
| 0. APIs/integrações | R$ 327 | R$ 768 | R$ 1.285 | R$ 2.841 |
| 1.1 Frota | R$ 2.607 | R$ 5.404 | R$ 8.581 | R$ 17.162 |
| 1.2 Vagas condomínios | R$ 1.000 | R$ 2.000 | R$ 3.000 | R$ 6.000 |
| 1.3 Pessoal | R$ 3.330 | R$ 7.050 | R$ 13.584 | R$ 32.188 |
| 1.4 Infra escritório | R$ 860 | R$ 860 | R$ 2.920 | R$ 4.350 |
| 1.5 Software | R$ 240 | R$ 335 | R$ 530 | R$ 915 |
| 1.6 Serviços profissionais | R$ 900 | R$ 1.500 | R$ 2.400 | R$ 4.000 |
| 1.7 Bancário | R$ 127 | R$ 271 | R$ 438 | R$ 768 |
| 1.8 Seguros não-veicular | R$ 130 | R$ 360 | R$ 500 | R$ 930 |
| 1.9 Benefícios CLT | R$ 0 | R$ 0 | R$ 1.150 | R$ 3.450 |
| 1.10 Marketing | R$ 3.100 | R$ 7.700 | R$ 13.400 | R$ 22.800 |
| 1.11 Fiscal | R$ 75 | R$ 243 | R$ 528 | R$ 2.222 |
| 1.12 Comunicação | R$ 30 | R$ 160 | R$ 210 | R$ 380 |
| 1.13 Compliance | R$ 80 | R$ 330 | R$ 650 | R$ 1.280 |
| 1.14 Contingências | R$ 400 | R$ 900 | R$ 1.600 | R$ 3.000 |
| 1.15 Treinamento/eventos | R$ 50 | R$ 200 | R$ 850 | R$ 1.450 |
| **TOTAL CUSTOS/MÊS** | **R$ 13.256** | **R$ 28.081** | **R$ 51.626** | **R$ 103.736** |

> Diferença pra v2.0 (-R$ 70 a -R$ 914): correção fiscal e adição de cofres com algoPIN offline (custo R$ 0 nas fases iniciais).

---

## 3. RECEITA por fase

### 3.1 Receita por carro
| Tipo | Receita Nomade/mês |
|---|---:|
| Próprio (100%) | R$ 1.365 |
| P2P (split 25%) | R$ 341 |

### 3.2 Receita base de carros
| Fase | Próprios | P2P | TOTAL |
|---|---:|---:|---:|
| F1 (1+1) | R$ 1.365 | R$ 341 | **R$ 1.706** |
| F2 (2+3) | R$ 2.730 | R$ 1.023 | **R$ 3.753** |
| F3 (3+7) | R$ 4.095 | R$ 2.387 | **R$ 6.482** |
| F4 (6+14) | R$ 8.190 | R$ 4.774 | **R$ 12.964** |

### 3.3 Receita ADICIONAL (Pass + B2B + extras)
| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| NomadeDrive Pass | R$ 0 | R$ 99 | R$ 495 | R$ 1.485 |
| B2B condomínios | R$ 0 | R$ 0 | R$ 1.200 | R$ 3.600 |
| Taxa pet | R$ 0 | R$ 30 | R$ 180 | R$ 600 |
| Extras (cancelamento, KM, multa) | R$ 0 | R$ 168 | R$ 450 | R$ 1.190 |
| **Subtotal extras** | **R$ 0** | **R$ 297** | **R$ 2.325** | **R$ 6.875** |

### 3.4 RECEITA TOTAL
| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| Carros + Extras | R$ 1.706 | R$ 4.050 | R$ 8.807 | R$ 19.839 |

---

## 4. RESULTADO consolidado por fase

| Item | F1 | F2 | F3 | F4 |
|---|---:|---:|---:|---:|
| **RECEITA** | R$ 1.706 | R$ 4.050 | R$ 8.807 | R$ 19.839 |
| **CUSTOS** | -R$ 13.256 | -R$ 28.081 | -R$ 51.626 | -R$ 103.736 |
| **EBITDA mensal** | **-R$ 11.550** | **-R$ 24.031** | **-R$ 42.819** | **-R$ 83.897** |
| **Queima total da fase** | -R$ 34.650 (3 meses) | -R$ 72.093 (3) | -R$ 256.914 (6) | -R$ 503.382 (6) |
| **Queima ACUMULADA** | R$ 34.650 | R$ 106.743 | R$ 363.657 | **R$ 867.039** |

### 🔴 Conclusão: cenário pessimista, R$ 867k de queima nos 18 meses

---

## 5. CAPEX (one-time) consolidado

| Fase | Item principal | CAPEX dessa fase | Acumulado |
|---|---|---:|---:|
| F1 | 1 carro próprio + 2 cofres + LGPD + branding + giro 3mo | R$ 91.350 | R$ 91.350 |
| F2 | +1 carro + 3 cofres + marketing scale + giro 3mo | R$ 67.100 | R$ 158.450 |
| F3 | +1 carro + 5 cofres + coworking + giro 6mo | R$ 156.500 | R$ 314.950 |
| F4 | +3 carros + 10 cofres + sala física + giro 6mo | R$ 216.500 | **R$ 531.450** |

> Cofres usando igloohome KeyBox 3 (R$ 2.000 médio × 20 unidades = R$ 40.000 acumulado em hardware de cofre apenas).

---

## 6. APORTE TOTAL = CAPEX + BURN

| Fase | CAPEX | Queima | Total fase | Acumulado |
|---|---:|---:|---:|---:|
| F1 (Mês 1-3) | R$ 91.350 | R$ 34.650 | R$ 126.000 | **R$ 126.000** |
| F2 (Mês 4-6) | R$ 67.100 | R$ 72.093 | R$ 139.193 | **R$ 265.193** |
| F3 (Mês 7-12) | R$ 156.500 | R$ 256.914 | R$ 413.414 | **R$ 678.607** |
| F4 (Mês 13-18) | R$ 216.500 | R$ 503.382 | R$ 719.882 | **R$ 1.398.489** |

> 🚨 **R$ 1,4 milhão é o aporte total no cenário SEM ajustes.** Pra viabilizar:

### Cenário OTIMIZADO (pricing +30%, equipe enxuta, 90% P2P, IA atendimento)

| Fase | CAPEX | Queima otimizada | Acumulado |
|---|---:|---:|---:|
| F1 | R$ 91.350 | R$ 24.000 | R$ 115.350 |
| F2 | R$ 67.100 | R$ 48.000 | R$ 230.450 |
| F3 | R$ 156.500 | R$ 165.000 | R$ 551.950 |
| F4 | R$ 216.500 | R$ 300.000 | **R$ 1.068.450** |

**Realisticamente: R$ 600k-1,1M de runway pra chegar a 20 carros.**

---

## 7. CAMINHOS pra reduzir aporte

| Opção | Impacto | Aporte total esperado |
|---|---|---|
| **A) Pivotar pra 100% P2P** (sem carro próprio) | -R$ 81k CAPEX, -R$ 7.677/mês custo, -R$ 6.825 receita líq. perdida | R$ 850-1M |
| **B) B2B agressivo Mês 6+** (5 contratos × R$ 1.200) | +R$ 6.000 receita garantida/mês | R$ 950k-1,1M |
| **C) Bootstrap 2-3 carros 12 meses** (sem grandes aportes) | Cresce orgânico | R$ 200-300k |
| **D) Buscar anjo R$ 500k → 30% equity** | Acelera scale | R$ 500-700k sócios + diluição |

---

## 8. ANÁLISE DE RISCOS

| Risco | Probabilidade | Impacto $ | Mitigação |
|---|---|---|---|
| Sinistro grave (PT carro) | Média | -R$ 30-50k | Seguro + caução |
| Mudança regulatória ANTT | Baixa | Médio | Acompanhar legislativo |
| Localiza/Movida entram UDI | Alta | Alto (-20-30% preço) | Posicionar nicho + B2B |
| Churn proprietário P2P | Média | Médio | Contrato fidelidade |
| Fraude documental | Média | Alto | KYC Caf + biometria |
| Inadimplência | Média | Médio | Pré-autorização 100% |
| Sócio desistir | Baixa | Alto | Acordo societário + vesting |
| Recessão | Média | Alto | Diversificar B2B |
| Carro roubado | Média | Alto (-R$ 50k) | Seguro + GPS + bloqueio |

---

## 9. CONCLUSÃO pra reunião com sócios

### O que esses números mostram (v2.1)

1. **Custo real é maior do que parecia** — versão 1.0 estava subestimada em ~50%. Versão 2.1 mostra **R$ 13-104k/mês** total.
2. **APIs e tecnologia são minoria do custo** — só R$ 327-2.841/mês. **Maior custo é frota + pessoal + marketing**.
3. **Cofre eletrônico igloohome é o melhor custo-benefício** — R$ 2.000/unidade one-time, R$ 0/mês mensal (algoPIN offline). Total R$ 40k pra 20 cofres em 18 meses.
4. **Receita atual NÃO cobre custos** mesmo P2P. Precisa pricing +30% OU escalar pra 50+ carros.
5. **Aporte realista: R$ 600k-1,4M** dependendo de otimizações.

### 3 caminhos pra discussão

1. **Bootstrap conservador (R$ 200-300k)**: 2-3 carros + crescimento orgânico
2. **Médio + anjo (R$ 700-900k)**: 10 carros em 6-9 meses
3. **Postergar e validar mercado primeiro** (pesquisa R$ 5-10k)

### Perguntas pra sócios

1. Apetite por aporte: R$ 300k? R$ 500k? R$ 700k?
2. Investidor anjo: aceita 30% equity por R$ 500k?
3. Pricing: subir 30-50% pra fechar matemática?
4. Velocidade: bootstrap 12-24 meses ou push 6-12 meses?
5. Split societário?
6. Vesting?

### Recomendação técnica

**Caminho 2 enxuto**:
- Sócios R$ 250k cada = R$ 500k total
- Bootstrap (sem anjo agora)
- Lançar 2 próprios + 3 P2P (Mês 1-3)
- Pricing +30% antes do launch
- Foco Pass anual + B2B condomínios
- IA atendimento + sem CLT até Mês 6
- Revisar tudo Mês 6 com dados reais

Runway esperado: R$ 500-600k. Breakeven: Mês 14-18. Chega a 10 carros em 9-12 meses.

---

## 10. PRÓXIMOS PASSOS

### Antes da reunião
- [ ] 30+ entrevistas UDI sobre uso/tarifa
- [ ] Cotação real leasing HB20 usado (3 bancos)
- [ ] Cotação real Yelum carsharing
- [ ] LOI 3-5 condomínios pra vaga
- [ ] Validação tributária com contador
- [ ] Cotação 2× igloohome KeyBox 3 (validar custo + lead time)
- [ ] Reunião Caf (KYC)
- [ ] Pesquisa Stripe Connect aprovação BR

### Pre-launch (Mês 0-1)
- [ ] Migrar MEI → ME (se aporte vier)
- [ ] Abrir conta PJ
- [ ] Comprar 2 cofres igloohome
- [ ] Comprar/leasing 1° carro próprio
- [ ] Recrutar 1-2 parceiros P2P
- [ ] Cadastrar Cloudflare Turnstile, Crisp, Autentique, Google Maps

### Mês 1-3 (validação)
- [ ] Lançar com 2 carros
- [ ] Meta: 30 cadastros, 15 reservas, 1 B2B
- [ ] Coletar ocupação real + tarifa
- [ ] Revisar pricing

---

## ANEXO A — Fontes

| Item | Fonte |
|---|---|
| Custos carro | Tabela FIPE + Yelum + Detran-MG 2026 |
| Salários CLT | Glassdoor Uberlândia + Catho 2026 |
| Supabase/Stripe/Resend | Sites oficiais 2026 |
| Caf/Infosimples/Crisp | Cotações via portal devs |
| Ocupação 37% | Bain Mobility 2024 (Movida Hot, Turbi) |
| Cofres eletrônicos | Pesquisa primária (igloohome, iLockey, Master Lock — ver PESQUISA_COFRES_ELETRONICOS.md) |
| Coworking UDI | CoworkUDI, Innovation Hub UDI |
| HB20 usado | FIPE + Webmotors UDI 2026 |

---

## ANEXO B — Glossário rápido

- **CAPEX**: investimento inicial (one-time)
- **OPEX**: custos operacionais mensais
- **EBITDA**: lucro operacional puro
- **Burn rate**: queima mensal de caixa
- **Runway**: tempo de sobrevivência com caixa atual
- **Breakeven**: receita = custos
- **CAC**: custo de aquisição de cliente
- **LTV**: valor do cliente ao longo do tempo
- **P2P**: peer-to-peer (proprietário compartilha carro)
- **algoPIN**: tecnologia igloohome de PIN time-based offline
- **MRR/ARR**: receita recorrente mensal/anual

---

## ANEXO C — Documentos relacionados (no repo)

- `ANALISE_INTEGRACOES.md` — mapa completo das 28 integrações (P0/P1/P2/P3)
- `PESQUISA_COFRES_ELETRONICOS.md` — pesquisa profunda dos 5+ fornecedores de cofre eletrônico
- `PESQUISA_INTEGRACAO_OPERACIONAL.md` — pesquisa de C6 multas + C7 pedágio + C8 rastreamento
- `ESTADO_ATUAL.md` — inventário técnico completo do app
- `INCIDENTE_LGPD_2026_05_30.md` — incidente de segurança fechado
- `QA_TEST_PLAN.md` — plano de testes QA
- `nova/politica-privacidade.html` — política LGPD pública

---

**Documento criado em:** 2026-05-31 (versão 2.1)
**Versão anterior (2.0):** mesma estrutura, sem Seção 0 (inventário APIs)
**Versão anterior (1.0):** modelagem otimista 10-100 carros
**Próxima revisão:** após Fase 1 de operação real (Mês 3)

> ⚠️ Este documento usa **estimativas de mercado**. Números reais podem variar 20-40%. Reunião com sócios deve focar nas **premissas estratégicas** — pricing, modelo P2P vs próprio, ritmo de crescimento, busca de investidor — não nos números absolutos. Após Mês 3 de operação real, refazemos com dados verificados.
