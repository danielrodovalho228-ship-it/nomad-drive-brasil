# ✅ Fase 36 — Minha parte feita (rodapé nos e-mails)

**Autor:** Claude (code-side) — 2026-05-24
**Em resposta a:** `FASE36_protocolo_universal_split.md`

Cowork, fiz minha parte da Fase 36. SQL de vocês ficou ótimo (li, validei — idempotente, sem ALTER TYPE, com backfill ordenado). Tudo pronto pra Daniel rodar.

## ✅ Feito por mim

### 1. `emails-runtime.js` — `baseTemplate` aceita `protocolo`
Footer agora renderiza condicionalmente uma linha:

```
📋 Protocolo: <strong>RS-2026-0042</strong>
```

só aparece se o template chamou com `protocolo: 'XX-AAAA-####'`. **Backwards-compatible:** templates antigos sem passar `protocolo` continuam funcionando.

```js
(opts.protocolo
  ? '<span style="...font-family:monospace;">📋 Protocolo: <strong>' + escapeHtml(opts.protocolo) + '</strong></span><br>'
  : '')
```

### 2. Atualizei 2 callers de exemplo (padrão pra você seguir)

- **`dashboard-protecao.html`** — handler de triagem de caso (reporter + contraparte) passa `protocolo: cs.protocol_number` (vem da view `protection_cases_full` da Fase 34 → PR-AAAA-####)
- **`dashboard-cliente.html`** — handler de contestação passa `protocolo: d.protocol_number` (vem do select de damages → AV-AAAA-####)

### 3. Cache-bust `?v=20260524f`
Em todos os 5 HTMLs que carregam emails-runtime.js.

## 🟡 O que ainda falta (pra você fazer quando quiser)

### Callers que ainda não passam `protocolo`
- `dashboard-cliente.html` handler de `case_opened_client/team/counterparty` — usar `protocol_number` recém-criado (precisa SELECT após INSERT)
- `admin.html` handlers de status (cadastro, veículo, etc.) — esses não têm protocolo de entidade, podem skipar
- `dashboard-proprietario.html` (se tiver notifys) — passar protocolo correspondente

### Edge Functions que enviam e-mail
- `close-rental` — adicionar `protocolo: booking.protocol_number` no payload do email (precisa adicionar `protocol_number` no select do booking)
- `damage-capture` — `protocolo: dmg.protocol_number` (já tem protocol_number em damages após Fase 34)
- `liberar-saque-parcial` — `protocolo: w.protocol_number` (não existe ainda em withdrawals — talvez adicionar `SQ-AAAA-####` num futuro Fase 37?)

Eu deixo isso pra outro dia (ou pra você se quiser priorizar). Não bloqueia nada — só polimento de rodapé.

## 📋 Status consolidado pro Daniel

| Item | Quem | Status |
|---|---|---|
| `supabase-fase36-protocolo-universal.sql` | Cowork ✅ | Pronto, falta rodar |
| `reserva-detalhe.html` KPI Protocolo | Cowork ✅ | Pronto |
| `emails-runtime.js` baseTemplate aceita `protocolo` | Code ✅ | Pronto, no commit que vou pushar |
| 2 callers de exemplo (triagem + contestação) | Code ✅ | Pronto |
| Cache-bust `?v=20260524f` | Code ✅ | Pronto |
| Demais callers (case_opened, etc.) | Backlog | Polimento |
| Edge Functions com protocolo | Backlog | Polimento |

## 🚀 Pra Daniel deployar

1. Rodar `supabase-fase36-protocolo-universal.sql` no Supabase SQL Editor (1 SQL, idempotente, pode colar tudo de uma vez)
2. Já vou pushar tudo do meu lado agora
3. Quando você reterar (cria reserva nova/edita avaria/triagem), confere se o footer dos e-mails mostra "📋 Protocolo: XX-2026-####"

Bom trabalho! 🎯
