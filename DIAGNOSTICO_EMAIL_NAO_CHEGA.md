# 📧 Diagnóstico: E-mail de confirmação do cadastro não chega

> Daniel reportou (2026-05-25): "Tentei cadastro com `danieltomazrodovalho@gmail.com` mas não recebi o e-mail."

## TL;DR — causa mais provável

O **Supabase Auth** tem um servidor SMTP **default que serve só pra desenvolvimento** com 2 limitações severas:

1. **Rate limit: 4 e-mails/hora** no projeto inteiro
2. **Só envia pra e-mails da MESMA conta dona do projeto Supabase**

Se `danieltomazrodovalho@gmail.com` **não é o e-mail da conta Supabase** (provavelmente é, mas vale checar), o e-mail é silenciosamente descartado.

**Solução real:** configurar um SMTP custom (Resend recomendado — você já tem).

---

## 🔎 Checklist de diagnóstico (rodar nessa ordem)

### 1. Confirmar se o e-mail saiu mesmo

Abra o **Supabase Dashboard** → Authentication → **Logs**:
- Procure por `email confirmation sent` ou similar nas últimas horas
- Se aparecer: e-mail SAIU do Supabase → problema é deliverability (spam ou bloqueio)
- Se NÃO aparecer: bateu rate limit ou erro silencioso → ver próximo passo

### 2. Conferir Email Provider settings

Supabase Dashboard → Project Settings → **Authentication** → **Email Templates** → role abaixo até **"SMTP Settings"**:
- Se está mostrando **"Built-in email service"** → é o default (rate limit baixo)
- Se está com SMTP custom configurado (host = `smtp.resend.com`) → pula pro passo 4

### 3. (PROVÁVEL FIX) Configurar Resend como SMTP custom

#### 3.1. No Resend (resend.com)
1. Crie um **API Key** (Dashboard → API Keys → Create)
2. Vá em **Domains** → Add → cadastre `nomadedrive.com.br`
3. Adicione os DNS records (SPF, DKIM, MX) no seu provedor de domínio
4. Aguarde verificação (~10 min após DNS propagar)

#### 3.2. No Supabase Dashboard
**Authentication** → **Project Settings** → **SMTP Settings** → **Enable Custom SMTP**:

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) ou `587` (TLS) |
| Username | `resend` |
| Password | A **API Key** do Resend (re_...) |
| Sender email | `noreply@nomadedrive.com.br` (precisa ser do domínio verificado) |
| Sender name | `Nomade Drive Brasil` |

Salvar. **Pronto** — todos os e-mails de auth (signup, recovery, magic link) passam pelo Resend.

### 4. Verificar deliverability

Mesmo com SMTP custom, e-mails podem cair em spam por:
- **SPF/DKIM/DMARC** ausentes ou incorretos no DNS — Resend mostra status na tela de Domains
- **Domínio novo** sem reputação — primeiros e-mails vão pra spam até a reputação criar
- **Conteúdo do template** parecer phishing (links suspeitos, palavras como "verifique URGENTE")

Teste:
- Mande pra **gmail** (tem o melhor filtro) → se chegar mesmo na spam, deliverability OK
- Mande pra **outlook/hotmail** → confirma SPF/DKIM
- Use [https://mail-tester.com](https://mail-tester.com) — pontuação 8+/10 = OK

### 5. Verificar template do Auth

Supabase Dashboard → Authentication → **Email Templates** → **Confirm signup**:
- `{{ .ConfirmationURL }}` deve estar presente
- Se você customizou e quebrou a variável, link não funciona
- Default funciona — só edite se souber o que tá fazendo

---

## 🚨 Workarounds enquanto não configura SMTP custom

### Opção A: Confirmar manualmente como admin (só pra testes)

No Supabase SQL Editor:
```sql
-- Marca o e-mail como confirmado manualmente (só pra testes)
update auth.users
set email_confirmed_at = now()
where lower(email) = lower('danieltomazrodovalho@gmail.com')
  and email_confirmed_at is null;

-- Ver se funcionou
select id, email, email_confirmed_at
from auth.users
where lower(email) = lower('danieltomazrodovalho@gmail.com');
```

Depois disso, login com a senha que você usou no cadastro funciona normal.

### Opção B: Desabilitar confirmação de e-mail (NÃO recomendado em produção)

Supabase Dashboard → Authentication → Providers → **Email** → desliga **"Confirm email"**.
Risco: qualquer um pode criar conta com qualquer e-mail (incluindo o seu) sem provar que é dono.

---

## ✅ Como a tela de cadastro foi melhorada (Fase 58d)

O novo `cadastro.html` mostra após cadastro com sucesso:
- ✉️ Ícone animado
- E-mail do cadastro em destaque
- **Dica visual amarela** com checklist:
  - "Verifique a pasta de spam"
  - "Confira se o e-mail está correto"
- 📧 Botão **"Reenviar e-mail"** — chama `supabase.auth.resend({type:'signup'})`
- ✏️ Botão **"Corrigir e-mail"** — volta pro formulário pré-preenchido com o e-mail (Daniel pode editar e re-submeter)
- Link "Já recebeu e confirmou? Entrar agora"

**Mas a UX só resolve a fricção do usuário** — o problema raiz (e-mail não chegando) precisa do SMTP custom configurado no Supabase Dashboard.
