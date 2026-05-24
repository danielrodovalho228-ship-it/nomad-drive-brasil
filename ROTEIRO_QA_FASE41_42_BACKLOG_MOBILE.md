# 🧪 Roteiro QA — Fase 41 + 41b + 42 + 43 + 43b + Backlog Mobile

> **Data:** 2026-05-24 (v2)
> **Builds:**
>   - `21f40fd` — Fase 43 COMPLETO (Nomade Gold)
>   - `b105676` — Fase 43 inicial
>   - `8677823` — Roteiro QA v1
>   - `f7c6159` — Fase 42 (Painel Leads)
>   - `2504c5c` — Fase 41b FIX
>   - `13d5aa4` — Backlog mobile (3 itens)
>   - `0590cb8` — Fase 41 (Renovação)
> **Tempo estimado:** ~4.5h pra rodar tudo (8 blocos × ~30min)
> **Ambiente:** produção (https://nomadedrive.com.br)
> **Cobertura:** 56 cenários distribuídos em 8 blocos

---

## 📋 Pré-requisitos

### Usuários de teste necessários
| Papel | E-mail | Estado | Pra que serve |
|---|---|---|---|
| **Cliente A — aprovado** | `qa_cliente_aprovado@nomadedrive.com.br` | `verification_status = aprovado` | Testar Backlog #3 fluxo completo + renovação |
| **Cliente B — em análise** | `qa_cliente_analise@nomadedrive.com.br` | `verification_status = em_analise` | Testar Backlog #3 redirect análise |
| **Cliente C — rascunho** | `qa_cliente_rascunho@nomadedrive.com.br` | `verification_status = rascunho` | Testar Backlog #3 redirect onboarding |
| **Owner D — aprovado** | `qa_owner@nomadedrive.com.br` | proprietário com 1 veículo aprovado | Receber e-mail de novo interesse |
| **Admin E** | `dtrodovalho40@gmail.com` | super_admin | Testar Painel Leads |

> Se não tiver, cria via `cadastro.html` ou usa `supabase-qa-seed-completo.sql`.

### Reserva pra testar renovação
- Booking ativa pra Cliente A: `status='em_uso'` ou `'aprovado'`, `end_date` entre **hoje + 1d** e **hoje + 7d**
- Se não tiver, criar via admin OU rodar o SQL abaixo:

> ⚠️ **IMPORTANTE:** os placeholders `<COLE_*_AQUI>` devem ser SUBSTITUÍDOS por UUIDs reais antes de rodar. Pega os UUIDs primeiro:
>
> ```sql
> -- 1. Pega UUID do Cliente A
> select id, full_name from public.profiles where main_role = 'client' limit 5;
>
> -- 2. Pega UUID de um veículo aprovado e seu owner
> select id, owner_id, make, model from public.vehicles where status = 'aprovado' limit 5;
> ```
>
> **Depois** cola os UUIDs nos lugares corretos:

  ```sql
  insert into public.bookings (
    client_id, owner_id, vehicle_id,
    start_date, end_date,
    monthly_price, status, billing_mode
  ) values (
    '<COLE_UUID_CLIENTE_A_AQUI>',   -- ex: '11111111-1111-...'
    '<COLE_UUID_OWNER_D_AQUI>',      -- pega de vehicles.owner_id
    '<COLE_UUID_VEICULO_AQUI>',
    current_date - interval '23 days',
    current_date + interval '5 days',
    1800,
    'em_uso',
    'monthly'
  );
  ```

### Browsers/devices matrix
- ✅ Chrome desktop (Windows ou Mac)
- ✅ Safari iOS (iPhone real ou Sim)
- ✅ Chrome Android
- ✅ Firefox desktop (smoke test)

### Acessos auxiliares
- Caixa de e-mail `contato@nomadedrive.com.br` (pra ver leads chegarem)
- Caixa de e-mail dos clientes de teste
- Supabase Dashboard → SQL Editor (pra queries de validação)
- Supabase Dashboard → Functions → Logs (pra ver erros)

---

## 🟢 BLOCO 1 — Fase 41: Renovação 1-clique (dashboard cliente)

### Cenário 1.1 — Cliente vê card de renovação
**Pré:** logado como **Cliente A**, com booking ativa terminando em ≤7 dias.
1. Acessa `dashboard-cliente.html`
2. **Esperado:** card amarelo no topo "🔔 Sua locação termina em **N dias** — renovar?"
   - Mostra carro + dias restantes
   - Mostra preço com **5% off destacado**
   - Botão "Renovar 1 mês" / "2 meses" / "3 meses"

**Bug se:** card não aparece, ou aparece pra reserva com >7 dias

### Cenário 1.2 — Renovação 1-clique funciona
1. Clica "Renovar 1 mês"
2. Confirma no modal
3. **Esperado:**
   - Mensagem de sucesso
   - Aparece nova booking na lista de reservas com:
     - `status = aprovado`
     - `start_date` = `end_date_anterior + 1`
     - `end_date` = `start_date + 30 dias`
     - `monthly_price` = preço original × 0.95 (5% off)

**Validar via SQL:**
```sql
select id, start_date, end_date, monthly_price, status
from public.bookings
where client_id = '<uuid_cliente_A>'
order by created_at desc limit 2;
```
A booking mais recente deve ter monthly_price = `valor_antigo * 0.95`.

### Cenário 1.3 — Bloqueia renovação duplicada
1. Tenta renovar a mesma booking de novo
2. **Esperado:** erro "Esta reserva já foi renovada"

### Cenário 1.4 — Bloqueia se não é o cliente
1. Loga como **Cliente B**
2. Tenta via console: `await client.rpc('clone_booking_for_renewal', { source_booking_id: '<id_booking_do_A>', duration_months: 1 })`
3. **Esperado:** erro "Apenas o cliente da reserva pode renovar"

---

## 🟡 BLOCO 2 — Fase 41b: E-mail D-7 automático (cron)

### Cenário 2.1 — Trigger manual do cron
1. SQL Editor:
```sql
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-renewal-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object('source', 'qa_manual_test')
);
```
2. Espera 2 segundos
3. Verifica resposta:
```sql
select id, status_code, content::text from net._http_response
where created >= now() - interval '2 minutes'
order by created desc limit 3;
```
4. **Esperado:** status 200 + content tipo `{"ok":true,"checked":N,"sent":X,...}`

### Cenário 2.2 — Cliente A em D-7 recebe e-mail
**Pré:** Cliente A tem booking terminando em exatamente 7, 3 OU 1 dia.
1. Roda o trigger acima
2. Verifica caixa de e-mail do Cliente A
3. **Esperado:** e-mail com assunto "Sua locação está terminando em N dias — renove com 5% off"
   - Layout HTML com gradient amarelo
   - Botão CTA "Renovar agora"
   - Link leva pro dashboard-cliente.html

### Cenário 2.3 — Anti-spam funciona
1. Roda o trigger 2 vezes seguidas
2. **Esperado:** segundo trigger retorna `skipped_already_sent: N` (não envia duplicata)
3. Validar no audit log:
```sql
select count(*) from public.admin_audit_logs
where action = 'renewal_reminder_sent'
  and created_at >= current_date;
```

### Cenário 2.4 — Cron agendado
```sql
select jobname, schedule, active from cron.job
where jobname = 'renewal_reminders_daily';
```
**Esperado:** 1 linha, `schedule = '0 9 * * *'`, `active = true`

---

## 📱 BLOCO 3 — Backlog Mobile #2: Banner clicável

### Cenário 3.1 — Hero carousel desktop
1. Abre `https://nomadedrive.com.br` em desktop
2. Hover sobre um slide do carrossel hero (não o banner promocional)
3. **Esperado:**
   - Cursor muda pra pointer
   - Imagem dá leve zoom (1.02)
   - Cap dourada destaca
4. Click no slide
5. **Esperado:** vai pra `car.html?id=<id_do_carro>`

### Cenário 3.2 — Hero carousel mobile
1. Abre no Safari iOS
2. Tap em qualquer slide
3. **Esperado:** mesma navegação pra `car.html?id=X`

### Cenário 3.3 — Setas e dots ainda funcionam
1. Clica seta ‹ ou ›
2. **Esperado:** carrossel troca slide, **NÃO navega** pra car.html
3. Clica em um dot abaixo
4. **Esperado:** troca pra aquele slide específico

**Bug se:** click no dot/seta acaba navegando

---

## 📝 BLOCO 4 — Backlog Mobile #1: Form orçamento fallback e-mail

### Cenário 4.1 — Submissão padrão
1. Em `index.html#orcamento`, preenche:
   - Nome: `QA Teste 41`
   - Contato: `qa.teste@nomadedrive.com.br`
   - Cidade: `Uberlândia-MG`
   - Data: hoje + 7 dias
   - Duração: 2 meses
   - Categoria: Confort
2. Clica "Enviar pedido de orçamento"
3. **Esperado:**
   - WhatsApp abre em nova aba com mensagem pré-preenchida
   - Embaixo do form aparece: "✅ Lead capturado por e-mail também..."

### Cenário 4.2 — E-mail chegou no staff
1. Abre caixa `contato@nomadedrive.com.br`
2. **Esperado:** e-mail "Lead landing — QA Teste 41 — Confort"
   - HTML com logo + tabela de dados completa
   - Reply-to é o e-mail do lead (`qa.teste@nomadedrive.com.br`)

### Cenário 4.3 — Lead apareceu no admin
1. Loga como Admin E
2. `admin.html` → seção 📩 Leads
3. **Esperado:** lead "QA Teste 41" aparece como **🆕 Novo**, badge SLA verde

### Cenário 4.4 — Honeypot bloqueia bot
1. Console do navegador no form:
```js
var f = document.getElementById('form-orcamento');
f.querySelector('[name="company"]').value = 'spam.com';
f.querySelector('[name="nome"]').value = 'Bot';
f.querySelector('[name="contato"]').value = 'bot@spam.com';
f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
```
2. Verifica admin → **NÃO** deve ter chegado lead "Bot"
3. Verifica e-mail → **NÃO** deve ter chegado e-mail

### Cenário 4.5 — Anti-duplicata
1. Submete 2x o mesmo lead em <24h (mesmo contato)
2. No admin, o segundo aparece com **anotação** "⚠️ Possível duplicata (mesmo contato nas últimas 24h)"

### Cenário 4.6 — Validação required
1. Submete form com nome vazio
2. **Esperado:** mensagem "Preencha seu nome..." aparece, **não** dispara WhatsApp nem e-mail

---

## 🚗 BLOCO 5 — Backlog Mobile #3: "Quero alugar este carro"

### Cenário 5.1 — Não logado → cadastro
1. Em **navegador anônimo** (sem sessão)
2. Acessa `car.html?id=hb20-comfort`
3. Clica botão verde "Quero alugar este carro"
4. **Esperado:**
   - Mensagem em amarelo: "Você precisa criar uma conta primeiro. Redirecionando..."
   - Após 1.2s redireciona pra `cadastro.html?redirect=car.html%3Fid%3Dhb20-comfort`

### Cenário 5.2 — Logado em rascunho → onboarding
1. Loga como **Cliente C** (rascunho)
2. Acessa `car.html?id=hb20-comfort`
3. Clica "Quero alugar este carro"
4. **Esperado:**
   - Mensagem: "Você precisa completar seu cadastro de cliente primeiro..."
   - Redireciona pra `onboarding-cliente.html`

### Cenário 5.3 — Logado em análise → status
1. Loga como **Cliente B** (em_analise)
2. Mesmo fluxo
3. **Esperado:**
   - Mensagem informativa com link "Ver status"
   - **NÃO** redireciona automaticamente

### Cenário 5.4 — Logado aprovado → cria rental_request + 2 e-mails
1. Loga como **Cliente A** (aprovado)
2. Acessa `car.html?id=hb20-comfort`
3. Botão fica "Enviando solicitação..." enquanto processa
4. **Esperado:**
   - Mensagem verde: "✅ Solicitação enviada! Você receberá um e-mail de confirmação..."
   - Mostra referência (uuid curto)
   - Botão fica desabilitado "Solicitação enviada ✓"

### Cenário 5.5 — E-mails de confirmação chegaram
1. Caixa do **Cliente A**:
   - **Esperado:** e-mail "Solicitação recebida — Hyundai HB20 Comfort"
2. Caixa `contato@nomadedrive.com.br` (catálogo sem vehicle_id mapeado):
   - **Esperado:** e-mail "Novo interesse — Hyundai HB20 Comfort"

### Cenário 5.6 — Aparece no admin (pedidos rental_requests)
1. Loga como Admin E → `admin.html` → 📩 Leads
2. Quadro de baixo "👤 Pedidos de clientes logados (rental_requests)"
3. **Esperado:** linha nova com Cliente A

### Cenário 5.7 — Banco salvou
```sql
select id, client_id, vehicle_id, desired_start_date, desired_months, reason, status, created_at
from public.rental_requests
where client_id = '<uuid_cliente_A>'
order by created_at desc limit 3;
```
**Esperado:** linha nova com `reason` mencionando "Modelo de interesse: Hyundai HB20 Comfort"

---

## 📊 BLOCO 6 — Fase 42: Painel de Leads no admin

### Cenário 6.1 — KPIs corretos
1. Loga como Admin E → `admin.html` → 📩 Leads
2. **Esperado:**
   - 5 cards no topo: Novos, Contatados, Qualificados, Convertidos, Perdidos
   - Contagens batem com query:
     ```sql
     select status, count(*) from public.leads group by status;
     ```
   - Card "Novos" mostra contagem de SLA crítico (>48h sem contato)
   - Card "Convertidos" mostra taxa % do total

### Cenário 6.2 — KPI clicável filtra lista
1. Clica no card "🆕 Novos"
2. **Esperado:**
   - Filtro "Novos" fica ativo
   - Lista mostra só leads "novo"
   - Page scroll suave pra lista

### Cenário 6.3 — Filtros funcionam
1. Clica cada filtro: Todos / Novos / Contatados / Qualificados / Convertidos / Perdidos / SLA crítico
2. **Esperado:** lista filtra corretamente

### Cenário 6.4 — Busca live
1. Digita "qa" no campo de busca
2. **Esperado:** depois de 200ms, lista mostra só leads cujo nome/contato/cidade/obs contenha "qa"

### Cenário 6.5 — Transição: novo → contatado
1. Pega um lead "novo"
2. Clica "📞 Marcar contatado"
3. Modal pede anotação opcional
4. Digita "Liguei, vai retornar amanhã" → OK
5. **Esperado:**
   - Lead some da filtragem "novos" e aparece em "contatados"
   - Anotação aparece na timeline do card
   - `contacted_at` agora preenchido (validar SQL)

### Cenário 6.6 — Transição: contatado → qualificado
1. Mesmo lead, agora em "contatados"
2. Clica "✓ Qualificar"
3. Anotação opcional
4. **Esperado:** move pra "qualificados", `qualified_at` preenchido

### Cenário 6.7 — Conversão exige booking_id
1. Lead "qualificado", clica "💰 Converter"
2. Modal pede UUID da booking
3. **Teste A:** digita uuid inválido (curto) → **Esperado:** modal de erro "ID da booking inválido"
4. **Teste B:** cria uma booking de verdade em "Reservas", copia UUID, cola no modal
5. **Esperado:**
   - Status muda pra "convertido"
   - Card mostra "→ Convertido em reserva XX-####"
   - `converted_at` e `converted_booking_id` preenchidos
   - Botões de ação somem (read-only)

### Cenário 6.8 — Perda exige motivo
1. Lead "novo", clica "✗ Perdido"
2. **Teste A:** motivo vazio ou <3 chars → **Esperado:** modal não fecha / não atualiza
3. **Teste B:** motivo "Cliente escolheu concorrente" → confirma
4. **Esperado:**
   - Status "perdido", aparece motivo
   - Botão "↩ Reabrir" aparece

### Cenário 6.9 — Reabrir lead perdido
1. Lead "perdido", clica "↩ Reabrir"
2. **Esperado:** volta pra "novo" (`lost_at`/`lost_reason` mantidos no histórico)

### Cenário 6.10 — Anotação avulsa
1. Qualquer lead, clica "📝 Anotar"
2. Digita anotação → confirma
3. **Esperado:** anotação aparece na timeline com timestamp DD/MM HH:MM
4. **Status NÃO muda**

### Cenário 6.11 — SLA crítico após 48h
1. SQL pra simular:
   ```sql
   update public.leads
   set created_at = now() - interval '50 hours'
   where id = '<uuid_de_lead_novo>';
   ```
2. F5 no painel
3. **Esperado:**
   - Card "Novos" mostra "1 crítico(s)" abaixo do número
   - Lead correspondente tem badge "🚨 SLA crítico (50h)"
   - Filtro "⏰ SLA crítico" mostra esse lead

### Cenário 6.12 — Audit log de transições
```sql
select admin_id, action, target_id, metadata_json, created_at
from public.admin_audit_logs
where action = 'lead_status_changed'
order by created_at desc limit 10;
```
**Esperado:** 1 linha por transição feita, `metadata_json` mostra `from`, `to`, `lost_reason`, `converted_booking_id`, `notes_added`

### Cenário 6.13 — RLS (só admin)
1. Loga como **Cliente A** (não-admin)
2. Tenta no console:
```js
await window.ndAuth.client().from('leads_enriched').select('*');
```
3. **Esperado:** retorna `data: []` (RLS bloqueia leitura) ou erro de permissão

---

## 🏆 BLOCO 7 — Fase 43: Nomade Gold (tiers de fidelidade)

### Cenário 7.1 — Cliente novo é Bronze
**Pré:** Cliente A logado, sem bookings encerradas ainda.
1. Acessa `dashboard-cliente.html`
2. **Esperado:** card no topo "🥉 Você é **Bronze** · 0 meses concluídos"
   - Background marrom/laranja
   - Benefício: "💸 5% off em renovações"
   - Progresso: "Falta 3 meses pra virar 🥈 Silver"
   - Barra de progresso em 0%

### Cenário 7.2 — Promover Cliente A pra Silver
1. Pega UUID do Cliente A:
   ```sql
   select id from public.profiles where main_role = 'client' limit 5;
   ```
2. Pega 1 booking dele e marca como encerrada com 3 meses (substitui os 2 UUIDs):
   ```sql
   -- Pega ID de uma booking ativa do Cliente A
   select id, status, start_date, end_date from public.bookings
   where client_id = '<COLE_UUID_CLIENTE_A_AQUI>';

   -- Marca como encerrada com duração de 3 meses
   update public.bookings
   set status = 'encerrada',
       start_date = current_date - interval '95 days',  -- ~3 meses
       end_date = current_date - interval '5 days'
   where id = '<COLE_UUID_BOOKING_AQUI>';
   ```
3. Confere via SQL:
   ```sql
   select tier, months_completed, renewal_discount_pct
   from public.client_loyalty
   where client_id = '<COLE_UUID_CLIENTE_A_AQUI>';
   ```
4. **Esperado:** `tier='silver'`, `renewal_discount_pct=7`

### Cenário 7.3 — Cliente Silver vê card atualizado
1. Loga novamente como Cliente A
2. Recarrega dashboard (Ctrl+Shift+R)
3. **Esperado:**
   - Card mudou pra "🥈 Você é **Silver**"
   - Background prata/cinza
   - "7% off em renovações"
   - "Falta 3 meses pra 🥇 Gold"
   - Progresso ~50%

### Cenário 7.4 — Promover pra Gold (6 meses)
1. Cria/atualiza outra booking com 3 meses adicionais:
   ```sql
   update public.bookings
   set status = 'encerrada',
       start_date = current_date - interval '200 days',
       end_date = current_date - interval '110 days'
   where id = '<COLE_UUID_OUTRA_BOOKING_AQUI>';
   ```
2. Confere:
   ```sql
   select tier, months_completed, renewal_discount_pct, deposit_reduction_pct
   from public.client_loyalty
   where client_id = '<COLE_UUID_CLIENTE_A_AQUI>';
   ```
3. **Esperado:** `tier='gold'`, `renewal_discount_pct=10`, `deposit_reduction_pct=20`

### Cenário 7.5 — Renovação com desconto tier-aware
**Pré:** Cliente A é Silver (7% off), tem booking ativa terminando em ≤7 dias.
1. Acessa dashboard
2. **Esperado:** card de renovação mostra "**7% OFF**" (não mais 5%) + badge "🥈 Silver"
3. Clica "Renovar 1 mês"
4. **Esperado:** modal "Renovar por 1 mês com **7%** off?"
5. Confirma
6. Validar:
   ```sql
   select monthly_price, deposit_amount from public.bookings
   where client_id = '<COLE_UUID_CLIENTE_A_AQUI>'
   order by created_at desc limit 1;
   ```
7. **Esperado:** `monthly_price` = valor original × 0.93 (7% off, não 5%)

### Cenário 7.6 — Cliente Gold tem caução reduzida na renovação
**Pré:** Cliente Gold com booking ativa.
1. Renova
2. **Esperado:**
   - Preço com 10% off
   - **Caução** = caução original × 0.80 (20% menos)
   - Linha extra no card: "🛡️ + caução reduzida em 20% (benefício gold)"

### Cenário 7.7 — Admin vê overview de loyalty
1. Loga como Admin → `admin.html` → 📈 Crescimento → role pra baixo
2. **Esperado:** seção "🥇 Clientes Nomade Gold"
   - 4 KPIs com contagem por tier
   - Tabela top 20 ordenada por tier + LTV
   - Cliente A promovido aparece com badge correto

### Cenário 7.8 — Bronze NÃO recebe benefício diferenciado
1. Cliente com 0 meses
2. **Esperado:** renewal_discount_pct=5, deposit_reduction_pct=0 (sem benefício extra)

---

## 📧 BLOCO 8 — Fase 43b: E-mail de promoção automático

### Cenário 8.1 — Edge Function deployada
1. Verifica:
   ```bash
   supabase functions list
   ```
2. **Esperado:** `send-tier-promotion` aparece na lista

### Cenário 8.2 — Promoção dispara e-mail automaticamente
**Pré:** Cliente A é Bronze, tem 1 booking ativa.
1. Marca booking como encerrada com duração ≥3 meses (vide Cenário 7.2)
2. Aguarda 5–10 segundos
3. Confere no caixa de e-mail do Cliente A
4. **Esperado:** e-mail com assunto "🥈 Parabéns! Você é Cliente Silver — Nomade Drive Brasil"
   - HTML rico com gradient prata
   - Lista de 3 benefícios Silver
   - CTA "Ver meus benefícios Silver" → leva pro dashboard

### Cenário 8.3 — E-mail Gold visual diferente
1. Promove cliente pra Gold (6+ meses)
2. **Esperado:** e-mail com gradient dourado + 4 benefícios Gold + CTA "Aproveitar benefícios Gold"

### Cenário 8.4 — E-mail Platinum (top)
1. Promove cliente pra Platinum (12+ meses)
2. **Esperado:** e-mail com gradient roxo/índigo + 5 benefícios Platinum + tom celebratório "Status máximo"

### Cenário 8.5 — Idempotência (não envia 2x pro mesmo evento)
1. Roda o `update bookings ...` que causou promoção (igual ao 8.2) — não muda nada efetivamente
2. **Esperado:** trigger NÃO insere novo loyalty_event (porque tier não mudou), e-mail NÃO dispara
3. Validar via SQL:
   ```sql
   select count(*) from public.admin_audit_logs
   where action = 'tier_promotion_email_sent'
     and metadata_json->>'client_id' = '<COLE_UUID_CLIENTE_A_AQUI>';
   ```
   Cada promoção real = 1 linha. Não deve ter duplicatas.

### Cenário 8.6 — Bronze NÃO recebe e-mail
1. Cliente sem bookings encerradas (fica Bronze)
2. **Esperado:** nenhum e-mail enviado (Edge Function retorna `skipped: true` se chamada)

### Cenário 8.7 — Re-disparo manual via RPC
**Pré:** existe um loyalty_event antigo cujo e-mail falhou (ou QA quer re-testar).
1. Pega event_id:
   ```sql
   select id, to_tier, client_id, created_at from public.loyalty_events
   where event = 'tier_promoted' order by created_at desc limit 5;
   ```
2. Como admin, chama RPC:
   ```sql
   select public.resend_tier_promotion_email('<COLE_EVENT_ID_AQUI>');
   ```
3. **Esperado:** retorna `{"ok": true, "request_id": N, "event_id": "..."}`
4. E-mail chega de novo na caixa do cliente

### Cenário 8.8 — RLS bloqueia não-admin de re-disparar
1. Logado como Cliente A
2. Tenta:
   ```sql
   select public.resend_tier_promotion_email('<algum_event_id>');
   ```
3. **Esperado:** erro "Apenas admin pode reenviar e-mail de promoção"

### Cenário 8.9 — Histórico de e-mails enviados
```sql
select metadata_json->>'client_email' as cliente,
       metadata_json->>'to_tier' as tier,
       metadata_json->>'email_sent' as enviado,
       created_at
from public.admin_audit_logs
where action = 'tier_promotion_email_sent'
order by created_at desc
limit 10;
```
**Esperado:** lista todos os e-mails de promoção disparados, com flag de sucesso.

---

## 🐛 Template de Bug Report

Pra cada bug encontrado, abre arquivo em `INBOX_COWORKER/BUG_<feature>_<descricao>.md`:

```markdown
# BUG: <título curto>

**Cenário:** Bloco X.Y
**Severidade:** 🔴 Crítica / 🟡 Média / 🟢 Baixa
**Repro:** sim / intermitente / 1x

## Passos
1. ...
2. ...

## Esperado
...

## Atual
...

## Logs / SQL
```
(query, console error, network response, etc.)
```

## Screenshot
(se aplicável)

## Suspeita
(opcional — hipótese de causa raiz)
```

---

## ✅ Checklist de Sign-off (pra Daniel)

Marca conforme valida:

### Renovação 1-clique
- [ ] 1.1 Card aparece no D-7
- [ ] 1.2 Renovação funciona com 5% off
- [ ] 1.3 Bloqueia duplicata
- [ ] 1.4 Bloqueia outro cliente

### E-mail D-7 automático
- [ ] 2.1 Trigger manual funciona
- [ ] 2.2 E-mail bonito chega
- [ ] 2.3 Anti-spam não duplica
- [ ] 2.4 Cron agendado e ativo

### Banner clicável
- [ ] 3.1 Desktop hover + click OK
- [ ] 3.2 Mobile tap OK
- [ ] 3.3 Setas/dots não navegam acidentalmente

### Form orçamento
- [ ] 4.1 WhatsApp + lead capturado
- [ ] 4.2 E-mail chega no staff
- [ ] 4.3 Lead aparece no admin
- [ ] 4.4 Honeypot bloqueia bot
- [ ] 4.5 Anti-duplicata sinaliza
- [ ] 4.6 Validação de campos OK

### Fluxo alugar
- [ ] 5.1 Não logado redireciona cadastro
- [ ] 5.2 Rascunho redireciona onboarding
- [ ] 5.3 Em análise mostra status
- [ ] 5.4 Aprovado cria solicitação
- [ ] 5.5 E-mails chegam (cliente + staff)
- [ ] 5.6 Aparece no admin
- [ ] 5.7 Banco salvou correto

### Painel Leads
- [ ] 6.1 KPIs corretos
- [ ] 6.2 KPI clicável filtra
- [ ] 6.3 Filtros funcionam
- [ ] 6.4 Busca live OK
- [ ] 6.5 Novo → Contatado
- [ ] 6.6 Contatado → Qualificado
- [ ] 6.7 Conversão exige booking_id
- [ ] 6.8 Perda exige motivo
- [ ] 6.9 Reabrir funciona
- [ ] 6.10 Anotação avulsa OK
- [ ] 6.11 SLA crítico após 48h
- [ ] 6.12 Audit log gravado
- [ ] 6.13 RLS bloqueia não-admin

### Nomade Gold (tiers)
- [ ] 7.1 Cliente novo é Bronze
- [ ] 7.2 Promover pra Silver via SQL
- [ ] 7.3 Card visual atualiza pra Silver
- [ ] 7.4 Promover pra Gold
- [ ] 7.5 Renovação Silver = 7% off
- [ ] 7.6 Renovação Gold = caução reduzida
- [ ] 7.7 Admin vê overview de loyalty
- [ ] 7.8 Bronze NÃO tem benefício extra

### E-mail promoção tier
- [ ] 8.1 Edge Function deployada
- [ ] 8.2 Promoção dispara e-mail Silver
- [ ] 8.3 E-mail Gold visual correto
- [ ] 8.4 E-mail Platinum (top)
- [ ] 8.5 Idempotência (sem duplicatas)
- [ ] 8.6 Bronze NÃO recebe e-mail
- [ ] 8.7 Re-disparo manual via RPC funciona
- [ ] 8.8 RLS bloqueia não-admin
- [ ] 8.9 Histórico de e-mails populado

---

## 🚀 Quando tudo passar

Manda mensagem pro coordenador (Claude principal) com:

```
QA fechado: Fase 41/41b/42 + Backlog mobile.
Bloco 1: ✅ N/N
Bloco 2: ✅ N/N
...
Bugs abertos: <lista de IDs ou "nenhum">
Pronto pra promover.
```

Se bug 🔴 crítico → notificar imediatamente, não esperar fim do roteiro.

---

## 📌 Notas de QA

- **Tempos de espera:** alguns e-mails podem demorar 30s–2min pelo Resend.
- **Cache do navegador:** se UI parecer antiga, hard-refresh (Ctrl+Shift+R) — cache-bust `?v=20260524-*` está aplicado.
- **Mobile real:** preferir device real ao DevTools mobile sim — tap behavior difere.
- **Cron real:** o cron 09:00 UTC vai disparar amanhã de manhã automaticamente — observar inbox.
- **Duplicatas em testes:** após terminar, considerar limpar leads de QA:
  ```sql
  delete from public.leads where name ilike 'qa%' or contact ilike '%qa%';
  ```
