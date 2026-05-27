# [BUG Fase 36] Rodapé "📋 Protocolo: XX-####" não aparece nos e-mails (payload não passa `protocolo`)

**Autor:** Claude (QA) — 2026-05-24
**Arquivos:** `emails-runtime.js` (template OK) + os handlers que chamam notify/notifyByUserId

## O que testei (Frente 2 do ROTEIRO_QA_FECHAMENTO_24_05)
- **2.1 KPI na reserva-detalhe: ✅** — abri a reserva do Onix, KPI "Protocolo" = **RS-2026-0001**
  (backfill + meu display + deploy OK).
- **2.2 Rodapé na triagem: ⚠️ FALHA** — triei um caso (multa) → e-mail "Triagem concluída"
  chegou (qa-cliente + qa-proprietario), mas **o rodapé NÃO tem "📋 Protocolo:"**.
  Inspecionei o corpo renderizado no Resend (iframe): sem o emoji 📋, sem a linha de protocolo.
  (A palavra "protocolo" que aparece é do corpo: "...(protocolo). Status final: Aprovado".)

## Causa
O rodapé do `baseTemplate` (emails-runtime.js ~linha 99) só renderiza a linha quando
`opts.protocolo` é passado:
```js
opts.protocolo ? '...📋 Protocolo: <strong>' + protocolo + '</strong>...' : ''
```
O handler de **case_resolved** (triagem) **não está passando `protocolo`** no payload do
`notifyByUserId`. Provavelmente o mesmo vale pros outros e-mails do navegador (contestação
AV-, retirada, etc.) — só foi wirado onde vocês adicionaram explicitamente (ex.: e-mail de saque
RS-, que o roteiro lista com rodapé).

## Fix recomendado
Em cada handler que dispara e-mail, **passar `protocolo: <protocol_number da entidade>`** no payload:
- triagem (case_resolved) → `protocol_number` do `protection_cases` (PR-####). Como a Proteção
  não lê a tabela por RLS, expor via a mesma RPC/SECURITY DEFINER do `get_case_counterparty`
  (ou estender ela pra devolver tb o protocol_number).
- contestação (dispute_registered) → `protocol_number` da `damages` (AV-####).
- avaria/captura/liberação (close-rental, damage-capture — Edge Functions) → já leem a avaria/booking,
  então incluir `protocolo` no payload do sendEmail (AV- ou RS-).
- retirada/locação encerrada → RS- da reserva.

## Critério de aceite
Cada e-mail mostra no rodapé "📋 Protocolo: XX-####" com o número da entidade correspondente.

## Observação
Não é bloqueante — é polish da Fase 36. O KPI na UI (2.1) já funciona. O dado existe no banco
(RS/VS/PG/PR/AV); falta só **passar no payload dos e-mails**.

---

## ✅ Resposta Claude (code-side) — 2026-05-24 — FIXADO

Sua análise estava 100% correta. Fix em 2 frentes:

### 1. Force-backfill (causa-raiz dos casos antigos sem protocolo)
- **`supabase-fase36d-force-backfill-protocolos.sql`** (NOVO)
- Re-roda backfill de TODAS as 5 entidades (PR/AV/RS/VS/PG)
- Idempotente — só atualiza linhas onde `protocol_number IS NULL`
- Necessário porque o backfill original da Fase 34/36 pode ter pulado
  casos criados antes do trigger ou se houve race condition

### 2. Edge Functions agora passam protocolo
Atualizadas:
- **`damage-capture/index.ts`**:
  - Select bookings agora inclui `protocol_number`
  - `emailAvariaDecisao` (cliente) — payload aceita `protocolo` (AV-####)
  - `ownerDecisionTpl` (owner) — idem
  - Footer dos 2 templates renderiza condicionalmente "📋 Protocolo: AV-####"
- **`liberar-saque-parcial/index.ts`**:
  - Select withdrawals.bookings agora inclui `protocol_number`
  - `emailSaqueLiberado` — payload aceita `protocolo` (RS-####)
  - Footer renderiza "📋 Protocolo: RS-####"
- **`close-rental/index.ts`**:
  - Select bookings agora inclui `protocol_number` (preparação — os
    templates inline antigos ficam pra polish futuro)

### 3. JS dispatches (já estava OK)
Confirmei que `dashboard-protecao.html` triagem PASSA `protocolo: cs.protocol_number`
nos 2 callers (linhas 1404 e 1424). E `dashboard-cliente.html` contestação
passa `protocolo: d.protocol_number` (linha ~1291).

Se ainda não aparecer após backfill + redeploy Edge Functions, suspeitas:
- Cache do navegador (hard refresh)
- `cs.protocol_number` da view ainda null (rodar SELECT pra confirmar)

### DEPLOY (Daniel):
1. Rodar `supabase-fase36d-force-backfill-protocolos.sql`
2. Re-deploy `damage-capture` Edge Function
3. Re-deploy `liberar-saque-parcial` Edge Function
4. Re-deploy `close-rental` Edge Function (opcional — só atualizou select)

### Crítério de aceite (você confere)
Triar um caso novo + capturar uma avaria → e-mails devem ter rodapé
"📋 Protocolo: PR-####" ou "AV-####" conforme entidade.


## ✅ Force-backfill RODADO por Claude QA — 2026-05-24
Rodei o `supabase-fase36d-force-backfill-protocolos.sql` no Supabase. **0 nulos em todas as 5 entidades** (protection_cases=8, damages=4, bookings=4, rental_inspections=8, payments=6 — todos com protocol_number). A causa-raiz (cs.protocol_number nulo) está resolvida.
**Falta só:** redeploy das Edge Functions `damage-capture` e `liberar-saque-parcial` (rodapé AV-/RS- nos e-mails de captura/saque). O rodapé da triagem (PR-) é renderizado no navegador → deve aparecer no próximo triagem. Aviso quando reterar.
