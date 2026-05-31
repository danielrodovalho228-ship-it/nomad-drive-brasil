# 🧪 QA Test Plan — Nomade Drive Brasil (`/nova/`)

> **Pra:** equipe de QA
> **Versão:** 1.1 — 30/Maio/2026
> **Escopo:** fluxo end-to-end do carsharing por hora/dia (modo Stripe TEST)
> **Tempo estimado:** 30-45 min pra rodar todos os fluxos

---

## 📌 Mudanças desde v1.0 (rodada anterior do QA)

**Bugs corrigidos e em produção (`https://nomadedrive.com.br`):**
- ✅ **F4-A** Slot ocupado agora dá feedback visual claro: shake animation no slot + ✕ vermelho + toast no topo da tela
- ✅ **F4-B** Botão "Ver próximo disponível →" funciona (era silencioso por causa de `onclick` inline; agora usa `addEventListener`)
- ✅ **F4 polish** Alerta de conflito tem link clicável real "Ver próximo disponível →" (antes só citava em texto)
- ✅ **E8** Data de retirada no passado: bloqueado por 2 camadas — `.min` no input HTML5 (calendário nativo não deixa selecionar) + handler `change` (se forçar via DevTools, mostra toast e reseta pra hoje)
- ✅ **Mini-bug** Console QA "Minhas reservas" agora lista via Edge Function `qa-listar-reservas` (antes RLS bloqueava a anon key)
- ✅ **Admin painel de Leads** `escapeHtml` local no `renderLeadCard` corrigido — se você viu "lista vazia mas KPIs corretos" na rodada anterior, faz `Ctrl+Shift+R` e re-loga
- ✅ **Atalho** Botão flutuante "🧪 QA Console" no canto inferior direito do `admin.html` linka direto pro `qa-test.html`

**Em paralelo (não afeta seus testes mas saber é bom):** corrigimos um vazamento de RLS em 15 views internas do banco (segurança LGPD). Já está em produção, não muda nada visualmente.

---

## 📋 Sumário

1. [Contas de teste disponíveis](#1-contas-de-teste-disponíveis)
2. [URLs principais](#2-urls-principais)
3. [Cartões de teste Stripe](#3-cartões-de-teste-stripe)
4. [FLUXO 1 — Reserva completa (happy path)](#fluxo-1--reserva-completa-happy-path)
5. [FLUXO 2 — Pagamento recusado](#fluxo-2--pagamento-recusado)
6. [FLUXO 3 — Cartão 3D Secure](#fluxo-3--cartão-3d-secure)
7. [FLUXO 4 — Conflito de horário](#fluxo-4--conflito-de-horário)
8. [FLUXO 5 — Magic Link de cadastro](#fluxo-5--magic-link-de-cadastro)
9. [FLUXO 6 — Lead via formulário público](#fluxo-6--lead-via-formulário-público)
10. [FLUXO 7 — Lead B2B (parceiros)](#fluxo-7--lead-b2b-parceiros)
11. [Cenários de erro pra cobrir](#cenários-de-erro-pra-cobrir)
12. [Checklist visual completo](#checklist-visual-completo)
13. [Como debugar](#como-debugar)
14. [Como reportar bugs](#como-reportar-bugs)

---

## 1. Contas de teste disponíveis

Já temos **8 contas** criadas no Supabase Auth, cada uma com role específico. **Use a coluna "Pra que serve" pra escolher.**

### Contas QA dedicadas (e-mails corporativos `@nomadedrive.com.br`)

| # | E-mail | Nome | Role | Pra que serve |
|---|---|---|---|---|
| 1 | `qa-cliente@nomadedrive.com.br` | Carlos Silva Teste | `client` | Testar fluxo cliente (reservar, pagar, devolver) |
| 2 | `qa-proprietario@nomadedrive.com.br` | Marcos Pereira Teste | `owner` | Testar dashboard proprietário (aprovar reserva, ver ganhos) |
| 3 | `qa-parceiro@nomadedrive.com.br` | Juliana Costa Teste | `referral_partner` | Testar programa indicações |
| 4 | `qa-protecao@nomadedrive.com.br` | Patrícia Souza Teste | `protection_partner` | Testar fluxo Shield/proteção |
| 5 | `qa-oficina@nomadedrive.com.br` | Roberto Lima Teste | `workshop` | Testar painel oficina credenciada |

### Contas pessoais do Daniel (recebe e-mails reais no Gmail)

| # | E-mail | Nome | Role | Pra que serve |
|---|---|---|---|---|
| 6 | `dtrodovalho40@gmail.com` | Daniel Tomaz Rodovalho | `super_admin` | **Admin do sistema** — acesso total a `/admin.html` |
| 7 | `danielrodovalho228@gmail.com` | Daniel Rodovalho | `client` | Cliente real do Daniel (recebe e-mails de QA no Gmail) |
| 8 | `danieltomazrodovalho@gmail.com` | Daniel Rodovalho | `client` | Cliente backup do Daniel |

### Caixa institucional (recebe notificações de admin)

| E-mail | Pra que serve |
|---|---|
| `contato@nomadedrive.com.br` | Recebe todas as notificações de novo lead, novo cadastro, reserva paga (configurado em `ADMIN_NOTIFY_EMAIL`) |

### 🔑 Como fazer login (sem senha — magic link)

1. Vai em `https://nomadedrive.com.br/login.html`
2. Digita o e-mail da conta de teste
3. Clica "Entrar com magic link"
4. Abre o e-mail e clica no link → entra logado direto

> ⚠️ Pras contas `@nomadedrive.com.br`, o magic link vai pra inbox do Hostinger (`webmail.hostinger.com`).
> Pras contas `@gmail.com`, vai direto pro Gmail do Daniel.

---

## 2. URLs principais

### 🌐 Site público (preview)
| URL | Pra que serve |
|---|---|
| https://nomadedrive.com.br/nova/ | Home estilo Zipcar |
| https://nomadedrive.com.br/nova/como-funciona.html | Carousel "Como funciona" |
| https://nomadedrive.com.br/nova/precos.html | Planos com toggle Mensal/Anual |
| https://nomadedrive.com.br/nova/parceiros.html | B2B (condomínio/shopping/hospital) |
| https://nomadedrive.com.br/nova/empresas.html | B2B corporativo |
| https://nomadedrive.com.br/nova/estudantes.html | Plano universitário |
| https://nomadedrive.com.br/nova/motoristas-app.html | Uber/99/iFood |
| https://nomadedrive.com.br/nova/carro.html?carro=tracker | Detalhe carro (cobalt/hb20/renegade tbm) |

### 🧪 Console QA (ferramenta principal de teste)
| URL | Pra que serve |
|---|---|
| **https://nomadedrive.com.br/nova/qa-test.html** | 🎯 **Console interativo de QA** — começa por aqui |
| https://nomadedrive.com.br/nova/qa-pago.html | Tela success do Stripe (auto-confirma pagamento) |

### 🔐 Áreas autenticadas
| URL | Pra quem |
|---|---|
| https://nomadedrive.com.br/login.html | Todos |
| https://nomadedrive.com.br/admin.html | Apenas `super_admin` |
| https://nomadedrive.com.br/dashboard-cliente.html | `client` |
| https://nomadedrive.com.br/dashboard-proprietario.html | `owner` |
| https://nomadedrive.com.br/dashboard-parceiro.html | `referral_partner` |
| https://nomadedrive.com.br/dashboard-oficina.html | `workshop` |
| https://nomadedrive.com.br/dashboard-protecao.html | `protection_partner` |

---

## 3. Cartões de teste Stripe

⚠️ **Sistema está em modo TEST.** Nenhuma cobrança real acontece.

| Cartão | Comportamento | Quando usar |
|---|---|---|
| `4242 4242 4242 4242` | ✅ Aprova na hora | Fluxo happy path |
| `4000 0027 6000 3184` | ⚠️ Pede 3D Secure | Testar autenticação adicional |
| `4000 0000 0000 0002` | ❌ Recusado | Testar erro de cartão |
| `4000 0000 0000 9995` | ❌ Sem saldo | Testar erro de saldo |
| `4000 0000 0000 0341` | ❌ Cartão expirado | Testar erro de validade |

**Dados fixos pra todos os cartões:**
- **Validade:** qualquer data futura (ex: `12/30`)
- **CVC:** qualquer 3 dígitos (ex: `123`)
- **CEP/ZIP:** qualquer (ex: `00000`)
- **Nome:** qualquer

---

## FLUXO 1 — Reserva completa (happy path)

**Objetivo:** validar fluxo principal sem erros. Reserva → pagamento → cofre → devolução → avaliação.

**Conta sugerida:** `danielrodovalho228@gmail.com` (recebe e-mails no Gmail).

### Passos

| # | Ação | URL | Resultado esperado |
|---|---|---|---|
| 1 | Abrir console QA | https://nomadedrive.com.br/nova/qa-test.html | Página carrega, formulário visível |
| 2 | Preencher dados: e-mail `danielrodovalho228@gmail.com`, nome `QA Tester`, carro `Chevrolet Tracker`, duração `6 horas` | Console QA | Datetime auto-preenchido com +1h |
| 3 | Clicar **"Criar reserva + Ir pro Stripe Checkout"** | Console QA | Log verde: `{ ok: true, booking_id: ..., amount_brl: 114, stripe_checkout_url: ... }`. Nova aba abre Stripe. |
| 4 | No Stripe: digitar `4242 4242 4242 4242`, validade `12/30`, CVC `123` | Stripe Checkout | Botão "Pay R$ 114,00" habilita |
| 5 | Clicar **"Pay"** | Stripe Checkout | Redireciona pra `qa-pago.html?booking=...&session_id=...` |
| 6 | Aguardar 2s na página de sucesso | qa-pago.html | **Código do cofre GIGANTE em amarelo** aparece (4 dígitos) |
| 7 | Verificar e-mail no Gmail | Inbox | 📧 *"✅ Reserva confirmada — senha XXXX"* (com logo Nomade) |
| 8 | Voltar ao console QA (link "Próximo passo") | qa-test.html | Booking ID preservado no campo |
| 9 | Clicar **"🔓 Desbloquear cofre"** | Console QA | Log verde, e-mail enviado |
| 10 | Verificar e-mail | Inbox | 📧 *"🚗 Cofre aberto — boa viagem!"* |
| 11 | Clicar **"🏁 Devolver carro"** | Console QA | Log verde com `duration_real` calculada |
| 12 | Verificar e-mail | Inbox | 📧 *"🏁 Reserva finalizada — duração real X horas"* |
| 13 | Escolher 5 estrelas + comentário "Tudo perfeito" | Console QA | |
| 14 | Clicar **"⭐ Enviar avaliação"** | Console QA | Log verde |
| 15 | Verificar e-mail do admin | `contato@nomadedrive.com.br` | 📧 *"[QA] Avaliação ★★★★★ — QA-XXXXXX-XXXX"* |

### ✅ Critérios de aceitação
- [ ] 4 e-mails chegaram no Gmail (passos 7, 10, 12) + 1 e-mail no admin (passo 15)
- [ ] Código do cofre é o mesmo no email e na página `qa-pago.html`
- [ ] Booking aparece em `qa_bookings` com status `completed`
- [ ] Rating salvo na coluna `rating` da tabela

---

## FLUXO 2 — Pagamento recusado

**Objetivo:** validar que sistema lida bem com cartão recusado.

### Passos
1. Criar reserva normal (mesmo do Fluxo 1, passos 1-3)
2. No Stripe, digitar `4000 0000 0000 0002`
3. Clicar "Pay" → Stripe mostra erro **"Your card was declined"**
4. Voltar pro console (botão "Voltar" do navegador)
5. Booking deve ficar com status `pending_payment` no banco
6. Tentar de novo com cartão válido `4242 4242 4242 4242`

### ✅ Critérios
- [ ] Nenhum e-mail é enviado quando cartão é recusado
- [ ] Booking continua com status `pending_payment` (não vai pra `confirmed`)
- [ ] Possível pagar a mesma reserva depois com outro cartão

---

## FLUXO 3 — Cartão 3D Secure

**Objetivo:** validar autenticação adicional 3DS (frequente no Brasil).

### Passos
1. Criar reserva normal
2. No Stripe: cartão `4000 0027 6000 3184`
3. Clicar "Pay" → Stripe abre **modal 3DS** com botões `Complete authentication` ou `Fail authentication`
4. Clicar **"Complete authentication"**
5. Aguarda redirect → `qa-pago.html` com código do cofre

### ✅ Critérios
- [ ] Modal 3DS abre antes da confirmação
- [ ] Fluxo completa normalmente após autorização
- [ ] Se clicar **"Fail authentication"** → cobrança falha, sem e-mail enviado

---

## FLUXO 4 — Conflito de horário

**Objetivo:** validar que sistema não permite reservar carro já alugado.

### Passos
1. Abrir `/nova/reservar.html?carro=tracker`
2. Mudar **data retirada** pra `2026-05-31`
3. Observar slots de horário:
   - Slot **08:00** deve ficar **cinza escuro** (ocupado mockado)
   - Slot **09:00** também cinza
   - Slot **14:00** também cinza
4. Clicar no slot **08:00** → 3 reações simultâneas:
   - Slot dá um **"shake"** (vibra horizontalmente por 0.5s)
   - **Toast vermelho** no topo: *"🚫 08:00 — horário ocupado por outro usuário"*
   - **Banner vermelho** com link clicável **"Ver próximo disponível →"** sublinhado
5. Escolher horário **11:00** + duração **6 horas** (passa por 14:00)
6. Banner vermelho aparece: *"Conflito de horário"*
7. Botão **"Continuar →"** fica desabilitado
8. Clicar link **"Ver próximo disponível →"** → JS sugere 15:00 automaticamente

### ✅ Critérios
- [ ] Slots ocupados visualmente distinguíveis (cinza escuro + ✕)
- [ ] Slot ocupado: shake + toast + banner com link
- [ ] Banner de conflito aparece auto quando duração colide
- [ ] Botão "Continuar" desabilitado durante conflito
- [ ] Link "Ver próximo disponível →" no banner é clicável e funciona

---

## FLUXO 5 — Magic Link de cadastro

**Objetivo:** validar criação automática de conta + login sem senha.

**Conta sugerida:** novo email que NÃO existe ainda (ex: `qa-teste-novo+${timestamp}@example.com` ou criar uma conta nova no Gmail).

### Passos
1. Abrir `/nova/index.html#cadastro`
2. Preencher form:
   - Nome: `QA Teste Magic`
   - E-mail: **um email novo que você consegue acessar**
   - WhatsApp: qualquer
   - Cidade: `Uberlândia`
3. Clicar **"Criar conta grátis →"**
4. Mensagem verde "✅ Cadastro recebido"
5. Verificar inbox do email cadastrado
6. Abrir e-mail *"🚗 Sua conta Nomade Drive está pronta"*
7. Clicar botão **"🔐 Acessar minha conta"**
8. Redireciona pra `https://nomadedrive.com.br/dashboard-cliente.html` **já logado**

### ✅ Critérios
- [ ] Conta criada em `auth.users` (verificar via SQL ou dashboard Supabase)
- [ ] Profile criado em `public.profiles` com `main_role='client'`
- [ ] Lead criado em `public.leads`
- [ ] Magic link funciona (não dá erro "redirect not allowed")
- [ ] Usuário entra direto no dashboard, sem precisar senha

### ⚠️ Pode falhar se
- Magic link redirect URL não tá nas Allowed URLs do Supabase Auth → resolver em [Dashboard Auth Config](https://supabase.com/dashboard/project/zeexmbgacvsaciojcrwr/auth/url-configuration)
- E-mail caiu no SPAM (Gmail às vezes filtra)

---

## FLUXO 6 — Lead via formulário público

**Objetivo:** validar form de cadastro `/nova/index.html#cadastro` (envia 2 emails).

### Passos
1. Abrir `https://nomadedrive.com.br/nova/`
2. Rolar até seção verde **"Crie sua conta grátis"**
3. Preencher: nome, e-mail, WhatsApp, cidade
4. Clicar **"Criar conta grátis →"**
5. Status muda pra "⏳ Enviando..."
6. Após 2s: "✅ Cadastro recebido!" com link WhatsApp

### ✅ Critérios
- [ ] Lead aparece em `public.leads` com `source = 'nova-landing-cadastro'`
- [ ] E-mail pro admin chega em `contato@nomadedrive.com.br`
- [ ] E-mail pro user chega no email cadastrado (com magic link)
- [ ] Se Edge Function falhar: fallback WhatsApp aparece

---

## FLUXO 7 — Lead B2B (parceiros)

**Objetivo:** validar form de parceiros `/nova/parceiros.html`.

### Passos
1. Abrir `https://nomadedrive.com.br/nova/parceiros.html`
2. Rolar até form **"Quero falar com vendas"**
3. Preencher: nome, e-mail corporativo, WhatsApp, tipo de local (Condomínio), nome do prédio
4. Clicar **"Falar com vendas →"**
5. Aguarda "✅ Interesse recebido!"

### ✅ Critérios
- [ ] Lead criado com `source = 'nova-landing-parceiros'` e `intent = 'carsharing-parceiro-b2b'`
- [ ] Admin recebe e-mail no `contato@nomadedrive.com.br`
- [ ] User recebe e-mail de boas-vindas

---

## Cenários de erro pra cobrir

| # | Cenário | Como reproduzir | Resultado esperado |
|---|---|---|---|
| E1 | Pular passo `confirm_payment` | Tenta `unlock` sem ter pago | Erro 409: *"Reserva precisa estar confirmada"* |
| E2 | Pular passo `unlock` | Tenta `return` sem ter desbloqueado | Erro 409: *"Reserva precisa estar ativa"* |
| E3 | Confirmar 2× a mesma reserva | Chama `confirm_payment` 2 vezes | 2ª chamada retorna 409 + mostra status atual |
| E4 | Avaliação inválida | Tenta `rate` com rating 0 ou 6 | Erro 400: *"rating deve ser 1-5"* |
| E5 | Booking ID inexistente | Cola UUID aleatório no console QA | Erro 404: *"Booking não encontrado"* |
| E6 | Email vazio no form | Submete form de lead sem email | HTML5 validation impede submit |
| E7 | Internet cai durante pagamento | Desconecta WiFi no Stripe Checkout | Booking fica `pending_payment` indefinido (cron deveria limpar) |
| E8 | Reservar carro pra passado | Em `/nova/reservar.html?carro=tracker`, abrir calendário do campo "Retirada" | ✅ **Corrigido 30/05**: calendário nativo não mostra datas passadas (`.min` no input). Se forçar via DevTools (`document.getElementById('date-start').value='2020-01-01'` + dispatch change), toast amarelo aparece e reseta pra hoje. |
| E9 | Reservar 0 horas | Duração = 0 | ⚠️ **Bug em aberto** — sistema deveria rejeitar |

---

## Checklist visual completo

### Fluxo principal (5 min)
- [ ] **F1.1** Abrir `qa-test.html` carrega ok
- [ ] **F1.2** Criar reserva retorna Stripe URL
- [ ] **F1.3** Stripe Checkout aceita `4242 4242 4242 4242`
- [ ] **F1.4** `qa-pago.html` mostra código do cofre
- [ ] **F1.5** E-mail "Reserva confirmada" chega no Gmail
- [ ] **F1.6** E-mail tem logo Nomade Drive real (não AI)
- [ ] **F1.7** Botão "Desbloquear cofre" funciona
- [ ] **F1.8** E-mail "Cofre aberto" chega
- [ ] **F1.9** Botão "Devolver carro" funciona
- [ ] **F1.10** E-mail "Reserva finalizada" chega
- [ ] **F1.11** Avaliação 5 estrelas salva
- [ ] **F1.12** Admin recebe e-mail de avaliação

### Erros (10 min)
- [ ] **F2.1** Cartão `0002` é recusado pelo Stripe
- [ ] **F3.1** Cartão `3184` abre modal 3DS
- [ ] **F4.1** `/reservar.html?carro=tracker` data 31/05 mostra slots ocupados (cinza + ✕)
- [ ] **F4.2** Clicar slot ocupado: shake + toast + banner com link clicável
- [ ] **F4.3** Banner vermelho aparece em conflito de range (duração que pega slot ocupado)
- [ ] **F4.4** Link "Ver próximo disponível →" no banner funciona e muda hora
- [ ] **E1.1** `unlock` antes de `confirm_payment` retorna 409
- [ ] **E4.1** Rating 6 retorna erro 400
- [ ] **E8.1** Calendário do campo "Retirada" não deixa selecionar data passada
- [ ] **E8.2** Forçar data passada via DevTools mostra toast e reseta pra hoje

### Magic Link (5 min)
- [ ] **F5.1** Cadastro com email novo cria conta em `auth.users`
- [ ] **F5.2** Profile criado com role `client`
- [ ] **F5.3** Magic link no email
- [ ] **F5.4** Clicar redireciona pra `dashboard-cliente.html` logado

### Forms públicos (10 min)
- [ ] **F6.1** Form `#cadastro` envia → 2 e-mails
- [ ] **F7.1** Form parceiros envia → 2 e-mails
- [ ] Empresas, estudantes, motoristas-app — repetir

### Visual / UX (10 min)
- [ ] Logo Nomade aparece em todas páginas + e-mails
- [ ] Paleta verde `#4FA600` consistente
- [ ] Sem espaços brancos excessivos
- [ ] Mobile responsivo (testar 360px width)
- [ ] Links do nav e footer funcionam
- [ ] Sem console errors no DevTools

---

## Como debugar

### Ver reservas no banco
```sql
SELECT protocol, user_email, vehicle_id, status, amount_brl, pickup_code, created_at
FROM public.qa_bookings
ORDER BY created_at DESC
LIMIT 20;
```

### Ver leads
```sql
SELECT name, contact, source, intent, status, created_at
FROM public.leads
WHERE source LIKE 'nova-landing%'
ORDER BY created_at DESC LIMIT 20;
```

### Ver e-mails enviados (Resend)
- Dashboard: https://resend.com/emails
- Filtra por destinatário ou data
- Cada email tem `id` que aparece na resposta da Edge Function

### Ver pagamentos (Stripe TEST)
- Dashboard: https://dashboard.stripe.com/test/payments
- ⚠️ Modo TEST (toggle no canto superior direito)
- Cada session tem o `booking_id` em metadata

### Ver logs das Edge Functions
- Dashboard Supabase → Functions → Logs
- Filtrar por: `qa-criar-reserva` ou `qa-acao` ou `nova-lead`

### Limpar dados de teste (cuidado)
```sql
-- ⚠️ APAGA TODAS as reservas QA
DELETE FROM public.qa_bookings WHERE created_at > now() - interval '1 day';

-- ⚠️ APAGA todos os leads de teste
DELETE FROM public.leads WHERE source LIKE 'nova-landing%' AND created_at > now() - interval '1 day';
```

---

## Como reportar bugs

**Template de bug:**

```markdown
### Bug #N — [Título curto]
**Fluxo:** F1 (passo 7) ou Cenário E5
**Conta usada:** danielrodovalho228@gmail.com
**Browser:** Chrome 138 / Safari iOS 18
**URL:** https://nomadedrive.com.br/nova/qa-test.html
**Passos:** 1, 2, 3...
**Esperado:** descreva
**Aconteceu:** descreva
**Screenshot:** anexe
**Console errors:** F12 → Console (cole erros)
**Booking ID afetado:** UUID (se aplicável)
```

**Enviar para:** Daniel via WhatsApp `(34) 9 8406-4864` ou e-mail `dtrodovalho40@gmail.com`

---

## 🆘 Suporte rápido durante o QA

- **WhatsApp:** https://wa.me/5534984064864
- **E-mail:** contato@nomadedrive.com.br
- **Logs do Resend:** https://resend.com/emails
- **Logs do Stripe TEST:** https://dashboard.stripe.com/test/logs

---

> 💡 **Dica:** rode os 7 fluxos numa única sessão de ~45 min, anote tudo, depois mande relatório consolidado em vez de bug a bug.
