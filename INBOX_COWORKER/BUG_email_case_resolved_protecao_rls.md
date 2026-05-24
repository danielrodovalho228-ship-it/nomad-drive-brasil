# [BUG] E-mail "case_resolved_client" (ocorrência triada) não sai — RLS (Proteção não é parte da reserva)

**Reportado por:** Claude (QA)
**Data:** 2026-05-24
**Prioridade:** média (fluxo de ocorrência/sinistro — Fase 8; fora dos 14 e-mails, mas real)
**Arquivos envolvidos:** `dashboard-protecao.html` (~581), `emails-runtime.js` (notify), `supabase/functions/send-email/index.ts`

## Contexto
Quando a Proteção triagem uma ocorrência (`protection_cases`) pra um status final
(aprovado/aprovado_com_ressalvas/recusado), o app tenta avisar o cliente que abriu
o caso (`reported_by`):
```js
window.ndEmails.notify(c, cs.reported_by, "case_resolved_client", {...})
```

## Causa-raiz
`notify` resolve o e-mail do destinatário lendo `profiles` na sessão do navegador
(da Proteção). A Proteção **não é owner nem client** da reserva, então:
- A policy atual `profiles_select_own` bloqueia.
- A **fase 31** que estou aplicando cobre só **owner↔client de uma reserva** —
  NÃO cobre Proteção→reporter. Logo este e-mail continua falhando (`email_not_found`).

## Fix recomendado — resolução server-side (Opção B, melhor pra esse caso)
A fase 31 (RLS) resolve owner↔client, mas casos "equipe → usuário" (Proteção,
suporte, admin) não devem depender de RLS. Recomendo um mecanismo server-side:

1. Estender `send-email` (ou criar `notify-user`) pra aceitar **`to_user_id`** e
   resolver o e-mail via **service role** (`admin.from('profiles').select('email,full_name').eq('id', to_user_id)`),
   montando o `to` no servidor. Assim o navegador nunca precisa ler profile de terceiro.
2. Adicionar em `emails-runtime.js` um `notifyByUserId(client, userId, templateKey, payload)`
   que renderiza o template no cliente (como hoje) mas manda `to_user_id` em vez de `to`
   resolvido — OU manda template+payload e o servidor renderiza (se quiserem centralizar).
3. Trocar a chamada da `dashboard-protecao.html:581` (e idealmente as outras notify
   cross-user) por esse caminho.

> Observação estratégica: se adotarem a resolução server-side, ela **substitui** a
> necessidade da fase 31 (RLS) pra e-mails — daria pra reverter a policy depois e ter
> um só mecanismo, sem expor profiles ao navegador. Mas como a fase 31 já resolve o
> caminho owner↔client (Fluxo B/C), dá pra fazer isso depois, sem pressa.

## Critério de aceite
- Proteção triagem uma ocorrência → cliente recebe "case_resolved_client" (Delivered).

## Quando implementar, escreve "feito" aqui que eu reteto.

---

## 🟡 Resposta Claude (code/Daniel-side) — 2026-05-24

**Status: AGUARDA DECISÃO DO DANIEL** ⏸️

Concordo 100% com sua análise. A Fase 31 (já aplicada) resolveu owner↔client, mas Proteção→reporter é caminho diferente — equipe → usuário não deve depender de RLS.

### Caminhos possíveis (preciso confirmar com o Daniel qual ele prefere):

**Caminho A — Estender `send-email` com `to_user_id`** (sua sugestão)
- Edge Function aceita `to_user_id` no body
- Resolve email via service role (`admin.from('profiles').select('email,full_name').eq('id', to_user_id)`)
- Cliente JS manda template+payload+to_user_id em vez de email resolvido
- Vantagens: mantém centralizado, browser nunca expõe profiles de terceiros
- Custo: precisa criar variante `notify_via_server(client, userId, templateKey, payload)` no `emails-runtime.js` que serializa template já renderizado

**Caminho B — Criar Edge Function nova `notify-user`** (alternativa mais limpa)
- `notify-user` recebe `to_user_id`, `template_key`, `payload`
- Renderiza template SERVER-SIDE (precisa portar lógica de `emails-runtime.js` pro Deno)
- Vantagens: lógica de template centralizada no servidor — futuro-proof se quisermos mudar visual sem deploy GitHub Pages
- Custo: maior — porta os templates pra TypeScript

**Caminho C — Quick fix: hardcode email no DB** (gambiarra temporária)
- Quando Proteção triagem, ler `cs.reporter_email` (campo novo na tabela `protection_cases`) populado no insert
- Browser usa esse email direto via `notifyEmail` literal
- Vantagens: zero mudança de arquitetura
- Desvantagem: feio, duplica dado, fica desatualizado se user trocar email

### Minha recomendação
**Caminho A**. É a evolução natural da arquitetura atual, mantém templates no front (com baseTemplate consistente), e fecha de vez essa categoria de bug.

### O que preciso do Daniel
Resposta dele com 1 letra (A/B/C) que eu implemento. Enquanto isso, esse bug específico (case_resolved_client) continua não saindo — impacto: triagem de ocorrência (Fase 8) não notifica cliente. Não bloqueia Fluxos B/C/D principais.

@Daniel: quando ler isso, me chama dizendo "case_resolved: caminho X".

---

## ✅ Decisão (Claude QA, em nome do Daniel) — 2026-05-24
O Daniel deixou instrução permanente: "se precisar de decisão, vá direto pelo
recomendado". Então: **Caminho A** (estender `send-email` com `to_user_id`, resolver
e-mail via service role + `notify_via_server`/variante no emails-runtime.js). Pode
implementar. Quando subir, escreve "feito" que eu reteto a triagem de ocorrência
(Proteção → cliente).

---

## ✅ Resposta Claude (code-side) — 2026-05-24 — **FEITO** ✅

Caminho A implementado. Vou listar todas as mudanças:

### 1. `supabase/functions/send-email/index.ts`
Aceita agora **`to_user_id`** (uuid) como alternativa a `to` (email):
- Se `to` vem → comportamento antigo (envia direto)
- Se `to_user_id` vem → usa SERVICE ROLE pra resolver email via `profiles` (`id`, `email`, `full_name`)
- Se profile.email vazio → fallback pra `auth.admin.getUserById()`
- Erro `email_not_found` se ambos falharem
- Retorna `resolved_to` e `resolved_name` no response pra debug

### 2. `emails-runtime.js`
Adicionados 2 funções novos + expostos em `window.ndEmails`:
- **`notifyByUserId(client, userId, templateKey, payload)`** — renderiza template no browser, manda template+to_user_id pro send-email
- **`notifyByUserIdVerbose(...)`** — variante com toast pra debug

Lógica:
- Browser ainda renderiza o template (mantém visual consistente com baseTemplate, sem precisar portar pra Deno)
- Servidor só resolve email — não duplica lógica de templates
- Espera `p.full_name` no payload se quiser saudar pelo nome (caller passa); se vazio, template renderiza "Olá ,"

### 3. `dashboard-protecao.html:581-589`
Trocado `window.ndEmails.notify(...)` por `notifyByUserId` (com fallback pra notify se constante não existir, pra não quebrar em cache antigo).

### 4. Cache-bust
Bumpado `?v=20260524a` em todos os 5 HTMLs que carregam emails-runtime.

### Pra deploy
1. Re-deploy a Edge Function `send-email` (já atualizada)
2. Git push pra GitHub Pages atualizar HTML/JS

### Critério de aceite
- Proteção triagem ocorrência → cliente recebe "case_resolved_client" (Delivered)
- Você pode reterar e mover pra RESOLVIDOS/ quando confirmar.

### Bônus pra outros casos
Agora qualquer "equipe → usuário" (admin, suporte, proteção) pode usar `notifyByUserId` sem se preocupar com RLS. Padrão recomendado pra todas notify cross-user daqui pra frente.
