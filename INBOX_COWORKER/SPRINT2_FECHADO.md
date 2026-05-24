# ✅ Sprint 2 Fase 32 — FECHADA

**Data:** 2026-05-24
**Status:** Implementação completa, validação real fica pendente de reserva nova

## 🎯 O que ativou

Saques parciais reais a cada 15 dias da locação, com fluxo BR-compatível
(Separate Charges + Transfers em vez de Destination Charges + Manual Payouts).

## 📦 Sprints internas (todas completas)

| Sprint | Item | Status |
|---|---|---|
| 2.1 | Edge Function `liberar-saque-parcial` | ✅ Deployed |
| 2.2 | `stripe-webhook` handlers `payout.paid/failed/canceled` | ✅ Deployed |
| 2.3 | Template `emailSaqueLiberado` (inline na função) | ✅ Deployed |
| 2.4 | Timeline CTA "💸 Sacar agora" funcional + cron pg_cron diário | ✅ Deployed |
| 2.5 | Edge Function `setup-manual-payouts` (DEPRECATED em BR) | ⏸️ Obsoleta — manter só pra non-BR futuro |
| 2.6 | **Refactor BR — Separate Charges + Transfers** | ✅ Deployed |

## 🔄 Arquitetura final (BR-friendly)

```
Cliente paga R$ 2.500 (cartão/PIX)
   ↓ (SEM transfer_data — código novo)
Saldo da Plataforma Stripe = R$ 2.500

A cada 15 dias, proprietário clica "💸 Sacar agora":
   ↓
stripe.transfers.create({ amount: R$ 1.125, destination: connected_account })
   ↓
Connected Account do proprietário (saldo +R$ 1.125)
   ↓
Stripe BR auto-payout (1-2 dias úteis — schedule daily padrão)
   ↓
Banco do proprietário
```

**Resultado:** plataforma controla o timing dos saques sem precisar de
manual payouts (proibido em BR).

## ⚠️ Caveats conhecidos

1. **Reservas antigas (com transfer_data ainda)** continuam roteando direto
   pra connected account dos proprietários. O dinheiro NÃO está mais no
   saldo da plataforma. Pra testar saque novo precisa criar reserva NOVA
   após o redeploy do `stripe-checkout`.
2. **Cron pg_cron** precisa ter sido habilitado pelo Daniel (extensão
   `pg_cron` no Supabase). Sem ele, marcos viram "available" só via SQL
   manual (`select public.activate_due_milestones();`).
3. **Connected Accounts existentes** que tentaram `setup-manual-payouts`
   antes do refactor BR podem ter ficado em estado inconsistente —
   recomendo verificar via Stripe Dashboard que estão em schedule "daily"
   (default BR).

## 🧪 Pendência de validação (não bloqueia fechamento)

Teste end-to-end real (gerar transfer no Stripe Dashboard) requer:
1. Criar reserva NOVA com `qa-cliente@` x `qa-proprietario@`
2. Pagar mensalidade nova (vai 100% pra saldo da plataforma agora)
3. Forçar marco `available` via SQL
4. Logar como proprietário, clicar "Sacar agora"
5. Verificar transfer `tr_xxx` no Stripe Dashboard

Cowork pode fazer isso quando quiser — instruções em
`ROTEIRO_QA_SPRINT2_SAQUE.md` (já com adaptações pra BR documentadas
neste arquivo).

## 📊 Total entregue (Sprint 2 completa)

- 1 Edge Function nova (`liberar-saque-parcial`)
- 1 Edge Function helper obsoleta (`setup-manual-payouts`)
- 3 Edge Functions atualizadas (`stripe-checkout`, `stripe-webhook`,
  `liberar-saque-parcial` v2)
- 2 SQLs (`fase32c-cron-marcos`, `fase35a-fix-triagem-counterparty`)
- 1 template e-mail inline (HTML rich)
- UI completa: botão "Sacar agora" + confirmação + loading + sucesso/erro
- Webhook handlers pra payout.paid/failed/canceled (manter pra non-BR)

Sprint 2 oficialmente fechada. 🎉
