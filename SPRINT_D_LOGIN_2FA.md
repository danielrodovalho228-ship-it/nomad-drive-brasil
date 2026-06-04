# 🔐 Sprint D — Login admin + 2FA TOTP

> Aplicado: 04/06/2026
> Arquivo novo: `login.html` (raiz)
> Edição: `admin.html` (gate aponta pro novo login)

## 🎯 O que entregou

1. **`login.html`** — página dedicada de acesso admin com:
   - Step 1: e-mail + senha (signInWithPassword via Supabase Auth)
   - Step 2: TOTP 6 dígitos (se conta tem MFA habilitado — autodetecta via `mfa.getAuthenticatorAssuranceLevel`)
   - Step 3: verifica `isAdmin()` antes de redirecionar; se logou mas não é admin, faz signOut + mostra erro
   - Auto-submit quando completa 6 dígitos do OTP
   - Suporta query param `?redirect=destino.html` (default `admin.html`)
   - Visual em paleta v3 (Verde Floresta + Champagne)

2. **`admin.html` corrigido** — gate de acesso agora aponta pra `login.html?redirect=admin.html` em vez do arquivo arquivado `_arquivo_carsharing/auth/login.html` (que estava quebrado desde Fase 92-C).

3. **Compatibilidade preservada**: usa o `window.ndAuth` (helper de `auth.js`) já existente — não duplica lógica. Só estende com fluxo MFA.

## ⚙ Como ativar 2FA pra uma conta admin

O Supabase Auth tem MFA TOTP nativo. Pra exigir 2FA num admin:

### Passo 1 — Habilitar MFA no projeto (uma vez)

1. Acessa [Supabase Dashboard → Authentication → Sign In / Up → Multi-Factor Auth](https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/auth/providers)
2. Em **MFA Enforcement**, marca:
   - ✅ TOTP (Time-based One-Time Password)
3. Salva

### Passo 2 — Cada admin enrola seu app autenticador

> ⚠ A UI de **enroll** ainda não foi criada (escopo da Fase D-2, abaixo). Por enquanto, é manual pelo Supabase Dashboard ou via Studio.

**Caminho fácil agora** (1x por admin):

1. Admin loga uma vez sem 2FA em `login.html`
2. Abre console do navegador na `admin.html` e roda:
   ```js
   var c = window.ndAuth.client();
   c.auth.mfa.enroll({ factorType: 'totp' }).then(r => {
     console.log('QR Code (data URL):', r.data.totp.qr_code);
     console.log('Factor ID:', r.data.id);
     // Cola o QR Code numa imagem ou escaneia direto
     // Depois roda:
     // c.auth.mfa.challenge({ factorId: r.data.id }).then(...)
     // c.auth.mfa.verify({ factorId, challengeId, code: '123456' })
   });
   ```
3. Escaneia o QR no Google Authenticator / 1Password / Authy
4. Pega o código de 6 dígitos do app e confirma via:
   ```js
   c.auth.mfa.challenge({ factorId: 'uuid-do-step-acima' }).then(ch => {
     c.auth.mfa.verify({
       factorId: 'uuid-do-step-acima',
       challengeId: ch.data.id,
       code: 'INSIRA-AQUI'
     }).then(console.log);
   });
   ```
5. Próximo login no `login.html`, automaticamente vai pedir o OTP.

**Versão UI** (a fazer — Fase D-2): criar `admin.html#seguranca` com botão "Habilitar 2FA" que faz tudo isso visualmente.

### Passo 3 — Exigir AAL2 (Authentication Assurance Level 2)

Por padrão, o Supabase Auth deixa o usuário escolher se quer habilitar MFA. Pra **forçar 2FA em contas admin**:

1. Cria policy RLS que exige `auth.jwt() ->> 'aal' = 'aal2'` em tabelas/views sensíveis (ex: `user_roles`, `profiles` de outros usuários, `expenses`, etc)
2. Ou no nível do app: o `login.html` já checa `getAuthenticatorAssuranceLevel()` e mostra o step OTP — bastará impor enrollment via UI.

## 👤 Como criar o primeiro admin (sem ME ainda)

Daniel ainda não tem ME/CNPJ, mas pode criar admin pra operação interna.

### Via Supabase Dashboard (recomendado — 2 minutos)

1. Acessa [Authentication → Users](https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/auth/users)
2. Clica **Add user** → **Create new user**
3. Email: `daniel@nomadedrive.com.br` (ou qualquer email seu)
4. Password: gera uma senha forte (16+ caracteres)
5. **Auto Confirm User**: ✅ ligado
6. Cria.

### Depois adicionar role admin via SQL

No Supabase SQL Editor:

```sql
-- Pega o UUID do usuário recém-criado
SELECT id, email FROM auth.users WHERE email = 'daniel@nomadedrive.com.br';

-- Insere role admin aprovada (substitua UUID abaixo)
INSERT INTO public.user_roles (user_id, role, status, created_at)
VALUES (
  'COLE-O-UUID-AQUI',
  'super_admin',
  'aprovado',
  NOW()
);
```

Roles válidos: `client`, `owner`, `referral_partner`, `workshop`, `protection_partner`, `admin`, `super_admin`. Pro Daniel: **super_admin** (acesso total). Pra Danilo: **admin** (sem alguns botões críticos como deletar dados).

### Verificar que funcionou

```sql
-- Lista admins atuais
SELECT u.email, r.role, r.status, r.created_at
FROM public.user_roles r
JOIN auth.users u ON u.id = r.user_id
WHERE r.role IN ('admin', 'super_admin')
ORDER BY r.created_at;
```

## 🧪 Como testar

1. **Sem admin** (estado atual): abre `https://nomadedrive.com.br/admin.html` → vê gate "Acesso restrito" → clica "Entrar" → vai pra `login.html` ✓
2. **Login wrong**: digita senha errada → erro "E-mail ou senha incorretos" ✓
3. **Login certo (sem MFA)**: digita certo → "Verificando…" → redireciona pra `admin.html` ✓
4. **Login certo (com MFA)**: digita certo → mostra Step 2 → digita 6 dígitos do app autenticador → redireciona ✓
5. **Logou mas não é admin**: digita certo mas é conta de cliente → "Esta conta não tem permissão de administrador" + logout automático ✓

## 🔒 Considerações de segurança

| Item | Status |
|---|---|
| Senha não trafega em URL | ✅ POST via SDK |
| Brute-force protection | ⚠ Default do Supabase Auth (rate-limit por IP) — pode endurecer com Cloudflare Turnstile (Fase 96) |
| Session timeout | ✅ Default Supabase = 1h access token + refresh automático |
| HTTPS-only | ✅ GitHub Pages força HTTPS |
| `meta robots noindex` em login.html | ✅ Adicionado |
| Logs de auditoria de login | ⚠ Supabase loga em `auth.audit_log_entries`, mas não há painel admin pra ver isso (criar UI futuramente) |
| 2FA obrigatório pra super_admin | ⚠ Falta enforcement — implementar policy `auth.jwt() ->> 'aal' = 'aal2'` em tabelas críticas |

## 📋 Tasks relacionadas

- ✅ Sprint D (esta) — login.html + suporte MFA TOTP no fluxo
- ⏸ Sprint D-2 (futura) — UI dentro do admin.html pra enrollment do TOTP (botão "Habilitar 2FA" que mostra QR)
- ⏸ Sprint D-3 (futura) — policy RLS exigindo AAL2 em tabelas sensíveis
- ⏸ Fase 96 — Cloudflare Turnstile no login.html pra anti-brute-force
- ⏸ Painel de logs de auditoria de login (dentro de admin.html#seguranca)
