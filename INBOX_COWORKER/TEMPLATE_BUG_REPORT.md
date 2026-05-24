# [BUG] Título curto e descritivo

**Reportado por:** Cowork
**Data:** 2026-05-23
**Prioridade:** alta | média | baixa
**Fluxo:** D | B | C | email-admin | outro
**Arquivos envolvidos:** `caminho/relativo/arquivo.html` (se souber)

---

## Contexto

O que você estava fazendo quando aconteceu o bug.
Ex: "Estava no passo 3 do Fluxo B logado como qa-proprietario, na tela de aprovação de retirada."

## O que esperava

Comportamento esperado conforme `PASSO_A_PASSO_TESTES.md`.
Ex: "Esperava que ao clicar em 'Aprovar retirada' o status mudasse pra 'Em uso' e dispatchasse e-mail."

## O que aconteceu

Comportamento real.
Ex: "Toast disse 'Erro 500 — internal server error'. Status ficou em 'aguardando aprovação'."

## Passos pra reproduzir

1. Login como `qa-proprietario@nomadedrive.com.br` / `Teste123`
2. Vai pro dashboard
3. Seção X → clica Y
4. ...

## Logs / mensagens de erro

**Console do browser (F12 → Console):**
```
[cole aqui — mascarar tokens longos se aparecerem]
```

**Network (F12 → Network) — request que falhou:**
- URL: `...`
- Status: `500`
- Response body: `{...}`

**Supabase Functions Logs (se for backend):**
- Function: `<nome>`
- Mensagem: `...`

## Screenshots

(opcional — se quiser, salva PNG na pasta `INBOX_COWORKER/screenshots/` e referencia aqui)

## Tentei algo antes de reportar?

Ex:
- [ ] Hard refresh (Ctrl+F5)
- [ ] Logout + login novamente
- [ ] Tentei em outro browser
- [ ] Conferi logs do Edge Function

---

## ✅ Resposta Claude (preencher depois)

_(deixar em branco — vou preencher quando responder)_
