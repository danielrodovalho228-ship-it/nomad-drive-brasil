# 🌙 Briefing pro Cowork — Testes Noturnos 23/05/2026

**De:** Claude (assistente do Daniel)
**Pra:** Cowork
**Status do Daniel:** dormindo (deu permissão pra todos os testes em modo Stripe TEST)
**Prioridade:** alta — terminar até ele acordar

---

## 🎯 Sua missão (3 fluxos + relatório)

Execute os 3 fluxos abaixo, na ordem sugerida. Pra cada um, anote num arquivo separado em `INBOX_COWORKER/` o que deu certo, o que deu errado, screenshots se possível, e cole logs do console se aparecer erro.

> **Roteiro detalhado completo:** `PASSO_A_PASSO_TESTES.md` (raiz do projeto)
> **Credenciais:** ver `INBOX_COWORKER/CONTEXTO_PARA_COWORK.md`

---

## ✅ Ordem sugerida

### 1️⃣ Fluxo D — Cancelar assinatura (~1 min)

**Por que primeiro:** mais rápido, valida o fluxo de cancelamento antes de "queimar" a reserva nos outros fluxos.

**Reserva alvo:** `53e86074-c753-41e9-a96f-ea5308ed7125` (Chevrolet Onix)
**URL:** https://nomadedrive.com.br/reserva-detalhe.html?id=53e86074-c753-41e9-a96f-ea5308ed7125

**Passos:**
1. Login `qa-cliente@nomadedrive.com.br` / `Teste123`
2. Abre URL acima
3. Seção "Pagamentos" → card "Assinatura mensal ativa" → "Cancelar assinatura"
4. Confirma modal

**O que validar:**
- [ ] Card muda pra "Assinatura cancelada"
- [ ] E-mail "Assinatura cancelada" chega em https://webmail.hostinger.com/ (login: `contato@nomadedrive.com.br`)
- [ ] Stripe Dashboard (https://dashboard.stripe.com/test/subscriptions) → subscription `qa-cliente@` muda pra "Cancelando" ou "Cancelada"

**Se der erro:** dropa `BUG_fluxo_d_<descricao>.md`. Não tenta seguir.

---

### 2️⃣ Fluxo B — Check-in/Check-out (~5 min)

**Pré-requisito:** Fluxo D OK (ou pode pular se quiser usar a mesma reserva).

**Passos resumidos** (detalhes em PASSO_A_PASSO_TESTES.md):
1. Cliente solicita retirada
2. Logout → Proprietário (`qa-proprietario@`) aprova retirada + km inicial
3. Logout → Cliente solicita devolução
4. Logout → Proprietário aprova devolução **SEM** avaria + km final

**O que validar:**
- [ ] Status passou por: aprovado → em uso → encerrada
- [ ] E-mail "Retirada aprovada"
- [ ] E-mail "Locação encerrada"
- [ ] E-mail "Caução liberada"
- [ ] No Stripe: PaymentIntent da caução cancelado (não capturado)

**Se der erro:** dropa `BUG_fluxo_b_<descricao>.md`.

---

### 3️⃣ Fluxo C — Avaria + Captura (~10 min)

**⚠️ Precisa de RESERVA NOVA** porque a Onix já foi "consumida" no Fluxo B.

**SQL pra criar nova reserva (HB20):** ver `INBOX_COWORKER/SQL_NOVA_RESERVA_FLUXO_C.md` — roda no Supabase SQL Editor antes de começar.

Depois segue o roteiro completo em `PASSO_A_PASSO_TESTES.md` seção Fluxo C:

1. Cliente paga mensalidade + caução (na reserva nova)
2. Cliente retira (passos 1-2 do Fluxo B)
3. Cliente solicita devolução
4. Proprietário aprova devolução **COM** avaria (R$ 300, descrição, 1 foto dummy)
5. Logout → Proteção (`qa-protecao@`) valida e captura R$ 300
6. Logout → Cliente vê avaria e contesta

**O que validar:**
- [ ] Avaria registrada com fotos + descrição + valor
- [ ] Stripe: captura parcial de R$ 300 visível
- [ ] R$ 700 restante liberado
- [ ] 4 e-mails: "Avaria registrada", "Decisão da Proteção", "Contestação registrada"
- [ ] Cliente consegue contestar

**Se der erro:** dropa `BUG_fluxo_c_<descricao>.md` com qual passo travou.

---

## 📋 Template do relatório final

Quando terminar (ou travar de vez), cria `INBOX_COWORKER/RELATORIO_TESTES_23_05.md`:

```markdown
# Relatório de Testes — 23/05/2026 (madrugada)

## Resumo
- Fluxos validados: D ✅ / B ✅ / C ⚠️ (travou no passo 5)
- E-mails recebidos: X de 7 esperados
- Bugs encontrados: 2 (ver arquivos BUG_*.md)

## Detalhe por fluxo

### Fluxo D
[checklist marcado + observações]

### Fluxo B
[checklist marcado + observações]

### Fluxo C
[checklist marcado + observações + onde travou]

## Bugs reportados
- `BUG_fluxo_c_passo5.md`
- `BUG_email_template_avaria.md`

## Dúvidas pro Claude
[se tiver]
```

---

## 🐛 Bugs conhecidos / pegadinhas

Antes de reportar bug, **conferir esses 3 itens**:

1. **Hard refresh (Ctrl+F5)** sempre que mudar de tela
2. **E-mail demora até 2 min** pra chegar no webmail Hostinger
3. **Logs do Edge Function** em: Supabase Dashboard → Functions → `<nome>` → Logs

Bugs conhecidos que JÁ caímos (não reportar de novo):
- ❌ ~~Stripe Checkout com email antigo~~ — já tem fix: limpar `stripe_customer_id`
- ❌ ~~PIX rejeitado quebra checkout~~ — já tem fix: env var `ENABLE_PIX=false`
- ❌ ~~Cache do GitHub Pages~~ — já tem cache-bust nos `<script src>`

---

## 📬 Como me chamar (Claude)

Eu **não estou polling a inbox em tempo real** — o Daniel precisa me invocar pra eu ler.

**Se você dropar bug e precisar resposta urgente:**
- Cria o `.md` aqui na inbox
- Manda mensagem pro Daniel quando ele acordar: "tem bug novo na inbox"
- Ele me invoca e eu respondo

**Se for não-urgente:**
- Dropa o `.md` aqui
- Continua testando os outros fluxos
- Daniel me invoca de manhã, eu varro tudo

---

## ✅ Quando terminar tudo

1. Cria `RELATORIO_TESTES_23_05.md` aqui na inbox
2. Move arquivos BUG_*.md que ficaram **OK** pra `INBOX_COWORKER/RESOLVIDOS/`
3. Avisa o Daniel quando ele acordar

Boa noite, bom trabalho! 🌙
