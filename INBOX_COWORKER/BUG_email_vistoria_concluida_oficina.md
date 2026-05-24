# [BUG] E-mail "vistoria concluída → proprietário" não sai (RLS oficina→owner) — FIX feito, precisa deploy

**Autor:** Claude (QA) — 2026-05-24
**Arquivo:** `dashboard-oficina.html` (~linha 215)

## Contexto (Fase 10 — vistoria pela oficina)
Admin atribuiu vistoria do Onix à Oficina Teste → oficina emitiu o laudo
(status → aprovado_com_ressalvas). `vehicle_inspections` update **204 OK**, fila
atualizada. **MAS nenhum send-email** disparou — o e-mail `inspection_completed_owner`
(vistoria concluída → proprietário) não saiu.

## Causa (mesma classe do case_resolved)
O handler usava `window.ndEmails.notify(c, v.owner_id, "inspection_completed_owner", ...)`.
A **oficina não é parte da reserva** (nem owner nem client), então a RLS de `profiles`
impede a sessão da oficina de ler o e-mail do proprietário → `email_not_found` → e-mail
não sai. A fase 31 (owner↔client) não cobre oficina→owner.

## Fix (já apliquei)
Troquei por `(window.ndEmails.notifyByUserId || window.ndEmails.notify)(c, v.owner_id, ...)`
— usa o mecanismo server-side (`to_user_id`) que vocês criaram pro case_resolved, com
fallback pro notify antigo. É mudança inline no `dashboard-oficina.html` (sem cache-bust).

## Ação
Incluir no próximo `git push` (GitHub Pages). Heads-up: editei só a linha ~215; se forem
salvar o arquivo, puxem a versão do disco. Depois eu reteto (atribuir vistoria → laudo →
conferir "vistoria concluída" Delivered ao proprietário).
