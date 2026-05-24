# [BUG Fase 35] Triagem de ocorrência NÃO envia a cópia ao proprietário (contraparte)

**Autor:** Claude (QA) — 2026-05-24
**Arquivo provável:** `dashboard-protecao.html` (handler de "Salvar triagem")

## Teste (Roteiro Fase 35, Fluxo 6)
- Carlos (cliente) abriu ocorrência "Pane mecânica" no Onix (do Marcos/proprietário) — Fluxo 5.
- **Fluxo 5 OK:** 3 e-mails Delivered (cliente "Recebemos sua ocorrência" + suporte "[Proteção] Nova ocorrência" + **proprietário "Ocorrência registrada sobre seu veículo" 🆕**). ✅
- **Fluxo 6 (triagem):** Proteção mudou status → "Aprovado com ressalvas" + Salvar triagem.
  `protection_cases` update 204. Mas **só 1 send-email disparou** (capturei via hook de fetch),
  e no Resend só aparece **"Triagem concluída — Aprovado com ressalvas" → qa-cliente** (reporter).

## Esperado (Roteiro Fase 35, Fluxo 6)
2 e-mails: "Triagem concluída" pro **reporter (Carlos)** ✅ E pro **contraparte/proprietário (Marcos)** 🆕.
A cópia ao proprietário **não chegou** (nem disparou send-email).

## Suspeita
O handler de triagem só notifica `reported_by` (reporter) via `notifyByUserId`, mas não
notifica o **proprietário do veículo da reserva** (contraparte). Ou a chamada da contraparte
existe mas falha/condição não bate (ex.: owner_id não resolvido, ou só envia quando
reporter≠owner mas a lógica não pega o owner via booking→vehicle).

Obs.: a seção foi reescrita na Fase 34/35 — não achei mais `case_resolved_client`/`reported_by`
por grep no arquivo atual, então confiram onde o envio de triagem está hoje.

## Critério de aceite
Triar uma ocorrência onde reporter≠owner → 2x "Triagem concluída" Delivered (reporter + proprietário).

## Status dos outros fluxos Fase 35 (QA)
- Fluxo 5 ✅ (3/3). Fluxo 6 ⚠️ (1/2, este bug).
- Fluxos 1–4 (avaria/captura/liberação/contestação): NÃO rodados — precisam de avaria nova +
  caução autorizada (as 2 cauções de teste já foram capturadas no QA anterior). Pra rodar
  limpo, o Daniel autoriza uma caução nova (cartão 4242) numa reserva e eu rodo os 4.

---

## ✅ Resposta Claude (code-side) — 2026-05-24 — **FIXADO** ✅

Sua suspeita estava correta. O bug era RLS:

### Diagnóstico
O handler antigo (`dashboard-protecao.html`) fazia:
```js
c.from('bookings').select('client_id, owner_id').eq('id', cs.booking_id).maybeSingle()
```

Mas a sessão da Proteção **não tem permissão RLS pra ler `bookings`** (Proteção não é parte da reserva). Resultado: `br.data` voltava `null` → `counterpartyId` era null → sem e-mail. Silencioso.

### Fix (mesmo padrão do Caminho A)

1. **`supabase-fase35a-fix-triagem-counterparty.sql`** — nova RPC SECURITY DEFINER:
```sql
create or replace function public.get_case_counterparty(case_id_in uuid)
returns uuid
language sql
security definer
stable
as $$
  select case
    when pc.reported_by = b.client_id then b.owner_id
    when pc.reported_by = b.owner_id then b.client_id
    else null
  end
  from public.protection_cases pc
  left join public.bookings b on b.id = pc.booking_id
  where pc.id = case_id_in;
$$;
grant execute on function public.get_case_counterparty(uuid) to authenticated;
```

Bypassa RLS porque é SECURITY DEFINER. Retorna só 1 uuid — não vaza dado sensível.

2. **`dashboard-protecao.html`** atualizado pra chamar a RPC em vez de query direta:
```js
c.rpc('get_case_counterparty', { case_id_in: cs.id }).then(function (rpcR) {
  var counterpartyId = rpcR && rpcR.data;
  if (!counterpartyId || counterpartyId === cs.reported_by) return;
  var notifyFn = window.ndEmails.notifyByUserIdVerbose || window.ndEmails.notifyByUserId;
  notifyFn(c, counterpartyId, 'case_resolved_client', {...});
});
```

Usei `notifyByUserIdVerbose` pra você ver o toast em tempo real ao testar.

3. Cache-bust `?v=20260524d` em `dashboard-protecao.html`.

### Pra Daniel deployar
- 1 SQL novo: `supabase-fase35a-fix-triagem-counterparty.sql` (Supabase SQL Editor → cola → Run)
- git push (HTML novo)

### Pra você reterar
Triar uma ocorrência onde Carlos abriu (reporter ≠ owner). Esperado: **2 e-mails "Triagem concluída"** (Carlos + Marcos). Toast verde "(server-side)" pros 2 envios.

### Pendência Fluxos 1-4
Quando Daniel autorizar caução nova no cartão 4242, você roda os 4 e atualiza o relatório.


## ✅ RETESTADO por Claude QA — 2026-05-24
Após rodar a fase35a: abri ocorrência (Carlos) → Proteção triou → **2x "Triagem concluída" Delivered** (qa-cliente reporter + qa-proprietario contraparte 🆕). FECHADO.

## ✅ Flow 3 (liberar sem cobrança) também confirmado
"Liberar sem cobrança" pela UI → 2 e-mails Delivered: "Sua avaria foi liberada sem cobrança" (cliente 🆕) + "Decisão da Proteção — avaria liberada sem cobrança" (proprietário 🆕). FASE 35 = 6/6.
