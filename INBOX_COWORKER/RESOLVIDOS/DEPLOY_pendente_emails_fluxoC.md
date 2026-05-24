# [DEPLOY pendente] Fluxo C testado — 2 e-mails dependem de deploy

**Autor:** Claude (QA)
**Data:** 2026-05-24

Rodei o Fluxo C inteiro com o HB20 (check-in → devolução COM avaria R$300 →
Proteção capturou R$300 → cliente contestou). Funcionalmente **tudo passou**:
- damage insert 201, close-rental 200 (caução **retida**), **#11 "Devolução recebida —
  avaria em análise" Delivered** ✅
- damage-capture 200, **capturou R$300** (R$700 liberado), payment→pago ✅
- contestação: damages update 204, status `em_contestacao` ✅

Mas 2 e-mails NÃO saíram — ambos por deploy:

## 1. #12 "Decisão da Proteção" — BUG corrigido por mim, precisa DEPLOY da Edge Function
`damage-capture` retornou `email_sent:false` (capturou ok, mas e-mail não saiu).
Causa: a função resolvia o e-mail SÓ pelo Stripe Customer (`getClientEmailFromStripe`)
e não tinha fallback — quando o customer/e-mail não vem, o e-mail não sai.
**Fix que já apliquei** em `supabase/functions/damage-capture/index.ts` (após a linha
"7) E-mail pro cliente"): se `cliEmail` vazio, busca `profiles.email` via service role
pelo `dmg.bookings.client_id`. (É o mesmo espírito do item 6 do MELHORIAS_code.md.)
**Ação de vocês:** `supabase functions deploy damage-capture`. Depois eu reteto.

## 2. #13 "Contestação registrada" — código de vocês pronto, mas NÃO deployado
Testei a contestação no ar: o handler disparou o UPDATE em `damages` (204) mas
**nenhum send-email** — ou seja, o site no ar ainda tem o handler ANTIGO. O código
novo de vocês (`dispute_registered_client` + `dispute_for_protection` + handler) está
escrito mas falta **deploy do GitHub Pages** (commit + push).

## Também pendente de deploy (não-bloqueante)
- Meu fix do **banner "Ações pendentes"** (dashboard-cliente.html) — pega pagamento/
  caução pendente. Inline, sem cache-bust, só precisa entrar no mesmo push.
- **#5/#6** (e-mail de veículo) — ainda pra implementar (MELHORIAS item 7).
- **case_resolved** — Caminho A aprovado (ver outro arquivo).

## Resumo: 1 deploy GitHub Pages + 1 deploy da Edge `damage-capture` fecham #12 e #13.
Quando deployarem, escrevam "deployado" que eu reteto #12, #13 e o banner de uma vez.


## ✅ RETESTADO por Claude QA — 2026-05-24
#12 confirmado: capturei uma avaria nova no T-Cross → damage-capture email_sent:true → "Avaria — decisão da Proteção (captura R$ 300,00)" Delivered. #13 também Delivered. Banner do cliente Delivered. FECHADO.
