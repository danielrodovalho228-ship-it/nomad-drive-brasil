# 🔍 Auditoria — fixes aplicados em sessão (05/06/2026)

## ✅ P0 — Segurança (3/3)

| # | Brecha | Fix | Commit |
|---|---|---|---|
| 1 | Link "Acesso interno" público no drawer | Removido. Equipe usa URL direta `/login.html` | `d5d78bc` |
| 2 | Gate admin mostrava tela com botão (piscava estrutura) | Redirect agressivo + signOut + clear localStorage se não-admin | `d5d78bc` |
| 3 | `redefinir-senha.html` aceitava qualquer sessão | Exige token de recovery no hash | `d5d78bc` |

## ✅ P1 — Alinhar modelo (frota própria LTDA) (3/3)

| # | Item | Fix | Commit |
|---|---|---|---|
| 1.1 | termos.html descrevia "plataforma intermediária CNAE 6319/Airbnb/Uber" | Reescrita seções 1.0, 1.3, 2, 3, 4.6, 5.1, 5.2, 5.3, 6 pra **LTDA frota própria CNAE 7711-0/00** | `ef29903` |
| 1.2 | admin tinha Stripe Connect/split 10-90/owners | Bloco Stripe Connect Manual Payouts removido + receita 100% | `683e48b` + `e557b5e` |
| 1.3 | Módulo Fiscal era MEI (R$81k/ano) | Refatorado pra **LTDA Lucro Presumido** com PIS/COFINS/IRPJ/CSLL/ISS (~7,9%). Cockpit hero + bar MEI 81k removidos. | `a2911a0` |

## ✅ P2 — Limpar dados + frota real (3/3)

Aplicado via SQL no Supabase (mostrei + confirmou):

- **Deletados**: 6 bookings, 1 rental_request, 8 applications, 8 protection_cases, 5 vehicles fictícios (T-Cross/Onix/Argo/HB20-2021/Cobalt), 8 contas QA (qa-proprietario/parceiro/oficina/cliente/protecao + qa-f6/f7/retest), tabelas dependentes (damages, installation_orders, maintenance_alerts, nps_responses, payments, rental_inspections, vehicle_fines, withdrawals, vehicle_documents, vehicle_inspections, vehicle_maintenance, vehicle_status_snapshots, admin_audit_logs dos QA, user_documents dos QA, workshops dos QA)
- **Mantidos**: 3 contas Daniel (dtrodovalho40, danieltomazrodovalho, danielrodovalho228) + 4 user_roles
- **Inserido**: Hyundai HB20 2023 + Fiat Cronos 2024 (status aprovado, owner = você)

**Estado pós-cleanup**: admin agora inicia ZERADO. KPIs mostram "—" ou "0" reais até a 1ª locação. Frota só tem os 2 carros do site público.

## ✅ P4 — Correções pontuais do site (6/6)

| # | Item | Fix | Commit |
|---|---|---|---|
| 4.1 | Link "Política de privacidade" → `privacidade.html` = 404 | Aponta pra `termos.html#privacidade` | `d23a746` |
| 4.2 | Bio sobre.html dizia "mora em UDI desde 2018" | "Atualmente baseado nos EUA, com operação local em Uberlândia" | `d23a746` |
| 4.3 | Datas reservar.html default = +30 dias | Já estava ok (fix anterior); confirmado | — |
| 4.4 | precos.html abria em "90 dias" (R$3.150/mês), hero diz "30 dias R$3.500" | Aba default `30 dias` + state JS `days: 30` | `d23a746` |
| 4.5 | Form contato dizia que enviava, podia confundir | Mantido fluxo mailto (já era a realidade do código) | — |
| 4.6 | Termos seção 3.3 dizia "nenhum dado armazenado" (mentira) | Reescrita honestamente: Supabase EU + storage criptografado + Stripe/Autentique como subprocessadores | `d23a746` |

## ✅ P5 — Polimento admin (4/4)

Removidas notas dev visíveis ao operador: `rental_requests`, `Backlog #3`, `Sprint E` (×3), `Edge Function`, `partner_services`, `commission_pct`, `<code>emails/email-templates.js</code>`, `Catálogo dos 24 templates v3`, link "Supabase → Functions → send-template → Logs". Tudo trocado por linguagem operacional natural. (`d23a746`)

## ✅ Bonus — UX login dinâmico

Login.html agora detecta **role** após signIn:
- Admin/super_admin → `admin.html`
- Cliente → `dashboard-cliente.html`

Drawer público ganhou botão "**Entrar / Minha conta**" ghost style (visível, não compete com CTAs).

Título login: "Acesso interno" → "Entrar" (mais convidativo pra cliente).

## ⏸ P3 — Área do cliente real (parcial)

**Feito agora (MVP)**:
- Link "Entrar / Minha conta" no drawer público
- Login.html com redirect dinâmico por role
- `dashboard-cliente.html` já existia (1952 linhas)

**Falta (próxima sessão dedicada — ~3-5h)**:

### P3.1 — Página de SIGNUP de cliente (`/cadastro-cliente.html`)
Atualmente cliente só pode ser cadastrado pelo admin via SQL ou pela Edge Function `nova-lead` (gera application). Faltam:
- Form público de signup (nome, e-mail, senha, telefone, CPF)
- Edge Function que cria `auth.users` + `profiles` + `user_roles(role=client, status=pendente)`
- E-mail de confirmação (já temos `mensal_lead_recebido` template)

### P3.2 — Limpar dashboard-cliente.html pro modelo v3
1952 linhas, provavelmente tem refs P2P (split, owner, etc). Precisa auditoria + cleanup similar ao admin.html.

### P3.3 — Página de upload de documentos (KYC)
Cliente envia CNH frente/verso + selfie + comprovante endereço. Storage Supabase `kyc-docs`. Admin revisa em `#documentos`.

### P3.4 — Painel do cliente: ver reservas + histórico
Cliente logado vê suas reservas ativas, histórico, próximas datas, link pra renovar (1-click).

### Alternativa pra Daniel decidir

Se você acha que **a maioria dos clientes vai vir por WhatsApp mesmo** (modelo Bombonato), pode FAZER MENOS:
- Manter signup só pelo admin (você ou Danilo cadastra após WhatsApp inicial)
- Cliente recebe email de boas-vindas com link pra `login.html`
- `dashboard-cliente.html` simplificado: mostrar só "Sua próxima reserva: X em Y" + WhatsApp pra suporte

Isso reduz P3 de 3-5h pra ~1h. Quer essa rota? Me avisa.

## 📊 Status final desta sessão

| Bloco | Status | Commits |
|---|---|---|
| P0 Segurança | ✅ 3/3 | `d5d78bc` |
| P1 Modelo LTDA frota própria | ✅ 3/3 | `ef29903` + `a2911a0` + (anteriores) |
| P2 Limpeza dados + frota real | ✅ 3/3 | SQL Supabase (sem commit no git) |
| P3 Área cliente | ⏸ MVP (link + redirect dinâmico). Falta signup/dashboard full. | parcial |
| P4 Polish site | ✅ 6/6 | `d23a746` |
| P5 Polish admin | ✅ 4/4 | `d23a746` |

**Total commits desta sessão**: 7 (`d5d78bc`, `d23a746`, `ef29903`, `a2911a0`, mais 3 anteriores)

Detalhes do que ainda falta + recomendação na seção P3 acima.
