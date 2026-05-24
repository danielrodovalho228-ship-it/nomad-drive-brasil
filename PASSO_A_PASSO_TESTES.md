# Passo a Passo — Testes Finais Nomade Drive Brasil

> **Atualizado:** 2026-05-23
> **Fluxo A (pagar mensalidade + caução):** ✅ Já validado
> **Faltam:** Fluxo B (check-in/out), Fluxo C (avaria), Fluxo D (cancelar), validação dos 14 e-mails do admin

---

## 🔑 Credenciais (todas senha `Teste123`)

| Perfil | Email | Pra que serve |
|---|---|---|
| Cliente | `qa-cliente@nomadedrive.com.br` | Aluga o carro, paga, devolve, contesta |
| Proprietário | `qa-proprietario@nomadedrive.com.br` | Aprova retirada/devolução, registra avaria |
| Proteção | `qa-protecao@nomadedrive.com.br` | Valida avaria, decide captura da caução |
| Oficina | `qa-oficina@nomadedrive.com.br` | Aceita ordem de instalação de rastreador |
| Parceiro | `qa-parceiro@nomadedrive.com.br` | Vê dashboard do parceiro comercial |
| Admin | `admin@nomadedrive.com.br` *(o seu)* | Aprova cadastros, valida vistorias, vê tudo |

---

## 🔗 URLs importantes

| O quê | URL |
|---|---|
| Reserva atual (Onix) | `https://nomadedrive.com.br/reserva-detalhe.html?id=53e86074-c753-41e9-a96f-ea5308ed7125` |
| Dashboard cliente | `https://nomadedrive.com.br/dashboard-cliente.html` |
| Dashboard proprietário | `https://nomadedrive.com.br/dashboard-proprietario.html` |
| Dashboard proteção | `https://nomadedrive.com.br/dashboard-protecao.html` |
| Admin | `https://nomadedrive.com.br/admin.html` |
| Webmail Hostinger | `https://webmail.hostinger.com/` |
| Stripe Dashboard | `https://dashboard.stripe.com/test/subscriptions` |

> 💡 **Dica:** Abre o webmail em uma aba só pra ficar acompanhando os e-mails que chegam em `contato@nomadedrive.com.br` (vão chegar pelos aliases qa-*).

---

## 🟢 Fluxo B — Check-in / Check-out (sem avaria) — 5 min

**Cenário:** Cliente pega o carro, usa, devolve. Tudo certo, sem avaria.

### Passo 1 — Cliente solicita retirada

1. Login: `qa-cliente@nomadedrive.com.br` / `Teste123`
2. Abre a reserva: link "Reserva atual" acima
3. Na seção **"Retirada e devolução do veículo"** → clica em **"Solicitar retirada"**
4. Confirma no modal → vê toast "Solicitação enviada"
5. ✅ **Verificar:** card muda pra "Aguardando aprovação do proprietário"

### Passo 2 — Proprietário aprova retirada

1. Logout do cliente → Login: `qa-proprietario@nomadedrive.com.br` / `Teste123`
2. Vai pro dashboard proprietário
3. Seção **"Reservas"** ou **"Vistorias pendentes"** → vê a reserva do Onix
4. Clica em **"Aprovar retirada"** → confirma km inicial (sugerido pelo sistema)
5. Confirma → toast "Retirada aprovada"
6. ✅ **Verificar:**
   - Status da reserva muda pra **"Em uso"**
   - 📧 E-mail **"Retirada aprovada"** chega no webmail Hostinger (alias `qa-cliente@`)

### Passo 3 — Cliente solicita devolução

1. Logout do proprietário → Login: `qa-cliente@nomadedrive.com.br`
2. Abre a reserva
3. Seção retirada/devolução → clica em **"Solicitar devolução"**
4. ✅ **Verificar:** card muda pra "Aguardando confirmação do proprietário"

### Passo 4 — Proprietário aprova devolução SEM avaria

1. Logout do cliente → Login: `qa-proprietario@nomadedrive.com.br`
2. Dashboard proprietário → reserva do Onix
3. Clica em **"Aprovar devolução"**
4. Modal pergunta: **"Houve avaria?"** → marca **NÃO**
5. Preenche km final (qualquer número maior que km inicial)
6. Confirma → toast "Devolução aprovada"
7. ✅ **Verificar:**
   - Status da reserva muda pra **"Encerrada"** ou **"Finalizada"**
   - 📧 E-mail **"Locação encerrada"** chega no webmail
   - 📧 E-mail **"Caução liberada"** chega (porque não houve avaria)

### ✅ Critérios de sucesso Fluxo B

- [ ] Status passou por: aprovado → em uso → encerrada
- [ ] 2-3 e-mails recebidos no `contato@nomadedrive.com.br`
- [ ] Caução foi liberada no Stripe (não capturada)
- [ ] Reserva aparece no "Histórico" do cliente

---

## 🟡 Fluxo C — Avaria + Captura de Caução — 10 min

**Cenário:** Cliente devolve o carro com um arranhão. Proprietário registra. Proteção valida e captura parte da caução. Cliente contesta.

> ⚠️ **Pré-requisito:** Você precisa criar uma **NOVA reserva** pra esse fluxo (a atual já está encerrada se você fez Fluxo B). Se ainda não fez Fluxo B, pode usar a 53e86074... mas vai "queimar" essa reserva.
>
> **Pra criar uma nova:** me peça que eu te dou o SQL com outro veículo (HB20 ou T-Cross).

### Passo 1-3 — Idem Fluxo B (até "Em uso")

Faz cliente solicitar retirada + proprietário aprovar + cliente solicitar devolução.

### Passo 4 — Proprietário aprova devolução COM avaria

1. Logado como `qa-proprietario@`
2. Reserva → **"Aprovar devolução"**
3. Modal pergunta: **"Houve avaria?"** → marca **SIM**
4. Preenche:
   - **Descrição:** "Arranhão no para-choque traseiro de aproximadamente 15cm"
   - **Valor estimado do reparo:** `R$ 300,00`
   - **Fotos:** sobe 1-2 imagens dummy (pode ser qualquer JPG do seu computador, tipo screenshot)
5. Preenche km final
6. Confirma → toast "Devolução com avaria registrada — aguardando Proteção"
7. ✅ **Verificar:**
   - Status da reserva muda pra **"Avaria em análise"**
   - 📧 E-mail **"Avaria registrada — Proteção vai avaliar"** chega no webmail

### Passo 5 — Proteção valida e captura

1. Logout → Login: `qa-protecao@nomadedrive.com.br` / `Teste123`
2. Vai pro `dashboard-protecao.html`
3. Seção **"Avarias pendentes"** → vê a reserva
4. Clica em **"Ver detalhes"** → confere descrição + fotos + valor
5. Clica em **"Aprovar captura R$ 300"**
6. Confirma → toast "Captura aprovada"
7. ✅ **Verificar:**
   - 📧 E-mail **"Avaria — decisão da Proteção"** chega no webmail
   - No Stripe Dashboard → Payments → vê uma cobrança de **R$ 300,00** (captura parcial da caução)
   - O restante da caução (R$ 700) é liberado automaticamente

### Passo 6 — Cliente contesta a avaria

1. Logout → Login: `qa-cliente@nomadedrive.com.br`
2. Abre a reserva → seção **"Avarias"**
3. Vê o registro da avaria com valor R$ 300
4. Clica em **"Contestar"**
5. Preenche motivo: "O arranhão já existia antes da retirada"
6. (Opcional) anexa foto da retirada
7. Confirma → toast "Contestação enviada"
8. ✅ **Verificar:**
   - 📧 E-mail **"Contestação registrada"** chega
   - Status da avaria muda pra **"Em contestação"**

### ✅ Critérios de sucesso Fluxo C

- [ ] Avaria registrada com descrição + fotos + valor
- [ ] Captura parcial de R$ 300 visível no Stripe
- [ ] R$ 700 restante da caução liberado
- [ ] 3-4 e-mails recebidos (avaria registrada, decisão, contestação, etc.)
- [ ] Cliente consegue contestar

---

## 🟢 Fluxo D — Cancelar Assinatura — 1 min

**Cenário:** Cliente decide cancelar a assinatura mensal.

### Passo único — Cliente cancela

1. Login: `qa-cliente@nomadedrive.com.br`
2. Abre a reserva atual: link "Reserva atual" acima
3. Seção **"Pagamentos"** → card **"Assinatura mensal ativa"**
4. Clica em **"Cancelar assinatura"**
5. Confirma no modal "Tem certeza?"
6. ✅ **Verificar:**
   - Card muda pra **"Assinatura cancelada — encerra em 22/08/2026"** (ou data próxima)
   - 📧 E-mail **"Assinatura cancelada"** chega no webmail
   - No Stripe Dashboard → subscription do `qa-cliente@` muda de **"Ativa"** pra **"Cancelando"** ou **"Cancelada"**

### ✅ Critérios de sucesso Fluxo D

- [ ] Card no app atualizado
- [ ] E-mail recebido
- [ ] Stripe atualizado
- [ ] Cliente NÃO consegue mais clicar em "Pagar mensalidade" nessa reserva

---

## 📧 Validação dos 14 e-mails do admin — 30 min

Cada e-mail deve chegar **no webmail Hostinger** (`contato@nomadedrive.com.br`) com:
- ✅ Template branded (verde Nomade Drive)
- ✅ Nome do destinatário no corpo
- ✅ CTA principal apontando pra `nomadedrive.com.br`
- ✅ Footer com endereço + unsubscribe (se aplicável)
- ✅ Sem typos, sem variáveis tipo `{{nome}}` quebradas

### Lista dos 14 e-mails pra disparar

| # | E-mail | Como disparar | Esperado |
|---|---|---|---|
| 1 | **Cadastro aprovado** | Admin → Cadastros → aprova um cliente novo | "Seu cadastro foi aprovado" |
| 2 | **Cadastro recusado** | Admin → Cadastros → recusa | "Seu cadastro foi recusado" |
| 3 | **Documento aprovado** | Admin → Documentos → aprova um doc | "Documento aprovado" |
| 4 | **Documento recusado** | Admin → Documentos → recusa | "Documento recusado" |
| 5 | **Veículo aprovado** | Admin → Veículos → aprova | "Seu veículo foi aprovado" |
| 6 | **Veículo recusado** | Admin → Veículos → recusa | "Seu veículo foi recusado" |
| 7 | **Mensalidade confirmada** ✅ | Cliente paga (Fluxo A) | "Mensalidade confirmada" |
| 8 | **Caução autorizada** ✅ | Cliente autoriza caução (Fluxo A) | "Caução autorizada" |
| 9 | **Retirada aprovada** | Proprietário aprova retirada (Fluxo B) | "Retirada aprovada" |
| 10 | **Locação encerrada** | Proprietário aprova devolução (Fluxo B) | "Locação encerrada" |
| 11 | **Avaria registrada** | Proprietário registra avaria (Fluxo C) | "Avaria registrada" |
| 12 | **Decisão da Proteção** | Proteção captura (Fluxo C) | "Avaria — decisão" |
| 13 | **Contestação registrada** | Cliente contesta (Fluxo C) | "Contestação registrada" |
| 14 | **Assinatura cancelada** | Cliente cancela (Fluxo D) | "Assinatura cancelada" |

> 📝 **Conforme você for testando os Fluxos B/C/D, os e-mails 9-14 vão chegar automaticamente.** Os 1-6 (cadastro + documento + veículo) você dispara manualmente no admin.

---

## 🐛 Troubleshooting comum

### "Nada para pagar" na página da reserva
- **Causa:** URL aberta com ID de reserva antiga (deletada)
- **Fix:** Confere o ID atual no Supabase: `select id from bookings where client_id = (select id from profiles where email = 'qa-cliente@nomadedrive.com.br');`

### E-mail não chega no webmail
- **Espera 30s-2 min** (Resend pode ter delay)
- **Confere spam/lixeira** no webmail
- **Confere logs:** Supabase Dashboard → Edge Functions → Logs → procura erros com "Resend"

### Stripe Checkout abre com email errado
- **Causa:** Stripe Customer foi criado com email antigo
- **Fix:** `update profiles set stripe_customer_id = null where email = 'qa-cliente@nomadedrive.com.br';` → tenta de novo

### "Botão desabilitado" / não consigo clicar
- **Possível causa:** Hard refresh do browser pra pegar JS novo (Ctrl+F5)
- **Verifica:** alguma seção do app espera estado anterior (tipo "só pode solicitar devolução depois de retirar")

---

## 📊 Checklist resumido

Marque cada um conforme for testando:

### Fluxo B — Check-in/check-out
- [ ] Cliente solicita retirada
- [ ] Proprietário aprova retirada + km inicial
- [ ] 📧 E-mail "Retirada aprovada"
- [ ] Cliente solicita devolução
- [ ] Proprietário aprova devolução (sem avaria) + km final
- [ ] 📧 E-mail "Locação encerrada"
- [ ] 📧 E-mail "Caução liberada"

### Fluxo C — Avaria
- [ ] Nova reserva criada (se necessário)
- [ ] Cliente retira (passos 1-2 do Fluxo B)
- [ ] Cliente solicita devolução
- [ ] Proprietário aprova devolução COM avaria + fotos + R$ 300
- [ ] 📧 E-mail "Avaria registrada"
- [ ] Proteção valida e captura R$ 300
- [ ] 📧 E-mail "Decisão da Proteção"
- [ ] Stripe Dashboard mostra cobrança de R$ 300
- [ ] Cliente contesta a avaria
- [ ] 📧 E-mail "Contestação registrada"

### Fluxo D — Cancelar
- [ ] Cliente clica "Cancelar assinatura"
- [ ] Card atualizado
- [ ] 📧 E-mail "Assinatura cancelada"
- [ ] Stripe Dashboard atualizado

### E-mails admin (disparar manualmente)
- [ ] #1 Cadastro aprovado
- [ ] #2 Cadastro recusado
- [ ] #3 Documento aprovado
- [ ] #4 Documento recusado
- [ ] #5 Veículo aprovado
- [ ] #6 Veículo recusado

---

## 📞 Quando me chamar

Quando voltar, é só me dizer:
- **"Fluxo X passo Y deu erro Z"** → eu corrijo
- **"E-mail #N não chegou"** → eu investigo
- **"Tudo funcionou"** → eu marco no checklist e seguimos pra próxima fase
- **"Preciso de nova reserva pra Fluxo C"** → eu te passo SQL com HB20 ou T-Cross

Tudo versionado. Nada se perde. 🚀
