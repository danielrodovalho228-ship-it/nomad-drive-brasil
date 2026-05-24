# 📋 Backlog Melhorias — Feedback Daniel (Mobile)

> **Data:** 2026-05-24 (madrugada)
> **Fonte:** Daniel testando no celular, dropou 3 screenshots
> **Status:** documentado pra implementação seguinte

---

## 1️⃣ Tela "Pedir Orçamento" → e-mail pra empresa

**Screenshot:** Formulário "Conte suas datas — respondemos rápido"

**Comportamento esperado:**
> *"Quando um usuário solicitar reserva sem ter cadastro, então eles preencham este simples formulário e enviar para o e-mail da empresa contato@nomadedrive.com.br"*

**O que fazer:**
- ✅ Conferir se já abre WhatsApp (parece que sim — texto diz "WhatsApp abre com tudo pronto pra enviar")
- 🆕 Adicionar **fallback por e-mail**: se WhatsApp não disponível, enviar pro `contato@nomadedrive.com.br` automático (sem o usuário precisar abrir cliente de e-mail)
- 🆕 Pode ser via Edge Function `send-lead-quote` que recebe form + envia e-mail formatado
- 🆕 Lead vira linha em `rental_requests` automaticamente (já existe tabela)

**Tempo estimado:** 1h

---

## 2️⃣ Banners da landing → clicáveis pra Frota

**Screenshot:** Carrossel com "Hyundai HB20 Comfort" no banner

**Comportamento atual:**
- Carrossel exibe carros mas **não tem link clicável**

**Comportamento esperado:**
> *"Adicionar link clicável nos banners e leve direto na frota"*

**O que fazer:**
- 🆕 Cada slide do carrossel deve ser `<a href="frota.html">` ou link pro próprio carro (`frota.html#hb20-comfort`)
- 🆕 Cursor: pointer
- 🆕 Hover (desktop) ou tap (mobile) navega
- 🆕 Manter setas/dots de navegação

**Tempo estimado:** 30 min

---

## 3️⃣ Fluxo "Alugar veículo" — verificar cadastro + notificar proprietário

**Screenshot:** Página do carro com botão "Pedir orçamento no WhatsApp"

**Comportamento esperado:**
> *"Assim que eu quiser alugar um veículo, se tiver cadastro está liberado, se não tiver tem que levar para a página de cadastros. Quero que crie notificações diretamente ao proprietário do veículo por enquanto tudo por e-mail. Daí vc junta com o q já criou e já implementa todos os outros recursos pra deixar tudo automatizado."*

**Etapas:**
- 🆕 Botão **"Pedir orçamento"** vira **"Quero alugar este carro"**
- 🆕 Check: usuário tá logado?
  - **Não logado** → redireciona pra `cadastro.html?retorno=frota.html?carro=X`
  - **Logado mas perfil em rascunho/em_análise** → redireciona pra completar cadastro
  - **Logado e aprovado** → cria `rental_request` direto + dispara e-mail pro proprietário
- 🆕 E-mail **`new_rental_request_owner`** novo:
  - Pra: proprietário do veículo (notifyByUserId Caminho A)
  - Assunto: "Novo interesse no seu Hyundai HB20 — Carlos Silva"
  - Conteúdo: nome do cliente, datas pretendidas, link pro dashboard pra aprovar
- 🆕 E-mail **`new_rental_request_client`** novo (confirmação):
  - Pra: cliente
  - "Recebemos sua solicitação. O proprietário vai responder em até 24h."
- 🆕 Quando proprietário aprovar/recusar no dashboard, dispara e-mail correspondente

**Integra com fluxos que já existem:**
- Rental requests (tabela)
- Aprovação por proprietário/admin
- Conversão em booking quando aprovado

**Tempo estimado:** 2h

---

## 🎯 Priorização sugerida

| Prioridade | Item | Tempo |
|---|---|---|
| 🔥 ALTA | #3 (fluxo alugar — fecha funil de aquisição) | 2h |
| 🔥 ALTA | #2 (banner clicável — quick win UX) | 30 min |
| 🟡 MÉDIA | #1 (fallback e-mail no orçamento) | 1h |

**Total:** ~3.5h pra fechar as 3 melhorias.

---

## 🚀 Como vou atacar

Depois de fechar a Fase 41b (e-mail D-7 automático de renovação, ~1h) que estou no meio, sigo com:
- **Fase 42 — Banner clicável + Fluxo alugar com check de cadastro** (3 ações combinadas)

Daniel: se quiser priorizar diferente, manda a letra. Senão, vou na ordem acima.

---

## ✅ STATUS DE EXECUÇÃO (2026-05-24)

### Item #1 — Form orçamento fallback e-mail ✅
- Edge Function `submit-lead-quote` criada (anônima, com honeypot anti-bot)
- `script.js` wa-form handler POSTa pro backend antes de abrir WhatsApp
- E-mail HTML rico vai pra `contato@nomadedrive.com.br` com todos os campos do form
- `index.html` honeypot field oculto adicionado + texto explicativo atualizado
- Feedback discreto pro usuário quando lead é capturado
- Log em `admin_audit_logs` (action=lead_quote_submitted)

### Item #2 — Banner carrossel clicável ✅
- `script.js` — slides do hero viraram `<a href="car.html?id=...">`
- Vai direto pra página do carro específico (melhor que só pra lista)
- `style.css` — hover effect (zoom 1.02 + cap dourada)
- Cache-bust `?v=20260524-hero-click` no `index.html`

### Item #3 — Fluxo "Quero alugar este carro" com check cadastro ✅
- Botão verde "Quero alugar este carro" adicionado em `car.html` (acima do WhatsApp CTA)
- `car.js` checa fluxo completo:
  - Não logado → `cadastro.html?redirect=car.html?id=X`
  - Rascunho/email_verificado → `onboarding-cliente.html`
  - Em análise/pendente → `status-cadastro.html` com mensagem
  - Aprovado → chama Edge Function `create-rental-request`
- Edge Function `create-rental-request` criada:
  - Valida verification_status='aprovado'
  - Cria row em `rental_requests`
  - E-mail #1 pro owner (se vehicle_id mapeado) OU pro staff
  - E-mail #2 pro cliente (confirmação "Recebemos sua solicitação")
- Log em `admin_audit_logs` (action=rental_request_created)

## 🚀 DEPLOY

Edge Functions novas:
```bash
supabase functions deploy submit-lead-quote --no-verify-jwt
supabase functions deploy create-rental-request
```

> ⚠️ `submit-lead-quote` deploy com `--no-verify-jwt` (é form público da landing).
