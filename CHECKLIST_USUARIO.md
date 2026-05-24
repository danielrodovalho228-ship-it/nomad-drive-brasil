# Checklist Pessoal — Daniel / Nomade Drive Brasil

> **Última atualização:** 2026-05-23 (commit `ef02707`)
> Marque cada item conforme for fazendo.

---

## ✅ URGENTE — TODOS FEITOS 🎉

- [x] **1. Verificar Edge Function `consulta-multas`**
- [x] **2. Verificar Edge Function `installation-checkout`**
- [x] **3. PIX no Stripe** — integração técnica feita (Pix Automático). Ativação na conta = solicitar à Stripe Support quando puder
- [x] **4. Validar login** `qa-cliente@nomadedrive.com.br` / `Teste123`
- [x] **A. Re-deploy `stripe-checkout`** (com suporte a Pix Automático)
- [x] **B. Re-deploy `stripe-webhook`** (com handler `mandate.updated`)

**SETUP 100% COMPLETO** — pronto pra rodar fluxos reais de teste.

---

## 🟡 ESTA SEMANA — Validação + planejamento

### Testar fluxos end-to-end (1-2h)

- [ ] **5. Fluxo A — Pagar mensalidade** (3 min)
  - Login como `qa-cliente` → `/reserva-detalhe?id=<booking>` → "Pagar mensalidade"
  - Stripe Checkout: cartão `4242 4242 4242 4242`, CVC `123`, data `12/30`, CEP `01310-100`
  - Verificar: e-mail "Mensalidade confirmada" em `contato@nomadedrive.com.br` (webmail Hostinger)

- [ ] **6. Fluxo B — Check-in / check-out** (5 min)
  - Cliente solicita retirada → Proprietário aprova → cliente vê "Em uso"
  - Cliente solicita devolução → Proprietário aprova
  - Verificar: e-mail "Locação encerrada"

- [ ] **7. Fluxo C — Avaria (mais complexo)** (10 min)
  - Proprietário aprova devolução COM avaria (fotos dummy + descrição)
  - Logar como Proteção → validar avaria → "Aprovar captura R$ 300"
  - Verificar: Stripe captura parcial + e-mail "Avaria — decisão da Proteção"
  - Logar como cliente → ver avaria → testar "Contestar"

- [ ] **8. Fluxo D — Cancelar assinatura** (1 min)
  - Cliente clica "Cancelar assinatura"
  - Verificar: e-mail "Assinatura cancelada" + card atualizado

### Contatar Cobli (sem urgência)

- [ ] **9. Preencher formulário Cobli**
  - `https://www.cobli.co/` → "Fale com vendas"
  - Usar mensagem sugerida no doc anterior
  - Aguardar contato (1-3 dias)

- [ ] **10. Quando Cobli ligar**
  - Fazer as 23 perguntas listadas no guia (preço, API, SLA, etc.)
  - Pedir teste com 1-2 dispositivos antes de escalar
  - Me avisar quando tiver API key

---

## 🟢 QUANDO QUISER — Sem urgência

### Documentos para passar pra equipe

- [ ] **11. Compartilhar `ROTEIRO_TESTE_GERAL.md`** com QA (61 itens de teste)
- [ ] **12. Compartilhar `ROTEIRO_QA_EMAILS.md`** com QA (21 e-mails)
- [ ] **13. Compartilhar `ROTEIRO_CRIAR_USUARIOS_TESTE.md`** (caso queira que outras pessoas façam onboarding manual)

### Migração futura

- [ ] **14. Abrir MEI / CNPJ** (quando decidir)
  - Atualizar dados em: Infosimples, Stripe, Hostinger, Resend
- [ ] **15. Renovar trial Hostinger** (expira 22/06/2026)
  - Fazer upgrade pra plano pago

### Polimento opcional (P3)

- [ ] **16. Trocar `window.confirm()` por modal não-bloqueante** (UX)
- [ ] **17. UI admin "Multas pendentes de cobrança"**
  - Dados já são coletados em `vehicle_fines` via Infosimples
  - Falta só a tela

---

## ✅ JÁ FEITO (parabéns pelo progresso!)

### Configuração inicial
- [x] Resend domain `nomadedrive.com.br` verificado
- [x] `EMAIL_FROM` configurada no Supabase
- [x] `INFOSIMPLES_TOKEN` configurada no Supabase
- [x] Hostinger: 5 aliases `qa-*@nomadedrive.com.br` criados
- [x] Subscription Claude upgrade
- [x] Account Infosimples criada (R$ 100 crédito)

### SQLs rodadas no Supabase
- [x] `supabase-qa-aliases-emails.sql`
- [x] `supabase-fase24-profiles-email.sql`
- [x] `supabase-fase26-km-audit.sql`
- [x] `supabase-fase28-installation.sql` (marketplace instalação)
- [x] `supabase-fase28b-papel-proprietario.sql` (correção papel + gate)
- [x] `supabase-fase29-gate-proprietario.sql` (gate proprietário recusado)
- [x] `supabase-fase30-multas.sql` (multas + license_plate)
- [x] `supabase-qa-seed-completo.sql` (popular tudo)

### Edge Functions deployadas
- [x] `close-rental` re-deployada com código novo
- [x] `consulta-multas` deployada com código real (Fase 30 / Infosimples)
- [x] `installation-checkout` deployada com código real (Fase 28.3)
- [x] `stripe-checkout` re-deployada com Pix Automático (Fase 31)
- [x] `stripe-webhook` re-deployada com handler mandate.updated

### Validações QA já feitas
- [x] Smoke test: handler de cadastros dispara e-mail
- [x] Bug crítico de cancelamento de assinatura corrigido (Fase 22)
- [x] Reset de senhas pra Teste123 (via SQL)
- [x] Login validado `qa-cliente@nomadedrive.com.br` / `Teste123`
- [x] PIX no Stripe: integração técnica + Pix Automático implementados.
      Ativação na conta depende de pedido à Stripe Support (não bloqueia operação com cartão)

---

## 📊 Resumo

| Categoria | Total | Feito | Falta |
|---|---|---|---|
| 🔴 Urgente | 6 | 6 | 0 ✅ |
| 🟡 Esta semana | 6 | 0 | 6 |
| 🟢 Quando quiser | 7 | 0 | 7 |
| ✅ Já feito (total) | 21 | 21 | 0 |

**🎯 Próxima ação:** Item 5 — Testar Fluxo A (pagar mensalidade) com cartão de teste Stripe.

---

## 📞 Quando me chamar de novo

Quando voltar, é só me dizer:
- **"Item N feito"** → marco e indico próximo
- **"Item N deu erro Y"** → corrijo
- **"Fechei Cobli, aqui está a API key"** → começo integração técnica
- **"Encontrei bug X"** → atendo

Tudo versionado no Git. Nada se perde.
