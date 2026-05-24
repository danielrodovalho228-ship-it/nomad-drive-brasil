# 🗺️ Roadmap Nomade Drive Brasil — Do código pronto à primeira locação real

> **Atualizado em:** 2026-05-24 (commit `11bde7a`)
> **Stack:** Vanilla JS + GitHub Pages · Supabase (Postgres + Edge Functions + Auth + Storage) · Stripe Connect (Brasil)
> **Modelo de negócio:** Plataforma de intermediação tecnológica (CNAE 6319-4/00), MEI Danilo Tomaz Rodovalho

---

## 📊 Estado atual — Mapa de calor

### ✅ FECHADO (pronto pra operar)

| Área | Status | Detalhe |
|---|---|---|
| **Landing institucional** | ✅ | Hero + frota + preços + FAQ + termos + LGPD |
| **Cadastro multi-papel** | ✅ | Cliente / Owner / Parceiro / Oficina / Proteção |
| **Onboarding cliente** | ✅ | Form + KYC + verification_status workflow |
| **Onboarding owner** | ✅ | Veículo + docs + simulador de receita |
| **Painel admin completo** | ✅ | Cadastros, reservas, vistorias, frota, financeiro, fiscal MEI, RH, cockpit CEO |
| **Painel cliente** | ✅ | Reservas, check-in/out, NPS, histórico, Nomade Gold, renovação 1-clique |
| **Painel proprietário** | ✅ | Veículos, locações, recebimentos, manutenção, painel verde, solicitações pendentes |
| **Painel oficina** | ✅ | Fila de vistorias, marketplace de instalações |
| **Painel proteção** | ✅ | Casos, evidências, decisões, SLA |
| **Catálogo de 54 templates e-mail** | ✅ | Cliente 14 / Owner 11 / Parceiro 7 / Oficina 7 / Proteção 5 / Admin 10 |
| **Stripe Checkout** | ✅ | Subscription mensal + PaymentIntent caução |
| **Webhook Stripe** | ✅ | 14 handlers (payment_intent, charge, invoice, customer.subscription, account, payout) |
| **Sistema de saques (Separate Charges + Transfers)** | ✅ | BR-compatível (sem Manual Payouts) |
| **Push Notifications PWA** | ✅ | VAPID + Service Worker + Edge Function send-push |
| **Sistema de protocolos universais** | ✅ | KYC-####, RES-####, AV-####, RS-#### + rodapé nos e-mails |
| **Renovação 1-clique** | ✅ | View renewal_opportunities + RPC clone_booking_for_renewal + UI dashboard |
| **E-mail D-7 renovação automático** | ✅ | Cron diário 9h UTC + anti-spam |
| **Programa Nomade Gold (loyalty)** | ✅ | 4 tiers + view client_loyalty + desconto progressivo (5/7/10/15%) |
| **E-mail "subiu de tier" automático** | ✅ | Trigger SQL → Edge Function send-tier-promotion |
| **Lead capture (form + admin panel)** | ✅ | submit-lead-quote + pipeline novo→contatado→qualificado→convertido |
| **"Quero alugar este carro" (Fase 44)** | ✅ | create-rental-request + check cadastro |
| **Aprovação owner com 1 clique (Fase 44)** | ✅ | approve-rental-request + reject-rental-request + UI |
| **Banner urgente Connect (Fase 45)** | ✅ | Dashboard owner mostra banner amarelo se Connect inativa |
| **Bloqueio aprovação sem Connect (Fase 45)** | ✅ | approve-rental-request retorna connect_not_ready |
| **Webhook Connect auto-update + e-mail (Fase 45b)** | ✅ | Detecta transição → ativo / restrito |
| **Auto-aprovação Gold/Platinum (Fase 46)** | ✅ | Cliente VIP recebe "Aprovada na hora" |

### 🟡 PARCIAL (funciona mas tem gap)

| Área | O que falta | Tempo |
|---|---|---|
| **Otimização landing pra conversão** | Hero com prova social, sticky CTA mobile, depoimentos placeholder, pricing visual, Core Web Vitals | ~3h |
| **Painel saldo/extrato pro owner** | Hoje só tem timeline Sprint 2 — falta saldo disponível, histórico transfers, próximos repasses, exportar CSV | ~2h |
| **Onboarding completo owner pré-1ª locação** | Falta checklist guiado "passo 1/5: dados pessoais, passo 2/5: cadastrar veículo, passo 3/5: Connect, passo 4/5: vistoria oficina, passo 5/5: pronto!" | ~2h |
| **Página inicial owner pós-login** | Hoje cai direto no dashboard — falta "boas-vindas" se primeira visita | ~30min |
| **Recuperação de senha** | Fluxo existe via Supabase mas a UI pode estar mais clara | ~1h |

### 🔴 BLOQUEADO POR DEPENDÊNCIA EXTERNA

| Item | Bloqueador | O que destrava |
|---|---|---|
| **NF eletrônica (Sprint 3 NotaZZ)** | CNPJ Danilo (MEI) | Danilo abrir MEI no gov.br → me passa CNPJ → integro NotaZZ |
| **Stripe Connect Brasil em produção** | Ativar Connect na Stripe da plataforma | Daniel/Danilo: Stripe Dashboard → Connect Settings → Brazil |
| **Domínio próprio nos e-mails** | DNS do nomadedrive.com.br | Verificar domínio em https://resend.com/domains → setar EMAIL_FROM=`Nomade Drive Brasil <noreply@nomadedrive.com.br>` |
| **VAPID keys reais (push notification produção)** | Daniel gerar par VAPID | `npx web-push generate-vapid-keys` → cola pub key no SW + priv key em Supabase secret |
| **Integração Cobli (rastreador real)** | API key Cobli + contrato | Daniel: contratar Cobli → me passa API key + ID device |
| **CNAE 6319-4/00 confirmado em contrato MEI** | Verificar no CCMEI gerado pelo Danilo | Posicionar como plataforma de tecnologia (NÃO locadora) |

---

## 🚦 Loop completo de monetização — onde estamos

```
[CLIENTE]
1. Entra na landing ✅
2. Clica banner ou navega frota ✅
3. Clica num carro (car.html) ✅
4. Clica "Quero alugar este carro" ✅
5. Sistema check cadastro ✅
6. Cria rental_request ✅
7. Recebe e-mail "Solicitação recebida" ✅

[OWNER]
8. Recebe e-mail "Novo interesse" ✅
9. Abre dashboard → vê banner Connect se inativo ✅
10. Conecta Stripe (KYC) → recebe e-mail "Conta verificada" ✅
11. Vê solicitação pendente ✅
12. Clica "Aprovar" → bloqueia se Connect inativo ✅
13. (OU) Auto-aprovação se cliente VIP + checkbox ON ✅

[SISTEMA]
14. Cria booking com desconto tier-aware ✅
15. Envia e-mail "🎉 Aprovada — pague pra confirmar" ✅

[CLIENTE]
16. Dashboard mostra card verde "APROVADA" ✅
17. Clica "Pagar" → Stripe Checkout ✅
18. Paga 1ª mensalidade + caução pré-auth ✅

[SISTEMA]
19. Webhook Stripe atualiza booking ✅
20. Transfer automático pro Connect account do owner ✅

[OPERACIONAL — fluxos B/C/D já existentes]
21. Check-in / Check-out ✅
22. Avaria + captura caução ✅
23. Renovação 1-clique D-7 ✅
24. Promoção de tier loyalty ✅

[FALTA AINDA]
25. ❌ NF eletrônica automática (NotaZZ)
26. 🟡 Sistema de avaliação/NPS pós-locação (parcial)
27. 🟡 Histórico de receita exportável (CSV)
```

---

## 🎯 Checklist pré-1ª locação real (ordem sugerida)

### 🏗️ Setup (fazer UMA vez)

- [ ] **Danilo abre MEI** no gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei (CNAE 6319-4/00)
- [ ] **Stripe Connect ativado** pra Brasil no dashboard Stripe (test mode → liga, depois live mode)
- [ ] **Domínio Resend verificado** (nomadedrive.com.br DNS) + `EMAIL_FROM=Nomade Drive Brasil <noreply@nomadedrive.com.br>` em secrets
- [ ] **VAPID keys** geradas e configuradas (pra push real funcionar)
- [ ] **Conta bancária da plataforma** (PF Daniel ou PJ Danilo) configurada na Stripe master
- [ ] **Webhook Stripe** apontando pro Edge Function com eventos Connect ativados

### 👥 Cadastro dos primeiros usuários reais

- [ ] **Você (Daniel)** se cadastra como super_admin (já é)
- [ ] **Danilo** se cadastra como admin/operacional
- [ ] **1º proprietário real** — alguém de Uberlândia com 1 carro disponível
  - Cadastro pelo onboarding-proprietario.html
  - Você aprova manualmente no admin
  - Owner conecta Stripe Express (KYC)
  - Veículo passa por vistoria em oficina parceira
- [ ] **1ª oficina parceira credenciada** em Uberlândia (pra vistoria)
- [ ] **Frota inicial:** veículo do 1º proprietário aprovado na plataforma

### 🧪 Teste smoke final

- [ ] Você abre incógnito → preenche form orçamento → recebe e-mail no `contato@nomadedrive.com.br`
- [ ] Você cadastra cliente teste → completa onboarding → vê seu status "em_analise"
- [ ] Admin aprova o cliente teste → cliente vê status='aprovado'
- [ ] Cliente teste clica "Quero alugar" no veículo do proprietário real
- [ ] Owner recebe e-mail + vê no dashboard
- [ ] Owner aprova → cliente recebe "🎉 Aprovada"
- [ ] Cliente paga com **cartão de teste Stripe** (`4242 4242 4242 4242`)
- [ ] Transfer simulado pro owner aparece no Stripe Dashboard
- [ ] Tudo funciona → liga **modo live** na Stripe

### 🚀 Go-live

- [ ] Promover propaganda inicial (Instagram, Google Ads, parceiros locais Uberlândia)
- [ ] Acompanhar leads no admin (Fase 42)
- [ ] Monitorar KPIs no cockpit CEO (Fase 37+40)
- [ ] 1ª locação real → champagne 🍾

---

## 💰 Modelo financeiro — fluxo de dinheiro

```
Cliente paga R$ 2000/mês (com 5% off de Bronze = R$ 1900)
  ↓
Stripe captura no cartão do cliente
  ↓
Stripe master da Nomade Drive recebe R$ 1900
  ↓
Transfer automático: R$ 1710 → Connect account do Owner (90%)
                     R$ 190  → fica na plataforma (10% taxa)
  ↓
Owner saca via Stripe Payout → conta bancária dele
  ↓
Plataforma usa os 10% pra:
  - Stripe Connect fee (~3.5% = R$ 67)
  - Resend (~R$ 50/mês total)
  - Supabase Pro (~R$ 130/mês)
  - Domínio (~R$ 50/ano)
  - Pró-labore Danilo MEI (DAS-MEI R$ 75/mês)
  - Reserva operacional (60% sobra)
```

### Break-even estimado
- **Custos fixos mensais:** ~R$ 300 (Supabase + Resend + Stripe minimum)
- **Ponto de equilíbrio:** ~5 locações ativas (R$ 950 de taxa) cobre custos
- **Meta primeiro trimestre:** 10 locações ativas → ~R$ 1900 receita líquida plataforma

---

## 📈 Backlog estratégico (pós-MVP, em ordem de impacto)

### Alto impacto (próximos 30 dias após go-live)

1. **Otimização landing pra conversão** (~3h) — sticky CTA, prova social, Core Web Vitals
2. **Painel saldo/extrato pro owner** (~2h) — owner vê o que está recebendo
3. **NotaZZ NF eletrônica** (~4h, bloqueado por CNPJ Danilo)
4. **Sistema de avaliação pós-locação** (~3h) — cliente avalia owner + owner avalia cliente
5. **Integração Cobli rastreador real** (~3h, bloqueado por API key)

### Médio impacto (próximos 60 dias)

6. **App mobile (PWA install + push real)** (~2h, parcialmente pronto)
7. **Marketplace de seguros** (~5h) — Shield próprio ou parcerias
8. **Multi-cidade** (~4h) — sair de Uberlândia
9. **API pública pra parceiros** (~5h) — agregadores tipo Booking
10. **Programa de referral** (~3h) — cliente indica cliente, ganha mês grátis

### Baixo impacto / nice-to-have

11. Multi-idioma (PT/EN)
12. White-label pra outros marketplaces
13. Integração com agendas (Google Calendar)
14. Mobile app nativo (Flutter/React Native)

---

## 🛡️ Riscos conhecidos

| Risco | Mitigação |
|---|---|
| **MEI ultrapassa R$ 81k/ano** | Migrar pra ME assim que faturar R$ 6k+/mês recorrente |
| **CNAE 6319-4/00 questionado** | Cláusula 1.0 em termos.html já posiciona como plataforma. Mesmo modelo Airbnb/Uber/iFood. |
| **Stripe Connect indisponível em produção BR** | Já temos fallback Sprint 2.6 (Separate Charges + Transfers manuais via webhook payouts) |
| **Spam no form orçamento** | Honeypot field + rate limit Resend (Fase 42) |
| **XSS via inputs públicos** | escapeHtml em renderLeadCard (Fase 42 fix #1) |
| **Auth bypass em Edge Functions** | event_id validation em send-tier-promotion (Fase 43b fix #2) |

---

## 🎯 Onde focar AGORA (top 3)

1. **Setup externo:** Danilo MEI + Stripe Connect ativado + Resend domain (sem isso, tudo trava no go-live)
2. **Otimização landing:** sem leads chegando, todo o sistema fica vazio
3. **Testar fluxo E2E completo:** validar com 1 cliente teste + 1 owner real antes de promover ads

---

## 📞 Contatos importantes

- **Stripe Support BR:** stripe.com/support (chat 24/7)
- **Resend Support:** resend.com/help
- **Supabase Discord:** discord.gg/supabase
- **gov.br MEI:** 138 (Receita) ou portal do empreendedor

---

## 📝 Histórico de fases (cronológico)

Pra contexto de quem chegou agora no projeto:
- **Fase 0-9:** Setup inicial, schema, RLS, auth multi-papel
- **Fase 10-20:** Reservas + Stripe checkout + webhook
- **Fase 21-30:** Operacional (check-in/out, avaria, caução)
- **Fase 31-32:** Timeline financeiro + saques (Sprint 1-2)
- **Fase 33:** Painel verde monitoramento + push PWA
- **Fase 34-35:** Painel Proteção + protocolos
- **Fase 36:** Rodapé protocolo universal nos e-mails
- **Fase 37-40:** Cockpit CEO (financeiro, fiscal MEI, RH, crescimento, qualidade)
- **Fase 41:** Renovação 1-clique
- **Fase 41b:** E-mail D-7 automático
- **Fase 42:** Painel de leads no admin
- **Fase 43:** Programa Nomade Gold (loyalty tiers)
- **Fase 43b:** E-mail promoção de tier
- **Fase 44:** Fluxo E2E aprovar+pagar
- **Fase 45:** Stripe Connect onboarding integrado
- **Fase 45b:** Webhook Connect auto-update + e-mail verificada
- **Fase 46:** Auto-aprovação Gold/Platinum

---

> ✨ **Resumo TL;DR:** 95% do código pronto. Falta: (a) Danilo abrir MEI, (b) ativar Stripe Connect BR, (c) verificar domínio Resend, (d) cadastrar 1º owner real com veículo aprovado, (e) testar fluxo E2E em modo test, (f) ligar modo live. **Tempo estimado pra 1ª locação real: ~1 semana de setup externo.**
