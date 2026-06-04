# 🔍 Status + diagnóstico (e-mail, admin, execuções)

> 04/06/2026

## 1. ✅ TODAS as 24 Edge Functions estão ACTIVE no Supabase

Confirmei via API: nenhuma quebrada. Lista atual:

| Categoria | Funções |
|---|---|
| **E-mail** | send-email · send-template (v3 novo) · send-rating-request · send-renewal-reminders · send-tier-promotion |
| **Pagamento** | stripe-checkout · stripe-webhook · stripe-subscription · liberar-saque-parcial · setup-manual-payouts · installation-checkout |
| **Reserva** | create-rental-request · approve-rental-request · reject-rental-request · close-rental · damage-capture · submit-lead-quote · nova-lead |
| **Outros** | connect-onboard · consulta-multas · send-push · maintenance-trigger (v3 novo) |
| **QA/Test** | qa-criar-reserva · qa-acao · qa-listar-reservas |

**Última execução observada**: `nova-lead` retornou HTTP 200 com sucesso há ~6 horas. Sistema operacional.

## 2. 📧 Por que e-mails não chegam (causa raiz + fix)

### Causa
A Edge Function `send-email` está usando `EMAIL_FROM=onboarding@resend.dev` por default. **A Resend bloqueia esse FROM pra qualquer destinatário que não seja o e-mail dono da conta Resend.** Ou seja:
- Se você usou seu próprio e-mail no form → e-mail chegou (testa caixa de spam)
- Se foi e-mail de cliente fictício → bloqueado pela Resend (silenciosamente)

### Fix (~10 min, você precisa fazer no painel da Resend)

**Passo 1 — Verificar domínio nomadedrive.com.br**
1. Acessa https://resend.com/domains
2. Clica **Add Domain** → digita `nomadedrive.com.br`
3. A Resend gera 3 registros DNS: SPF, DKIM, DMARC
4. Você adiciona esses 3 no painel DNS do `nomadedrive.com.br` (provavelmente Registro.br ou Cloudflare)
5. Volta na Resend e clica **Verify** — leva de 5min a 24h

**Passo 2 — Atualizar EMAIL_FROM no Supabase**
1. https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/settings/functions
2. Em **Edge Function Secrets**, edita ou cria:
   ```
   EMAIL_FROM=Nomade Drive Brasil <noreply@nomadedrive.com.br>
   ```
3. Salva. Não precisa redeployar — é lido em runtime.

**Passo 3 — Testar**
- Manda uma reserva de teste pelo site usando outro e-mail (Gmail seu pessoal por ex)
- Deve chegar em 10-30 segundos
- Se cair no spam, marca como "não é spam" e adiciona `noreply@nomadedrive.com.br` à lista de remetentes confiáveis

### Bônus: ativar destinatário pra templates `team_*`
Pra templates de equipe (novo lead, KYC pra revisar, etc) sair pro seu e-mail:
```
TEAM_EMAIL_RECIPIENTS=daniel@nomadedrive.com.br,danilo@nomadedrive.com.br
```
(CSV, sem espaços. Crie esses aliases no provedor de e-mail antes.)

## 3. 🔐 Por que admin/dashboard não aparece (como acessar)

### Estado atual
- `admin.html` (4230 linhas) **existe e está completo**: Cockpit CEO, painel financeiro, KYC, leads, manutenção, parceiros etc.
- Mas precisa **estar logado** numa conta com role `admin` ou `super_admin`
- Como nunca criamos seu admin no Supabase Auth, ele te mostra "Acesso restrito" e redireciona pra login

### Fix (~5 min, você faz no Supabase)

**Passo 1 — Criar usuário**
1. https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/auth/users
2. Clica **Add user → Create new user**
3. Email: `daniel@nomadedrive.com.br` (ou outro seu)
4. Password: gera senha forte de 16+ caracteres (anota)
5. ✅ **Auto Confirm User** marcado
6. Cria

**Passo 2 — Dar role super_admin**
No SQL Editor (https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/sql):
```sql
-- Pega seu UUID
SELECT id, email FROM auth.users WHERE email = 'daniel@nomadedrive.com.br';

-- Insere role super_admin (cole o UUID na linha abaixo)
INSERT INTO public.user_roles (user_id, role, status, created_at)
VALUES ('COLE-O-UUID-AQUI', 'super_admin', 'aprovado', NOW());
```

**Passo 3 — Logar**
- Acessa https://nomadedrive.com.br/login.html
- Digita o e-mail + senha do passo 1
- Vai redirecionar automaticamente pra `admin.html`
- Agora você vê: Cockpit financeiro, leads, KYC, frota, parceiros, manutenção

### Link de acesso interno (UX)
Adicionei link discreto **"Acesso interno"** no rodapé do menu hambúrguer (não na lista pública — é só pra você ver onde clicar pra logar).

## 4. 📋 O que entreguei nas últimas sessões (resumo executivo)

| Sprint v3 | Entrega | Commit |
|---|---|---|
| **A** ✅ | Paleta Verde Floresta + 3 planos com Limite Total km | (antigo) |
| **B** ✅ | FAQ 18 perguntas + Compromissos 6 cards + Como funciona | (antigo) |
| **C** ✅ | 24 templates email (11 cliente + 13 equipe) + Edge Function send-template | `12e4204` |
| **D** ✅ | login.html admin + suporte MFA TOTP | `b0864c8` |
| **E** ✅ | Schema Parceiros + Edge Function maintenance-trigger | `dd450e7` |
| **Refactor** ✅ | SPA→multi-página + menu hambúrguer + spacing -35% | `66f12d4` |
| **Compromissos** ✅ | 6 thumbs nos cards de compromissos | (antigo) |
| **Imagens** ✅ | Fotos reais do ChatGPT processadas (16MB→700KB total) | vários |
| **UX fix** ✅ (este) | Remove breadcrumb redundante "Início · Frota" + link Admin | NOVO |

### Páginas criadas/refatoradas nesta sessão
- `index.html` — home enxuta (1065→285 linhas)
- `frota.html` — 2 carros lado a lado
- `precos.html` — 3 planos com toggle carro/período dinâmico
- `como-funciona.html` — 5 etapas + timing cards
- `publico.html` — 4 perfis (Para Quem É)
- `sobre.html` — equipe + 6 compromissos
- `contato.html` — 3 canais + formulário
- `faq.html` — 18 perguntas com filtro
- `login.html` — autenticação admin com MFA TOTP

### Edge Functions deployadas nesta sessão
- `maintenance-trigger v1` — alerta de manutenção/uso restrito
- `send-template v1` — disparo dos 24 templates v3

## 5. ⏭ Próximos passos (ordem sugerida)

| Prioridade | Tarefa | Quem faz | Tempo |
|---|---|---|---|
| 🔴 P0 | Verificar domínio Resend (e-mail destrava) | Daniel | 10-30 min |
| 🔴 P0 | Criar primeiro admin Supabase (Daniel acessa painel) | Daniel | 5 min |
| 🔴 P0 | **Abrir ME/CNPJ** — desbloqueia Stripe LIVE, Caf, Autentique, NF | Daniel | semanas |
| 🟠 P1 | Replicar visual v3 nas 4 páginas restantes (Fase 93-B) | Eu | sessão |
| 🟠 P1 | Sobre/Contato — validar conteúdo (bio Danilo, telefone, e-mail) | Daniel | 5 min |
| 🟡 P2 | Cloudflare Turnstile no reservar (anti-bot) | Daniel + eu | 30 min |
| 🟡 P2 | WhatsApp Z-API (automatiza templates pelo WhatsApp) | Daniel + eu | 1h |

## 6. 🆘 Se algo quebrar

- **Logs Edge Functions**: https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/functions
- **Logs DB**: https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/logs/postgres-logs
- **Status GitHub Pages**: https://github.com/danielrodovalho228-ship-it/nomad-drive-brasil/actions
- **DNS check** (após mexer no domínio): https://dnschecker.org/#TXT/nomadedrive.com.br
