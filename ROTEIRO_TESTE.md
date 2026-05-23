# Roteiro de teste funcional — Nomade Drive Brasil

Passo a passo para validar o fluxo ponta-a-ponta em modo de teste. Execute em ordem, marcando ✅ em cada item.

---

## 0. Pré-requisitos do ambiente

| # | Item | Como verificar |
|---|---|---|
| 0.1 | **SQLs rodados** | Supabase → SQL Editor → confirme execução de `supabase-fase1.sql` até `supabase-fase20.sql` + `supabase-seed-teste.sql` (cada um deve mostrar `OK ...` no rodapé) |
| 0.2 | **Edge Functions implantadas** | Supabase → Edge Functions → `stripe-checkout`, `stripe-webhook`, `connect-onboard` aparecem como "Deployed" |
| 0.3 | **Verify JWT** | `stripe-checkout` e `connect-onboard`: **LIGADO** · `stripe-webhook`: **DESLIGADO** |
| 0.4 | **Secrets Stripe** | Edge Functions → Secrets → `STRIPE_SECRET_KEY` = `sk_test_…` |
| 0.5 | **Stripe Connect ativo** | Stripe Dashboard (modo teste) → **Connect** → mostra "Contas conectadas" (não "Reforce sua plataforma") |
| 0.6 | **GitHub Pages publicado** | https://nomadedrive.com.br abre normalmente |

## Contas de teste (todas com senha `Teste123`)

| Papel | E-mail |
|---|---|
| Cliente | `teste-cliente@nomadedrive.com.br` |
| Proprietário | `teste-proprietario@nomadedrive.com.br` |
| Parceiro | `teste-parceiro@nomadedrive.com.br` |
| Oficina | `teste-oficina@nomadedrive.com.br` |
| Proteção | `teste-protecao@nomadedrive.com.br` |
| Super-admin | `dtrodovalho40@gmail.com` (sua senha real) |

---

## Fase 1 — Acesso e onboarding (cada papel)

Para cada conta de teste acima:

1. Acesse `https://nomadedrive.com.br/login.html`.
2. Faça login com `Teste123`.
3. ✅ Esperado: redireciona direto para o dashboard correspondente ao papel (não para o onboarding).
4. Confirme no topo:
   - Hero colorido com nome do painel + ícone do papel.
   - Banner amarelo **"Ações pendentes"** OU verde **"Tudo em dia"**.
   - Pill de status no topo direito (passe o mouse → tooltip explica).
5. ✅ Verifique se cada item do menu lateral tem ícone.

**Critério de aceite:** todos os 5 perfis logam, dashboards carregam com hero, menu com ícones e banner de pendências.

---

## Fase 2 — Cadastros e aprovações (admin)

1. Login como super-admin.
2. Menu lateral → **"Cadastros e aprovações"**.
3. ✅ A lista mostra solicitações por papel com `status` (em_analise, aprovado, etc.).
4. Para cada solicitação `em_analise`:
   - Confirme protocolo (`NDB-2026-…`).
   - Mude o status para `aprovado`.
   - ✅ Mensagem de sucesso ("Status alterado").
5. Recarregue a página (Ctrl+F5) → status persiste como **aprovado**.
6. Vá em **"Log de atividades"** → confirme que cada alteração foi auditada.

**Critério de aceite:** admin consegue aprovar cadastros e o log registra todas as ações.

---

## Fase 3 — KYC documental (cliente)

### 3.1 — Envio dos documentos pelo cliente

1. Login como `teste-cliente@`.
2. Painel → seção **"Documentos"**.
3. Envie 4 PDFs/JPGs (até 8 MB cada):
   - CNH válida
   - Documento oficial com foto
   - Comprovante de residência
   - Comprovação de renda
4. ✅ Cada item passa para **"Em análise"**.
5. ✅ A seção **"Solicitações de locação"** mostra:
   - Aviso âmbar **"KYC ainda não aprovado"**.
   - Botão **"Nova solicitação de locação"** cinza/bloqueado (passe o mouse → tooltip).

### 3.2 — Tentativa de violar o gate (deve falhar)

1. Ainda como cliente, clique no botão bloqueado.
2. ✅ Esperado: notice amarelo aparece no topo, navegação não ocorre.
3. Tente burlar: abra DevTools → `c.from("rental_requests").insert({...})`.
4. ✅ Esperado: erro `KYC_PENDENTE: …` direto do banco (trigger Fase 20).

### 3.3 — Aprovação documental pelo admin

1. Login como super-admin.
2. Menu → **"Documentos (KYC)"**.
3. Para cada documento `em_analise`:
   - Clique em **"Ver"** → confirme que o PDF/imagem abre (link assinado da Stripe Storage).
   - Mude o seletor de status para **"Aprovado"**.
   - ✅ Mensagem "Status atualizado com sucesso".
4. Recarregue → cada documento persiste como **"Aprovado"**.

### 3.4 — Aprovação do perfil cliente

1. Ainda no admin → **"Cadastros e aprovações"**.
2. Mude o perfil do cliente teste para **"aprovado"**.
3. Volte ao painel do cliente.
4. ✅ Pill no topo: **"Aprovado"**.
5. ✅ Aviso KYC desaparece, botão **"Nova solicitação"** liberado.

**Critério de aceite:** gate bloqueia antes da aprovação, libera depois. Banco trava mesmo se UI falhar.

---

## Fase 4 — Veículo do proprietário

1. Login como `teste-proprietario@`.
2. Painel → **"Meus veículos"** → cadastrar Chevrolet Onix 2022.
3. Preencha categoria, km, cidade, preço mensal sugerido.
4. ✅ Veículo entra com status `em_analise`.
5. Login como admin → **"Frota"** → muda o veículo para `aprovado`.
6. Volte ao proprietário → veículo aparece como **"Aprovado"** no painel.

**Critério de aceite:** ciclo completo de cadastro → aprovação do veículo.

---

## Fase 5 — Stripe Connect (recebimentos)

Repita para **proprietário**, **parceiro** e **oficina**:

1. Login com a conta correspondente.
2. Painel → seção **"Recebimentos"** → **"Configurar conta de recebimento"**.
3. ✅ Redireciona para a tela hospedada da Stripe Express.
4. Preencha com dados de teste:
   - SMS de verificação: código `000000`
   - Tipo: **Indivíduo** (parceiro) ou **Pessoa Jurídica/MEI** (oficina)
   - Nome `Joao Silva`, nascimento `01/01/1990`, CPF `000.000.001-91`
   - Telefone `(11) 96123-4567`
   - Endereço `Av. Paulista, 1000 — São Paulo — 01310-000`
   - PEP: **Não**
   - Setor: "Personal services" → "Other personal services" (ou similar)
   - Descrição: descrição apropriada do negócio
   - Conta bancária: clique **"Usar conta de teste"**
   - Documento de identidade: qualquer JPG/PNG
5. ✅ Volta ao app com `?recebimentos=ok` → status passa de "Ainda não configurada" para "Em análise" ou "Conta ativa".
6. Recarregue → status persiste.
7. Confira no Stripe Dashboard → **Connect** → **Contas conectadas** → as 3 contas aparecem como "Ativada".

**Critério de aceite:** 3 contas conectadas ativas, persistentes no banco e na Stripe.

---

## Fase 6 — Reserva e pagamento (split de 10%)

### 6.1 — Criação da reserva pelo admin

1. Login como admin → **"Reservas"**.
2. No card **"Criar nova reserva"**:
   - Cliente: selecione o cliente teste.
   - Veículo: Chevrolet Onix 2022.
   - Data de início: `01/07/2026`.
   - Data de fim: `31/07/2026`.
   - Valor mensal: `2500`.
3. **"Criar reserva"** → linha nova aparece na tabela com **coluna Cliente preenchida**.
4. Mude o status para `aprovado`.
5. Recarregue → persiste.

### 6.2 — Pagamento da mensalidade pelo cliente

1. Login como `teste-cliente@`.
2. Painel → **"Check-in / check-out"** → abre a nova reserva (Onix `01/07–31/07`).
3. Em `reserva-detalhe.html` → seção **"Pagamentos"** → **"Pagar mensalidade"**.
4. Stripe Checkout:
   - Cartão: `4242 4242 4242 4242`
   - Validade: `12/30` · CVC: `123` · País: `Brasil`
5. ✅ Retorna ao app com "Mensalidade paga e confirmada", status **"Pago"**, botão desabilitado.
6. Recarregue → status persiste.

### 6.3 — Conferência do split na Stripe

1. Stripe Dashboard (test) → **Pagamentos** → última transação.
2. ✅ **Application fee:** R$ 250,00 (10% do valor).
3. ✅ **Transfer:** R$ 2.250,00 → conta conectada do proprietário (`acct_…`).
4. ✅ Conta destino: a do `teste-proprietario` (não outra).

### 6.4 — Caução (sem split)

1. Ainda no painel do cliente → mesma reserva → **"Autorizar caução"**.
2. Mesmo cartão de teste.
3. ✅ Retorna com "Caução autorizada", botão desabilitado.
4. ✅ Na Stripe → pagamento da caução **NÃO tem `application_fee_amount`** nem `transfer_data`.
5. ✅ `capture_method` = `manual` (valor retido, não cobrado).

**Critério de aceite:** split de 10% funciona na mensalidade, caução fica integralmente na plataforma com captura manual.

---

## Fase 7 — Check-in e check-out

### 7.1 — Check-in solicitado pelo cliente

1. Cliente → reserva → **"Solicitar check-in"**.
2. Preencha data/hora, local, km, combustível, observações, confirme.
3. ✅ Aparece como "Check-in aguardando aprovação".

### 7.2 — Aprovação pelo proprietário

1. Proprietário → painel → seção **"Check-in / check-out"**.
2. Linha do check-in solicitado → **"Aprovar"**.
3. ✅ Status passa para "Aprovado" + km do veículo atualiza.

### 7.3 — Check-out (mesma sequência)

1. Cliente solicita check-out.
2. Proprietário aprova.
3. ✅ Locação encerrada na linha do tempo.

---

## Fase 8 — Ocorrência (proteção)

1. Cliente → seção **"Proteção e ocorrências"** → escolhe reserva + tipo (ex: Dano externo) + descrição.
2. **"Registrar ocorrência"** → ✅ aparece em "Minhas ocorrências" com **"Em análise"**.
3. Login como `teste-protecao@` → painel → **"Casos abertos — triagem"** → o caso aparece.
4. Preencha parecer, mude status para "Aprovado com ressalvas".
5. Login como admin → **"Proteção / Sinistros"** → status reflete o novo valor.
6. Em **"Log de atividades"** → mudança auditada.

---

## Fase 9 — Indicação (parceiro)

1. Login como `teste-parceiro@`.
2. Painel → **"Código de indicação"** → confirma código `ND-…`.
3. Confira lista de indicações + comissão estimada.
4. Login como admin → **"Parceiros"** → status das indicações.

---

## Fase 10 — Vistoria (oficina)

1. Login como admin → SQL Editor → atribua uma vistoria à oficina de teste (ou crie pelo fluxo de aprovação de veículo).
2. Login como `teste-oficina@` → **"Fila de vistorias"** → aparece o veículo atribuído.
3. Emita o checklist técnico → mude status para `aprovado`/`aprovado_com_ressalvas`/`reprovado`.
4. Login como admin → confirma reflexo na frota e no log.

---

## Fase 11 — Admin (auditoria, KPIs, logs)

1. Login como super-admin → **"Visão geral"**.
2. Confira os KPIs:
   - Cadastros em análise (deve refletir realidade).
   - Veículos cadastrados / aprovados.
   - Locações registradas.
   - Ocorrências abertas.
   - Receita bruta estimada (R$ × locações).
   - Taxa da plataforma (R$).
3. **"Notificações"** → confira lista recente.
4. **"Log de atividades"** → confira eventos com data, ação, alvo e metadata.

**Critério de aceite:** dados batem com os criados nas fases anteriores; logs auditam todas as ações mutáveis.

---

## Fase 12 — UX (tooltips e banners)

### 12.1 — Tooltips em status

Em qualquer painel, passe o mouse em pills de status:

| Pill | Tooltip esperado |
|---|---|
| Em análise | "Em análise pela equipe Nomade Drive — normalmente leva 1 a 3 dias úteis." |
| Aprovado | "Aprovado pela equipe Nomade Drive. Tudo certo nesta etapa." |
| Aguardando aprovação | "Aguardando aprovação do proprietário do veículo." |
| Pago | "Pagamento confirmado pela Stripe." |
| Caução autorizada | "Caução autorizada — valor retido no cartão, sem cobrança imediata." |
| Conta ativa | "Conta de recebimento ativa — pronta para receber repasses pela Stripe." |
| Conta com pendências | "A Stripe pediu mais informações ou documentos…" |

### 12.2 — Banner "Ações pendentes"

Em cada painel, no topo logo após o hero:

- **Banner âmbar com lista numerada** quando há pendências.
- **Banner verde "Tudo em dia"** quando nada está pendente.
- Cada item da lista tem link "ver" para a seção relevante.
- Passe o mouse em cada item → tooltip explicativo.

Confira em todos os 6 painéis (cliente, proprietário, parceiro, oficina, proteção, admin).

---

## Fase 13 — Sinergia ponta a ponta

Cruze os dados entre os 6 painéis e confirme que tudo bate:

| Evento | Cliente | Proprietário | Parceiro | Oficina | Proteção | Admin |
|---|---|---|---|---|---|---|
| Reserva criada | ✓ aparece | ✓ aparece (em locação) | — | — | — | ✓ na tabela Reservas |
| Mensalidade paga | ✓ status Pago | ✓ aparece em recebimentos (após repasse) | — | — | — | ✓ KPI Receita |
| Caução autorizada | ✓ status Autorizada | — | — | — | — | ✓ na transação |
| Check-in aprovado | ✓ na linha do tempo | ✓ histórico | — | — | — | ✓ no log |
| Ocorrência aberta | ✓ Em análise | — | — | — | ✓ na triagem | ✓ KPI Ocorrências |
| Indicação convertida | — | — | ✓ status | — | — | ✓ na lista de parceiros |
| Vistoria emitida | — | ✓ histórico | — | ✓ histórico | — | ✓ no log |

---

## Anexo A — Dados de teste

**Cartão Stripe:**
- `4242 4242 4242 4242` · validade `12/30` · CVC `123` · país `Brasil`

**SMS Stripe Express:**
- Código `000000`

**CPF/CNPJ de teste:**
- CPF: `000.000.001-91`
- CNPJ: `00.000.000/0001-91`

**Endereço seguro:**
- `Av. Paulista, 1000 — São Paulo/SP — 01310-000`

---

## Anexo B — Como reportar falhas

Para cada falha, anote:

| Campo | Exemplo |
|---|---|
| **Perfil** | Cliente, proprietário, parceiro, oficina, proteção ou admin |
| **Fase** | "Fase 6.2 — Pagamento da mensalidade" |
| **Mensagem visual** | Cópia literal do texto exibido |
| **Console** | Erros em vermelho do DevTools (F12) |
| **URL** | A URL completa onde travou |
| **Print** | Captura da tela |

Sem print + console, fica difícil corrigir cego — anexe sempre.
