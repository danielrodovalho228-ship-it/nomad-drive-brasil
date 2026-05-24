# 📬 Protocolo de comunicação Claude ↔ Cowork

Esta pasta é o canal de comunicação entre o Claude (assistente do Daniel) e o cowork que está trabalhando no projeto do outro lado.

---

## 🧭 Como funciona

### ➡️ Cowork → Claude (reportar bug, pedir fix, tirar dúvida)

1. Criar um arquivo `.md` aqui em `INBOX_COWORKER/` com nome descritivo:
   - `BUG_<feature>_<curto>.md` — pra bugs
   - `PERGUNTA_<topico>.md` — pra dúvidas
   - `MELHORIA_<topico>.md` — pra sugestões
   - Exemplo: `BUG_stripe_checkout_email.md`

2. **Estrutura sugerida** dentro do arquivo:
   ```markdown
   # [BUG/PERGUNTA/MELHORIA] Título curto

   **Reportado por:** Cowork
   **Data:** YYYY-MM-DD
   **Prioridade:** alta/média/baixa
   **Arquivos envolvidos:** caminho/relativo/do/arquivo.html

   ## Contexto
   O que você estava fazendo quando aconteceu

   ## O que esperava
   Comportamento esperado

   ## O que aconteceu
   Comportamento real (cole logs, mensagem de erro, screenshot path)

   ## Passos pra reproduzir
   1. Faz X
   2. Clica Y
   3. Vê Z
   ```

### ⬅️ Claude → Cowork (responder, propor fix)

- Eu **respondo no mesmo arquivo**, adicionando uma seção `## ✅ Resposta Claude (YYYY-MM-DD)` no fim
- Se eu fizer o fix, listo os arquivos alterados e o commit hash
- Se precisar de info adicional, adiciono `## ❓ Preciso saber`

### 📦 Arquivar resolvido

- Quando o problema fica resolvido (testado e confirmado), **mover o arquivo** pra `INBOX_COWORKER/RESOLVIDOS/`
- Mantém histórico, libera a inbox

---

## 🚦 Regras de ouro

1. **Um problema por arquivo** — não junta vários bugs num só `.md`
2. **Caminhos relativos** — sempre que citar arquivo, usar caminho relativo da raiz (`reserva-detalhe.html`, não `C:\Users\...`)
3. **Sem credenciais** — nunca colar senhas, tokens, API keys nesses arquivos (vai parar no git)
4. **Logs sensíveis** — se precisar colar log do Stripe/Supabase, mascarar IDs longos (`cus_xxx...123`)
5. **Confirmação no fim** — depois que eu propor fix, o cowork testa e confirma "✅ OK" antes de mover pra `RESOLVIDOS/`

---

## 📊 Status atual da inbox

> Esta seção é atualizada conforme arquivos entram/saem da inbox.

**Pendentes:** 0
**Em análise:** 0
**Resolvidos hoje:** 0

---

## 📞 Quando o Daniel volta

Daniel: quando você voltar pra falar comigo, é só dizer:
- **"Tem mensagem na inbox"** → eu leio todos os `.md` novos e respondo
- **"Cowork resolveu X"** → eu marco e arquivo
- **"Roda o protocolo"** → eu faço varredura completa da inbox e te dou um resumo
