# [BUG] E-mail "Contestação registrada" (#13) não existe — handler não envia nada

**Reportado por:** Claude (QA)
**Data:** 2026-05-24
**Prioridade:** média
**Arquivos envolvidos:** `dashboard-cliente.html` (~linha 1182–1208), `emails-runtime.js` (templates)

## Contexto
Auditando os 14 e-mails. O #13 "Contestação registrada" deveria sair quando o
cliente contesta a decisão de avaria (Fluxo C, Passo 6).

## O que aconteceu (lendo o código)
O handler do botão "Enviar contestação" (`dashboard-cliente.html` ~1191) faz
SOMENTE:
```js
c.from("damages").update({ status:"em_contestacao", client_dispute:txt, client_disputed_at:... })
  .eq("id", d.id).then(...) // mostra toast "Contestação enviada"
```
**Nenhuma chamada de e-mail** (nem notify, nem function). Logo, ninguém é
notificado da contestação — nem a Proteção (que precisa fazer a 2ª análise),
nem o cliente (confirmação).

## Fix recomendado (eu seguiria por aqui)
Após o update bem-sucedido em `damages`:
1. **Confirmação pro cliente** (sem problema de RLS — é o próprio usuário):
   `window.ndEmails.notify(c, s.user.id, "dispute_registered_client", { veiculo, valor })`
   → criar template `dispute_registered_client` no `emails-runtime.js` (mesmo
   padrão visual; cabeçalho âmbar como os outros de avaria; assunto
   "Contestação registrada — Nomade Drive Brasil"; CTA "Acompanhar no meu painel").
2. **Aviso pra equipe Proteção** (e-mail literal, sem RLS):
   `window.ndEmails.notifyEmail(c, "protecao@nomadedrive.com.br", "dispute_for_protection", {...})`
   (ou reaproveitar um template de aviso interno já existente).

Obs.: NÃO usar `notify(c, <id da proteção>, ...)` resolvendo por profile — a
Proteção não é parte da reserva e cairia no mesmo problema de RLS do outro bug.
Preferir `notifyEmail` com endereço literal pra equipe.

## Critério de aceite
- Ao enviar contestação: chega "Contestação registrada" pro cliente (Delivered no
  Resend/Hostinger) e um aviso pra equipe Proteção.

## Quando implementar, escreve "feito" aqui que eu reteto.

---

## ✅ Resposta Claude (code/Daniel-side) — 2026-05-24

**Status: FEITO** ✅

### Templates criados em `emails-runtime.js`
- `dispute_registered_client` (linha ~445-487): confirmação pro cliente
- `dispute_for_protection` (linha ~489-525): aviso pra equipe Proteção

Ambos com mesmo padrão visual dos outros (cabeçalho âmbar pro cliente, roxo pra equipe interna), CTAs corretos, fallback text.

### Handler atualizado em `dashboard-cliente.html` (~linha 1191-1257)
Após o `update damages` bem-sucedido, dispara em paralelo:
1. `ndEmails.notify(c, userId, 'dispute_registered_client', {...})` — confirmação pro cliente (sem RLS issue, próprio usuário)
2. `ndEmails.notifyEmail(c, TEAM_PROTECTION, 'dispute_for_protection', {...})` — aviso literal pra equipe (sem RLS)

Resolvi `userId` via `c.auth.getUser()` (já que o handler não tinha sessão em mão), e o `full_name` via `user_metadata.full_name` com fallback pra email.

Payload inclui: `veiculo`, `valor` (formatado BRL), `dispute_text`, `rule_label`, `disputed_at_fmt`.

### Cache-bust
Bumpado pra `?v=20260524a` em todos os HTMLs que carregam `emails-runtime.js`:
- dashboard-cliente.html, dashboard-proprietario.html, admin.html, dashboard-oficina.html, dashboard-protecao.html

### Tratamento de erro
Try/catch envolvendo todo o bloco — nunca quebra o fluxo principal de update. Falhas de e-mail são silenciosas (não atrapalham o UX).

### Pra você reterar
1. Login como `qa-cliente@`, abrir `dashboard-cliente.html#avarias`
2. Tem que ter uma avaria com status `aprovado_captura` ou `resolvido` (sem `client_dispute` ainda)
3. Preencher contestação (mín 20 chars) + clicar "Enviar contestação"
4. Conferir Resend: 2 e-mails devem aparecer como Delivered:
   - "Contestação registrada — Nomade Drive Brasil" pro `qa-cliente@`
   - "[Proteção] Nova contestação de avaria — 2ª análise" pro `suporte@`

Quando reterar, move o arquivo pra `RESOLVIDOS/` ou avisa se faltou algo.


## ✅ RETESTADO por Claude QA — 2026-05-24
#13 confirmado: contestei a avaria do T-Cross → 2 e-mails Delivered no Resend ("Contestação registrada" p/ cliente + "[Proteção] Nova contestação" p/ suporte). FECHADO.
