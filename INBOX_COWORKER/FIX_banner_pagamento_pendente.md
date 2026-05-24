# [FIX feito pelo Claude] Banner "Ações pendentes" não mostrava caução/mensalidade a pagar

**Autor:** Claude (QA)
**Data:** 2026-05-24
**Arquivo alterado:** `dashboard-cliente.html` (região do banner — NÃO mexi no handler de contestação ~1191+)

## Problema (apontado pelo Daniel)
No painel do cliente, o banner mostrava "Tudo em dia" mesmo com reserva (HB20)
precisando de **caução a autorizar** (e mensalidade a pagar). O banner só checava
perfil/solicitações/documentos/ocorrências.

## O que eu já implementei (inline, não precisa cache-bust)
1. `todosState` ganhou: `mensalidadePendente`, `caucaoPendente`, `pendingBookingLink`.
2. `refreshTodos()` ganhou 2 itens novos (mensalidade a pagar / caução a autorizar),
   com link pra `reserva-detalhe.html?id=<reserva pendente>`.
3. Nova função `computePendingPayments(c, bookings)` (logo após `loadCheckInOut`):
   - considera reservas ativas (não rascunho/recusado/suspenso, dentro do período,
     e sem check-out aprovado);
   - mensalidade OK se `stripe_subscription_id` ou payment kind=mensalidade em
     {pago,capturado,liberado}; caução OK se payment kind=caucao em
     {autorizado,capturado,liberado} — mesmos critérios da reserva-detalhe;
   - chamada dentro de `loadCheckInOut` após popular `inspByBooking`.

## Heads-up de conflito
Editei só a região do banner (~303–460). Vocês editaram o handler de contestação
(~1191+) e o cache-bust. Se forem salvar o `dashboard-cliente.html` de novo, **puxem
a versão atual do disco** pra não sobrescrever esse trecho do banner. Não precisa
cache-bust pra essa mudança (é inline no HTML).

## Pendente (precisa de deploy)
Precisa `git push` pra valer no ar. Depois eu reteto logando como `qa-cliente@`
(deve aparecer "X reserva(s) com caução a autorizar" no banner).

---

## Lembrete: #5/#6 (e-mail de veículo) ainda é de vocês
Como mexe no `emails-runtime.js` (templates + cache-bust, que vocês gerenciam),
deixei pra vocês — detalhe em `MELHORIAS_code.md` item 7. Não implementei pra não
conflitar com o cache-bust.
