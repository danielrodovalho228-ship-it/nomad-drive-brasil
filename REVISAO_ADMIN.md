# Revisao sistematica admin.html — 04/06/2026

Arquivo: `admin.html` (4367 linhas). 25 secoes visiveis + 2 hidden (`#proprietarios`, `#instalacoes` — corretamente ocultas via `hidden`).

## Resumo executivo

- 🟢 OK: **9** de 25
- 🟡 Polir: **8**
- 🟠 Refatorar: **4**
- 🔴 Remover/ocultar: **1** (bloco Stripe Connect dentro de `#config`)
- 🆕 Conectar (placeholder): **3**

---

## Por grupo

### 📊 OVERVIEW (5 secoes)

#### 1. `#cockpit` — Cockpit CEO — 🟡 Polir
- **Coerencia**: hero, KPIs (Receita/Contas/Frota/Base) e barra MEI — todos coerentes com frota propria. Alertas SLA/Avarias/Multas/DAS — tudo aderente. **Excecao**: KPI "Base de clientes" soma `clientes_aprovados + proprietarios_aprovados` (linha 3924) — proprietarios nao existe mais, deve ser so `clientes_aprovados`.
- **Tabelas Supabase**: `business_settings`, `ceo_cockpit_summary` (view).
- **Refs P2P**: 1 linha de codigo (3924) + view `ceo_cockpit_summary` provavelmente ainda agrega proprietarios.
- **Sugestao**: linha 3924 → trocar por `s.clientes_aprovados || 0`. Confirma se a view `ceo_cockpit_summary` ainda expoe `proprietarios_aprovados` e remove. Tirar `alertSaques` (saques sao owner-only).

#### 2. `#visao` — Visao geral — 🟠 Refatorar
- **Coerencia**: KPI grid mistura sinais antigos com novos. "Proprietarios em analise" (linha 325) e "Indicacoes de parceiros" (linha 330, label generico) sao P2P.
- **Tabelas Supabase**: `applications` (com `profile_type='owner'` — linha 1542), `vehicles`, `bookings`, `protection_cases`, `partners_referrals`, `workshops`, `notifications`.
- **Refs P2P**: linhas 325, 330, 333 ("Taxa da plataforma" — 10% de split P2P), 1542 (query `profile_type='owner'`), 1555 (`partners_referrals`).
- **Sugestao**: remove KPI `kProprietarios` (325 + 1542). Renomeia "Indicacoes de parceiros" → "Indicacoes B2B" (330). Trocar/remover `kTaxa` (333). Trocar `partners_referrals` por `partners` quando Sprint E rodar. Banner do hero (linha 213) ainda diz "frota, parceiros, **protecao**" — pode virar "sinistros e multas".

#### 3. `#crescimento` — Crescimento — 🟠 Refatorar
- **Coerencia**: funil de aquisicao OK. Mas tem 2 blocos P2P claros: "Top proprietarios por receita gerada" (linhas 1095-1108) e "Clientes Nomade Gold (top fidelidade)" — Gold tier era promo P2P.
- **Tabelas Supabase**: `growth_funnel`, `growth_by_period`, `top_owners` (linha 3556), `client_loyalty_overview`.
- **Refs P2P**: linha 1070 (note "top proprietarios"), 1095-1108 (bloco inteiro Top owners), 1097 (h3), 3556 (query `top_owners`), 3738/3801 (mencao a `owners`).
- **Sugestao**: **remove** bloco "Top proprietarios" inteiro (1095-1108 + JS 3556-3573). Reavalia "Nomade Gold" — se virou clube fidelidade de cliente unico, mantem mas renomeia; se era P2P, remove.

#### 4. `#qualidade` — Qualidade — 🟢 OK
- **Coerencia**: NPS, SLA, churn, tempo medio de triagem — todas metricas de cliente B2C que continuam valendo.
- **Tabelas Supabase**: `quality_summary` view.
- **Sugestao**: nada urgente.

#### 5. `#saude` — Saude sistema — 🟡 Polir
- **Coerencia**: emails 24h, crons, funil rental_requests — tudo OK. **Excecao**: KPI "Connect ativos" e bloco "Stripe Connect breakdown" (linha 1062) sao P2P (owners + Connected Accounts).
- **Tabelas Supabase**: `emails_health_24h`, `cron_jobs_health`, `stripe_connect_health`, `rental_requests_funnel_7d`, `system_alerts`.
- **Refs P2P**: linhas 1036-1039 (KPI Connect), 1062-1065 (breakdown), 3718/3737/3738/3801 (queries Connect).
- **Sugestao**: remove o card Connect (1036-1039) e o breakdown inteiro (1062-1065). Tira a query `stripe_connect_health` do Promise.all (3718). Mantem o resto.

---

### 📞 OPERACAO (8 secoes)

#### 6. `#leads` — Leads — 🟢 OK
- Funil 5 estagios + KPI cards + busca + filtros + lista `rental_requests`. View `leads_enriched`. RPC `update_lead_status`. 100% v3.

#### 7. `#documentos` — KYC — 🟢 OK
- Tabela `user_documents`, storage `kyc-docs`, RLS-friendly. Coerente.

#### 8. `#cadastros` — Cadastros e aprovacoes — 🟡 Polir
- **Coerencia**: tabela funciona pra qualquer perfil. Texto OK.
- **Refs P2P**: linha 1513 ("clientes, proprietarios, parceiros, oficinas") em `dashTodos`. Linha 1680 (`a.roleLabel(app.profile_type)`) ainda mapeia owner se ele aparecer.
- **Sugestao**: muda label do todo (1513) para "clientes, oficinas e parceiros B2B". Filtra `applications` excluindo `profile_type='owner'` ou trata como historico read-only.

#### 9. `#reservas` — Reservas — 🟡 Polir
- **Coerencia**: form de criacao + tabela. Boa UX. **Mas**: usa `owner_id` em todo lugar (3056, 3061, 3109, 3146-3149) pra calcular split 90/10 (3100), salva `platform_fee` (3099) e `owner_estimated_amount` (3115). E dispara email `booking_confirmed_owner` (3147).
- **Tabelas Supabase**: `profiles` (clients), `vehicles` (com `owner_id`), `bookings`.
- **Sugestao**: o split 90/10 nao faz mais sentido se a frota e propria. Considera remover `platform_fee`/`owner_estimated_amount` da insert OU deixa como 0/100. Remove envio do `booking_confirmed_owner` (3146-3149). Mantem o resto.

#### 10. `#vistorias` — Vistorias — 🟢 OK
- `vehicle_inspections` + `workshops` — fluxo legitimo de check-in/out da frota. JS coerente.

#### 11. `#manutencao` — Manutencao e alertas — 🆕 Conectar
- **Coerencia**: estrutura PERFEITA pro v3 (4 KPIs por tipo + tabela alerts + historico).
- **Tabelas Supabase**: `maintenance_alerts`, `vehicle_maintenance` — **nao tem JS pra popular**. `alertCountOil/App/Doc/Tire`, `alertsList`, `maintenanceHistory` ficam como traco indefinido.
- **Sugestao**: criar `loadMaintenanceAlerts()` que faz `from('maintenance_alerts').select(...)`, agrega por `alert_type` pra preencher os 4 KPIs, popula tabela. Idem `loadVehicleMaintenance()`. Sem isso, os "—" no painel viram falso negativo.

#### 12. `#sinistros` — Sinistros e multas — 🟡 Polir
- **Coerencia**: titulo e descricao OK pro v3.
- **Refs P2P**: ainda usa tabela `protection_cases` (linha 2612) — tabela do antigo modelo de "Protecao Nomade" entre owner e locatario. JS so renderiza, sem fluxo de seguradora/Detran.
- **Sugestao**: criar tabela nova `fleet_incidents` (ou reusar `protection_cases` com `case_type` ampliado pra `multa`, `sinistro`, `dano`). Adicionar campos no form: condutor responsavel, status seguradora, valor cobrado. Linha 1525 do todo ainda diz "ocorrencias de **protecao**" — mudar pra "sinistros/multas".

#### 13. `#notificacoes` — Notificacoes — 🟢 OK
- `notifications` table. Generic. Tudo certo.

---

### 🚗 FROTA E PARCEIROS (3 secoes)

#### 14. `#frota` — Frota — 🟢 OK
- Lista `vehicles`. Mantem `owner_id` no schema mas no contexto v3 o owner sempre e a empresa MEI — schema funciona, basta ter os 2-3 veiculos cadastrados.

#### 15. `#oficinas` — Oficinas parceiras — 🟡 Polir
- **Coerencia**: titulo + descricao refatorados pro v3 — OK.
- **Refs P2P**: JS ainda lista `workshops` (linha 2591), nao `partners` com `partner_type='workshop'` como a descricao da secao promete (linha 550).
- **Sugestao**: migrar query (ou view) pra `partners` quando Sprint E rodar. Ate la deixa `workshops` mas adiciona aviso visivel.

#### 16. `#parceiros` — Parceiros B2B — 🟠 Refatorar
- **Coerencia**: titulo e descricao OK pro v3 (hospitais, empresas, seguradoras).
- **Refs P2P**: query `partners_referrals` (2599) e coluna comissao R$200 fixa (2604-2607). Email "referral_commission_paid" disparado em 2052-2055. Tudo isso era o programa "indique e ganha R$200" P2P.
- **Sugestao**: trocar `partners_referrals` por `partners` + view `partners_referrals_b2b`. Coluna "Indicacoes (30d)" precisa contar bookings que vieram de cada parceiro. Comissao deve vir de `partners.commission_pct` (% variavel), nao R$200 fixo. Remove logica do email (2046-2056).

---

### 💰 FINANCEIRO (5 secoes)

#### 17. `#financeiro` — Receita e pagamentos — 🟠 Refatorar
- **Coerencia**: receita bruta, ticket medio, caucao — OK. **Mas**: KPI "Repasses aos proprietarios" (linha 710), descricao "(10%) e repasse ao proprietario (90%)" (706), JS calcula `taxa = bruta * 0.10` e `repasse = bruta - taxa` (1612-1613, 1645-1646).
- **Tabelas Supabase**: `payments`, `bookings`.
- **Sugestao**: remove KPI `finRepasse` (710). Renomeia "Taxa da plataforma" → "Receita liquida" (ou simplesmente nao calcula split). Note de "Conferencia cruzada" com Connect (730-733) tambem nao se aplica mais — substitui por "Stripe Dashboard → Payments". Atualiza JS (1611-1657) pra parar de splitar.

#### 18. `#contas-pagar` — Contas a pagar — 🟢 OK
- CRUD completo de `expenses`. Categorias coerentes. Inclui `pro_labore`, `distribuicao_lucros`, `salario` — tudo v3.

#### 19. `#fiscal` — Fiscal MEI — 🟢 OK
- DAS, DASN, IRPF, alerta de migracao ME. Coerente.

#### 20. `#nfs` — Notas fiscais — 🟢 OK
- Upload manual + listagem. Bucket `invoices`. Generico — vale pra frota propria sem mudanca.

#### 21. `#cupons` — Cupons — 🟡 Polir
- **Coerencia**: form bom. **Excecao**: linha 988 — campo "Tier minimo" com Silver/Gold/Platinum — eram tiers do programa Gold P2P.
- **Sugestao**: ou remove o campo `ncMinTier` (988) ou redefine os tiers no contexto novo (ex: cliente recorrente, primeiro mes, etc).

---

### 👥 GESTAO (4 secoes)

#### 22. `#equipe` — Equipe — 🟢 OK
- CRUD `employees`. Tipos de contrato (Socio/CLT/PJ/Estagio/Aprendiz/Informal). Alerta MEI sobre limite de 1 CLT — perfeito.

#### 23. `#emails` — E-mails enviados — 🆕 Conectar
- **Coerencia**: estrutura excelente, catalogo dos 24 templates v3 listado, link pros logs do Supabase.
- **Falta**: `loadEmails()` que popule `emailToday/Week/Fail` e `emailLogList`. Hoje renderiza so traco e link.
- **Sugestao**: ou cria tabela `email_log` (`SELECT count(*) FROM email_log WHERE sent_at::date = today`) ou usa endpoint Supabase Functions logs via fetch. Sem isso fica decorativo.

#### 24. `#log` — Log de atividades — 🟡 Polir
- **Coerencia**: filtros bons, auditoria robusta. **Excecao**: dropdown filtro inclui `withdrawals` (1242) que e P2P. `auditActionLabel` (2787-2810) mapeia `comissao_status_alterado`, `indicacao_*`, `pagamento_*` — alguns nao se aplicam mais.
- **Sugestao**: tira `<option value="withdrawals">` (1242). Limpa mapas obsoletos em `auditActionLabel` (2807) e `auditTargetLabel` (2817 — `indicacao`, `comissao`).

#### 25. `#config` — Configuracoes — 🔴 Remover bloco Stripe Connect
- **Coerencia**: card generico OK (1287-1290).
- **Refs P2P**: bloco INTEIRO "🔧 Stripe Connect — Configurar payouts manuais" (linhas 1293-1319) + ~110 linhas de JS (1335-1446) sao 100% pra owners P2P (Connected Accounts Express, schedule daily/manual, email `qa-proprietario@nomadedrive.com.br`).
- **Sugestao**: remove tudo entre 1293-1319 (HTML) e 1334-1446 (JS).

---

## Proximos passos priorizados

### Critico — fazer primeiro (≤30 min cada)
1. **Cockpit linha 3924**: `var totalBase = s.clientes_aprovados || 0;` (tira `proprietarios_aprovados`).
2. **`#config`**: deletar bloco Stripe Connect manual payouts inteiro (linhas 1293-1319 HTML + 1334-1446 JS).
3. **`#financeiro` KPI repasse**: remover card linha 710 + ajustar JS 1611-1621 pra parar de calcular split 90/10.
4. **`#crescimento` Top owners**: remover bloco 1095-1108 + JS loader 3556-3573.

### Importante — fazer logo (1-2h cada)
5. **`#manutencao`** 🆕: implementar `loadMaintenanceAlerts()` + `loadVehicleMaintenance()` — desbloqueia a feature Sprint E.
6. **`#emails`** 🆕: implementar `loadEmailLogs()` (criar tabela `email_log` ou wrapper fetch).
7. **`#parceiros`**: trocar query de `partners_referrals` → `partners` + ajustar coluna comissao.
8. **`#sinistros`**: criar form/campos pra condutor responsavel + status seguradora.
9. **`#visao`**: remover KPI `kProprietarios`, renomear "Indicacoes de parceiros" → "Indicacoes B2B".

### Pode esperar (polish)
10. `#cadastros` — texto do todo (linha 1513).
11. `#cupons` — campo "Tier minimo" (linha 988).
12. `#log` — tirar opcao `withdrawals` (1242) + limpar mapas labels P2P.
13. `#reservas` — remover envio email `booking_confirmed_owner` (3146-3149).
14. `#oficinas` — migrar query de `workshops` pra `partners` quando Sprint E rodar.
15. `#saude` — tirar card "Connect ativos" (1036-1039) + breakdown (1062-1065).
16. Hero banner linha 213 — trocar "protecao" por "sinistros".

## Tempo estimado pra zerar
- **Critico** (4 fixes — itens 1-4): ~1h30
- **Importante** (5 fixes — itens 5-9): ~5-7h
- **Polish** (7 fixes — itens 10-16): ~2h
- **Total**: **~9-11h** pra deixar admin 100% v3 (frota propria mensal) sem legacy P2P.
