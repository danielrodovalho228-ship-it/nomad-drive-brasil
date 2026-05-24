# [FASE 36] Protocolo universal — divisão de trabalho (Claude QA ↔ cowork)

**Autor:** Claude (QA) — 2026-05-24
**Spec completo:** `PROPOSTA_FASE36_protocolo_universal.md` (raiz)

O Daniel pediu pra implementar. Pra não colidirmos nos arquivos compartilhados
(emails-runtime.js + Edge Functions + cache-bust são geridos por vocês), dividi assim:

## ✅ JÁ FEITO por mim (Claude QA)
1. **`supabase-fase36-protocolo-universal.sql`** — migração completa:
   - `bookings.protocol_number` (RS-AAAA-####), `rental_inspections` (VS-), `payments` (PG-)
   - sequência + trigger BEFORE INSERT + **backfill** ordenado + índice único, por tabela
   - idempotente, sem ALTER TYPE, com bloco de verificação (raise notice)
   - **AÇÃO DE VOCÊS:** rodar no Supabase SQL Editor.
2. **`reserva-detalhe.html`** — adicionei o KPI **"Protocolo"** no cabeçalho da reserva
   (mostra `b.protocol_number`; a query já é `select *`, então vem automático após a migração;
   é forward-compatible — mostra "—" enquanto o SQL não roda). Edição inline, sem cache-bust.

## ➡️ PRA VOCÊS (mexe em arquivos que vocês gerenciam + cache-bust)
1. **Rodapé "Protocolo: X" em todos os e-mails:**
   - `emails-runtime.js` — adicionar `protocolo` ao rodapé do baseTemplate (campo opcional no payload).
   - Edge Functions `close-rental`, `damage-capture`, `send-email`, `stripe-webhook`,
     `stripe-subscription` — incluir o protocolo da entidade no rodapé (ler `protocol_number`
     da reserva/avaria/pagamento que já carregam).
   - Passar `protocol_number` no payload dos `notify`/`sendEmail`.
2. **Displays adicionais (opcional):** protocolo da avaria/vistoria nos dashboards cliente/proprietário,
   e `PG-...` em cada linha de pagamento no `reserva-detalhe.html` (seção Pagamentos).
3. **Cache-bust + deploy** dos HTMLs/JS + redeploy das Edge Functions que ganharem o rodapé.

## Heads-up de conflito
Eu mexi só no `reserva-detalhe.html` (cabeçalho/KPIs, ~linha 156-163 e ~344) — se forem editar
a seção Pagamentos do mesmo arquivo, puxem a versão do disco. NÃO toquei em emails-runtime.js
nem nas Edge Functions (deixei pra vocês por causa do cache-bust).

## Reteste (eu faço depois do deploy)
Criar 1 reserva/pagamento novo → conferir RS-/PG- na UI + no rodapé do e-mail. Backfill: reservas
antigas (Onix/HB20/T-Cross/Argo) devem ganhar RS-2026-#### após rodar o SQL.


## ✅ ATUALIZAÇÃO — Claude QA rodou o SQL (2026-05-24)
Rodei `supabase-fase36-protocolo-universal.sql` no Supabase. **18 protocolos gerados** (backfill ok):
bookings RS-2026-0001..0004, rental_inspections VS-2026-0001..., payments PG-2026-... Triggers ativos.
**NÃO precisa re-rodar o SQL.** Falta só: rodapé "Protocolo: X" nos e-mails (vocês) + git push do reserva-detalhe.html (KPI Protocolo que eu adicionei).
