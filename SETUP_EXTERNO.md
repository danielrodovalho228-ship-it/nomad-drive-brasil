# 🔧 Setup Externo — Bloqueadores pra ir pra produção

> **Pra:** Daniel + Danilo
> **Data:** 2026-05-24
> **Status:** 95% código pronto. Falta só esses 5 setups externos.

---

## 📋 Checklist resumido (ordem sugerida)

- [ ] **1. Resend domain verification** — 30min (você no Resend)
- [ ] **2. Stripe Connect BR ativado** — 10min (você no Stripe Dashboard)
- [ ] **3. VAPID keys (push notifications)** — 5min (você no terminal)
- [ ] **4. CNPJ da ME registrado** — 15 dias úteis (contador + Danilo)
- [ ] **5. Stripe live mode** — 30min (após validação)
- [ ] **6. Cobli rastreador** — depende contrato (opcional, V1 sem)

---

## 1️⃣ Resend Domain Verification (PRIORIDADE)

**Por que importa:** hoje todos e-mails saem de `onboarding@resend.dev` (modo sandbox). Só **você** recebe (a conta dona da API key). Pra mandar pra clientes reais, precisa verificar o domínio.

### Passo a passo

1. **Acessa:** https://resend.com/domains
2. **Clica** "Add Domain"
3. **Digita:** `nomadedrive.com.br`
4. **Escolhe região:** "São Paulo (br-sao-1)" pra latência baixa BR
5. **Copia os 3 DNS records** que aparecem:
   - **MX** record (mail server)
   - **TXT SPF** (sender policy)
   - **TXT DKIM** (signing key)
6. **Vai no Registro.br** (ou onde você comprou o domínio):
   - Login → Painel → Domínios → `nomadedrive.com.br` → DNS
7. **Adiciona os 3 records** que copiou
8. **Volta no Resend** → clica "Verify" (pode demorar 5-30min de propagação DNS)
9. **Quando ficar verde** ✅, copia o "From email" sugerido: `noreply@nomadedrive.com.br`

### Atualizar o Supabase

10. **Supabase Dashboard** → Project Settings → Edge Functions → **Secrets**
11. **Adiciona/atualiza:**
    ```
    EMAIL_FROM = Nomade Drive Brasil <noreply@nomadedrive.com.br>
    ```
12. **Redeploy** qualquer função (pra pegar o secret novo):
    ```bash
    supabase functions deploy send-email
    ```

### Teste

13. Cria um lead na landing usando um e-mail **externo** (Gmail/Outlook que não é o de você)
14. Confere se chegou e tem **"Nomade Drive Brasil <noreply@nomadedrive.com.br>"** como remetente

### Troubleshooting

❌ **"Domain verification failed"** → DNS demora pra propagar, espera 15min e tenta de novo
❌ **"E-mail vai pra spam"** → Resend recomenda adicionar **DMARC record** depois:
```
_dmarc.nomadedrive.com.br TXT "v=DMARC1; p=none; rua=mailto:contato@nomadedrive.com.br"
```

---

## 2️⃣ Stripe Connect Brasil

**Por que importa:** sem Connect ativo, owner não consegue receber transfer automático quando cliente paga. Hoje funciona em modo "Separate Charges + Transfers manual" (Sprint 2.6), mas Connect Express simplifica MUITO.

### Passo a passo

1. **Acessa:** https://dashboard.stripe.com/test/connect
2. **Clica:** "Get started with Connect"
3. **Escolhe:** "Express" (não Standard nem Custom)
4. **Configura:**
   - Plataforma name: `Nomade Drive Brasil`
   - Country: Brasil
   - Industry: `Marketplace`
   - Description: `Plataforma de intermediação de aluguel mensal de carros`
   - URL: `https://nomadedrive.com.br`
5. **Branding:**
   - Logo: faz upload do logo (caminho: `images/logo-nomade-drive.jpg`)
   - Cor primária: `#145f3e` (verde Nomade)
   - Cor de fundo: `#ffffff`
6. **Email de suporte:** `contato@nomadedrive.com.br`
7. **Salva**

### Atualizar webhook

8. **Connect → Webhooks** → clica no endpoint do `stripe-webhook`
9. **Listen to events on:** marca ambos:
   - ☑ "Self"
   - ☑ "Connected accounts"
10. **Events** — confirma que tem:
   - ☑ `account.updated` (CRÍTICO pra Fase 45b)
   - ☑ `payment_intent.succeeded`
   - ☑ `payment_intent.payment_failed`
   - ☑ `charge.refunded`
   - ☑ `customer.subscription.created/updated/deleted`
   - ☑ `invoice.paid`
   - ☑ `invoice.payment_failed`
   - ☑ `payout.paid/failed/canceled`

### Teste

11. **Cria um owner teste** no app → vai em **Recebimentos** → clica "Configurar conta de recebimento"
12. **Stripe abre wizard** Express onboarding → preenche **com dados de teste**:
   - CPF teste BR: `111.111.111-11`
   - Banco: qualquer (modo test)
13. **Volta pro dashboard** → banner Connect some, status='ativo'
14. **Webhook recebe `account.updated`** → e-mail "Conta verificada" chega (Fase 45b)

---

## 3️⃣ VAPID Keys (Push Notifications)

**Por que importa:** push real só funciona com VAPID keys próprias. Hoje tem placeholder no código que precisa ser substituído.

### Passo a passo (5 minutos)

1. **Abre terminal/PowerShell**
2. **Roda:**
   ```bash
   npx web-push generate-vapid-keys
   ```
3. **Vai aparecer algo tipo:**
   ```
   Public Key:  BNxK7H9Fk9...
   Private Key: 8aZP3R7v...
   ```

### Configurar no app

4. **Supabase Dashboard → Secrets**, adiciona:
   ```
   VAPID_PUBLIC_KEY  = BNxK7H9Fk9...
   VAPID_PRIVATE_KEY = 8aZP3R7v...
   VAPID_SUBJECT     = mailto:contato@nomadedrive.com.br
   ```
5. **No frontend** (`sw.js` ou onde tem o `applicationServerKey`):
   - Substitui a public key placeholder pela sua
6. **Redeploy:**
   ```bash
   supabase functions deploy send-push
   ```

### Teste

7. Cliente clica "Ativar notificações" no perfil → permite no browser
8. Admin marca veículo como `status='red'` → push chega no celular do cliente

---

## 4️⃣ CNPJ da ME

**Por que importa:** sem CNPJ, NotaZZ NF eletrônica está bloqueado (Sprint 3). E sem NF, escala fica difícil.

### Status atual

⏳ **Em decisão** com você + Danilo. Veja:
- `GUIA_MIGRACAO_ME.md` — passo a passo abertura
- `ESTRUTURA_FINANCEIRA_SOCIETARIA.md` — divisão 60/40
- `APRESENTACAO_SOCIEDADE.html` — simulador interativo

### Quando CNPJ sair

Me manda o CNPJ + razão social que eu atualizo:
- `termos.html` cláusula 1.0
- `admin.html` Cockpit Fiscal MEI → Simples Nacional
- `supabase-fase48-empresa-me.sql` com dados reais
- Footer de e-mails com CNPJ
- Stripe Connect master com CNPJ real
- Integração NotaZZ (Sprint 3 destrava)

---

## 5️⃣ Stripe Live Mode

**Pré-requisitos (tudo verde):**
- ✅ Connect BR ativado
- ✅ Resend domain verificado
- ✅ VAPID keys
- ✅ Webhook configurado
- ✅ Smoke test E2E passou em test mode
- ⏳ CNPJ disponível (opcional pro test mode, **obrigatório** pro live)

### Passo a passo

1. **Dashboard Stripe** → toggle no topo: **Test mode** → **Live mode**
2. **Ative** cobranças (precisa CNPJ + dados PJ)
3. **Webhook live** → cria novo endpoint apontando pra `stripe-webhook` (mesmo URL, mas precisa novo signing secret)
4. **Atualiza** `STRIPE_WEBHOOK_SECRET` nos secrets do Supabase
5. **Atualiza** `STRIPE_SECRET_KEY` de `sk_test_...` → `sk_live_...`
6. **Redeploy** todas as Edge Functions Stripe:
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-subscription
   supabase functions deploy stripe-billing-portal
   supabase functions deploy approve-rental-request
   supabase functions deploy connect-onboard
   ```

### Smoke test live

7. Faz 1 locação real (você mesmo) com cartão real (pode ser seu)
8. Verifica:
   - Pagamento processou
   - Transfer pro Connect account funcionou
   - Webhook gravou tudo no DB
   - E-mails chegaram

---

## 6️⃣ Cobli Rastreador (OPCIONAL pra V1)

**Por que pode adiar:** V1 funciona sem rastreador. Mas pra confiança/seguro, é importante adicionar quando escalar.

### Quando contratar

- Já tem 3+ veículos ativos
- Já teve 1 caso de "onde está o carro?"
- Cliente exigiu pra alugar (raro)

### Como integrar

Me passa:
- Cobli API key
- ID device por veículo
- Eu implemento sync automático em `vehicle_health_latest`

---

## 🚨 Erros comuns

### "Resend respondeu 422 invalid_email"
→ Domain ainda não verificado ou EMAIL_FROM com domínio errado.

### "Stripe Connect: signed up for Connect needed"
→ Connect não foi ativado no dashboard da plataforma. Volta no passo 2.

### "Webhook signature verification failed"
→ STRIPE_WEBHOOK_SECRET no Supabase está desatualizado. Pega novo secret no endpoint config do Stripe.

### "Push notification não chega"
→ VAPID keys não configuradas OU service worker registrado errado. Confere `sw.js` registration no console do browser.

---

## ✅ Quando tudo verde

Status final esperado:
```
✅ Resend domain verified — e-mails de noreply@nomadedrive.com.br
✅ Stripe Connect BR ativo — owners podem conectar
✅ VAPID keys configured — push notifications funcionando
✅ CNPJ da ME ativo — NotaZZ Sprint 3 destravado
✅ Stripe live mode — pagamentos reais
✅ Smoke test E2E passou
```

**Próximo:** primeira locação real → champagne 🍾

---

## 📞 Quem ajuda em cada item

| Item | Quem |
|---|---|
| Resend domain | Você + Registro.br (DNS) |
| Stripe Connect | Você (Dashboard Stripe) |
| VAPID keys | Você (terminal local) |
| CNPJ | Danilo + contador |
| Stripe live | Você (após CNPJ + smoke test) |
| Cobli | Você (contratar) |

---

## ⏱️ Timeline realista

- **Hoje:** Resend domain (30min) + VAPID keys (5min)
- **Esta semana:** Stripe Connect BR (10min) + contador escolhido
- **Próximas 2 semanas:** CNPJ saindo + smoke test E2E
- **Semana 4:** Stripe live mode + 1ª locação real

🎯 **Meta:** 1 mês pra ir pra produção de verdade.
