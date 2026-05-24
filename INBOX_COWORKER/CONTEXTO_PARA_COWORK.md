# 👋 Contexto pro Cowork — Nomade Drive Brasil

> **Última atualização:** 2026-05-23
> **Autor:** Claude (assistente do Daniel)
> **Quem deve ler:** dev/QA cowork trabalhando do outro lado do projeto

---

## 🚗 O que é o projeto

**Nomade Drive Brasil** — marketplace MVP de aluguel mensal de carros.
- **Cliente** aluga carro de um **Proprietário**
- Plataforma cobra mensalidade (subscription Stripe) + caução pré-autorizada
- **Proteção** valida avarias e decide captura da caução
- **Oficina** instala rastreador GPS antes do veículo entrar na frota
- **Admin** aprova cadastros, valida vistorias, gerencia tudo

**Site:** https://nomadedrive.com.br (GitHub Pages)
**Backend:** Supabase (Auth + Postgres + Edge Functions + Storage)
**Pagamentos:** Stripe Connect Express (split 10/90 — plataforma/proprietário)
**E-mails:** Resend (domain `nomadedrive.com.br` verificado) → entrega em `contato@nomadedrive.com.br`
**Frota tracking:** Cobli (escolhido, ainda não integrado — esperando contato comercial)
**Multas:** Infosimples (Senatran) — R$ 0,06/consulta, integrado

---

## ✅ O que já está pronto e validado

### Configuração de infra
- ✅ Resend com domain verificado
- ✅ Hostinger com 5 aliases `qa-*@nomadedrive.com.br` (forward pra `contato@`)
- ✅ Supabase secrets: `EMAIL_FROM`, `INFOSIMPLES_TOKEN`, `STRIPE_SECRET_KEY`, `ENABLE_PIX` (opt-in, default off)
- ✅ Edge Functions deployadas: `consulta-multas`, `installation-checkout`, `stripe-checkout`, `stripe-webhook`, `close-rental`

### Fluxos do MVP
- ✅ **Fase 22-26**: cancelamento de assinatura, perfis email, KM audit
- ✅ **Fase 28** (6 sub-fases): marketplace de instalação de rastreador GPS
- ✅ **Fase 29**: gate proprietário recusado (3 triggers SQL)
- ✅ **Fase 30**: integração multas via Infosimples
- ✅ **Fase 31** (B2-v2): Pix Automático em subscription mensal (opt-in via env var)

### QA já validado end-to-end
- ✅ **Fluxo A — Pagar mensalidade R$ 2.500** com cartão `4242 4242 4242 4242`
- ✅ **Autorizar caução R$ 1.000** (pré-autorização, não cobrança)
- ✅ Subscription **Active** no Stripe Dashboard com email `qa-cliente@nomadedrive.com.br`
- ✅ E-mails chegando no webmail Hostinger via aliases

---

## 🟡 O que falta testar (priorizado)

| # | Tarefa | Tempo | Detalhes |
|---|---|---|---|
| 1 | **Fluxo B** — Check-in/check-out | 5 min | Cliente solicita retirada → Proprietário aprova → "Em uso" → Cliente solicita devolução → Proprietário aprova → e-mail "Locação encerrada" |
| 2 | **Fluxo C** — Avaria + captura caução | 10 min | Proprietário registra avaria → Proteção captura R$ 300 → Cliente contesta |
| 3 | **Fluxo D** — Cancelar assinatura | 1 min | Cliente clica "Cancelar" → e-mail + status atualizado |
| 4 | **14 e-mails do admin** | 30 min | Validar template branded, copy, footer, etc |
| 5 | **UX** — Trocar `window.confirm()` por modal não-bloqueante | algumas horas | Polimento |

> 📋 **Passo a passo completo:** ver `PASSO_A_PASSO_TESTES.md` na raiz do projeto.

---

## 🔑 Credenciais de teste (todas senha `Teste123`)

| Perfil | Email |
|---|---|
| Cliente | `qa-cliente@nomadedrive.com.br` |
| Proprietário | `qa-proprietario@nomadedrive.com.br` |
| Proteção | `qa-protecao@nomadedrive.com.br` |
| Oficina | `qa-oficina@nomadedrive.com.br` |
| Parceiro | `qa-parceiro@nomadedrive.com.br` |
| Admin | (o do Daniel — pedir se precisar) |

**Reserva atual ativa:** `53e86074-c753-41e9-a96f-ea5308ed7125` (Chevrolet Onix 2022)
URL: `https://nomadedrive.com.br/reserva-detalhe.html?id=53e86074-c753-41e9-a96f-ea5308ed7125`

**Cartões de teste Stripe:**
- Sucesso: `4242 4242 4242 4242` (qualquer CVC, data futura, CEP `01310-100`)
- Recusa: `4000 0000 0000 0002`
- Requer autenticação 3DS: `4000 0025 0000 3155`

---

## 🏗️ Stack técnico (resumo)

### Frontend
- HTML puro (Vanilla JS, sem framework)
- 16 páginas HTML na raiz (`index.html`, `dashboard-*.html`, `reserva-detalhe.html`, etc.)
- Cache-bust nas tags `<script src>` com `?v=20260523c`

### Backend (Supabase)
- **DB:** Postgres com RLS habilitado
- **Auth:** Supabase Auth (email + senha)
- **Storage:** buckets `documents`, `vehicles`, `inspections`, `damages`, `installations`
- **Edge Functions:** Deno + TypeScript, em `supabase/functions/<nome>/index.ts`

### Tabelas principais
- `profiles` (extends `auth.users`) — colunas: `id`, `full_name`, `email`, `main_role`, `verification_status`, `stripe_customer_id`, `caucao_tier`
- `vehicles` — colunas: `owner_id`, `make`, `model`, `year_model`, `status`, `tracker_installed`, `license_plate`, `renavam`, `fipe_value`
- `bookings` — colunas: `client_id`, `owner_id`, `vehicle_id`, `status`, `billing_mode` (`monthly` ou `one_off`), `monthly_price`, `deposit_amount`, `stripe_subscription_id`
- `applications`, `rental_requests`, `rental_inspections`, `damages`, `damage_decisions`, `installation_orders`, `vehicle_fines`

### Pagamentos (Stripe)
- **Mode subscription** (mensalidade): cria Customer + Subscription, métodos `card` + opcional `pix` (Pix Automático)
- **Mode payment** (caução): cria PaymentIntent com `capture_method: manual` (pré-autorização, captura posterior)
- **Webhook** em `supabase/functions/stripe-webhook/index.ts`: trata `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `payment_intent.amount_capturable_updated`, `payment_intent.captured`, `mandate.updated`
- **Connect**: cada Proprietário tem `stripe_connected_account_id` na profile, split via `transfer_data.destination`

---

## ⚠️ Pegadinhas conhecidas (já caímos)

### 1. Cache do GitHub Pages
- GitHub Pages tem CDN agressivo. Sempre que mudar HTML/JS, **bumpar o `?v=YYYYMMDDx`** em todos os `<script src>`.
- Browser também guarda cache pesado — em QA, sempre Ctrl+F5 (hard refresh).

### 2. Edge Function "criada" ≠ "deployada"
- Quando cria uma function nova no Supabase Dashboard, ela vem com **código placeholder**.
- Tem que copiar o código real do GitHub raw e colar + clicar **Deploy** explicitamente.

### 3. Stripe Customer email mismatch
- Quando muda email da profile (rename ou update), Stripe **NÃO** atualiza o Customer object existente.
- Fix: `update profiles set stripe_customer_id = null where ...` força criar Customer novo no próximo checkout.

### 4. PIX rejeitado quebrava checkout
- Quando PIX não está habilitado na conta Stripe e a gente listava como método, dava erro.
- Fix: `ENABLE_PIX` env var (default `false`). Só ativa quando Stripe Support liberar.

### 5. Pix Automático exige `cancel_at` na subscription
- Subscriptions com Pix Automático precisam ter data de fim de mandato.
- Setamos default de 3 meses (cobrança renova antes do fim automaticamente).
- É por isso que toda subscription aparece "Cancela em DD/mês".

### 6. RLS pode bloquear silenciosamente
- Se você fizer um SELECT/INSERT/UPDATE no DB e vier vazio sem erro, **provavelmente é RLS**.
- Roda primeiro como `postgres` no SQL Editor pra confirmar que os dados existem, depois investiga policy.

---

## 📬 Como comunicar comigo (Claude)

Ver `INBOX_COWORKER/README.md` na raiz do projeto. Resumo:

1. Cria um `.md` em `INBOX_COWORKER/` com nome `BUG_<feature>.md`, `PERGUNTA_<topico>.md`, etc.
2. Segue o template do README (contexto, esperado, real, passos pra reproduzir)
3. Eu respondo no mesmo arquivo adicionando `## ✅ Resposta Claude (data)`
4. Quando fechar, move pra `INBOX_COWORKER/RESOLVIDOS/`

**Regras:**
- ⚠️ **Nunca colar credencial** (senha, token, API key) — vai parar no git
- ⚠️ **Caminhos relativos** ao citar arquivos (`reserva-detalhe.html`, não `C:\Users\...`)
- ⚠️ **Mascarar IDs longos** do Stripe se precisar colar logs (`cus_xxx...123`)

---

## 📁 Arquivos importantes pra você conhecer

| Arquivo | Pra que serve |
|---|---|
| `CHECKLIST_USUARIO.md` | Status geral do projeto (o que falta fazer) |
| `PASSO_A_PASSO_TESTES.md` | Roteiro detalhado dos 3 fluxos pendentes |
| `ROTEIRO_TESTE_GERAL.md` | 61 itens de teste geral (visão ampla) |
| `ROTEIRO_QA_EMAILS.md` | 21 e-mails a validar (mais amplo que os 14 do admin) |
| `ROTEIRO_CRIAR_USUARIOS_TESTE.md` | Como criar/onboardar usuários manualmente |
| `PESQUISA_INTEGRACAO_OPERACIONAL.md` | Decisões sobre Cobli, Infosimples, integrações operacionais |
| `INBOX_COWORKER/README.md` | Protocolo de comunicação Claude ↔ Cowork |

---

## 🚦 Status atual do projeto (executivo)

```
🟢 Setup infra ......................... 100%
🟢 Fluxo financeiro (Fluxo A) .......... 100% validado end-to-end
🟡 Fluxos operacionais (B + C + D) ..... 0%   pendentes
🟡 Validação de e-mails ................ 14% (2 de 14 validados visualmente)
🟢 Marketplace de instalação ........... 100% deployado, não testado
🟢 Integração Infosimples (multas) ..... 100% deployado, não testado
🟡 Integração Cobli (tracking) ......... 0%   esperando contato comercial
🟢 Pix Automático ...................... 100% código, esperando Stripe Support liberar
```

---

## 📞 Quando precisar de mim

O Daniel é o canal único pra me ativar — ele vai dizer:
- **"Tem mensagem na inbox"** → eu leio tudo que tá em `INBOX_COWORKER/` e respondo
- **"Roda o protocolo"** → varredura completa + resumo
- **"Cria mensagem pro cowork sobre X"** → eu mesmo dropo arquivo na inbox

Tudo versionado no git. Nada se perde. 🚀

---

**Bem-vindo ao projeto! Qualquer dúvida, deixa na inbox.**
