# Roteiro de Teste — Nomade Drive Brasil (sistema completo)

Versão: 2026-05-23 (após commit `ac1abe4`)
Objetivo: validar **todas as funcionalidades** do MVP de produção.

> Para teste específico de e-mails, veja `ROTEIRO_QA_EMAILS.md`.

---

## 📋 Contas de teste padrão

Senha: `Teste123` em todas.

| Papel | Login | Tem onboarding completo? |
|---|---|---|
| Cliente | `teste-cliente@nomadedrive.com.br` | Sim |
| Proprietário | `teste-proprietario@nomadedrive.com.br` | Sim |
| Parceiro | `teste-parceiro@nomadedrive.com.br` | Sim |
| Oficina | `teste-oficina@nomadedrive.com.br` | Sim |
| Proteção | `teste-protecao@nomadedrive.com.br` | Sim |
| Super-admin | `dtrodovalho40@gmail.com` | — |

## 💳 Cartões de teste Stripe

| Cartão | Comportamento |
|---|---|
| `4242 4242 4242 4242` | Sempre aprova |
| `4000 0000 0000 9995` | Recusa por saldo |
| `4000 0000 0000 0341` | 1ª aprova, recorrências falham |
| `4000 0027 6000 3184` | Exige 3D Secure |

CVC qualquer (`123`), data futura (`12/30`), CEP `01310-100`.

---

## ✅ FASE 0 — Sanity checks (5 min)

| # | Teste | Esperado |
|---|---|---|
| 0.1 | Acessar `nomadedrive.com.br` | Landing carrega, sem erro JS no console |
| 0.2 | Menu principal tem 8 itens (Início, Como funciona, Para quem é, Frota, Pagamento, Proteção, Proprietários, FAQ) | ✓ |
| 0.3 | Footer mostra links de Termos, Verificação, Privacidade, Pagamento, Cancelamento | ✓ |
| 0.4 | Abrir `termos.html` — 7 seções numeradas, TOC clicável | ✓ |
| 0.5 | Tentar abrir `/admin.html` sem login | Redireciona pro login |

---

## 🔐 FASE 1 — Autenticação e onboarding (10 min)

### 1.1 — Cadastro novo
1. Aba anônima → `/login.html` → "Criar conta"
2. Preencher e-mail + senha + tipo (cliente)
3. Receber e-mail "Confirme seu e-mail" (Supabase Auth)
4. Clicar no link → redireciona pro dashboard
5. **Esperado:** dashboard do cliente com hero verde + KPIs

### 1.2 — Onboarding cliente
1. `/onboarding-cliente.html` (logado)
2. Preencher tudo + envia perfil pra análise
3. **Esperado:** tela "Solicitação recebida com sucesso" + protocolo `NDB-2026-XXXXXX`
4. Voltar ao admin: cadastro aparece em "Cadastros e aprovações" com o protocolo

### 1.3 — Recuperar senha
1. `/login.html` → "Esqueci minha senha"
2. Digita e-mail → receber link de reset
3. Trocar senha → conseguir logar com a nova

### 1.4 — Verificar status do cadastro
1. `/status-cadastro.html` (sem login)
2. Digite o protocolo → mostra status atual da análise

---

## 👨‍💼 FASE 2 — Admin (15 min)

### 2.1 — Aprovar cadastro + e-mail
1. `/admin#cadastros` com DevTools (F12) aberto
2. Mudar status pra "Aprovado"
3. **Esperado:** toast verde "E-mail 'profile_approved' enviado para X" + Network mostra POST send-email 200 + Resend mostra entrada nova

### 2.2 — Aprovar documento (verificação de identidade)
1. Cliente teste sobe um doc em `/dashboard-cliente#documentos` (PDF dummy serve)
2. Admin vai em `/admin#documentos` → status "Aprovado"
3. **Esperado:** toast verde + e-mail "Seus documentos foram aprovados"

### 2.3 — Criar reserva
1. `/admin#reservas` → "Criar nova reserva"
2. Selecionar cliente + veículo aprovado + datas + valor
3. Verificar campo "Caução sugerida" auto-preenche (1000 se padrão)
4. Submeter
5. **Esperado:** 2 toasts verdes (cliente + owner) + 2 e-mails

### 2.4 — Cancelar subscription pelo admin (#8)
1. `/admin#reservas` → linha com `stripe_subscription_id` → botão "Cancelar assinatura"
2. Confirma no diálogo
3. **Esperado:** toast verde + e-mail "Assinatura cancelada" pro cliente
4. Stripe Dashboard mostra subscription canceled

### 2.5 — Lead aprovado/recusado
1. `/admin#leads` (rental_requests vindas do form de orçamento)
2. Mudar status → e-mail "Sua solicitação foi atualizada"

### 2.6 — Comissão paga
1. `/admin#parceiros` → mudar commission_status pra "paga"
2. **Esperado:** e-mail "Sua comissão foi liberada" (R$ 200) pro parceiro

### 2.7 — Atribuir vistoria (#4)
1. `/admin#vistorias` → "Atribuir vistoria"
2. Selecionar veículo aprovado + oficina aprovada
3. **Esperado:** e-mail "Nova vistoria atribuída" pra oficina + linha em "Vistorias em andamento"

### 2.8 — Financeiro real
1. `/admin#financeiro`
2. **Esperado:** KPIs mostram valores reais (Receita bruta, Taxa, Repasses, Caução, Ticket médio) + tabela "Por mês"

### 2.9 — Upload NF
1. `/admin#nfs` → "Vincular NF a pagamento"
2. Selecionar pagamento + upload PDF
3. **Esperado:** aparece na lista + cliente consegue baixar no painel dele

### 2.10 — Robustez de sessão (#D1)
1. Abrir admin em uma aba, ficar 10+ min sem mexer
2. Tentar criar reserva nova
3. **Esperado:** se sessão expirou, redireciona pro login com aviso (não trava em "Carregando...")

---

## 🚗 FASE 3 — Cliente (20 min)

### 3.1 — Documentos
1. Cliente teste → `/dashboard-cliente#documentos`
2. Subir CNH (PDF/JPG), comprovante de residência, doc com foto, comprovante de renda
3. **Esperado:** cada arquivo aparece com link "Ver", status "Em análise"
4. Limite 8 MB por arquivo

### 3.2 — Gate de verificação
1. Antes de aprovar identidade: tentar "Nova solicitação de locação"
2. **Esperado:** banner amarelo "Solicitação bloqueada — verificação de identidade ainda não aprovada"
3. Admin aprova todos os docs → cliente consegue criar nova solicitação

### 3.3 — Pagamento da mensalidade
1. Reserva confirmada pelo admin
2. `/reserva-detalhe?id=...` → "Pagar mensalidade"
3. Stripe Checkout abre → cartão `4242...` → confirma
4. Volta pra reserva → status "Mensalidade paga"
5. **Esperado:** e-mail "Mensalidade confirmada" + recibo automático em `/dashboard-cliente#recibos`

### 3.4 — Autorizar caução
1. Mesma reserva → "Autorizar caução"
2. Stripe Checkout (sem cobrança real, só pré-autorização)
3. **Esperado:** status "Caução autorizada" + e-mail "Caução autorizada"
4. Card "Como funciona a caução" no painel mostra tier do cliente

### 3.5 — Atualizar cartão (#B1)
1. Reserva com `stripe_subscription_id` → botão "Atualizar cartão / ver histórico"
2. **Esperado:** redirect pro Stripe Billing Portal (URL hospedada)
3. Trocar cartão → voltar pro painel
4. Próxima cobrança usa o novo cartão

### 3.6 — Solicitar retirada (check-in)
1. `/dashboard-cliente#checklist` → "Solicitar retirada"
2. Preencher data, local, km, combustível, observações
3. **Esperado:** card mostra "Pedido de retirada enviado — aguardando o proprietário" + e-mail pro owner

### 3.7 — Registrar ocorrência
1. `/dashboard-cliente#protecao` → "Registrar uma ocorrência"
2. Tipo + descrição + reserva
3. **Esperado:** card aparece na lista + 2 e-mails (cliente confirma + equipe Proteção)

### 3.8 — Ver avaria reportada
1. Owner reporta avaria no check-out → cliente vê em `/dashboard-cliente#avarias`
2. **Esperado:** card com tipo, valor, fotos, status. Botão "Contestar" se status final + dentro de 5 dias

### 3.9 — Contestar avaria
1. Avaria com status "resolvido" ou "aprovado_captura"
2. Clicar "Contestar" → textarea (mín 20 chars)
3. Enviar
4. **Esperado:** status muda pra "Em contestação" + e-mail interno pra equipe Proteção

### 3.10 — Cancelar assinatura
1. Card "Assinatura mensal ativa" → "Cancelar assinatura"
2. Confirmar
3. **Esperado:** card mostra "Cancelada" + e-mail "Assinatura cancelada"

---

## 🚙 FASE 4 — Proprietário (15 min)

### 4.1 — Cadastrar veículo
1. `/dashboard-proprietario#veiculos` → "Cadastrar um veículo"
2. Onboarding completo (foto, dados, FIPE, doc)
3. **Esperado:** entra na lista com status "Em análise"

### 4.2 — Configurar Stripe Connect
1. `/dashboard-proprietario#recebimentos` → "Configurar conta de recebimento"
2. Redirect pra Stripe Express onboarding
3. Preenche tudo (em modo teste, aceita qualquer SSN/dados)
4. **Esperado:** status "Conta verificada" + repasses começam a ir pra esta conta

### 4.3 — Aprovar retirada (check-in) do cliente
1. Cliente solicita retirada → aparece em `/dashboard-proprietario#locacao`
2. Aprovar
3. **Esperado:** e-mail pro cliente "Retirada aprovada"

### 4.4 — Aprovar devolução (check-out) SEM avaria
1. Cliente solicita devolução → aparece no painel do owner
2. Clica "Aprovar devolução" → escolhe "Sem problemas"
3. **Esperado:**
   - `close-rental` invocada
   - Subscription cancelada na Stripe
   - Caução liberada (PaymentIntent canceled)
   - E-mail "Locação encerrada — caução liberada" pro cliente

### 4.5 — Aprovar devolução COM avaria (Fase 22c)
1. Cliente solicita devolução → owner abre o form
2. Marca "Encontrei avaria(s)" → adiciona avaria (tipo Risco, R$ 300, descrição + foto)
3. Aprovar
4. **Esperado:**
   - Avaria inserida em `damages` com status `pendente_revisao`
   - `close-rental` invocada COM `has_damages=true`
   - Subscription cancelada
   - Caução NÃO liberada (fica autorizada pra captura parcial)
   - E-mail "Devolução recebida — avaria em análise" pro cliente (LARANJA)

### 4.6 — Manutenção por quilometragem
1. `/dashboard-proprietario#manutencao` → cadastrar km da última revisão + km da última troca de pneus
2. Após check-outs aprovados, o km do veículo atualiza automaticamente
3. **Esperado:** alertas aparecem quando próximo do vencimento

### 4.7 — Regressão de km bloqueada (#9)
1. Cliente solicita check-out com km MENOR que o registrado
2. Owner aprova
3. **Esperado:** banner amarelo "km informado é menor que o registrado" + km NÃO atualiza no veículo + entrada em admin_audit_logs

---

## 🛡️ FASE 5 — Proteção (10 min)

### 5.1 — Triagem de ocorrência
1. Cliente registra ocorrência em `/dashboard-cliente#protecao`
2. Proteção vê em `/dashboard-protecao#triagem`
3. Mudar status (aprovado / aprovado_com_ressalvas / recusado) + parecer
4. Salvar
5. **Esperado:** e-mail "Triagem concluída" pro cliente

### 5.2 — Revisar avaria reportada (Fase 22c.3)
1. Owner reportou avaria no check-out
2. Proteção vê em `/dashboard-protecao#avarias`
3. Card mostra: tipo, descrição, fotos (signed URLs), valor sugerido
4. Definir valor final → "Aprovar captura"
5. **Esperado:**
   - `damage-capture` invocada
   - Stripe captura PARCIAL da caução (`amount_to_capture`)
   - `damages.status = resolvido`, `payments.status = pago`
   - E-mail "Avaria — decisão da Proteção" pro cliente (LARANJA, com valor + prazo de contestação)

### 5.3 — Liberar sem captura
1. Avaria pendente → "Liberar sem cobrança"
2. **Esperado:** status muda pra `aprovado_sem_captura`, caução continua autorizada (será liberada quando todas as avarias forem resolvidas)

### 5.4 — Re-revisar contestação
1. Cliente contesta avaria → status volta pra `em_contestacao`
2. Aparece de novo na fila com badge laranja + caixa com texto do cliente
3. Proteção pode aprovar/liberar de novo

---

## 🔧 FASE 6 — Oficina (10 min)

### 6.1 — Receber vistoria atribuída
1. Admin atribui em `/admin#vistorias`
2. Oficina recebe e-mail "Nova vistoria atribuída"
3. Vai em `/dashboard-oficina#fila` → aparece na lista

### 6.2 — Concluir vistoria
1. Mudar status pra "Aprovado" ou "Recusado"
2. **Esperado:**
   - `vehicle_inspections.approved = true/false`
   - E-mail "Vistoria APROVADA" / "concluída com ressalvas" pro proprietário (verde/laranja)

### 6.3 — Configurar recebimento
1. `/dashboard-oficina#recebimentos` → Stripe Connect Express
2. Mesmo fluxo do proprietário

---

## 🤝 FASE 7 — Parceiro (5 min)

### 7.1 — Registrar indicação
1. `/dashboard-parceiro` (logado como parceiro)
2. "Registrar uma indicação" → preencher dados do indicado
3. **Esperado:** aparece em "Minhas indicações" com status "Em análise"

### 7.2 — KPI de comissão estimada (Fase 23)
1. Visão geral mostra "Comissão estimada: R$ 200 × N indicações ativas"
2. Card "💰 Quanto você ganha por indicação" explica R$ 200 fixo

### 7.3 — Comissão paga (admin)
1. Admin marca commission_status pra "paga"
2. Parceiro recebe e-mail "Sua comissão foi liberada" (R$ 200)
3. Parceiro vê em `/dashboard-parceiro#comissoes` com status atualizado

---

## 💰 FASE 8 — Stripe end-to-end (20 min)

### 8.1 — Mensalidade primeira
1. Reserva nova + cliente paga via Checkout (4242)
2. **Esperado:**
   - `payments.status = pago`
   - E-mail "Mensalidade confirmada"
   - Recibo disponível em `/dashboard-cliente#recibos`

### 8.2 — Caução
1. Mesma reserva → "Autorizar caução"
2. Stripe pré-autoriza no cartão (sem cobrança real)
3. **Esperado:**
   - `payments.status = autorizado`
   - `payments.stripe_payment_intent_id` preenchido
   - E-mail "Caução autorizada"

### 8.3 — Cobrança recorrente (precisa Stripe Test Clock)
1. Stripe Dashboard → Customers → cliente teste → Test Clock → avançar 30 dias
2. Stripe cobra a próxima mensalidade automaticamente (cartão salvo)
3. **Esperado:**
   - Webhook `invoice.paid` chega → `stripe-webhook` processa
   - `payments` ganha nova linha (mensalidade #2)
   - E-mail "Mensalidade #2 cobrada" pro cliente
   - Split 10/90 acontece (verifica `transfers` na Stripe)

### 8.4 — Falha de pagamento
1. Trocar cartão pro `4000 0000 0000 0341` (1ª aprova, 2ª falha)
2. Avançar test clock pra próxima cobrança
3. **Esperado:**
   - Webhook `invoice.payment_failed` chega
   - E-mail "Falha no pagamento" pro cliente (VERMELHO)
   - Card no painel mostra "Atrasada — pagamento falhou"

### 8.5 — Stripe Billing Portal (#B1)
1. Cliente clica "Atualizar cartão / ver histórico"
2. Stripe Portal abre
3. Trocar cartão → próxima cobrança usa o novo

### 8.6 — Captura parcial (Fase 22c.4)
1. Reserva com caução autorizada + owner reporta avaria + Proteção aprova captura R$ 300
2. **Esperado:**
   - `stripe.paymentIntents.capture({amount_to_capture: 30000})`
   - Cobrança real de R$ 300 no cartão
   - Restante da caução liberado automaticamente
   - E-mail "Avaria — decisão da Proteção" pro cliente
   - Stripe Dashboard mostra Charge `captured: true, amount_captured: 30000`

---

## 🎨 FASE 9 — Conteúdo / SEO / UX (10 min)

### 9.1 — Landing
- Hero carrega, banners rotativos funcionam
- Seção "Para quem é" mostra 6 cards (turistas, profissionais, etc.)
- Seção "Como funciona a mensalidade" explica split 10/90
- Trustbar, frota, preços, segurança, FAQ todos OK

### 9.2 — Termos
- `/termos.html` mostra 7 seções numeradas
- TOC clicável funciona
- #verificacao, #pagamento são novos (Fase 27)

### 9.3 — Footer
- Links pra Termos, Verificação, Privacidade, Pagamento, Cancelamento
- WhatsApp flutuante funciona

### 9.4 — Mobile
- Drawer abre/fecha em mobile
- Cards são responsivos
- Forms funcionam em iOS/Android

---

## 🚨 FASE 10 — Casos de borda / segurança

### 10.1 — RLS funciona
1. Logar como cliente A
2. Tentar acessar reserva do cliente B via `/reserva-detalhe?id=...`
3. **Esperado:** "Reserva não encontrada"

### 10.2 — Admin não acessível sem permissão
1. Cliente teste → `/admin.html`
2. **Esperado:** mensagem "Sua conta não tem permissão de administrador"

### 10.3 — Cancelamento de assinatura pelo cliente
1. Cliente cancela via painel
2. **Esperado:** stripe-subscription cancela na Stripe + e-mail vai pra ele
3. Admin vê status atualizado em /admin#reservas

### 10.4 — Caução já liberada não pode ser capturada
1. Tentar `damage-capture` numa caução com status `liberado` (não autorizado)
2. **Esperado:** Edge Function retorna 404 "Caução autorizada não encontrada"

### 10.5 — Hooks não disparam em transições neutras
1. Mudar status de cadastro pra "Em análise" (não é aprovado/reprovado)
2. **Esperado:** NENHUM e-mail (só transições finais notificam)

---

## 📊 FOLHA DE REGISTRO

| Fase | Itens | OK | Falha | Bug# |
|---|---|---|---|---|
| 0 | Sanity (5 itens) | __/5 | | |
| 1 | Autenticação (4 itens) | __/4 | | |
| 2 | Admin (10 itens) | __/10 | | |
| 3 | Cliente (10 itens) | __/10 | | |
| 4 | Proprietário (7 itens) | __/7 | | |
| 5 | Proteção (4 itens) | __/4 | | |
| 6 | Oficina (3 itens) | __/3 | | |
| 7 | Parceiro (3 itens) | __/3 | | |
| 8 | Stripe (6 itens) | __/6 | | |
| 9 | Conteúdo (4 itens) | __/4 | | |
| 10 | Bordas (5 itens) | __/5 | | |
| **TOTAL** | **61 itens** | | | |

---

## 📚 Referências

- ROTEIRO_QA_EMAILS.md — diagnóstico específico de e-mails
- supabase-fase1.sql até fase26 — migrations em ordem cronológica
- Edge Functions: stripe-checkout, stripe-webhook, stripe-subscription, close-rental, damage-capture, stripe-billing-portal, send-email, connect-onboard

---

Última atualização: 2026-05-23 (commit `ac1abe4`)
