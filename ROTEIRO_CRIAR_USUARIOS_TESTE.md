# Roteiro — Criar Contas de Teste com Dados Fictícios

**Versão:** 2026-05-23 · **Para:** equipe QA Nomade Drive Brasil

Este roteiro guia a criação de **6 contas de teste completas** usando os aliases `qa-*@nomadedrive.com.br` (todos forwardando pra `contato@nomadedrive.com.br`). Após seguir, você terá 5 perfis funcionais com dados realistas — pronto pra rodar testes de fluxo end-to-end.

---

## 🎯 Pré-requisitos (já feito)

- ✅ Aliases criados no Hostinger
- ✅ SQL `supabase-qa-aliases-emails.sql` rodado (e-mails de auth.users atualizados)
- ✅ SQL `supabase-fase24-profiles-email.sql` rodado (profiles.email espelhado)
- ✅ Domínio nomadedrive.com.br verificado no Resend

---

## 📋 Resumo das contas

| Perfil | Login | Senha | Aliasforwarda pra |
|---|---|---|---|
| **Cliente locatário** | `qa-cliente@nomadedrive.com.br` | `Teste123` | contato@ |
| **Proprietário** | `qa-proprietario@nomadedrive.com.br` | `Teste123` | contato@ |
| **Parceiro indicador** | `qa-parceiro@nomadedrive.com.br` | `Teste123` | contato@ |
| **Oficina** | `qa-oficina@nomadedrive.com.br` | `Teste123` | contato@ |
| **Equipe Proteção** | `qa-protecao@nomadedrive.com.br` | `Teste123` | contato@ |
| **Super-admin** | `dtrodovalho40@gmail.com` | (sua senha real) | — |

---

## 🧰 Dados fictícios padronizados

Use estes dados em **todos** os onboardings — facilita lembrar e mantém consistência.

### Endereço comum (use em todos)
```
Cidade:       Uberlândia
Estado:       MG
CEP:          38400-100
Endereço:     Av. Rondon Pacheco, 100, sala 50
Bairro:       Centro
```

### Telefones (use formato +55 34 9XXXX-XXXX)
- Cliente: `+55 34 99100-0001`
- Proprietário: `+55 34 99100-0002`
- Parceiro: `+55 34 99100-0003`
- Oficina: `+55 34 99100-0004`
- Proteção: `+55 34 99100-0005`

### Documentos fictícios (use sempre os mesmos)
| Tipo | Valor sugerido |
|---|---|
| CPF | `111.444.777-35` (válido pra dígitos, fictício) |
| CNPJ (oficina/parceiro PJ) | `45.997.418/0001-53` (válido pra dígitos, fictício) |
| RG | `MG-12.345.678` |
| CNH | `01234567890` |

---

## 🚀 Sequência sugerida (segue a ordem dos perfis)

### 1️⃣ Cliente — `qa-cliente@nomadedrive.com.br`

**1.1. Criar conta de auth (se ainda não tem)**

Aba anônima → `nomadedrive.com.br/login.html` → "Criar conta":
- E-mail: `qa-cliente@nomadedrive.com.br`
- Senha: `Teste123`
- Tipo: **Cliente locatário**

> ⚠️ Se a conta já existe (você rodou o SQL de aliases antes), só faça login direto.

**1.2. Confirmar e-mail**

Webmail do Hostinger (`mail.hostinger.com`) → caixa de `contato@nomadedrive.com.br` → procurar "Confirme seu e-mail" → clicar no link.

**1.3. Completar onboarding** (`/onboarding-cliente.html`)

| Campo | Valor |
|---|---|
| Nome completo | `Carlos Silva Teste` |
| Telefone | `+55 34 99100-0001` |
| Cidade de interesse | `Uberlândia-MG` |
| Motivo da locação | `Trabalho remoto / nômade digital` |
| Início desejado | `25/06/2026` |
| Período (meses) | `3` |
| Tipo de veículo | `Confort` |
| Detalhes | `Profissional remoto vindo de SP, vou ficar 3 meses em Uberlândia trabalhando híbrido entre escritório local e home.` |
| ☑ CNH válida | sim |
| ☑ Ciência docs | sim |
| ☑ Consentimento rastreador GPS | sim |

Submeter → tela "Solicitação recebida" + protocolo `NDB-2026-XXXXXX`

**1.4. Upload de documentos**

`/dashboard-cliente#documentos` — sobe 4 PDFs/JPGs dummy (qualquer arquivo serve pra teste):
- CNH
- Documento com foto
- Comprovante de residência
- Comprovação de renda

---

### 2️⃣ Proprietário — `qa-proprietario@nomadedrive.com.br`

**2.1. Criar conta + confirmar e-mail** (mesmo processo do cliente)
- Tipo no cadastro: **Proprietário**

**2.2. Onboarding do proprietário** (`/onboarding-proprietario.html`)

| Campo | Valor |
|---|---|
| Nome completo | `Marcos Pereira Teste` |
| Telefone | `+55 34 99100-0002` |
| Cidade | `Uberlândia-MG` |
| Categoria veículo | `Confort` |
| Marca | `Chevrolet` |
| Modelo | `Onix` |
| Ano | `2022` |
| Quilometragem | `45000` |
| FIPE (opcional) | `60000` |
| Placa | `ABC1D23` |
| Renavam | `12345678901` |
| ☑ Ciente análise | sim |
| ☑ Ciente rastreador GPS obrigatório | sim |

Submeter → veículo entra com status "em análise"

**2.3. Configurar Stripe Connect** (`/dashboard-proprietario#recebimentos`)
- Clicar "Configurar conta de recebimento"
- Stripe Express abre — usar **dados de teste** (CPF qualquer válido, banco fictício)
- Volta pra plataforma → "Conta verificada"

---

### 3️⃣ Parceiro — `qa-parceiro@nomadedrive.com.br`

**3.1. Criar conta + confirmar**
- Tipo: **Parceiro indicador**

**3.2. Onboarding parceiro** (`/onboarding-parceiro.html`)

| Campo | Valor |
|---|---|
| Nome | `Juliana Costa Teste` |
| Telefone | `+55 34 99100-0003` |
| Cidade | `Uberlândia-MG` |
| Tipo de parceiro | `Pessoa física` |
| Como conhece a Nomade Drive | `Indicação de amigo proprietário` |
| ☑ Ciente regras | sim |

**3.3. Configurar Stripe Connect** (pra receber R$ 200 por indicação)

---

### 4️⃣ Oficina — `qa-oficina@nomadedrive.com.br`

**4.1. Criar conta + confirmar**
- Tipo: **Oficina**

**4.2. Onboarding oficina** (`/onboarding-oficina.html`)

| Campo | Valor |
|---|---|
| Nome da empresa | `Auto Center Teste Uberlândia` |
| CNPJ | `45.997.418/0001-53` |
| Responsável | `Roberto Lima Teste` |
| Telefone | `+55 34 99100-0004` |
| Endereço | `Av. Rondon Pacheco, 100` |
| Cidade | `Uberlândia-MG` |
| Capacidade semanal (veículos) | `10` |
| ☑ Ciente checklist obrigatório | sim |

**4.3. Configurar Stripe Connect**

**4.4. Pra suportar Fase 28 (instalação de rastreador):**

Após admin aprovar a oficina, ela precisa ter:
- `offers_tracker_install = true`
- `tracker_install_price = 350` (ou outro valor)

Edite via SQL no admin (1 vez só):
```sql
update public.workshops
   set offers_tracker_install = true,
       tracker_install_price = 350,
       tracker_install_notes = 'Hardwired oculto. Inclui dispositivo Cobli homologado.'
 where user_id = (select id from auth.users where email = 'qa-oficina@nomadedrive.com.br');
```

---

### 5️⃣ Proteção — `qa-protecao@nomadedrive.com.br`

**5.1. Criar conta + confirmar**
- Tipo: **Equipe de Proteção**

**5.2. Onboarding proteção** (`/onboarding-protecao.html`)

| Campo | Valor |
|---|---|
| Nome | `Patrícia Souza Teste` |
| Telefone | `+55 34 99100-0005` |
| Empresa/seguradora | `Proteção Nomade Drive (interna)` |
| Função | `Analista de triagem` |
| ☑ Ciente regras LGPD | sim |

---

### 6️⃣ Super-admin — `dtrodovalho40@gmail.com`

**Não precisa criar** — é sua conta real. Senha continua a mesma.

Login: `/login.html` → cai direto em `/admin.html`

---

## 🔓 Aprovações iniciais (admin)

Logado como super-admin (`/admin.html`), aprovar os 5 perfis criados:

### Cadastros (`/admin#cadastros`)
Aprovar todos os 5 cadastros (Cliente, Proprietário, Parceiro, Oficina, Proteção) — status → `Aprovado`.

### Documentos (`/admin#documentos`)
Aprovar os 4 documentos do cliente Carlos Silva — status → `Aprovado`.

### Veículo (`/admin#frota`)
Aprovar o Chevrolet Onix do Marcos Pereira → mas atenção: **vai bloquear** porque ainda não tem rastreador instalado. Mensagem esperada:

```
TRACKER_PENDENTE: veículo X não tem rastreador instalado/validado.
Conclua a ordem de instalação antes de aprovar o veículo.
```

Pra resolver, siga o fluxo de instalação (Marcos contrata Auto Center).

### Oficina (`/admin#oficinas`)
Aprovar Auto Center → executar SQL acima pra ativar `offers_tracker_install`.

---

## 🧪 Fluxos prontos pra testar

Depois de tudo aprovado e setado:

### Fluxo A — Instalação de rastreador (NOVO! Fase 28)
1. Logar como **proprietário** (Marcos)
2. `/dashboard-proprietario#rastreador` → escolher Auto Center → "Contratar e pagar"
3. Stripe Checkout → cartão `4242 4242 4242 4242`
4. Logar como **oficina** (Roberto) → `/dashboard-oficina#rastreador` → "Aceitar ordem"
5. Subir 3 fotos dummy + 1 PDF dummy → "Concluir e enviar para validação"
6. Logar como **admin** → `/admin#instalacoes` → ver evidências → "Validar instalação ✓"
7. Veículo agora pode ser aprovado pra entrar na frota!

### Fluxo B — Locação mensal (após Fluxo A)
1. **Admin** aprova veículo (`/admin#frota`)
2. **Admin** cria reserva (`/admin#reservas` → "Criar nova reserva")
   - Cliente: Carlos / Veículo: Onix / Mensal recorrente / R$ 2.500
3. **Cliente** loga → `/reserva-detalhe?id=...` → "Pagar mensalidade" + "Autorizar caução"
4. Validar e-mails em `contato@nomadedrive.com.br` (caixa única)

### Fluxo C — Check-in/out + avaria + multas
1. Cliente solicita retirada (`/dashboard-cliente#checklist`)
2. Proprietário aprova
3. Cliente solicita devolução
4. Proprietário aprova → reporta avaria com fotos
5. Proteção (Patrícia) valida no `/dashboard-protecao#avarias` → captura parcial
6. Sistema consulta Infosimples automaticamente, registra multas em `vehicle_fines`

### Fluxo D — Indicação (parceiro)
1. Parceiro (Juliana) registra indicação (`/dashboard-parceiro` → "Registrar indicação")
2. Admin marca status pra "Aprovado" + comissão `commission_status = paga`
3. Parceiro recebe e-mail "Comissão de R$ 200 paga"

---

## 📧 Onde ver os e-mails

Todos os e-mails de teste chegam em `contato@nomadedrive.com.br` (caixa única via aliases). Acesse:

1. **Webmail Hostinger:** [https://mail.hostinger.com](https://mail.hostinger.com)
2. Login: `contato@nomadedrive.com.br` + senha cadastrada no Hostinger
3. Verá e-mails endereçados pra `qa-cliente@`, `qa-proprietario@`, etc. — todos na mesma caixa

Pra filtrar por destinatário (ver só os do cliente, p.ex.), use o campo de busca: `to:qa-cliente`.

---

## 🛠️ Reset rápido (limpar tudo e refazer)

Se precisar zerar os dados de teste e começar do zero:

```sql
-- ATENÇÃO: apaga TUDO dos usuários qa-* (não toca dtrodovalho40)
-- Rodar em Supabase SQL Editor

-- 1. Deletar bookings deles
delete from public.bookings
 where client_id in (select id from auth.users where email like 'qa-%@nomadedrive.com.br')
    or owner_id  in (select id from auth.users where email like 'qa-%@nomadedrive.com.br');

-- 2. Deletar veículos
delete from public.vehicles
 where owner_id in (select id from auth.users where email like 'qa-%@nomadedrive.com.br');

-- 3. Deletar applications, documentos, ocorrências, indicações...
delete from public.applications where email like 'qa-%@nomadedrive.com.br';
delete from public.user_documents where user_id in (select id from auth.users where email like 'qa-%@nomadedrive.com.br');
delete from public.protection_cases where reported_by in (select id from auth.users where email like 'qa-%@nomadedrive.com.br');
delete from public.partners_referrals where partner_id in (select id from auth.users where email like 'qa-%@nomadedrive.com.br');
delete from public.installation_orders where owner_id in (select id from auth.users where email like 'qa-%@nomadedrive.com.br');

-- 4. Reseta profiles
update public.profiles
   set verification_status = 'rascunho',
       caucao_tier = 'padrao'
 where id in (select id from auth.users where email like 'qa-%@nomadedrive.com.br');

-- 5. Pronto pra refazer onboarding
```

⚠️ Isso NÃO apaga auth.users (a conta segue, só zera os dados associados).

---

## 📚 Referências

- `ROTEIRO_QA_EMAILS.md` — testar cada um dos 21 e-mails ativos
- `ROTEIRO_TESTE_GERAL.md` — checklist mestre de 61 itens cobrindo o sistema todo
- `supabase-qa-aliases-emails.sql` — migration original dos aliases (idempotente)
- `supabase-seed-teste.sql` — seed alternativo via SQL (caso queira pular todos os onboardings)

---

Última atualização: 2026-05-23 (commit após `99844ab`)
