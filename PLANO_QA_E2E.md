# 🧪 Plano de Testes QA — Nomade Drive Brasil

**Versão:** 1.0 · 05/06/2026
**Site:** https://nomadedrive.com.br
**Painel admin:** https://nomadedrive.com.br/admin.html

---

## 🔐 Credenciais de teste

### Cliente novo (para testar fluxo de cliente)
```
URL:    https://nomadedrive.com.br/login.html
E-mail: danielrodovalho228@gmail.com
Senha:  TesteQa1234!
Status: em_analise (KYC pendente — perfeito pra testar todo o fluxo)
```

### Admin (para validar leads, KYC, reservas etc.)
```
URL:    https://nomadedrive.com.br/login.html
E-mail: dtrodovalho40@gmail.com
Senha:  (pedir ao Daniel)
Role:   super_admin
```

### Reset entre rodadas de teste
Avisar ao time de dev pra rodar:
```sql
DELETE FROM leads;
DELETE FROM rental_requests;
DELETE FROM bookings;
DELETE FROM user_documents WHERE user_id = '<id do cliente teste>';
-- recadastrar conta cliente via signup-cliente
```

---

## 📋 Suite 1 — Site público (não logado)

| # | Passo | Resultado esperado |
|---|---|---|
| 1.1 | Abrir `https://nomadedrive.com.br` em celular | Hero verde com foto do Fiat Cronos, badge "A partir de R$ 3.690 / 30 dias" |
| 1.2 | Tocar no hambúrguer (canto direito) | Drawer abre da direita com itens: Início, Frota, Preços, Como funciona, Para quem é, Sobre, FAQ, Contato + CTA Reservar + Entrar |
| 1.3 | Ir em **Frota** | Mostra **APENAS 1 carro** (Fiat Cronos 2024), preço "A partir de R$ 3.690 / 30 dias", botões "Ver detalhes" e "Reservar" |
| 1.4 | Ir em **Preços** | Abre na aba **30 dias** (default), mostra 3 planos: Essencial R$ 3.690 · Estendido R$ 3.740 (destacado "Mais escolhido") · Sem Limite R$ 3.790. Trocar pra 60/90/180 dias atualiza valores. Box verde sage embaixo: "Diferença pra locadora tradicional: km que não evapora" |
| 1.5 | Ir em **Como funciona** | Stepper visual com etapas + CNH realista |
| 1.6 | Ir em **FAQ** | 18 perguntas. Buscar "caução" → resposta diz "R$ 2.000 no Fiat Cronos" (NÃO menciona HB20) |
| 1.7 | Ir em **Sobre** | Bio: "Atualmente baseado nos EUA, com operação local em Uberlândia tocada pelo sócio operacional" |
| 1.8 | Ir em **Contato** → preencher form e enviar | Abre app de e-mail nativo com mensagem pronta pra `contato@nomadedrive.com.br`. Mensagem na tela: "Abrindo seu app de e-mail..." |
| 1.9 | Footer → clicar em "Política de privacidade" | Abre `politica-privacidade.html` (sem 404) |
| 1.10 | URL antiga `/carros/popular.html` | Redireciona automaticamente pra `/carros/sedan.html` (HB20 removido do lançamento) |
| 1.11 | Procurar link "Acesso interno" no footer | ❌ NÃO existe (segurança) |

---

## 📝 Suite 2 — Cadastro novo de cliente

| # | Passo | Resultado esperado |
|---|---|---|
| 2.1 | Footer/menu → "Entrar / Minha conta" → "Cadastre-se grátis" | Vai pra `/cadastro-cliente.html` |
| 2.2 | Preencher form: nome, e-mail (use plus-address tipo `seuemail+qa1@gmail.com`), senha 8+, WhatsApp `(34) 99999-8888`, marcar aceite termos | Botão "Criar conta gratuita" |
| 2.3 | Clicar "Criar conta gratuita" | Tela muda pra "Conta criada 🎉" em ~2 segundos. Botão "Entrar no meu painel →" |
| 2.4 | Conferir Gmail | E-mail "Recebemos sua solicitação — Nomade Drive" chega em até 30s, remetente `Nomade Drive Brasil <noreply@nomadedrive.com.br>` |
| 2.5 | (Daniel/admin) Conferir Gmail dele | E-mail "[Equipe] Novo lead — responder em até 2h" chega pra time |
| 2.6 | (Admin) Login + ir em `#leads` | Novo lead aparece no topo da lista com nome, e-mail, status "novo" |
| 2.7 | (Admin) Ir em `#cadastros` | Novo cadastro aparece com status `em_analise` |

---

## 🔑 Suite 3 — Login + dashboard cliente

| # | Passo | Resultado esperado |
|---|---|---|
| 3.1 | Abrir `/login.html` em celular | Hero verde, form e-mail + senha, link "Esqueci minha senha" + "Cadastre-se grátis" |
| 3.2 | Login com `danielrodovalho228@gmail.com` / `TesteQa1234!` | Redireciona pra `/dashboard-cliente.html` |
| 3.3 | (Mobile) Topo do dashboard | **Hero gradient verde Nubank-style** com halo dourado, eyebrow "Sua conta · Nomade Drive", título "Tudo da sua locação em um lugar só" |
| 3.4 | (Mobile) Tocar no hambúrguer | Drawer abre com 2 seções: **Meu painel** (Painel, Solicitações, Documentos, Histórico, Próximos passos) + **Site** (Início, Frota, Preços, etc.) + botão "Sair da minha conta" |
| 3.5 | Saudação "👋 Olá Daniel" + pill verde "em análise" | Visível no topo (Sora 26px) |
| 3.6 | 3 KPIs em cards arredondados | Status do perfil · Solicitações enviadas · Cidade. Cada um com barra lateral colorida (verde, dourado, roxo). Hover lifta -2px |
| 3.7 | Seção "Solicitações" | Tem 3 steps numerados em cards verdes claros (não lista flat) |
| 3.8 | Seção "Documentos" | Lista de docs pendentes (CNH frente, verso, selfie, comprovante endereço) com botões "Enviar" |
| 3.9 | Botão "Sair da minha conta" | Faz logout + volta pra `index.html` |

---

## 📄 Suite 4 — Upload de documentos KYC

| # | Passo | Resultado esperado |
|---|---|---|
| 4.1 | Logado, ir em **#documentos** | Lista mostra 4 docs pendentes |
| 4.2 | Tocar "Enviar" no item "CNH frente" → selecionar foto | Upload começa (~3s), status muda pra "enviado, aguardando análise" |
| 4.3 | Repetir pros outros 3 docs | Todos status "enviado" |
| 4.4 | (Admin) Ir em `#documentos` (KYC pra revisar) | Cliente aparece com 4 docs anexados pra revisão |
| 4.5 | (Admin) Aprovar | Cliente recebe e-mail "Documentos aprovados ✓" |
| 4.6 | (Cliente) Recarregar dashboard | Status muda pra "aprovado" (pill verde) |

---

## 🚗 Suite 5 — Solicitação de locação

| # | Passo | Resultado esperado |
|---|---|---|
| 5.1 | Cliente logado e aprovado clica "Reservar" | Vai pra `/reservar.html` |
| 5.2 | Step 1: data, plano, carro | **Cronos auto-selecionado** (único carro). Data devolução = retirada + 30 dias por padrão. Mínimo 30 dias |
| 5.3 | Trocar plano (Essencial / Estendido / Sem Limite) | Total atualiza em tempo real (3.690 / 3.740 / 3.790) |
| 5.4 | Trocar período pra 60 dias | Total atualiza pra ~7.011 / 7.106 / 7.201 |
| 5.5 | Step 2: ponto de retirada | Mapa interativo com 5 pontos UDI (Aeroporto, Center Shopping, HC-UFU, Tubal Vilela, Posto BR) |
| 5.6 | Step 3: motivo da locação | Dropdown com 8 categorias (trabalho remoto, médico, executivo, etc). Selecionar "médico-visitante" → sugestão "Cronos automático é mais confortável" |
| 5.7 | Enviar solicitação | Confirmação "Solicitação enviada" + e-mail chega |
| 5.8 | (Admin) Ir em `#leads` | Novo lead aparece com origem "site-reservar-mensal" + perfil escolhido + plano |
| 5.9 | (Cliente) Voltar pro dashboard → `#solicitacoes` | Solicitação listada com status "em análise" |

---

## 💼 Suite 6 — Painel admin

| # | Passo | Resultado esperado |
|---|---|---|
| 6.1 | Login admin → `/admin.html` em **mobile** | Topbar verde no topo com hambúrguer esquerda + atalho home direita |
| 6.2 | Tocar hambúrguer | Sidebar desliza da esquerda (drawer 86% tela). Tocar num link (ex: Cockpit) → drawer fecha, scrolla pra seção |
| 6.3 | **Cockpit CEO** (topo) | Cabeçalho diz "LTDA · Lucro Presumido · CNAE 7711-0/00" (NÃO MEI). KPIs zerados (R$ 0 receita, 0 locações) |
| 6.4 | **Leads** | 4 cards: Daniel (signup), Maria Silva (família), Dr. João Mendes (médico), Carlos Oliveira (executivo) |
| 6.5 | Mover Maria Silva: novo → contatado → qualificado → convertido | Funil atualiza, conta de "novos" diminui |
| 6.6 | **KYC pra revisar** | Daniel sem docs ainda (vazio até cliente upload) |
| 6.7 | **Cadastros** | 1 cadastro: Daniel · em_analise · client · há minutos |
| 6.8 | **Frota** | 1 carro: Fiat Cronos 2024 · status aprovado |
| 6.9 | **Reservas ativas** | 0 (até criar a primeira) |
| 6.10 | **Vistorias** | Vazio (sem booking pra checkin/checkout) |
| 6.11 | **Manutenção e alertas** | Tipos: troca de óleo, uso suspeito, doc vencendo, pneu. SEM jargão dev (sem `maintenance-trigger Edge Function`) |
| 6.12 | **Sinistros e multas** | Vazio |
| 6.13 | **Notificações internas** | Lista de e-mails enviados |
| 6.14 | **Oficinas parceiras** | Vazio até cadastrar manual |
| 6.15 | **Parceiros B2B** | Vazio até cadastrar manual |
| 6.16 | **Financeiro** | "Receita líquida 100%" (NÃO repasse 90/10). Taxa Stripe 3% (não 10%) |
| 6.17 | **Contas a pagar** | Vazio |
| 6.18 | **Fiscal (LTDA)** | Cabeçalho diz "LTDA / Lucro Presumido". PIS 0,65% + COFINS 3% + IRPJ 1,2% + CSLL 1,08% + ISS 2-5%. SEM teto MEI R$ 81k, SEM DAS MEI |
| 6.19 | **Notas fiscais** | Vazio |
| 6.20 | **Cupons** | Vazio |
| 6.21 | **Equipe** | Lista os sócios + funcionários |
| 6.22 | **E-mails enviados** | Lista dos disparos recentes (signup, KYC, etc.) |
| 6.23 | **Log de atividades** | Eventos do admin |
| 6.24 | **Configurações** | Settings do business |
| 6.25 | Sair (sidebar) → atalho home | Faz logout + volta pra `/index.html` |
| 6.26 | Tentar `/admin.html` sem logar | Tela "Verificando acesso…" + bloqueio (não vê dados) |

---

## ✉️ Suite 7 — E-mails transacionais

| # | Trigger | E-mail esperado | Quem recebe |
|---|---|---|---|
| 7.1 | Signup cliente | "Recebemos sua solicitação" | Cliente |
| 7.2 | Signup cliente | "[Equipe] Novo lead — responder em até 2h" | Equipe (`TEAM_EMAIL_RECIPIENTS`) |
| 7.3 | Admin aprova KYC | "Documentos aprovados ✓ — vamos pro contrato" | Cliente |
| 7.4 | Admin reprova KYC | "Não conseguimos aprovar seu cadastro" | Cliente |
| 7.5 | Admin envia link contrato | "Seu contrato chegou — assine pra liberar pagamento" | Cliente |
| 7.6 | Admin aprova locação + cliente paga | "Pagamento confirmado — vamos agendar entrega" | Cliente + Equipe |
| 7.7 | Admin agenda entrega | "Entrega agendada — DD/MM às HH:MM" | Cliente |
| 7.8 | D-3 antes da devolução | "Sua devolução é em 3 dias — vamos combinar?" | Cliente (cron `renewal_reminders_daily` 09:00h) |
| 7.9 | Cliente confirma devolução | "Devolução confirmada — obrigado por dirigir com a gente" | Cliente |
| 7.10 | NPS baixo do cliente | "[Equipe] NPS baixo ({nota}) — {nome}" | Equipe |

**Verificar TODOS no Resend Dashboard** (https://resend.com/emails):
- Status: `delivered` ✅
- Remetente: `Nomade Drive Brasil <noreply@nomadedrive.com.br>` ✅
- Sem bounces nem failed

---

## 🏷 Códigos de protocolo (referência única do time)

Todo registro do sistema gera um **protocolo único** automaticamente via trigger SQL. Aparece no **rodapé dos e-mails transacionais**, nos **cards do painel admin** e no **dashboard do cliente** (seções Solicitações/Histórico). Formato padrão: `XX-AAAA-####` (2 letras prefixo + ano 4 dígitos + sequencial 4 dígitos zero-padded).

| Prefixo | Significado | Tabela | Trigger | Aparece nos e-mails |
|---|---|---|---|---|
| **RS-AAAA-####** | 🚗 Reserva (booking) | `bookings` | `set_booking_protocol` | Pagamento confirmado · Caução autorizada · Entrega agendada · Devolução · Renovação |
| **PG-AAAA-####** | 💰 Pagamento/cobrança | `payments` | `set_payment_protocol` | Mensalidade cobrada · Caução capturada · Recibo/NF |
| **VS-AAAA-####** | 🔍 Vistoria (check-in/out) | `rental_inspections` | `set_inspection_protocol` | Vistoria de retirada OK · Vistoria de devolução |
| **AV-AAAA-####** | 🔧 Avaria | `damages` | `set_damage_defaults` | Avaria reportada · Cotação enviada · Contestação registrada |
| **PR-AAAA-####** | 🛡 Caso de proteção/sinistro | `protection_cases` | `set_protection_case_defaults` | Sinistro aberto · Caso encerrado · Triagem do parceiro |
| **NDB-AAAA-######** | 📝 Aplicação/cadastro (6 dígitos) | `applications` | `set_application_protocol` | Documentos solicitados · Análise concluída · Aprovação KYC |

### ⚠️ Sobre e-mails legados `[QA] ... QA-YYMMDD-####`

Os e-mails com prefixo `[QA]` no assunto e protocolo no formato `QA-260531-5239` são **simulações da época de testes (tabela `qa_bookings`)**. **NÃO** representam fluxo de produção. Se aparecerem na inbox do time, podem ser arquivados — não são bugs.

E-mails reais da operação **sempre** usam um dos 6 prefixos da tabela acima.

### Como QA valida que protocolo está funcionando

1. Roda Suite 5 (cliente cria solicitação) → sistema gera `RS-2026-####`
2. No e-mail "Pagamento confirmado" que cliente recebe → rodapé deve mostrar `📋 Protocolo: RS-2026-####`
3. No painel admin (Reservas ativas) → cabeçalho do card deve mostrar o mesmo `RS-2026-####`
4. Suporte recebe ticket do cliente → consulta no admin por protocolo → encontra reserva, cliente, pagamentos, vistorias, avarias relacionadas com o mesmo prefixo

### Exemplo demonstrado em 05/06/2026

Booking de demonstração criado pelo Daniel:
- Cliente: `danielrodovalho228@gmail.com`
- Carro: Fiat Cronos 2024
- Plano: Estendido 30 dias · R$ 3.740
- Período: 08/06/2026 → 08/07/2026
- **Protocolo gerado pelo trigger: `RS-2026-0007`**
- E-mail "Mensalidade confirmada" enviado pela Edge Function `send-template`
- Resend ID: `442d508c-7205-4697-a3d5-8b0301196670`

---

## 🔒 Suite 8 — Segurança (não pode acontecer)

| # | Cenário | Resultado esperado |
|---|---|---|
| 8.1 | Abrir `/admin.html` sem logar | Tela "Verificando acesso…" bloqueia, NÃO mostra dados |
| 8.2 | Login com role=client tentar acessar `/admin.html` | Redirect pra `/dashboard-cliente.html` |
| 8.3 | Login com role=admin tentar acessar `/dashboard-cliente.html` | Acessa normal (admin pode ver tudo) |
| 8.4 | Cliente A logado + chamar API `/rest/v1/profiles` direto | Só retorna o próprio profile (RLS funciona) |
| 8.5 | Cliente A tentar SELECT em booking de outro cliente | RLS bloqueia |
| 8.6 | Página `/login.html` com URL `?redirect=admin.html` mas role=client | Redireciona pra dashboard cliente, NÃO pra admin |
| 8.7 | Footer público de qualquer página | Sem link "Acesso interno" ou similar |
| 8.8 | Source code de qualquer página pública | Sem nome/e-mail real, sem service_role_key, sem credencial |

---

## 📱 Suite 9 — Responsividade mobile

| # | Tela / Cenário | Resultado esperado |
|---|---|---|
| 9.1 | Home no celular (iPhone SE 375px) | Hero não corta, foto Cronos visível, badge legível |
| 9.2 | Tabela comparativa locadora vs Nomade (mobile) | Scroll horizontal interno (não estoura) |
| 9.3 | Página `/frota.html` no celular | Card único Cronos centralizado, foto grande |
| 9.4 | Página `/precos.html` no celular | 3 planos empilhados em 1 coluna, toggle período 30/60/90/180 funciona |
| 9.5 | `/dashboard-cliente.html` no celular | Hero gradient verde Nubank-style, hambúrguer abre drawer, cards KPI empilhados, animação suave |
| 9.6 | `/admin.html` no celular | Topbar verde + hambúrguer, sidebar vira drawer overlay, KPIs em 2 colunas (cockpit), tabelas com scroll horizontal |
| 9.7 | Trocar device pra tablet (768px) | Layout adapta, nada quebra |
| 9.8 | Trocar pra desktop 1280px | Tudo volta ao normal (sidebars fixas, grids 3-6 colunas) |

---

## 🎬 Cenário completo end-to-end (fluxo real do cliente)

Tempo estimado: **20 minutos**

1. **Abrir site** → ver Cronos R$ 3.690 → clicar "Reservar"
2. **Não logado** → redirect pra login → "Cadastre-se grátis"
3. **Cadastrar** com e-mail `qa+ciclo1@suaempresa.com` + senha forte
4. **Verificar e-mail** "Recebemos sua solicitação"
5. **Logar** no dashboard → ver hero verde + status "em análise"
6. **Upload de docs** CNH + selfie + comprovante endereço
7. **(Trocar pra admin)** → KYC pra revisar → aprovar
8. **Cliente recebe** e-mail "Documentos aprovados" → recarrega dashboard → status "aprovado"
9. **Cliente clica Reservar** → escolhe plano Estendido 60 dias (R$ 7.106) → ponto Aeroporto → motivo "tratamento médico"
10. **Solicitação criada** → admin vê em #leads + #rental_requests
11. **Admin aprova** → cliente recebe link contrato Autentique (mock)
12. **Cliente recebe** link pagamento → paga PIX (mock)
13. **Admin agenda entrega** → cliente recebe "Entrega agendada"
14. **Vistoria de retirada** (admin marca fotos + km inicial)
15. **30 dias depois** (simular) → e-mail D-3 devolução
16. **Vistoria devolução** → e-mail "Devolução confirmada"
17. **Cliente avalia** NPS (e-mail D+1)
18. **Verificar admin** mostra: 1 locação encerrada, NPS registrado, contas a receber tudo certo

---

## 🐛 Como reportar bugs

Pra cada bug:
- **Severidade**: 🚨 P0 (bloqueador) · ⚠️ P1 (impede tarefa) · 📋 P2 (incômodo) · ✨ P3 (polish)
- **Passos pra reproduzir** (1, 2, 3...)
- **Esperado vs Obtido**
- **Print/vídeo** se possível
- **Browser/device** (ex: iPhone 13, Safari)
- **URL exata** + horário (pra cruzar com logs Supabase)

Mandar pro Daniel via WhatsApp ou e-mail.

---

## 📊 Tabela de cobertura

| Área | Suites | Itens | Coberto? |
|---|---|---|---|
| Site público | 1 | 11 | ✅ |
| Cadastro | 2 | 7 | ✅ |
| Login + dashboard | 3 | 9 | ✅ |
| KYC | 4 | 6 | ✅ |
| Reserva | 5 | 9 | ✅ |
| Admin | 6 | 26 | ✅ |
| E-mails | 7 | 10 | ✅ |
| Segurança | 8 | 8 | ✅ |
| Responsivo | 9 | 8 | ✅ |
| E2E completo | Cenário | 18 passos | ✅ |
| **TOTAL** | **9 + 1** | **112 checks** | ✅ |

---

## 🛠 Smoke tests automatizados (já rodaram 05/06/2026 18:50)

Status técnico backend:
- ✅ 15/15 páginas HTTP 200
- ✅ CSS Nubank novo carrega
- ✅ Login com `TesteQa1234!` retorna access_token
- ✅ Sessão validada (`/auth/v1/user` retorna user correto)
- ✅ RLS funciona (profiles retorna só o próprio)
- ✅ Edge Function `signup-cliente` cria conta + dispara 2 e-mails em ~2s
- ✅ Resend custom SMTP entregando (remetente `noreply@nomadedrive.com.br`)
- ✅ 2 crons Supabase ativos (`activate_milestones_daily`, `renewal_reminders_daily`)

---

**Pronto pra QA executar.** Qualquer dúvida sobre fluxos específicos, perguntar ao Daniel.
