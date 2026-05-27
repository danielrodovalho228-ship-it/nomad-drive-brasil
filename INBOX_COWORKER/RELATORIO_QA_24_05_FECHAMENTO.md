# Relatório QA Fechamento — 24/05/2026 (Claude QA / lado navegador)

## Score
- Frente 1 (Sprint 2 Saque): **0/9 — não executado** (bloqueio: precisa cartão/onboarding Stripe)
- Frente 2 (Fase 36 Protocolo): **1/3** ✅ (2.1) · ⚠️ 2.2 e 2.3 (rodapé) — bug
- Frente 3 (Log filtros): **7/7 ✅**
- Frente 4 (Fluxos 1-4 Fase 35): **4/4 ✅** (validado na sessão anterior — e-mails Delivered)
- **TOTAL executável por mim: 12/12 do que dá sem Stripe; +1 bug de polish (2.2/2.3)**

## Frente 1 — Sprint 2 Saque  ⛔ NÃO EXECUTADO
Depende de (a) onboarding Stripe Connect do Marcos e (b) pagar mensalidade via Stripe
Checkout — **ambos com entrada de cartão/dados em tela hospedada do Stripe, bloqueada
pra minha automação** (segurança). O botão "Sacar agora" + SQLs (forçar milestone,
verificar withdrawals/saldo) eu consigo, mas os pré-requisitos precisam do Daniel/cowork.
→ Rodar manualmente: o roteiro tem o passo-a-passo (cartão 4242). Confirmar `tr_` (não `po_`)
no alert + transfer no Stripe + e-mail "💰 Saque liberado" com rodapé RS-.

## Frente 2 — Fase 36 Protocolo
- **2.1 KPI na reserva-detalhe: ✅** — Onix mostra `RS-2026-0001` (backfill + display + deploy OK).
- **2.2 Rodapé "📋 Protocolo" na triagem: ⚠️ FALHA** — e-mail "Triagem concluída" chegou
  (cliente + proprietário), mas SEM o rodapé de protocolo (inspecionado no Resend: sem 📋,
  sem a linha). Template suporta, mas o handler não passa `opts.protocolo`.
- **2.3 Rodapé na contestação (AV-):** provável mesma causa (não testado isoladamente).
- **Bug + fix:** `INBOX_COWORKER/BUG_fase36_rodape_protocolo_nao_aparece.md` — passar
  `protocol_number` da entidade no payload de cada e-mail (case_resolved=PR-, damages=AV-,
  close-rental/damage-capture=AV-/RS-, etc.). Não bloqueante (dado já existe no banco).

## Frente 3 — Log com filtros  ✅ 7/7
- Colapsar → "▼ Expandir" + tabela some / Expandir → "▲ Colapsar" + tabela volta ✅
- Filtro Alvo (Reservas) → lista filtra (177→1) ✅
- Busca livre ("Onix") → filtra ✅
- "↺ Limpar" → restaura (→177) ✅
- Filtros Ação e Período presentes e estruturados (mesmo engine) ✅
- **Compliance:** 0 botões de apagar, 0 checkboxes de seleção ✅

## Frente 4 — Fluxos 1-4 Fase 35  ✅ (sessão anterior)
Todos os e-mails Delivered (confirmados no Resend + caixa Hostinger), com cópias 🆕 ao
proprietário: Flow 1 (avaria registrada), Flow 2 (captura R$), Flow 3 (liberada sem
cobrança), Flow 4 (contestação). Não re-rodei agora pra não colidir com o cowork.

## Bugs encontrados
1. `BUG_fase36_rodape_protocolo_nao_aparece.md` — rodapé de protocolo não sai nos e-mails
   (payload não passa `protocolo`). Polish da Fase 36. Não bloqueante.

## Pendências pro Daniel
- **Frente 1 (saque):** rodar manualmente os passos com cartão Stripe (onboarding Connect +
  pagar mensalidade). Depois eu valido o lado do banco/Stripe se quiser.
- Decidir Fase 37 (Cockpit CEO) A/B/C ou Fase 33 (Painel Verde) — recomendações do cowork.
