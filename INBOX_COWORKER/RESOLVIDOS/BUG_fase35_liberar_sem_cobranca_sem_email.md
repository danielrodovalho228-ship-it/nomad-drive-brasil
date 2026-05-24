# [BUG Fase 35] "Liberar sem cobrança" (Fluxo 3) não envia NENHUM e-mail

**Autor:** Claude (QA) — 2026-05-24
**Arquivo:** `dashboard-protecao.html` (handler do botão "Liberar sem cobrança" / status `aprovado_sem_captura`)

## Teste (Roteiro Fase 35, Fluxo 3)
Avaria nova (amassado, pendente_revisao) no Fiat Argo → Proteção clica **"Liberar sem cobrança"**.
- `damages` UPDATE → **204 OK** (status mudou).
- **NENHUM send-email disparou** (hook do browser pegou 0) e **nenhuma Edge Function** chamada
  (sem damage-capture). No Resend: **não chegou nada** — nem pro cliente nem pro proprietário.

## Esperado (Roteiro Fase 35, Fluxo 3) — os 2 e-mails são NOVOS 🆕
| # | Assunto | Destino |
|---|---|---|
| 1 | "Sua avaria foi liberada sem cobrança — Nomade Drive Brasil" 🆕 | qa-cliente@ |
| 2 | "Decisão da Proteção — avaria liberada sem cobrança" 🆕 | qa-proprietario@ |

(Era o gap mais crítico da Fase 35: antes, liberar sem cobrança não avisava ninguém.)

## Causa provável
O caminho de **captura** (`damage-capture`) manda os e-mails server-side. Mas o caminho de
**liberar sem cobrança** parece fazer só um `c.from('damages').update({status:'aprovado_sem_captura'...})`
direto, **sem** chamar nenhum envio de e-mail (nem `notifyByUserId` no browser, nem uma função).

## Fix recomendado
No handler de "Liberar sem cobrança", após o update bem-sucedido em `damages`:
1. Notificar o **cliente** (template "avaria liberada sem cobrança"): como é o cliente da reserva,
   resolver o destinatário — mas a Proteção não lê `profiles` do cliente por RLS, então usar
   `notifyByUserId(c, <client_id>, ...)` (server-side, igual ao case_resolved). Pegar o client_id
   via a RPC `get_case_counterparty`-style OU uma função SECURITY DEFINER que devolva client_id+owner_id
   da reserva da avaria.
2. Notificar o **proprietário** (template "decisão — liberada sem cobrança") via `notifyByUserId`.
3. Criar os 2 templates novos no `emails-runtime.js` (se ainda não existem).

> Observação: como a Proteção não tem RLS em `bookings`/`profiles`, qualquer destinatário aqui
> precisa do caminho server-side (`notifyByUserId` / SECURITY DEFINER), igual fizemos no Fluxo 6.

## Critério de aceite
Liberar sem cobrança → 2 e-mails Delivered (cliente "liberada sem cobrança" + proprietário "decisão").

## Status Fase 35 (QA runtime)
- Fluxo 1 ✅ (cliente + proprietário 🆕) · Fluxo 2 ✅ (cliente + proprietário 🆕) ·
  **Fluxo 3 ❌ (este bug)** · Fluxo 4 ✅ (cliente + suporte + proprietário 🆕) ·
  Fluxo 5 ✅ (3/3) · Fluxo 6 — fix do cowork aplicado (fase35a), aguarda rodar o SQL pra eu reterar.


## ✅ RETESTADO por Claude QA — 2026-05-24 — RESOLVIDO
O fix já está no ar. Cliquei "Liberar sem cobrança" pela UI da Proteção numa avaria pendente → damages 204 + **2 send-emails [200,200]**. No Resend, ambos Delivered:
- "Sua avaria foi liberada sem cobrança" → qa-cliente 🆕
- "Decisão da Proteção — avaria liberada sem cobrança" → qa-proprietario 🆕
FASE 35 = **6/6**. FECHADO.
