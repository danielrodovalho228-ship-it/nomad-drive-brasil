# [BUG] E-mails "navegador → contraparte" não saem (RLS de profiles) — FIX PRONTO, falta aplicar

**Reportado por:** Claude (QA, lado do Daniel)
**Data:** 2026-05-24
**Prioridade:** alta
**Arquivos envolvidos:** `emails-runtime.js` (notify), `supabase-schema.sql` (policy profiles), **fix em `supabase-fase31-profiles-partes-reserva.sql`**

## Contexto
Rodando o Fluxo B (check-in/out) com as contas `qa-*`. Quando o proprietário
aprova a retirada, o app deveria mandar o e-mail "Retirada aprovada" pro cliente
via `window.ndEmails.notify(...)` (roda no NAVEGADOR do proprietário).

## O que esperava
E-mail "Retirada aprovada — em uso" chegando pro cliente (qa-cliente@).

## O que aconteceu
Nenhum e-mail. Confirmado no Resend (não aparece "Retirada aprovada") e na caixa
`contato@` do Hostinger (só chegaram "Mensalidade confirmada", "Caução autorizada"
e "Locação encerrada", que saem de Edge Functions). A aprovação da vistoria em si
funciona (update 204).

## Causa-raiz (confirmada com cliente supabase autenticado no browser)
`notify()` resolve o e-mail do destinatário lendo `profiles` na **sessão do
navegador**. A policy `profiles_select_own` só deixa cada usuário ler o PRÓPRIO
perfil (`id = auth.uid() or is_admin()`). Então o proprietário lê 0 linhas do
perfil do cliente → `notify` devolve `email_not_found` → e-mail não sai.
Vale pra TODOS os e-mails "navegador → contraparte" (retirada aprovada/recusada,
check-in solicitado→proprietário, e provavelmente avaria/contestação do Fluxo C).
Os e-mails de Edge Function (service role) NÃO sofrem disso.

Teste que comprova (sessão qa-proprietario, dono da reserva):
- ler booking → OK (acha client_id)
- ler `profiles` do cliente → 0 linhas, sem erro (RLS)
- ler o próprio profile → 1 linha, com e-mail
- `ndEmails.notify(..., 'inspection_approved_client', ...)` → `{ok:false, error:"email_not_found"}`

## Fix (Daniel escolheu a Opção A — RLS partes da reserva)
Já escrito em **`supabase-fase31-profiles-partes-reserva.sql`** (raiz do repo):
adiciona policy `profiles_booking_parties_select` permitindo que owner e client
de UMA MESMA reserva leiam o perfil um do outro. Soma por OR à policy atual.

## Ação necessária (não consigo fazer eu mesmo — é controle de acesso)
Aplicar a migração no Supabase (SQL Editor → colar o conteúdo do arquivo → Run).
NÃO precisa deploy do GitHub Pages (é mudança de banco, vale na hora).

## Critério de aceite (eu reteto depois)
- `ndEmails.notify(..., 'inspection_approved_client', ...)` retorna `{ok:true}`.
- E-mail "Retirada aprovada" aparece como Delivered no Resend e na caixa Hostinger.

## Quando aplicar, escreve aqui embaixo "aplicado" que eu reteto e movo pra RESOLVIDOS/.

## ✅ Resposta Claude (2026-05-24) — RESOLVIDO
Fase 31 aplicada pelo Daniel. Revalidei (sessão qa-proprietario):
- Leitura do profile do cliente (contraparte): agora retorna a linha ✅
- `ndEmails.notify(..., 'inspection_approved_client', ...)` → `{ok:true, id:...}` ✅
- E-mail "Retirada aprovada" passou a ser enviado. Movendo pra RESOLVIDOS/.
