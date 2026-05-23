# Roteiro QA — Sistema de E-mails Nomade Drive Brasil

Versão: 2026-05-23 (commit `d803285`)
Objetivo: diagnosticar e validar **todos os 18+ e-mails** ativos do sistema.

---

## 🧰 ANTES DE COMEÇAR — pré-verificação (5 min)

> Sem esses 5 itens OK, NENHUM e-mail vai sair. Faça em ordem.

### ✅ Check 1 — `EMAIL_FROM` no Supabase
1. Supabase Dashboard → **Project Settings → Edge Functions → Secrets**
2. Procure a secret `EMAIL_FROM`. Tem que existir e valer **exatamente**:
   ```
   Nomade Drive Brasil <noreply@nomadedrive.com.br>
   ```
   ⚠️ **Sem aspas**, com espaço entre `Brasil` e `<`, e `@nomadedrive.com.br` deve ser o domínio verificado.

3. Se a secret **não existir** ou estiver com `onboarding@resend.dev` (sandbox), o sistema usa o sandbox e Resend só envia pra `danielrodovalho228@gmail.com`.

### ✅ Check 2 — Domínio verificado no Resend
1. resend.com → **Domains** → `nomadedrive.com.br`
2. Status = **Verified** (verde). Se estiver **Pending** ou **Failed**, e-mails pra qualquer destinatário ≠ `danielrodovalho228@gmail.com` vão dar **403**.

### ✅ Check 3 — Migrations SQL rodadas
No SQL Editor do Supabase, rode esta query — se aparecer `t` em todas as linhas, OK:
```sql
select
  (select count(*) > 0 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='email') as profiles_email_existe,
  (select count(*) > 0 from public.profiles where email is not null) as profiles_email_backfill_ok,
  (select count(*) > 0 from information_schema.columns
    where table_schema='public' and table_name='applications' and column_name='email') as applications_email_existe,
  (select count(*) > 0 from public.applications where email is not null) as applications_email_preenchido;
```

Se `profiles_email_existe = f` → **rodar `supabase-fase24-profiles-email.sql`**.
Se `applications_email_preenchido = f` → temos um problema separado: usuários antigos não têm e-mail registrado.

### ✅ Check 4 — Edge Functions deployed
Supabase → **Edge Functions** → confirme que existem (status Active):
- `send-email`
- `stripe-checkout`
- `stripe-webhook`
- `stripe-subscription`
- `close-rental`
- `damage-capture`
- `stripe-billing-portal`
- `connect-onboard`

### ✅ Check 5 — Você está logado como admin
- Abra `nomadedrive.com.br/admin.html`
- Hero verde com seu nome aparece = OK.
- Se redirecionar pra login = sessão expirou, refaça login.

---

## 🔬 FASE 1 — Smoke test (3 min)

Vai te dizer em segundos se o pipeline está vivo.

1. Abra `/admin.html`
2. **F12 → aba Console** + **aba Network** (deixe abertas)
3. Vai em **"Cadastros e aprovações"**
4. Em um cadastro que **tem e-mail real preenchido**, mude o status:
   - "Aprovado" → "Em análise" → "Aprovado" (volta e refaz)

### 👀 O que olhar (em ordem)

#### A) Toast no canto superior direito
| Cor | Texto exemplo | Significado |
|---|---|---|
| 🔘 Cinza | "Enviando 'profile_approved'..." | Hook foi chamado, esperando resposta |
| 🟢 Verde | "E-mail 'profile_approved' enviado para X@..." | Tudo OK no app — verifique caixa do destinatário e logs Resend |
| 🔴 Vermelho | "FALHA 'profile_approved': MOTIVO" | Veja o motivo abaixo |
| ❌ Nada | (nenhum toast aparece) | Hook NÃO foi chamado — pode ser `app.email` vazio ou tabela errada |

#### B) Network → procure `send-email`
| Status code | Significa |
|---|---|
| 200 | Edge Function rodou, requisição foi pro Resend |
| 401/403 | Sessão sem JWT válido — refaça login |
| 422 | `EMAIL_FROM` mal formatado |
| 500 | Bug na Edge Function — veja logs no Supabase |
| (não aparece) | Hook não chegou a invocar — bug no JS local |

#### C) Resend → resend.com/logs
| Status | Significa |
|---|---|
| 200 | Resend aceitou — verificar `/emails` se de fato saiu |
| 403 + "validation_error" | Domínio NÃO verificado pra esse destinatário |
| 422 | `from`/`to` mal formatados |

#### D) Caixa de entrada do destinatário
- Conferir spam/lixo eletrônico também
- Se domínio Resend é novo, alguns provedores demoram alguns minutos

---

## 🗺️ FASE 2 — Tabela de gatilhos (cada e-mail, como disparar)

Use essa tabela como **catálogo**. Para cada teste:
1. Logue na conta certa
2. Faça a ação
3. Veja o toast (se admin)
4. Confira caixa do destinatário

### 📂 Categoria: ADMIN dispara
Todos esses mostram **toast** no admin.

| # | Template | Onde clicar | Pré-condição | Vai pra |
|---|---|---|---|---|
| 1 | `profile_approved` | `/admin#cadastros` → mude status pra "Aprovado" | `applications.email` preenchido | E-mail do candidato |
| 2 | `profile_rejected` | `/admin#cadastros` → status "Reprovado" + digite motivo no prompt | Idem | E-mail do candidato |
| 3 | `kyc_approved` | `/admin#documentos` → status doc pra "Aprovado" | `profiles.email` do dono do doc preenchido | E-mail do cliente |
| 4 | `kyc_rejected` | `/admin#documentos` → status pra "Recusado" + motivo | Idem | E-mail do cliente |
| 5 | `booking_confirmed_client` + `booking_confirmed_owner` | `/admin#reservas` → "Criar nova reserva" → preencher tudo → Enviar | Cliente + owner com `profiles.email` | 2 e-mails (paralelos) |
| 6 | `referral_commission_paid` | `/admin#parceiros` → mudar `commission_status` pra "paga" | Parceiro com `profiles.email` | E-mail do parceiro |
| 7 | `lead_status_updated` | `/admin#leads` → mudar status do lead | `rental_requests.client_id` → `profiles.email` | E-mail do cliente |
| 8 | `inspection_assigned_workshop` | `/admin#vistorias` → "Atribuir vistoria" → escolher veículo + oficina | Oficina (workshop.user_id) → `profiles.email` | E-mail da oficina |

### 📂 Categoria: CLIENTE dispara
**Sem toast** (cliente não tem o debug ativo).

| # | Template | Onde clicar |
|---|---|---|
| 9 | `inspection_requested_owner` | `/dashboard-cliente#checklist` → "Solicitar retirada" ou "Solicitar devolução" → submit |
| 10 | `case_opened_client` + `case_opened_team` | `/dashboard-cliente#protecao` → "Registrar ocorrência" |

### 📂 Categoria: OWNER dispara
| # | Template | Onde clicar |
|---|---|---|
| 11 | `inspection_approved_client` | `/dashboard-proprietario#locacao` → aprovar uma retirada de cliente |
| 12 | `inspection_rejected_client` | Idem, mas Recusar |

### 📂 Categoria: PROTEÇÃO dispara
| # | Template | Onde clicar |
|---|---|---|
| 13 | `case_resolved_client` | `/dashboard-protecao#triagem` → mudar status do caso pra final (aprovado/recusado) → Salvar triagem |

### 📂 Categoria: OFICINA dispara
| # | Template | Onde clicar |
|---|---|---|
| 14 | `inspection_completed_owner` | `/dashboard-oficina#fila` → mudar status da vistoria pra "aprovado" ou "recusado" |

### 📂 Categoria: STRIPE/EDGE FUNCTION dispara (automático)
Esses NÃO precisam de clique no admin. Disparam por evento Stripe.

| # | Template | Quando dispara | Disparado por |
|---|---|---|---|
| 15 | "Mensalidade confirmada" | Cliente paga 1ª mensalidade no Checkout | `stripe-checkout` (action confirm) |
| 16 | "Caução autorizada" | Cliente autoriza caução no Checkout | `stripe-checkout` (action confirm) |
| 17 | "Mensalidade #N cobrada" | Stripe cobra mensalidade recorrente OK | `stripe-webhook` (invoice.paid) |
| 18 | "Falha no pagamento" | Stripe falha em cobrar | `stripe-webhook` (invoice.payment_failed) |
| 19 | "Assinatura cancelada" | Cliente OU admin cancela subscription | `stripe-subscription` (cancel/cancel_at_end) |
| 20 | "Locação encerrada" / "Avaria em análise" | Owner aprova check-out | `close-rental` |
| 21 | "Avaria — decisão da Proteção" | Proteção aprova captura no painel | `damage-capture` |

---

## 🩺 FASE 3 — Árvore de diagnóstico

Você fez o teste e algo não saiu como esperado. Siga essa árvore:

### ❌ Cenário 1 — Não apareceu NENHUM toast no admin
**Causa provável**: hook não foi chamado.

Check:
1. F5 hard refresh (Ctrl+F5) e refaça — talvez o JS novo não carregou
2. Console mostra erro JS? (ex: `ndEmails is undefined`)
3. Veio do `script.js`? Confirme: `View Source` → procure `<script src="emails-runtime.js">`
4. Você mudou o status PRA UM dos que dispara e-mail? (ex: pra "em_analise" não dispara nada, propositalmente)

### ❌ Cenário 2 — Toast vermelho: "email_not_found"
**Significa**: O usuário/applicação alvo **não tem e-mail** registrado.

Caminho da correção (ordem):
1. Se foi `profile_approved`/`profile_rejected` via #cadastros (applications):
   - SQL Editor: `select id, full_name, email from public.applications where status = 'aprovado' order by created_at desc;`
   - Se `email` vier vazio → onboarding antigo não pegou. Pode preencher manualmente: `update public.applications set email = 'X' where id = 'Y';`
2. Se foi via #documentos (KYC) ou outra fonte que usa `profiles.email`:
   - SQL: `select id, full_name, email from public.profiles where verification_status='em_analise' limit 10;`
   - Se vier vazio → `supabase-fase24-profiles-email.sql` não rodou ou backfill falhou. Rode de novo (idempotente).

### ❌ Cenário 3 — Toast vermelho: "Resend 403: validation_error"
**Significa**: Domínio NÃO está verificado pra esse destinatário.

Check:
1. Resend → Domains → status do `nomadedrive.com.br`
2. Se estiver Verified mas ainda falha: confira se `EMAIL_FROM` aponta pra `@nomadedrive.com.br` (não outro domínio)
3. **Sandbox mode**: se EMAIL_FROM == `onboarding@resend.dev`, só envia pra `danielrodovalho228@gmail.com`

### ❌ Cenário 4 — Toast vermelho: 500 / "send_failed"
**Significa**: Edge Function `send-email` quebrou.

Check:
1. Supabase → Edge Functions → `send-email` → **Logs**
2. Veja o erro exato. Comum: `RESEND_API_KEY` faltando, ou `EMAIL_FROM` em formato inválido
3. Reset a API key do Resend se necessário (depois cadastra em Supabase secrets)

### ❌ Cenário 5 — Toast verde, mas e-mail não chega
**Significa**: Resend aceitou mas algo aconteceu no caminho.

Check:
1. Resend → Emails → procure pela entrada
   - Status "Delivered" → chegou (verifica spam)
   - Status "Bounced" → e-mail destinatário inválido / caixa cheia
   - Status "Complained" → marcado como spam
2. **Provedor lento**: novos domínios às vezes demoram 1-5 min nos primeiros envios
3. Veja **Receiving** no Resend pra ver se respondeu ao remetente

### ❌ Cenário 6 — Toast verde + Resend "Delivered" + caixa vazia
**Causa rara**: filtro de spam agressivo do destinatário.

Check:
1. Verifique pasta Spam / Lixo eletrônico
2. Provedores muito restritivos (Outlook corporativo, alguns Gmail enterprise) podem rejeitar antes de chegar
3. Tente outro destinatário (Gmail pessoal funciona quase sempre)

---

## 🧪 FASE 4 — Plano de teste "limpo" pra você fazer AGORA

**Pré-condição**: tenha 1 e-mail real seu (ex: `seuemail+teste@gmail.com` ou crie uma conta nova) que NÃO seja `danielrodovalho228@gmail.com`.

### Teste 1 — Smoke (5 min) — Confirma se PIPELINE INTEIRO funciona

1. Crie um cadastro novo:
   - Abra incógnito → `nomadedrive.com.br/onboarding-cliente.html`
   - Preencha tudo, **use o e-mail novo no campo de e-mail**
   - Submeta
2. Saia do incógnito, abra admin como `dtrodovalho40@gmail.com`
3. `/admin#cadastros` → veja a entrada nova
4. **Mude status pra "Aprovado"** com DevTools aberto
5. Anote: toast cor + texto + Network status do `send-email`
6. Confirma na caixa do e-mail novo

### Teste 2 — KYC (3 min)

1. Logado como o cliente novo, vá em `/dashboard-cliente#documentos`
2. Suba um doc qualquer (CNH, PDF dummy serve)
3. Volte ao admin, `/admin#documentos`
4. Mude o status do doc pra "Aprovado"
5. Anote: toast + caixa de e-mail

### Teste 3 — Reserva (5 min)

1. Logado como admin, `/admin#reservas`
2. "Criar nova reserva" — selecione o cliente novo + um veículo aprovado + datas
3. Veja se dispara **2 toasts** (cliente + owner)
4. Confirma 2 caixas (cliente e owner)

### Teste 4 — Stripe (10 min, exige cartão teste)

1. Como cliente, vá em `/reserva-detalhe?id=...` da reserva criada
2. Clica "Pagar mensalidade" → Stripe Checkout
3. Use `4242 4242 4242 4242`, CVC qualquer, data futura
4. Confirma e-mail "Mensalidade confirmada"
5. Volta, clica "Autorizar caução" → mesmo cartão
6. Confirma e-mail "Caução autorizada"

---

## 📋 FOLHA DE REGISTRO DO TESTE

Tira print desta tabela e preenche conforme testa:

| # | Teste | Toast | Network | Resend log | Caixa | OK? |
|---|---|---|---|---|---|---|
| 1 | profile_approved | | | | | |
| 2 | profile_rejected | | | | | |
| 3 | kyc_approved | | | | | |
| 4 | kyc_rejected | | | | | |
| 5 | booking_confirmed (2) | | | | | |
| 6 | referral_commission_paid | | | | | |
| 7 | lead_status_updated | | | | | |
| 8 | inspection_assigned_workshop | | | | | |
| 9 | inspection_requested_owner | | | | | |
| 10 | case_opened (2) | | | | | |
| 11 | inspection_approved_client | | | | | |
| 12 | inspection_rejected_client | | | | | |
| 13 | case_resolved_client | | | | | |
| 14 | inspection_completed_owner | | | | | |
| 15 | Mensalidade confirmada | | | | | |
| 16 | Caução autorizada | | | | | |
| 17 | Mensalidade #N (recorrente) | | | | | |
| 18 | Falha no pagamento | | | | | |
| 19 | Assinatura cancelada | | | | | |
| 20 | Locação encerrada (s/ avaria) | | | | | |
| 20b | Locação encerrada (c/ avaria) | | | | | |
| 21 | Avaria — decisão da Proteção | | | | | |

---

## 🆘 Quando travar — me manda

Pode copiar/colar este bloco no chat:

```
TESTE X: [nome]
TOAST: [cor + texto exato]
NETWORK send-email: [status code + response body se !=200]
RESEND log: [status + erro se houver]
CAIXA destinatário: [chegou? spam? não chegou?]
```

Com isso eu consigo te dizer EXATAMENTE onde está travando e o fix em 1 mensagem.

---

## 📚 Referências rápidas

- **Resend Dashboard**: https://resend.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Cartão teste Stripe**: `4242 4242 4242 4242` (sempre aprova)
- **Cartão teste falha**: `4000 0000 0000 9995` (recusa por saldo)
- **Cartão teste recorrência falha**: `4000 0000 0000 0341` (1ª aprova, 2ª falha)

---

Última atualização: 2026-05-23 (commit `d803285`)
