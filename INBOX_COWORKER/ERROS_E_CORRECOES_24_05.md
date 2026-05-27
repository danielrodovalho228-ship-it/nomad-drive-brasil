# Índice de erros encontrados + prompts de correção — QA 24/05/2026

> Consolidação de tudo que o QA (Claude, lado navegador) achou hoje.
> Cada erro tem um prompt de correção (arquivo .md). Marcados ✅ os já resolvidos.

---

## 🔴 ABERTOS (precisam de correção/deploy)

### 1. [CRÍTICO] Saque "Sacar agora" falha — `withdrawal_id ausente`
- **Prompt:** `BUG_saque_withdrawal_id_ausente.md`
- **Resumo:** clicar "Sacar agora" (Marcos, marco available R$1.080) → `liberar-saque-parcial`
  retorna **400 `{"error":"withdrawal_id ausente."}`**. O handler do `#timelineCtaBtn` não
  manda `withdrawal_id` no body. Pré-condições todas OK (Connect ativo, marco available).
- **Fix:** passar `{ body: { withdrawal_id: <id do marco available> } }` no invoke. + redeploy/git push.
- **Status:** aberto (aguarda cowork). Bloqueia a feature-chave da Sprint 2.

### 2. Fase 36 — rodapé "📋 Protocolo" não sai nos e-mails
- **Prompt:** `BUG_fase36_rodape_protocolo_nao_aparece.md`
- **Resumo:** template suporta, mas payload não passava `protocolo` (e `protocol_number` nulo
  em casos antigos). Confirmado: e-mail de triagem sem o rodapé.
- **Status:** cowork respondeu **FIXADO** (force-backfill `supabase-fase36d-...sql` + Edge
  Functions passam protocolo). **Falta DEPLOY:** rodar o SQL force-backfill + redeploy
  `damage-capture` e `liberar-saque-parcial`. Depois eu reteto.

### 3. E-mail "vistoria concluída → proprietário" não saía (RLS oficina)
- **Prompt:** `BUG_email_vistoria_concluida_oficina.md`
- **Resumo:** oficina não é parte da reserva → `notify` não lia o profile do dono (RLS).
- **Fix (eu apliquei):** troquei `notify`→`notifyByUserId` em `dashboard-oficina.html:215`.
- **Status:** fix no código local, **falta git push** + reteste.

### 4. [OPS] Repo local possivelmente atrás do deployado
- **Resumo:** o handler do `#timelineCtaBtn` (saque) não está no `reserva-detalhe.html` local
  (só o `<button>`), mas existe no site deployado. HEAD local = `2504c5c`, working tree diverge
  de `origin/main`. **Ação:** conferir/sincronizar local↔remote pra evitar que minhas edições
  futuras partam de uma base velha.

---

## ✅ JÁ RESOLVIDOS hoje (em RESOLVIDOS/) — pro histórico
- **fase31** RLS partes da reserva (e-mail "Retirada aprovada" #9) — aplicado + retestado ✅
- **#12** "Decisão da Proteção" — fallback de e-mail no `damage-capture` — fix + retestado ✅
- **#13** "Contestação registrada" — cowork — retestado ✅
- **case_resolved** (Proteção→cliente, Caminho A `to_user_id`) — cowork — retestado ✅
- **Fluxo 3** "Liberar sem cobrança" — retestado (2 e-mails Delivered) ✅
- **Fluxo 6** triagem cópia ao proprietário (RPC `get_case_counterparty`) — cowork — retestado ✅
- **Banner "Ações pendentes"** (caução/mensalidade pendente no painel do cliente) — eu — deployado ✅
- **#5/#6** "Veículo aprovado/recusado" — cowork — retestado ✅

---

## Ordem sugerida de prioridade
1. **Saque (item 1)** — crítico, é o coração da Sprint 2.
2. **Deploy do item 2** (force-backfill + Edge) — fecha a Fase 36 nos e-mails.
3. **git push do item 3** (vistoria) + sincronizar repo (item 4).

Depois de cada deploy, me avisa "deployado X" que eu reteto na hora.
