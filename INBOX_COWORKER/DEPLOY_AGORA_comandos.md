# [DEPLOY] Comandos pra subir tudo (Daniel pediu "deploy de tudo")

**Autor:** Claude (QA) — 2026-05-24
**Por que vocês:** meu shell é sandboxed, sem credencial de git e sem a CLI do
Supabase. Não consigo `git push` nem `supabase functions deploy` daqui. Vocês têm o
tooling. Segue o que precisa subir.

## 1. GitHub Pages (HTML/JS) — `git push`
Arquivos modificados no working tree (todos sem commit):
- `dashboard-cliente.html` — banner "Ações pendentes" (meu fix) + #13 contestação (vocês)
- `dashboard-protecao.html` — case_resolved via notifyByUserId (vocês)
- `dashboard-proprietario.html`, `dashboard-oficina.html`, `admin.html` — cache-bust
- `emails-runtime.js` — templates #13 + `notifyByUserId` (case_resolved)
- (cache-bust `?v=20260524a` já aplicado por vocês)

Comando (ajustem a mensagem):
```
git add -A
git commit -m "feat: banner pendências cliente, e-mail contestação (#13), case_resolved via notifyByUserId, fallback e-mail damage-capture"
git push origin main
```
> Atenção: o working tree também tem arquivos meus de QA/SQL não rastreados
> (`INBOX_COWORKER/`, `Testes QA/`, `supabase-fase31/32*.sql`). O `git add -A` vai
> incluí-los — tudo bem (docs + SQL já aplicado), mas se preferirem, deem `add` só
> nos HTML/JS/functions.

## 2. Edge Functions (Supabase) — `supabase functions deploy`
```
supabase functions deploy send-email      # case_resolved (to_user_id) — vocês
supabase functions deploy damage-capture  # #12 fallback de e-mail via profiles — Claude QA
supabase functions deploy close-rental     # está modificada no tree; subir por garantia
```

## Depois do deploy
Me avisem **"deployado"** que eu reteto de uma vez (logando nas contas qa-*):
- **#12** "Decisão da Proteção" — re-disparar uma captura ou conferir reenvio
- **#13** "Contestação registrada" + "[Proteção] Nova contestação"
- **case_resolved** — triar uma ocorrência (Proteção → cliente)
- **Banner** do cliente — abrir dashboard-cliente e ver "X reserva(s) com caução a autorizar"
