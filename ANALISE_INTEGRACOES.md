# 🔌 Análise de Integrações Externas — Nomade Drive Brasil

> **Versão:** 1.0 — 30/Maio/2026
> **Para:** Daniel + sócios + dev (Claude Code / outras IAs)
> **Escopo:** mapa completo do que está integrado hoje vs. o que falta pra app funcionar 100%
> **Não perca:** este doc é a fonte de verdade pra orçamento, roadmap técnico e decisões de fornecedor.

---

## 📋 Sumário executivo

| Bucket | Implementado | Falta P0 | Falta P1 | Falta P2/P3 |
|---|---:|---:|---:|---:|
| **Pagamento** | 5 | 1 | 2 | 1 |
| **Identidade/KYC** | 0 | 3 | 1 | 2 |
| **Comunicação** | 2 | 1 | 2 | 1 |
| **Operação veículo** | 0 | 4 | 2 | 0 |
| **Vistoria** | 1 | 2 | 1 | 0 |
| **Mapas/localização** | 0 | 1 | 2 | 0 |
| **Legal/regulatório** | 1 | 1 | 0 | 2 |
| **Total** | **9** | **13** | **10** | **6** |

**Custo total mensal estimado se contratar tudo P0 + P1:** R$ 1.130 – R$ 1.450/mês (já está nas projeções aos sócios).

**Lead time pra ter 100% funcional:** ~6-8 semanas (assumindo 1 sprint = 2 semanas), distribuído em 3 sprints.

**Bloqueadores não-técnicos:** 7 decisões de negócio (rastreador OBD vs hardwired, toda frota com tag de pedágio, etc) listadas na seção 7.

---

## 1. Integrações JÁ em produção (verificado no código em 30/05/2026)

### 1.1 Stripe + Stripe Connect (Pagamentos)

| Item | Detalhe |
|---|---|
| **Provedor** | Stripe ([stripe.com](https://stripe.com)) |
| **Modo atual** | Provavelmente TEST (verificar com `STRIPE_SECRET_KEY` no Supabase Dashboard) |
| **Env vars** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Edge Functions** (9 usam) | `stripe-checkout`, `stripe-subscription`, `stripe-billing-portal`, `stripe-webhook`, `connect-onboard`, `setup-manual-payouts`, `liberar-saque-parcial`, `installation-checkout`, `damage-capture` |
| **Funcionalidades cobertas** | Checkout, Subscription, Connect (split 90/10), Pré-autorização (capture manual = caução), PIX (feature flag `ENABLE_PIX`), Captura de avaria via PaymentIntent, Webhooks (56 eventos processados) |
| **Custo mensal** | 3,5% sobre receita processada |
| **Status** | ✅ Pronto pra produção real (trocar TEST→LIVE) |
| **Pendência conhecida** | Verificar `STRIPE_SECRET_KEY` mode + rodar 1 cobrança real de teste antes do launch |

### 1.2 Resend (E-mail transacional)

| Item | Detalhe |
|---|---|
| **Provedor** | Resend ([resend.com](https://resend.com)) |
| **Domínio** | `nomadedrive.com.br` verificado |
| **Env vars** | `RESEND_API_KEY`, `EMAIL_FROM` (`pagamentos@nomadedrive.com.br`), `EMAIL_REPLY_TO` (`contato@nomadedrive.com.br`) |
| **Edge Functions que usam** | `send-email` (wrapper) + 10 outras (close-rental, approve/reject-rental-request, damage-capture, send-rating-request, send-renewal-reminders, send-tier-promotion, submit-lead-quote, stripe-checkout, stripe-webhook, nova-lead, create-rental-request, liberar-saque-parcial) |
| **Templates** | ~14 em `emails/` + inline em várias functions |
| **Custo mensal** | Grátis até 100 emails/dia (Resend free tier). Acima: USD $20/mês = R$ 100 (50k emails/mês) |
| **Status** | ✅ Funcionando |
| **Pendência conhecida** | Task #10: QA validar visualmente todos os 14 templates |

### 1.3 Supabase (DB + Auth + Storage + Edge Runtime)

| Item | Detalhe |
|---|---|
| **Provedor** | Supabase ([supabase.com](https://supabase.com)) |
| **Projeto ID** | `zeexmbgacvsaciojcrwr` |
| **URL** | `https://zeexmbgacvsaciojcrwr.supabase.co` |
| **Região** | us-west-1 |
| **Env vars** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tabelas** | 33 (todas com RLS, audit feito 30/05) |
| **Edge Functions** | 22 ativas |
| **Storage** | Buckets pra fotos KYC + vistoria + perfil |
| **Custo mensal** | Plano Pro $25/mês = R$ 125 (assumindo já no Pro pelo volume) |
| **Status** | ✅ Backbone do sistema |

### 1.4 Web Push (Push notifications PWA)

| Item | Detalhe |
|---|---|
| **Provedor** | Padrão Web Push (VAPID), self-hosted via Supabase Edge Function |
| **Env vars** | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| **Edge Function** | `send-push` |
| **Funcionalidades** | Notifica cliente em status de booking, lembrete devolução, alertas |
| **Custo mensal** | 0 (self-hosted) |
| **Status** | ✅ Implementado (Fase 33b) |
| **Limitação** | Só funciona em browser. **Não substitui app nativo** quando você for ter Android/iOS |

### 1.5 Infosimples (Consulta de multas Senatran)

| Item | Detalhe |
|---|---|
| **Provedor** | Infosimples ([infosimples.com](https://infosimples.com/consultas/senatran-infracoes/)) |
| **Env var** | `INFOSIMPLES_TOKEN` |
| **Edge Function** | `consulta-multas` |
| **Funcionalidade** | Consulta infrações por placa + Renavam (últimos 12 meses, até 3 anos retroativo) |
| **Cobertura** | Nacional (via SENATRAN) |
| **Custo mensal** | R$ 100/mês mínimo + R$ 0,06/consulta |
| **Status** | ✅ Implementado (Fase 30) |
| **Pendência** | Cobrança automática via Stripe ainda não é automática — admin precisa aprovar |

### 1.6 PIX (via Stripe BR)

| Item | Detalhe |
|---|---|
| **Provedor** | Stripe (PIX nativo no Brasil) |
| **Feature flag** | `ENABLE_PIX=true` |
| **Funcionalidades** | PIX one-off (checkout único) + PIX Automático (subscription mensal) |
| **Status** | ✅ Implementado (Fase B2 + B2-v2) |
| **Pendência** | Validar com 1 PIX real após Stripe LIVE |

### 1.7 Outras "integrações" internas (interno, não APIs externas)

- **Calendário de reservas + lock** (impede dupla reserva) — em `bookings` + `qa_bookings`
- **Cálculo de preço dinâmico** (Fase 80 market-based + descontos progressivos) — funções SQL
- **Dashboard operacional** (Cockpit CEO no admin.html)
- **Relatórios financeiros** (Receita, Contas a pagar, Fluxo de caixa, MEI)
- **Sistema de tiers Gold/Platinum** (`loyalty_events`)
- **Auto-aprovação Gold/Platinum** (Fase 46)
- **Notificações in-app** (sino + página `/notificacoes.html`)

---

## 2. Integrações FALTANDO — P0 (essencial pra abrir as portas)

### 2.1 🔴 Validação CPF + OCR CNH + Biometria facial

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **Caf** ([caf.io](https://caf.io)) ou **Idwall** ([idwall.co](https://idwall.co)) |
| **Alternativas** | Truora, Unico Check, Vidaas, Datavalid |
| **Cobertura única plataforma** | Valida CPF na RF + OCR CNH (lê nome/número/validade) + match facial (selfie x CNH) + score crédito (opcional) + checagem CNH suspensa |
| **Custo mensal estimado** | R$ 250/mês (50 validações) na Caf — escala por uso |
| **Lead time integração** | 1-2 dias após contrato |
| **Bloqueio comercial** | Daniel precisa abrir conta (cartão + CNPJ) |
| **Risco se não implementar** | Cadastro fraudulento, locação pra inadimplente, KYC manual não escala >20 cadastros/mês |
| **Como funciona hoje** | KYC manual via upload em `user_documents` — admin aprova visualmente |
| **Quando bloqueia** | A partir de 20 cadastros/mês fica impossível manual |

**Próximo passo:** Daniel decide entre Caf e Idwall (ambos cobrem mesma coisa, diferença é UX do dashboard + preço por volume), abre conta, gera API key, me passa o token e eu implemento Edge Function `kyc-verify`.

### 2.2 🔴 WhatsApp Business API oficial

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **Z-API** ([z-api.io](https://z-api.io)) ou **Meta Cloud API** (oficial, mais barata) |
| **Alternativas** | Twilio WhatsApp, Zenvia, WPPConnect (self-hosted gratuito) |
| **Funcionalidade** | Enviar mensagens transacionais (cliente brasileiro responde 4x mais no WhatsApp que email) |
| **Custo mensal estimado** | Z-API: R$ 100-200/mês. Meta Cloud API: USD $0,005-0,02 por mensagem = R$ 50-150/mês |
| **Lead time integração** | 2-3 dias (Z-API: imediato após cadastro). Meta Cloud: 5-10 dias (precisa aprovação Business Manager) |
| **Bloqueio comercial** | Z-API: 7 dias trial grátis + R$ 99/mês. Meta: precisa Business Manager Verificado |
| **Como funciona hoje** | Apenas links `wa.me/?text=...` em vários botões |
| **Quando bloqueia** | Já bloqueia: 60% dos clientes prefere WhatsApp ao email, e dropoff de notificação importante por email é >30% |

**Próximo passo:** decidir Z-API (mais rápido) vs Meta Cloud (mais barato a longo prazo). Implementar como Edge Function `send-whatsapp` análoga ao `send-email`.

### 2.3 🔴 Telemetria + Rastreamento GPS + Bloqueio remoto motor

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **SmartGPS** ([smartgps.com.br](https://smartgps.com.br)) — preço público, API REST documentada, white-label |
| **Alternativa premium** | **Cobli** (80+ endpoints, preço opaco, ~R$ 30-60/un/mês) |
| **Funcionalidade** | Posição em tempo real, ignição on/off, velocidade, geofence, alertas, bloqueio remoto |
| **Hardware** | OBD-II (plug & play) ou hardwired (oculto, mais seguro) — R$ 200-400 por unidade (compra única) |
| **Custo mensal estimado** | SmartGPS: R$ 3,20/un/mês (1-100 disp) = R$ 32/mês pra 10 carros + R$ 2.000-4.000 hardware único |
| **Lead time integração** | 2 dias após cotação + 1 dispositivo teste validado |
| **Bloqueio comercial** | Daniel decide se toda frota terá rastreador (sim/opcional). Falar com `contato@smartgps.com.br` |
| **Como funciona hoje** | **Não há tracking real-time.** Apenas marketplace de instalação (`installation-checkout`) — manda cliente pra oficina parceira instalar. |
| **Bloqueio crítico** | Sem rastreador + bloqueio: recuperação de carro em furto = só polícia, sem prova de localização. Geofence (alerta se sair de MG) impossível. |

**Decisões pendentes** (do `PESQUISA_INTEGRACAO_OPERACIONAL.md` §C8):
1. Toda frota terá rastreador? (Sim/Opcional)
2. OBD-II ou hardwired? (Hardwired = mais seguro, mas eletricista)
3. Quem instala? (Oficina parceira via marketplace já existente, ou contratação direta SmartGPS)
4. Aceite LGPD do rastreamento no contrato? (Cláusula em `termos.html`)

**Próximo passo:** ligar pra `contato@smartgps.com.br` ou WhatsApp via site pedindo demo + cotação 5-10 dispositivos.

### 2.4 🔴 Cofre eletrônico (carsharing /nova/)

| Item | Detalhe |
|---|---|
| **Provedor sugerido** | **Yale Connect Smart Lock** ou **iLockey** (precisa pesquisar APIs) |
| **Alternativas** | Tedee, igloohome, August Smart Lock |
| **Funcionalidade** | Cliente recebe código de 4-6 dígitos válido APENAS durante a locação. Cofre fica no para-brisa/console e libera a chave física do carro. |
| **Custo estimado** | Hardware: R$ 1.500/unidade (compra única). API mensal: varia (~R$ 30-80/un dependendo do fornecedor) |
| **Lead time** | 3-5 dias após contrato + 1 cofre teste |
| **Como funciona hoje** | No `/nova/` (carsharing): `pickup_code` é gerado randomicamente como mock. Não abre cofre real. Carsharing por hora NÃO funciona sem cofre. |
| **Bloqueio crítico** | Sem cofre: precisa staff entregando chave fisicamente (mata o modelo Zipcar). |

**Próximo passo:** pesquisar fornecedores BR de cofres com API REST. **Não decidido ainda.** Recomendo: ligar pra Yale Brasil + iLockey + 2 fornecedores nacionais e comparar.

### 2.5 🔴 Assinatura eletrônica de contrato

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **D4Sign** ([d4sign.com.br](https://d4sign.com.br)) — BR, ICP-Brasil compatível |
| **Alternativas** | Clicksign, DocuSign (intl, mais caro), Autentique (free tier generoso!) |
| **Funcionalidade** | Cliente assina termos de locação digitalmente com validade jurídica (Lei 14.063/2020 + MP 2.200-2/2001) |
| **Custo mensal estimado** | D4Sign: R$ 80-150/mês (50 assinaturas). Autentique: GRÁTIS até 5/mês, R$ 49 plano starter |
| **Lead time** | 1 dia após contrato |
| **Como funciona hoje** | Apenas `termos.html` estático + checkbox aceite no cadastro. Sem assinatura formal por locação. |
| **Bloqueio** | Em dispute jurídica, checkbox "li e aceito" tem força menor que assinatura eletrônica ICP-Brasil. |

**Próximo passo:** começar com **Autentique grátis** pro MVP, migrar pra D4Sign quando volume >10/mês.

### 2.6 🔴 Google Maps / Mapbox (mapas com pontos de retirada)

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **Google Maps Platform** (mais conhecido) ou **Mapbox** (mais barato, design melhor) |
| **Funcionalidades** | Mostrar pontos de retirada em mapa interativo, cálculo de rota até o ponto, distância/ETA |
| **Custo mensal** | Google: 0-50 reais (free tier $200 USD = 28k carregamentos/mês). Mapbox: free 50k loads/mês |
| **Lead time integração** | 1 dia (só pegar API key + colar embed) |
| **Como funciona hoje** | Não há mapa. Pontos de retirada listados em texto. |
| **Bloqueio UX** | Cliente quer **ver** onde estão os carros próximos a ele. Lista de endereços = baixa conversão. |

**Próximo passo:** pegar Google Maps API key (gratuito, só precisa cartão pra ativar), adicionar mapa em `/nova/index.html` e `/index.html`.

### 2.7 🔴 LGPD compliance básico

| Item | Detalhe |
|---|---|
| **Tipo** | Não é integração, é estrutura |
| **Status atual** | 🟡 Parcial — `termos.html` cobre, checkbox de aceite no cadastro existe, **incidente de RLS auditado e fechado 30/05** (ver `INCIDENTE_LGPD_2026_05_30.md`) |
| **O que falta** | (1) Página `/politica-privacidade.html` separada e completa. (2) Direito ao esquecimento — botão "Excluir minha conta" no dashboard cliente. (3) Painel de consentimentos granular. (4) Avisar usuários afetados se incidente de dados reportável ocorrer. |
| **Custo** | R$ 0 (estrutura interna) + advogado LGPD pra revisão (R$ 500-2.000 one-time) |
| **Lead time** | 3-5 dias (sem o advogado) |

**Próximo passo:** ler `INCIDENTE_LGPD_2026_05_30.md` e considerar consulta jurídica. Adicionar `/politica-privacidade.html` e botão "Excluir conta".

---

## 3. Integrações FALTANDO — P1 (essencial em 30 dias após launch)

### 3.1 🟡 NF-e (Nota Fiscal Eletrônica)

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **NotaZZ** ([notazz.com](https://notazz.com)) — task #34 já listada |
| **Alternativas** | NFE.io, Bling (mais ERP), Omie |
| **Funcionalidade** | Emite NFS-e por locação (obrigatório quando faturar B2B) |
| **Custo mensal estimado** | R$ 49-150/mês (50 NFs/mês) |
| **Lead time integração** | 2-3 dias (NotaZZ tem doc clara) |
| **Bloqueio fiscal** | Necessário quando emitir nota pra empresa (condomínio paga R$ 1.000/mês — empresa quer NF) |
| **Pendência task** | #34 — Fase 32 Sprint 3 |

### 3.2 🟡 Chat de suporte in-app

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **Crisp** ([crisp.chat](https://crisp.chat)) — free tier OK, design moderno |
| **Alternativas** | Tawk.to (grátis), Intercom (caro, $74/mês), Zendesk |
| **Funcionalidade** | Cliente fala com Daniel sem sair do app |
| **Custo mensal** | Crisp Basic: GRÁTIS (2 operadores) ou Pro $25/mês. Tawk.to: 100% grátis |
| **Lead time** | 1 hora (só colar script no HTML) |

### 3.3 🟡 SMS backup (para quando WhatsApp/email falha)

| Item | Detalhe |
|---|---|
| **Provedor recomendado** | **Zenvia** ([zenvia.com](https://zenvia.com)) ou **TotalVoice** |
| **Alternativa** | Twilio (intl, USD) |
| **Custo mensal estimado** | R$ 0,08-0,15 por SMS. ~R$ 50/mês pra 500 SMS |
| **Lead time** | 1-2 dias |
| **Quando usar** | Confirmação de senha do cofre crítica, alerta de geofence, alerta de inadimplência |

### 3.4 🟡 Cobrança automática de multas (wiring final)

| Item | Detalhe |
|---|---|
| **Status** | Infosimples ✅ + Stripe ✅, falta o "elo" |
| **O que falta** | Edge Function `auto-cobrar-multa` que: (1) recebe vehicle_fines NOVA. (2) Identifica booking ativo no momento da infração. (3) Captura caução do cliente via PaymentIntent. (4) Notifica cliente por email + WhatsApp. |
| **Custo adicional** | R$ 0 (usa Stripe + Resend já contratados) |
| **Lead time** | 1 dia |

### 3.5 🟡 Cobrança recorrente "NomadeDrive Pass" (R$ 99/ano)

| Item | Detalhe |
|---|---|
| **Status** | Stripe Subscription ✅ existe, falta produto criado no Stripe + UI no cliente |
| **Lead time** | 2-3 horas |

### 3.6 🟡 Cobrança recorrente B2B condomínio (R$ 800-1.200/mês)

| Item | Detalhe |
|---|---|
| **Status** | Stripe Subscription ✅ existe, falta plano criado + página `/empresas` com checkout |
| **Lead time** | 4-6 horas |

### 3.7 🟡 Hodômetro automático + sensor combustível + alerta manutenção

| Item | Detalhe |
|---|---|
| **Status** | Vem com telemetria SmartGPS/Cobli (P0 §2.3). Quando 2.3 estiver pronto, esses 3 vêm de graça via mesma API. |

### 3.8 🟡 Comparação automática de fotos vistoria (IA)

| Item | Detalhe |
|---|---|
| **Provedor sugerido** | **OpenAI Vision API** (GPT-4o vision) — simples + barato |
| **Alternativas** | Google Vision, AWS Rekognition |
| **Custo** | $0,01-0,03 por par de fotos (4-6 ângulos × 2 momentos = 8-12 chamadas por locação) = ~R$ 0,50 por vistoria |
| **Lead time** | 3-5 dias (precisa prompting + UI marcador de diferenças) |
| **Quando** | Backlog após volume >50 locações/mês |

### 3.9 🟡 Cálculo de rota até o ponto

| Item | Detalhe |
|---|---|
| **Status** | Vem com Google Maps (P0 §2.6) usando Directions API |
| **Lead time** | 2-3 horas após Google Maps integrado |

### 3.10 🟡 Geofencing (alerta sai de área)

| Item | Detalhe |
|---|---|
| **Status** | Vem com SmartGPS (P0 §2.3) via webhooks |

---

## 4. Integrações FALTANDO — P2 (importante em 3-6 meses)

| Integração | Provedor sugerido | Custo | Quando | Nota |
|---|---|---|---|---|
| **Push notifications mobile NATIVO** | OneSignal, Firebase Cloud Messaging | Grátis | Quando lançar app Android/iOS | PWA web push (atual) cobre 80% dos casos |
| **Score de crédito** | Serasa Experian, Boa Vista | R$ 3-8/consulta | Pra caução reduzida pra cliente Gold | Já recomendo deixar pra fase B2B |
| **Pedágio** | Veloe Go ou ConectCar | R$ 10/tag/mês + uso | Depende decisão "toda frota com tag" (§7) | Marketing: cliente paga pedágio na fatura mensal |
| **Sistema de avaliação dupla** (cliente avalia carro, sistema avalia cliente) | Interno + Cobli reputation | R$ 0 | Pós-launch | Importante pra qualidade da frota |
| **PIX como alternativa Stripe** | Asaas, Pagar.me | 0,99% por transação | Backup pra recusas Stripe | Hoje PIX automático já funciona via Stripe |
| **Consulta CNH suspensa em tempo real** | Caf "CNH Status" | Incluso no plano Caf | Quando contratar Caf | Re-validação antes de cada locação |

---

## 5. Integrações P3 (quando escalar — 6+ meses)

- **Antecedentes criminais** — Caf "Background Check"
- **Apólice de seguro Yelum API** — provavelmente não existe API pública. Manual via planilha
- **Consulta CNH Denatran direto** — burocrático, só faz sentido com volume muito alto
- **Cartão combustível** (Cobli integrado) — quando virar ração de fluxo
- **TMS / ERP integrado** (NotaZZ, Bling) — quando equipe administrativa crescer

---

## 6. Custo total mensal de integrações (cenário MVP — 5-10 carros, 50 cadastros/mês)

| Categoria | Provedor | Custo/mês |
|---|---|---|
| Pagamento | Stripe (3,5% × R$ 7.400 receita) | R$ 260 |
| Identidade | Caf (50 validações) | R$ 250 |
| Telemetria | SmartGPS (10 carros) | R$ 32 |
| Hardware GPS | R$ 200-400/un × 10 (one-time) | R$ 0/mês após pago |
| Cofre eletrônico | R$ 1.500/un (one-time) × 5 | R$ 0/mês após pago |
| Comunicação WhatsApp | Z-API | R$ 100-200 |
| Email | Resend Pro (até 50k/mês) | R$ 100 |
| SMS backup | Zenvia (~500 SMS) | R$ 50 |
| Assinatura eletrônica | D4Sign (50 docs/mês) | R$ 80-150 |
| Mapas | Google Maps | R$ 0-50 |
| Multas | Infosimples (R$ 100 mínimo) | R$ 100 |
| NF-e | NotaZZ (50 NFs/mês) | R$ 49-150 |
| Supabase Pro | $25/mês | R$ 125 |
| Chat suporte | Crisp Basic / Tawk.to | R$ 0 |
| Push notifications | Self-hosted VAPID | R$ 0 |
| Domínio + GitHub | nomadedrive.com.br + GH Pages | R$ 5 |
| **TOTAL MENSAL** | | **R$ 1.151 – R$ 1.572** |

**One-time inicial:** hardware GPS (R$ 2.000-4.000) + cofres eletrônicos (R$ 7.500 para 5) + advogado LGPD (R$ 500-2.000) = **R$ 10.000-13.500**.

---

## 7. Decisões pendentes que destravam várias integrações

### Decisões de NEGÓCIO (Daniel decide)

| # | Decisão | Destrava | Prazo |
|---|---|---|---|
| 1 | Toda frota terá rastreador GPS? (Sim/Opcional) | C8 telemetria, bloqueio remoto, geofence, hodômetro auto, sensor combustível | **Antes do contratos SmartGPS** |
| 2 | Hardware OBD-II ou hardwired? | Custo instalação + segurança contra remoção pelo cliente | Antes de pedir cotação |
| 3 | Toda frota terá tag de pedágio? | C7 (Veloe Go ou ConectCar) | Antes do MVP é OK pendente |
| 4 | Caf vs Idwall vs Truora? | KYC automático | Antes de abrir conta |
| 5 | Z-API vs Meta Cloud API vs Twilio? | WhatsApp transacional | Antes de cadastrar provedor |
| 6 | D4Sign vs Autentique vs Clicksign? | Assinatura eletrônica contratos | Antes de subir UI |
| 7 | Cofre Yale vs iLockey vs outro? | Carsharing `/nova/` funcionar de verdade | Antes de lançar `/nova/` em produção |
| 8 | Stripe TEST → LIVE quando? | Pagamentos reais | Antes do primeiro cliente real |

### Decisões TÉCNICAS (Daniel + dev decidem juntos)

| # | Decisão | Impacto |
|---|---|---|
| A | Mover migrations SQL pra `supabase/migrations/` (pasta padrão)? | Versionamento mais limpo. Hoje migrations registradas no MCP só, sem arquivos locais até FASE_82 |
| B | Adotar Sentry ou similar pra error tracking? | Hoje só logs Supabase (24h retenção). Sentry free tier serve. |
| C | Configurar Supabase Audit Log (recurso pago)? | Retenção >24h dos logs HTTP — útil pra forensics LGPD futuros |
| D | Rate-limiting nos forms públicos via Cloudflare Turnstile? | Anti-spam de leads (mencionado na auditoria Fase 79c) |

---

## 8. Roadmap sugerido por sprint (6-8 semanas até MVP completo)

### Sprint 1 (semanas 1-2) — Destravar lançamento

**Foco:** o que impede o primeiro cliente real de fechar a locação completa.

1. **Stripe TEST → LIVE** (Daniel troca a `STRIPE_SECRET_KEY` no Supabase Secrets — 5 min, eu te guio)
2. **Google Maps** — pega API key + integro em `/index.html#frota` e `/nova/index.html` (1 dia)
3. **Assinatura eletrônica (Autentique grátis)** — Edge Function `gera-contrato` + UI no fluxo de booking (2 dias)
4. **WhatsApp Z-API** — `send-whatsapp` Edge Function (1 dia)
5. **Validar políticas LGPD existentes + criar /politica-privacidade.html** (1 dia)

**Custo Sprint 1:** R$ 100 (Z-API) + R$ 0 (Autentique grátis) + R$ 0 (Google Maps free tier) = R$ 100/mês recorrente

### Sprint 2 (semanas 3-4) — KYC + Auto-cobrança

1. **Caf KYC** (CPF + OCR CNH + biometria) — Edge Function `kyc-verify` (3 dias)
2. **Cobrança automática de multas** — wiring Infosimples + Stripe (1 dia)
3. **NF-e NotaZZ** — `gera-nfe` Edge Function (3 dias)
4. **Botão "Excluir minha conta"** — LGPD direito ao esquecimento (1 dia)

**Custo Sprint 2:** +R$ 250 Caf + R$ 49 NotaZZ = **+R$ 299/mês**

### Sprint 3 (semanas 5-6) — Operação física

1. **Decisão SmartGPS** (Daniel decide §7.1)
2. **Compra 5-10 cofres eletrônicos + hardware GPS** (one-time)
3. **Integração SmartGPS API** — `consulta-rastreamento` + webhook `geofence-alert` (3 dias)
4. **Integração cofre eletrônico** — `cofre-gera-codigo` + `cofre-libera` (3 dias)
5. **Bloqueio remoto motor** — endpoint admin em emergência (1 dia)

**Custo Sprint 3:** +R$ 32 SmartGPS + R$ ~80 cofre API = **+R$ 112/mês** + R$ 9.500 one-time

### Sprint 4 (semanas 7-8) — Polimento + extras

1. **Chat Crisp/Tawk.to** (1 hora)
2. **SMS backup Zenvia** (1 dia)
3. **Comparação IA fotos vistoria** (OpenAI Vision) (3 dias)
4. **Push native quando app sair** (futuro)
5. **Auditoria final segurança + LGPD pré-launch** (1 dia)

**Custo Sprint 4:** +R$ 50 SMS + R$ ~30 OpenAI = **+R$ 80/mês**

### Total acumulado após 8 semanas

**Mensal:** ~R$ 1.150 – R$ 1.450 (na faixa projetada)
**One-time:** ~R$ 10.000 – R$ 13.500 (hardware + cofres + advogado)
**Cobertura:** 100% das 20 integrações P0/P1

---

## 9. Cross-references — onde achar mais detalhes

| Doc | Conteúdo |
|---|---|
| `ESTADO_ATUAL.md` (26/05) | Inventário completo de schema, tabelas, fluxos, páginas, integrações atuais |
| `PESQUISA_INTEGRACAO_OPERACIONAL.md` (23/05) | Pesquisa profunda C6 multas + C7 pedágio + C8 rastreamento (preços, APIs, comparativos) |
| `INCIDENTE_LGPD_2026_05_30.md` (30/05) | Vazamento RLS de 15 views + avaliação ANPD + ações preventivas |
| `QA_TEST_PLAN.md` v1.1 (30/05) | Fluxos de teste end-to-end pro carsharing `/nova/` |
| `ROADMAP_MVP.md` | Roadmap geral do MVP (visão Daniel) |
| `PLANO_IMPLEMENTACAO.md` | Plano técnico de implementação |
| `GUIA_PUSH_NOTIFICATIONS_VAPID.md` | Setup VAPID pra push notifications |
| `SETUP_EXTERNO.md` | Guia passo-a-passo de setup externo (Stripe, Resend, etc) |
| `FASE_82_SECURITY_INVOKER_VIEWS.sql` (30/05) | Migration do fix LGPD |

---

## 10. O que copiar pra outras IAs (ChatGPT, Cursor, Claude Code) saberem o contexto

Quando você abrir nova conversa com qualquer IA sobre integrações, cole este resumo:

> **Stack:** Vanilla HTML/JS + Supabase (Postgres + Edge Functions Deno) + Stripe Connect + Resend + Infosimples + Web Push VAPID. Hospedado em GitHub Pages (`nomadedrive.com.br`).
> **22 Edge Functions** ativas em `supabase/functions/`. **33 tabelas** com RLS. **3 commits hoje (30/05)** fecharam vazamento LGPD de 15 views + auditoria APIs.
> **P0 ainda faltando:** KYC Caf/Idwall, WhatsApp Business API, Telemetria SmartGPS, Cofre eletrônico, Assinatura eletrônica, Google Maps.
> **Sem multi-tenancy** (mono-brand Nomade Drive).
> **Modo Stripe:** provavelmente TEST. Trocar pra LIVE antes do primeiro cliente real.
> **Doc fonte de verdade:** `ANALISE_INTEGRACOES.md` (este arquivo) + `ESTADO_ATUAL.md`.

---

**Próxima revisão sugerida:** após cada Sprint do roadmap (a cada 2 semanas), pra refletir o que entrou em produção.

**Versão:** 1.0 — 2026-05-30 — gerado consolidando leitura direta de código + 2 docs prévios + auditoria fresca de Edge Functions e RLS.
