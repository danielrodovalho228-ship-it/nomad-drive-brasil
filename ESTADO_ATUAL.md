# Estado Atual — Nomade Drive Brasil

> Documento gerado em **2026-05-26** via leitura direta de filesystem + Supabase MCP. Snapshot do que existe **hoje em produção**, sem alterações.

---

## ⚠️ ALERTA DE SEGURANÇA DESCOBERTO NA AUDITORIA

**Tabela `public.pricing_categories` está com Row Level Security DESABILITADA** — qualquer pessoa com a anon key pode ler/escrever. Não contém dados sensíveis (só preços-base públicos), mas escrita aberta permite vandalismo. **Recomendado** habilitar RLS com policy de leitura pública + escrita só admin.

---

## 1. Stack Técnica

**O projeto NÃO é Next.js/React/TypeScript.** É um app **vanilla** muito mais leve:

| Camada | Tecnologia |
|---|---|
| Frontend | **HTML5 + Vanilla JavaScript** (sem framework, sem bundler) |
| Hospedagem | **GitHub Pages** (estático) em https://nomadedrive.com.br |
| Backend | **Supabase** (Postgres + Auth + Storage + Edge Functions) |
| Pagamento | **Stripe** + **Stripe Connect** (split automático 90/10) |
| Email | **Resend** (SMTP) |
| API externa | **Infosimples** (consulta de multas) |
| Push notifications | **Web Push** (VAPID) |
| MCP/IA | Claude Code via `.claude.json` local (não-tracked) |
| Versionamento | Git + GitHub (`nomad-drive-brasil` repo) |

**Não há `package.json`** — todo JS roda direto no browser. Edge Functions usam Deno (runtime nativo do Supabase) com imports `https://esm.sh/...`.

---

## 2. Estrutura de Pastas

```
nomad-drive-brasil/
├── *.html (50+ páginas — ver seção 5)
├── *.js (script.js, car.js, auth.js, payouts.js, fm-reveal.js,
│         nd-modal.js, nd-notifications.js, emails-runtime.js,
│         car-data.js, statuses.js)
├── *.sql (~35 migrations — supabase-fase1.sql até FASE_80_*.sql)
│
├── supabase/
│   └── functions/
│       ├── _shared/                       (helpers Stripe + email)
│       ├── approve-rental-request/        (owner aprova rental)
│       ├── close-rental/                  (check-out final)
│       ├── connect-onboard/               (Stripe Connect setup)
│       ├── consulta-multas/               (API Infosimples)
│       ├── create-rental-request/         (cliente pede orçamento)
│       ├── damage-capture/                (captura avaria)
│       ├── installation-checkout/         (Stripe ativ. rastreador)
│       ├── liberar-saque-parcial/         (saque 15-em-15)
│       ├── reject-rental-request/         (owner recusa)
│       ├── send-email/                    (wrapper Resend)
│       ├── send-push/                     (Web Push notifications)
│       ├── send-rating-request/           (D+1 pós-locação)
│       ├── send-renewal-reminders/        (D-7 cron)
│       ├── send-tier-promotion/           (cliente subiu de tier)
│       ├── setup-manual-payouts/          (Stripe payouts)
│       ├── stripe-billing-portal/         (cliente gerencia cartão)
│       ├── stripe-checkout/               (sessão de pagamento)
│       ├── stripe-subscription/           (subscription mensal)
│       ├── stripe-webhook/                (eventos Stripe)
│       └── submit-lead-quote/             (form orçamento público)
│
├── images/  (~59 fotos: hero, car-cobalt-X.jpg, hero-shield.jpg etc.)
├── emails/  (templates HTML)
└── INBOX_COWORKER/, Imagens parceiros/, Testes QA/, Novas atualizacoes/
    (todos gitignored — pastas locais do owner)
```

---

## 3. Schema do Banco de Dados (Supabase)

**29 tabelas** no schema `public`. Todas com RLS habilitada EXCETO `pricing_categories`.

| Tabela | Linhas | Colunas-chave | FK | RLS | Comentário |
|---|---|---|---|---|---|
| **profiles** | 7 | id (uuid→auth.users), full_name, email, phone, cnh, cpf, address | → auth.users | ✅ | Perfil estendido de usuário |
| **user_roles** | 12 | user_id, role, status | → profiles | ✅ | Roles: client/owner/workshop/referral_partner/protection_partner/super_admin |
| **vehicles** | 5 | id, owner_id, make, model, year_model, mileage, fipe_value, category, category_key, transmission, city_tier, status, monthly_price_override, pricing_floor/ceiling, discount_2/3/4/6/12mo_pct | → profiles, → pricing_categories | ✅ | Frota |
| **pricing_categories** | 13 | key, label, body_type, base_price_brl, localiza_final_brl | — | ⚠️ **DESABILITADA** | Categorias de mercado (Fase 80) |
| **vehicle_documents** | 0 | vehicle_id, type, url | → vehicles | ✅ | CRLV, IPVA, etc. |
| **vehicle_inspections** | 1 | vehicle_id, workshop_id, status, checklist_json | → vehicles, → workshops | ✅ | Vistoria técnica inicial |
| **vehicle_status_snapshots** | 3 | vehicle_id, status_color, captured_at | → vehicles | ✅ | Painel Status Verde |
| **vehicle_fines** | 0 | vehicle_id, booking_id, valor, data_infracao | → vehicles, → bookings | ✅ | Multas via Infosimples |
| **workshops** | 1 | id, name, cnpj, address, status | — | ✅ | Oficinas parceiras |
| **applications** | 8 | user_id, role, status, data_json | → profiles | ✅ | Cadastros pendentes/aprovados |
| **rental_requests** | 1 | client_id, vehicle_id, status, desired_start_date, desired_months | → profiles, → vehicles | ✅ | Pedido de orçamento |
| **bookings** | 6 | client_id, owner_id, vehicle_id, status, start_date, end_date, monthly_price, deposit_amount, protocol_number | → rental_requests, → vehicles | ✅ | Locação ativa/encerrada |
| **rental_inspections** | 8 | booking_id, kind (checkin/checkout), status, mileage, fuel_level, notes | → bookings | ✅ | Vistoria de retirada/devolução |
| **damages** | 4 | booking_id, type, severity, valor_estimado, fotos_urls | → bookings | ✅ | Avarias reportadas |
| **damage_rules** | 7 | type, faixa_min, faixa_max, severidade | — | ✅ | Catálogo admin de avarias |
| **payments** | 6 | booking_id, kind (mensalidade/caucao), amount, status, stripe_intent_id | → bookings | ✅ | Histórico de pagamentos |
| **payout_accounts** | 3 | user_id, stripe_account_id, status, payouts_enabled | → profiles | ✅ | Stripe Connect Express |
| **withdrawals** | 10 | owner_id, booking_id, amount, status, stripe_transfer_id | → profiles | ✅ | Saques parciais 15-em-15 |
| **stripe_events** | 56 | event_id, type, payload_json | — | ✅ | Audit log de webhooks |
| **protection_cases** | 8 | booking_id, type, status, protocol_number | → bookings | ✅ | Casos de proteção/sinistro |
| **installation_orders** | 0 | client_id, workshop_id, vehicle_id, status | → workshops | ✅ | Marketplace de instalação GPS |
| **notifications** | 8 | user_id, kind, title, body, read_at | → profiles | ✅ | Sino in-app |
| **notification_preferences** | 0 | user_id, channel, kind, enabled | → profiles | ✅ | Configuração de notificações |
| **partners_referrals** | 0 | partner_id, referred_email, role, status | → profiles | ✅ | Programa de indicação |
| **loyalty_events** | 0 | user_id, event_type, points_delta, tier_at_event | → profiles | ✅ | Histórico do Programa Gold |
| **nps_responses** | 3 | user_id, booking_id, role, score, comment | → profiles | ✅ | NPS pós-locação |
| **leads** | 1 | name, phone, email, vehicle_id, status | → vehicles | ✅ | Formulário público de orçamento |
| **user_documents** | 5 | user_id, type, url, status | → profiles | ✅ | KYC documentos |
| **admin_audit_logs** | 188 | admin_id, action, target_type, target_id, metadata_json | → profiles | ✅ | Auditoria de ações admin |

### Multi-tenancy
**NÃO é multi-tenant.** Não há `operator_id`/`tenant_id`. Sistema é mono-marca (Nomade Drive). Para multi-tenant futuro seria necessária refatoração ampla.

### Constraints + Funções importantes
- **Trigger `trg_guard_vehicle_mileage`** bloqueia regressão de KM em `vehicles` (só admin pode forçar com auditoria)
- **`is_admin(uuid)`** — função usada em RLS
- **`calculate_suggested_monthly_price(vehicle_id, num_months)`** — Fase 80 pricing
- **`progressive_discount_pct(vehicle_id, num_months)`** — descontos 2/4/5/7/10%
- **`effective_monthly_price(vehicle_id, base_price)`** — aplica override + floor/ceiling
- **5 ajustes pricing**: age, mileage, transmission, city, oficinas

---

## 4. Fluxos Implementados

| Fluxo | Status | Onde |
|---|---|---|
| Cadastro e autenticação de cliente | ✅ Pronto | `cadastro.html` + `login.html` + Supabase Auth |
| Cadastro e autenticação de proprietário | ✅ Pronto | `cadastro.html?perfil=proprietario` + `applications` |
| Cadastro e autenticação de parceiro/oficina | ✅ Pronto | `onboarding-oficina.html` + `onboarding-parceiro.html` |
| Painel admin/super-admin | ✅ Pronto | `admin.html` (cockpit + leads + financeiro + RH) |
| Listagem e busca de carros disponíveis | ✅ Pronto | `index.html` (#frota) + `frota.html` + `car.html` |
| Solicitação/pedido de orçamento | ✅ Pronto | `submit-lead-quote` + `create-rental-request` |
| Geração de contrato eletrônico | ❌ **Não existe** | Apenas termos.html público (estático) |
| Vistoria por foto na retirada | 🟡 Parcial | `rental_inspections` aceita campos mas falta UI de foto |
| Vistoria por foto na devolução | 🟡 Parcial | Idem — `damages` tem `fotos_urls` mas owner não captura odômetro |
| Pagamento mensal recorrente via Stripe | ✅ Pronto | `stripe-subscription` + PIX Automático |
| Split automático 90/10 via Stripe Connect | ✅ Pronto | Separate Charges + Transfers (BR) |
| Cobrança de caução (pré-autorização) | ✅ Pronto | `stripe-checkout` + capture manual |
| Sistema de tiers (Gold/Platinum/Silver/Bronze) | ✅ Pronto | `loyalty_events` + `get_client_loyalty_tier()` |
| Programa de indicação/parceiros | ✅ Pronto | `partners_referrals` + `dashboard-parceiro.html` |
| Verificação de identidade do cliente | ❌ **Não existe** (Idwall/Caf) | Apenas KYC manual via `user_documents` |
| Integração com WhatsApp para suporte | 🟡 Parcial | Links `wa.me` no site, sem API oficial |
| Notificações por email | ✅ Pronto | Resend + ~14 templates |
| Relatórios financeiros para proprietário | ✅ Pronto | `dashboard-proprietario.html` (saldo, extrato, saques) |
| Dashboard de métricas para admin | ✅ Pronto | `admin.html` (cockpit CEO + financeiro + crescimento) |

**Outros fluxos não listados na pergunta mas implementados:**
- ✅ Auto-aprovação Gold/Platinum
- ✅ Renovação 1-clique
- ✅ Push notifications PWA
- ✅ Painel Status Verde de veículos
- ✅ Cupons/promoções
- ✅ Notas reservas (Fase 80c — pricing market-based + simulador 3-cliques)
- ✅ Avaliações pós-locação (NPS)

---

## 5. Páginas Existentes

| URL | Função | Status |
|---|---|---|
| `/` (`index.html`) | Landing principal: hero, frota, preços, ganhe, FAQ | 🟢 Produção |
| `/cadastro.html` | Cadastro de cliente/owner/parceiro | 🟢 Produção |
| `/login.html` | Login + recuperação de senha | 🟢 Produção |
| `/admin.html` | Painel super-admin (CEO, leads, financeiro, RH) | 🟢 Produção |
| `/dashboard-cliente.html` | Painel cliente (reservas, pagamento, KYC) | 🟢 Produção |
| `/dashboard-proprietario.html` | Painel owner (frota, vistorias, saldo, saques) | 🟢 Produção |
| `/dashboard-oficina.html` | Painel oficina parceira | 🟢 Produção |
| `/dashboard-parceiro.html` | Painel parceiro de indicação | 🟢 Produção |
| `/dashboard-protecao.html` | Painel da equipe Proteção | 🟢 Produção |
| `/car.html?id=X` | Detalhe de veículo | 🟢 Produção |
| `/proprietarios.html` | Página owner: regras, simulador rápido | 🟢 Produção |
| `/simulador-roi-proprietario.html` | Simulador interativo Fase 80 (3-cliques + detalhado) | 🟢 Produção |
| `/parceiros.html` | Página parceiro de indicação | 🟢 Produção |
| `/oficinas.html` | Página oficina parceira | 🟢 Produção |
| `/shield-protecao.html` | Página Shield (proteção/caução) | 🟢 Produção |
| `/seguranca-sinistros.html` | FAQ de segurança e sinistros | 🟢 Produção |
| `/programa-gold.html` | Programa Nomade Gold (tiers) | 🟢 Produção |
| `/termos.html` | Termos de uso (intermediação) | 🟢 Produção |
| `/historico.html` | Histórico de reservas (role-aware) | 🟢 Produção |
| `/notificacoes.html` | Lista de notificações | 🟢 Produção |
| `/reserva-detalhe.html?id=X` | Detalhe da reserva (timeline, pagamento) | 🟢 Produção |
| `/recibo.html?id=X` | Recibo formal de pagamento | 🟢 Produção |
| `/status-cadastro.html` | Status pós-cadastro (aguardando aprovação) | 🟢 Produção |
| `/boas-vindas-cliente.html` | Onboarding cliente pós-confirmação email | 🟢 Produção |
| `/boas-vindas-owner.html` | Onboarding owner pós-aprovação | 🟢 Produção |
| `/onboarding-cliente.html` | Onboarding cliente 5 steps | 🟢 Produção |
| `/onboarding-proprietario.html` | Onboarding owner 5 steps | 🟢 Produção |
| `/onboarding-oficina.html` | Onboarding oficina parceira | 🟢 Produção |
| `/onboarding-parceiro.html` | Onboarding parceiro indicação | 🟢 Produção |
| `/onboarding-protecao.html` | Onboarding equipe Proteção | 🟢 Produção |
| `/preview-components.html` | Página interna de design system | 🟡 Em dev (não-listada) |
| `/APRESENTACAO_SOCIEDADE.html` | Slide pra investidores (calc aportes) | 🟢 Produção (privado) |

---

## 6. Integrações de Terceiros

| Categoria | Serviço | Status | Onde |
|---|---|---|---|
| **Pagamento** | **Stripe** | ✅ Ativo | `stripe-checkout`, `stripe-subscription`, `stripe-webhook` |
| **Pagamento** | **Stripe Connect** (Express) | ✅ Ativo | `connect-onboard`, `setup-manual-payouts`, `liberar-saque-parcial` |
| **Pagamento** | **PIX Automático** | ✅ Ativo (via Stripe) | controlled por env `ENABLE_PIX` |
| **Comunicação** | **Resend** (email) | ✅ Ativo | `send-email`, `_shared/email.ts`, ~14 templates |
| **Comunicação** | **WhatsApp** | 🟡 Parcial — só links `wa.me`, sem API oficial | botões em todas páginas |
| **Comunicação** | **Web Push** (PWA) | ✅ Ativo | `send-push` + VAPID keys |
| **Identidade** | **Idwall / Caf** | ❌ **NÃO implementado** | KYC manual via upload |
| **Veiculos** | **Infosimples** (multas) | ✅ Ativo | `consulta-multas` |
| **Telemetria** | Rastreador GPS | 🟡 Parcial — marketplace de instalação existe (`installation-checkout`), GPS ao vivo NÃO |
| **NF eletrônica** | **NotaZZ** | ❌ Pendente (Fase 32 Sprint 3) | Opção existe no admin mas sem integração |
| **CNPJ** | BrasilAPI / Receita Federal | ❌ **NÃO implementado** | Validação CNPJ manual |
| **MCP/IA** | Anthropic Claude (via Claude Code) | ✅ Ativo (dev tool) | `.claude.json` local |

---

## 7. Estado do Deploy

| Item | Status |
|---|---|
| **Hospedagem frontend** | **GitHub Pages** (`danielrodovalho228-ship-it/nomad-drive-brasil`) |
| **Hospedagem backend** | **Supabase Cloud** (us-west-1) |
| **Backend URL** | `https://zeexmbgacvsaciojcrwr.supabase.co` |
| **Domínio** | ✅ `nomadedrive.com.br` configurado e funcionando |
| **HTTPS** | ✅ (GitHub Pages + Supabase nativo) |
| **Fase atual** | **Pré-lançamento** em Uberlândia-MG |
| **Clientes reais** | **7 cadastrados** (todos aprovados — provavelmente testes) |
| **Owners reais** | **1 aprovado** (super_admin = Daniel Rodovalho) |
| **Carros reais na frota** | **4 aprovados** (T-Cross, Onix, HB20, Argo, Cobalt — 1 recusado) |
| **Reservas reais** | **6 bookings totais** (4 ativas) |
| **Stripe** | Mode: **provavelmente test/sandbox** (verificar com STRIPE_SECRET_KEY) |

**Conclusão:** infraestrutura completa em produção, mas operação real ainda **não começou** — dados parecem ser de teste interno.

---

## 8. Variáveis de Ambiente Necessárias

### Supabase (autoinjetadas nas Edge Functions)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Stripe
- `STRIPE_SECRET_KEY` (modo test ou live)
- `STRIPE_WEBHOOK_SECRET`

### Email (Resend)
- `RESEND_API_KEY`
- `EMAIL_FROM` (ex: `Nomade Drive Brasil <pagamentos@nomadedrive.com.br>`)
- `EMAIL_REPLY_TO`

### Push notifications (VAPID/Web Push)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Integrações externas
- `INFOSIMPLES_TOKEN` (consulta de multas)

### Feature flags
- `ENABLE_PIX` (liga/desliga método PIX no checkout)

### Cron jobs (Supabase pg_cron)
- `CRON_SECRET` (autenticação dos jobs agendados — D-7 renovação, D+1 avaliação)

---

## 9. Limitações Conhecidas e TODOs

### Tasks pendentes (de #10 a #35 do tracker)
- **#10** QA validar todos os 14 e-mails do admin
- **#12** UX trocar `window.confirm()` por modal não-bloqueante (parcialmente feito)
- **#27** QA validar Fluxo B (check-in/check-out)
- **#28** QA validar Fluxo C (avaria + captura caução)
- **#29** QA validar Fluxo D (cancelar assinatura)
- **#34** Fase 32 Sprint 3: **Integração NotaZZ (NF parcial)**
- **#35** Fase 33: Painel Status Verde + Notificações Configuráveis (parcial)

### Pendências arquiteturais
- **Foto obrigatória do odômetro** no check-in/check-out (decidido, não implementado)
- **Status `pausado` em vehicles** (decidido, não implementado)
- **`last_inspection_date` + função `needs_inspection()`** (vistoria após 6 meses)
- **CNPJ obrigatório no cadastro de owner** (decidido por defaults — não codado)
- **Edge function "informe anual de rendimentos"** (estilo 1099-K BR)
- **Verificação de identidade automatizada** (Idwall, Caf, Serasa)
- **API WhatsApp oficial** (hoje só `wa.me` link)
- **GPS ao vivo** (rastreador instalado, dashboard de localização não)
- **Contrato eletrônico assinado** (DocuSign, ClickSign)

### Segurança
- ⚠️ **`pricing_categories` sem RLS** (corrigir com `ALTER TABLE ... ENABLE RLS`)
- 14 inputs sem `<label>` ou `aria-label` em páginas secundárias (a11y)

### Issues UX conhecidos (não-bloqueantes)
- T-Cross fica só 6,5% abaixo da média de mercado (alvo: 15-30%) — ajustar base GX ou cap nos ajustes positivos
- Owner em Modo Simples ignora overrides do Detalhado (comportamento esperado mas pode confundir)
- Modelo "Outro" no dropdown do simulador não auto-popula nada (owner precisa ir ao Detalhado)

### Código deprecated/legacy
- `FLEET_TIER_RATES` (% FIPE) — substituído pela Fase 80, mas `car.js`/`script.js` mantêm variável zerada por compat
- Categoria legacy A/B/C/D em `vehicles.category` (coexiste com nova `category_key`)

### Scripts de teste internos (em `_test_*.js`)
- 8 arquivos `_test_*.js` na raiz — provavelmente devem ir pra `Testes QA/` ou serem deletados após valid

---

## 10. Modelo de Dados — Mapa de Entidades

```
auth.users (Supabase Auth — gerenciado pelo Supabase)
  └─ profiles (1:1)
       ├─ user_roles (1:N) — pode ter múltiplos papéis
       │    ├─ client
       │    ├─ owner
       │    ├─ workshop
       │    ├─ referral_partner
       │    ├─ protection_partner
       │    └─ super_admin
       │
       ├─ user_documents (1:N) — KYC: CNH, CPF, comprovante
       ├─ applications (1:N) — fluxo de cadastro pendente
       ├─ payout_accounts (1:1) — Stripe Connect Express (só owner)
       ├─ withdrawals (1:N) — saques quinzenais (só owner)
       ├─ partners_referrals (1:N) — indicações feitas (só partner)
       ├─ loyalty_events (1:N) — eventos de tier
       ├─ notifications (1:N) — sino in-app
       ├─ notification_preferences (1:N) — config canais
       └─ nps_responses (1:N)

profiles (owner)
  └─ vehicles (1:N) — frota do proprietário
       ├─ pricing_categories (N:1 via category_key) — Fase 80
       ├─ vehicle_documents (1:N)
       ├─ vehicle_inspections (1:N) — vistoria técnica inicial
       ├─ vehicle_status_snapshots (1:N) — Painel Status Verde
       ├─ vehicle_fines (1:N) — multas via Infosimples
       │
       └─ rental_requests (1:N) — pedidos de orçamento
            └─ bookings (1:1 após aprovação)
                 ├─ rental_inspections (1:N) — checkin + checkout
                 ├─ payments (1:N) — mensalidades + caução
                 ├─ damages (1:N) — avarias no checkout
                 │    └─ damage_rules (N:1 lookup)
                 ├─ protection_cases (1:N) — sinistros/contestações
                 ├─ vehicle_fines (1:N por booking)
                 └─ withdrawals (1:N) — antecipação 15-em-15

workshops
  ├─ vehicle_inspections (1:N) — vistorias realizadas
  └─ installation_orders (1:N) — instalação de rastreador GPS

leads (formulário público — sem auth)
  └─ pode virar profile + rental_request após cadastro

stripe_events — log read-only de webhooks (não tem FK)
admin_audit_logs — log read-only de ações admin (referencia user_id)
```

### Resumo de cardinalidades
- **1 cliente** pode ter **N bookings**, em **N veículos** diferentes
- **1 owner** pode ter **N veículos**, gerando **N bookings** (de N clientes)
- **1 booking** tem **2 vistorias** (checkin + checkout) e **N pagamentos**
- **1 oficina** atende **N vistorias** e **N instalações de rastreador**
- **Stripe Connect** liga **1 owner** ao **1 payout_account** (Stripe Express)

---

## 📊 Snapshot operacional (consulta ao vivo)

| Métrica | Valor |
|---|---|
| Profiles cadastrados | 7 |
| Clientes aprovados | 7 |
| Owners aprovados | 1 |
| Carros aprovados | 4 |
| Bookings total | 6 |
| Bookings ativas (aprovado + em_uso) | 4 |
| Edge Functions ativas | **19** |
| Tabelas no DB | **29** |
| Stripe webhook events processados | 56 |
| Admin actions auditadas | 188 |
| Migrations SQL aplicadas | ~35 |

---

## 🗂️ Histórico de fases (referência)

Sistema evoluiu em **80+ fases** (`Fase 1` até `Fase 80c`) documentadas em commits + arquivos SQL. Algumas fases-chave:
- **Fase 26** — Guard de regressão de KM (trigger SQL)
- **Fase 28** — Marketplace de instalação de rastreador GPS
- **Fase 30** — Multas via Infosimples
- **Fase 32** — Saques quinzenais (Stripe Connect)
- **Fase 33** — Push notifications PWA
- **Fase 36** — Protocolo universal nas reservas
- **Fase 41** — Renovação 1-clique
- **Fase 42** — Painel de leads no admin
- **Fase 43** — Programa Nomade Gold (tiers)
- **Fase 44-46** — Fluxo E2E aprovar+pagar + Stripe Connect + Auto-aprovação Gold/Platinum
- **Fase 47-49** — Otimização landing + saldo owner + onboarding
- **Fase 50-52** — Avaliações + Dashboard saúde + Cupons
- **Fase 53** — Sistema UI/UX moderno (design tokens)
- **Fase 65-72** — Simulador ROI proprietário (versão inicial)
- **Fase 76-78** — `/historico.html` + RLS admin
- **Fase 79** — Pricing overrides (override + floor/ceiling + descontos progressivos)
- **Fase 80** — Market-based pricing (substitui % FIPE) + 13 categorias inspiradas em Localiza
- **Fase 80b/c** — Descontos conservadores (10% max) + Toggle Simples/Detalhado + dropdown 12 modelos + checkbox includeCosts

---

**Fim do documento.** Gerado por leitura direta — nenhuma alteração foi feita no código ou no banco durante a geração.
