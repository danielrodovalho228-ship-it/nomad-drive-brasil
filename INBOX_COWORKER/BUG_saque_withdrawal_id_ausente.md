# [BUG CRÍTICO Sprint 2] "Sacar agora" falha — `withdrawal_id ausente` (frontend não passa)

**Autor:** Claude (QA) — 2026-05-24
**Severidade:** ALTA (bloqueia a feature mais importante da Sprint 2)
**Edge Function:** `liberar-saque-parcial`
**Frontend:** handler do botão `#timelineCtaBtn` no `reserva-detalhe.html` (timeline de marcos)

## Teste (Frente 1 do roteiro de fechamento)
Pré-condições TODAS OK (validei via supabase client, sessão qa-proprietario):
- `payout_accounts`: status=ativo, **payouts_enabled=true, details_submitted=true** ✅
- `withdrawals`: milestone 1 = **available**, R$ 1.080 (reserva Fiat Argo `bc74cddd`), nenhum saque feito ✅

Logado como Marcos (qa-proprietario) → reserva-detalhe da Argo → card "💰 Saque disponível
agora" + "💸 Sacar agora" aparecem ✅ → **cliquei "Sacar agora"**.

## Resultado ❌
- Alert: **"❌ Não foi possível liberar o saque: Edge Function returned a non-2xx status code"**
- HTTP **400** da `liberar-saque-parcial`
- Corpo da resposta: **`{"error":"withdrawal_id ausente."}`**

## Causa
O handler do botão "Sacar agora" chama `liberar-saque-parcial` **sem mandar `withdrawal_id`
no body**. A função valida e rejeita (400). Não é saldo nem onboarding — é o frontend não
enviando o parâmetro.

## Fix
No handler do `#timelineCtaBtn` (reserva-detalhe.html), incluir o `withdrawal_id` do marco
`available` no body do invoke:
```js
c.functions.invoke("liberar-saque-parcial", { body: { withdrawal_id: <id do marco available> } })
```
O id do withdrawal disponível já está na timeline (a query que monta o card "Saque disponível"
tem o registro de `withdrawals` — só passar o `.id` dele).

## ⚠️ Nota de sincronização de repo
O handler desse botão **NÃO está no meu repo local** (`reserva-detalhe.html` local só tem o
`<button id="timelineCtaBtn">`, sem addEventListener/invoke). Mas no site deployado ele existe
(o clique disparou a função). Parece que o **working tree local está atrás dos commits que vocês
deployaram** (fece3ee/2dd156d). Recomendo conferir se há divergência local↔remote — pode afetar
edições futuras minhas sobre esse arquivo.

## Critério de aceite
Clicar "Sacar agora" → `liberar-saque-parcial` 200 → alert "💰 Saque liberado! ... tr_xxx" →
transfer no Stripe + `withdrawals` status=paid com `stripe_payout_id` tr_*.
