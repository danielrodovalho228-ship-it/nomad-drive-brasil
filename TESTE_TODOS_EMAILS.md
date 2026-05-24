# 📧 Teste de TODOS os E-mails Cadastrados

> **Data:** 2026-05-24
> **Total de templates:** 54 transacionais + 6 disparadores automáticos
> **Como funciona:** dispara cada um manualmente via SQL/HTTP e confere recebimento

---

## ⚙️ Setup

### E-mail de destino dos testes
Substitua nos comandos abaixo:
- `<SEU_EMAIL_DE_TESTE>` → tipo `daniel+teste@gmail.com` (use o `+teste` pra filtrar)

### UUIDs que você vai precisar
```sql
-- Pega 1 cliente, 1 owner, 1 booking pra testar
select 'CLIENTE' as tipo, id, full_name from public.profiles where main_role = 'client' limit 3;
select 'OWNER'   as tipo, id, full_name from public.profiles where main_role = 'owner' limit 3;
select 'BOOKING' as tipo, id, status, monthly_price from public.bookings order by created_at desc limit 3;
select 'VEHICLE' as tipo, id, make, model from public.vehicles where status='aprovado' limit 3;
```

---

## 🚀 GRUPO 1 — Disparadores AUTOMÁTICOS (cron + triggers)

Esses já estão rodando. Pra forçar disparo:

### 1.1 — `send-renewal-reminders` (cron diário 9h UTC)
**Dispara manualmente:**
```sql
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-renewal-reminders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object('source', 'teste_manual')
);
```
**Pré:** precisa ter booking com `end_date` entre hoje e hoje+7d
**Esperado:** e-mail "🔄 Renove sua locação com X% off" (X = tier do cliente)

### 1.2 — `send-tier-promotion` (trigger ao encerrar booking)
**Dispara via trigger:** marcar booking como `encerrada` (vide SIMULACAO_RESERVAS_E2E.sql)
**Esperado:** se tier subiu, chega e-mail "🥈/🥇/💎 Parabéns! Você é Cliente <tier>"

### 1.3 — `close-rental` (chamada quando proprietário aprova check-out)
**Dispara manualmente:** flow real pelo dashboard-proprietario
**E-mails enviados:**
- Cliente: "Locação encerrada — caução liberada" OU "Devolução recebida — avaria em análise"
- Owner: "Locação encerrada · valor pendente liberação"

### 1.4 — `create-rental-request` (cliente clica "Quero alugar este carro")
**Dispara:** car.html → botão verde (com cliente aprovado)
**E-mails:**
- Cliente: "Solicitação recebida — Hyundai HB20"
- Staff/Owner: "Novo interesse no seu Hyundai HB20"

### 1.5 — `submit-lead-quote` (form orçamento da landing)
**Dispara:** index.html#orcamento → preenche form
**E-mail:** Staff (contato@nomadedrive.com.br): "Lead landing — <nome>"

### 1.6 — `stripe-webhook` (eventos Stripe)
**Dispara:** evento real de pagamento (faça uma cobrança de teste)
**E-mails:**
- payment_intent.succeeded → "Pagamento confirmado"
- payment_intent.payment_failed → "Não foi possível concluir seu pagamento"
- charge.dispute.created → "[Admin] Disputa aberta no Stripe"

---

## 📨 GRUPO 2 — Templates avulsos via `send-email`

Pra disparar QUALQUER template do catálogo manualmente, use a Edge Function `send-email`.

### Comando genérico (pelo SQL Editor)

```sql
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImP4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object(
    'to', '<SEU_EMAIL_DE_TESTE>',
    'subject', '🧪 TESTE — <nome_do_template>',
    'html', '<h1>Teste do template <strong>X</strong></h1><p>Este é um teste manual disparado em ' || now() || '</p>',
    'text', 'Teste do template X — disparado em ' || now()
  )
);
```

> ⚠️ A função `send-email` é **genérica** — você passa HTML + subject. Ela NÃO usa o catálogo `email-templates.js` automaticamente (esse é renderizado client-side pelo `render.js`). Pra testar UM template específico do catálogo, use o preview UI (próxima seção).

### Validar envio
```sql
-- Logs Resend (status, ID do envio)
select id, status_code, content::text
from net._http_response
where created >= now() - interval '5 minutes'
  and url like '%send-email%'
order by created desc limit 5;
```

---

## 🎨 GRUPO 3 — Visualizar templates pelo Preview UI

O sistema tem uma UI de preview embutida:

### Como usar
1. Abre no navegador: **`https://nomadedrive.com.br/emails/preview.html`** (ou local)
2. **Dropdown lista todos os 54 templates** (cliente/owner/parceiro/oficina/proteção/admin)
3. Seleciona um → mostra preview HTML renderizado
4. Botão "Enviar pra mim" → dispara real pra seu e-mail

### Templates no catálogo (por grupo)

#### 👤 Cliente (14)
| # | Template Key | Subject | Quando dispara |
|---|---|---|---|
| 1 | `client_welcome_verify_email` | Confirme seu e-mail | Cadastro inicial |
| 2 | `client_profile_under_review` | Seu cadastro está em análise | Perfil completo |
| 3 | `client_documents_pending` | Há documentos pendentes | Pendência |
| 4 | `client_reservation_requested` | Recebemos sua solicitação | Reserva criada |
| 5 | `client_reservation_approved` | Sua reserva foi aprovada | Aprovação |
| 6 | `client_payment_required` | Falta concluir o pagamento | Pagamento pendente |
| 7 | `client_payment_succeeded` | Pagamento confirmado | Stripe sucesso |
| 8 | `client_payment_failed` | Não foi possível concluir pagamento | Stripe falhou |
| 9 | `client_card_action_required` | Confirme seu cartão | 3DS Secure |
| 10 | `client_deposit_authorized` | Caução autorizada | Caução pré-auth |
| 11 | `client_checkin_required` | Hora do check-in | Início reserva |
| 12 | `client_checkout_required` | Hora do check-out | Fim reserva |
| 13 | `client_damage_reported` | Registramos ocorrência | Dano reportado |
| 14 | `client_refund_or_deposit_release` | Atualização sobre liberação | Caução liberada |

#### 🚗 Proprietário (11)
| # | Template Key | Subject |
|---|---|---|
| 15 | `owner_welcome` | Bem-vindo à área do proprietário |
| 16 | `owner_vehicle_submitted` | Recebemos cadastro do veículo |
| 17 | `owner_vehicle_approved` | Seu veículo foi aprovado |
| 18 | `owner_vehicle_rejected` | Veículo precisa de ajustes |
| 19 | `owner_reservation_received` | Seu veículo recebeu solicitação |
| 20 | `owner_reservation_confirmed` | Reserva confirmada |
| 21 | `owner_financial_statement_ready` | Demonstrativo financeiro atualizado |
| 22 | `owner_payout_scheduled` | Repasse programado |
| 23 | `owner_payout_blocked` | Repasse bloqueado |
| 24 | `owner_maintenance_due` | Manutenção próxima do vencimento |
| 25 | `owner_km_discrepancy_alert` | Divergência de quilometragem |

#### 🤝 Parceiro de indicação (7)
| # | Template Key | Subject |
|---|---|---|
| 26 | `partner_welcome` | Sua área de parceiro está pronta |
| 27 | `partner_referral_received` | Indicação recebida |
| 28 | `partner_referral_converted` | Sua indicação virou oportunidade |
| 29 | `partner_commission_pending` | Comissão em validação |
| 30 | `partner_commission_approved` | Comissão aprovada |
| 31 | `partner_commission_paid` | Comissão paga |
| 32 | `partner_fraud_review` | Indicação em revisão |

#### 🔧 Oficina (7)
| # | Template Key | Subject |
|---|---|---|
| 33 | `workshop_welcome` | Oficina cadastrada |
| 34 | `workshop_service_order_created` | Nova OS disponível |
| 35 | `workshop_quote_requested` | Envie orçamento |
| 36 | `workshop_quote_approved` | Orçamento aprovado |
| 37 | `workshop_checklist_required` | Checklist pendente |
| 38 | `workshop_report_submitted` | Laudo recebido |
| 39 | `workshop_quality_alert` | Pendência qualidade |

#### 🛡️ Proteção (5)
| # | Template Key | Subject |
|---|---|---|
| 40 | `protection_case_opened` | Novo caso aberto |
| 41 | `protection_documents_required` | Documentos necessários |
| 42 | `protection_evidence_received` | Evidência recebida |
| 43 | `protection_case_decision` | Decisão emitida |
| 44 | `protection_case_closed` | Caso encerrado |

#### 🔐 Admin (10)
| # | Template Key | Subject |
|---|---|---|
| 45 | `admin_new_user_registered` | [Admin] Novo usuário |
| 46 | `admin_document_review_required` | [Admin] Documento aguardando análise |
| 47 | `admin_payment_failed_alert` | [Admin] Falha pagamento |
| 48 | `admin_dispute_created` | [Admin] Disputa/chargeback |
| 49 | `admin_webhook_failed` | [Admin] Webhook falhou |
| 50 | `admin_bank_data_changed` | [Admin] Dados bancários alterados |
| 51 | `admin_permission_changed` | [Admin] Permissão alterada |
| 52 | `admin_restricted_access_denied` | [Admin] Acesso negado |
| 53 | `admin_global_setting_changed` | [Admin] Regra global alterada |
| 54 | `admin_km_fraud_alert` | [Admin] Manipulação quilometragem |

---

## 🧪 GRUPO 4 — Teste de SUCESSO/FALHA por canal

### 4.1 — Test rate limit Resend
```sql
-- Dispara 5 e-mails seguidos pra mesma caixa — deve passar (limite Resend é alto)
do $$
declare i int;
begin
  for i in 1..5 loop
    perform net.http_post(
      url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <ANON_KEY_AQUI>'
      ),
      body := jsonb_build_object(
        'to', '<SEU_EMAIL_DE_TESTE>',
        'subject', '🧪 Test rate limit #' || i,
        'html', '<p>Disparo ' || i || ' de 5</p>'
      )
    );
  end loop;
end $$;
```

### 4.2 — Test e-mail inválido
```sql
-- Resend deve rejeitar com status 422
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object(
    'to', 'invalido-sem-arroba',
    'subject', 'teste',
    'html', '<p>teste</p>'
  )
);

-- Confere resposta
select status_code, content::text from net._http_response
where created >= now() - interval '1 minute'
order by created desc limit 1;
-- Esperado: status 4xx + erro de email inválido
```

### 4.3 — Test EMAIL_FROM configurado
```sql
-- Se EMAIL_FROM não tiver, manda do default onboarding@resend.dev
-- (que só envia pra você mesmo). Esse teste só funciona se EMAIL_FROM
-- estiver com domínio verificado tipo noreply@nomadedrive.com.br
select net.http_post(
  url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
  ),
  body := jsonb_build_object(
    'to', '<ENDERECO_EXTERNO@gmail.com>',  -- não sua conta Resend
    'subject', 'Teste EMAIL_FROM',
    'html', '<p>Esse só chega se EMAIL_FROM tem domínio verificado</p>'
  )
);
```

---

## 📊 GRUPO 5 — Dashboard de auditoria

Pra ver TODOS os e-mails enviados nas últimas 24h:

```sql
select
  action,
  count(*) as total,
  count(*) filter (where (metadata_json->>'email_sent')::boolean) as sucesso,
  count(*) filter (where not (metadata_json->>'email_sent')::boolean) as falha
from public.admin_audit_logs
where created_at >= now() - interval '24 hours'
  and action like '%email%' or action like '%notification%'
group by action
order by total desc;
```

E pra ver detalhe dos últimos 20 envios:
```sql
select
  created_at,
  action,
  metadata_json->>'client_email' as destino,
  metadata_json->>'email_sent' as enviado,
  metadata_json->>'email_error' as erro_se_houver
from public.admin_audit_logs
where action in (
  'tier_promotion_email_sent',
  'renewal_reminder_sent',
  'rental_request_created',
  'lead_quote_submitted'
)
order by created_at desc
limit 20;
```

---

## ✅ Checklist final

Pra dar sign-off no sistema de e-mails:

- [ ] **Grupo 1.1** (renewal cron): roda manual → e-mail chega
- [ ] **Grupo 1.2** (tier promotion): promove tier → e-mail chega
- [ ] **Grupo 1.4** (rental request): cliente clica botão → 2 e-mails (cliente + staff)
- [ ] **Grupo 1.5** (lead landing): preenche form → e-mail staff + WhatsApp abre
- [ ] **Grupo 3** (preview UI): cada um dos 54 templates abre sem erro no preview.html
- [ ] **Grupo 4.1** (rate limit): 5 e-mails passam
- [ ] **Grupo 4.2** (email inválido): retorna erro 4xx
- [ ] **Grupo 4.3** (EMAIL_FROM): chega no Gmail externo (não só na conta Resend)
- [ ] **Grupo 5** (auditoria): logs aparecem em `admin_audit_logs`

---

## 🔧 Troubleshooting

### "RESEND_API_KEY não configurado"
→ Supabase Dashboard → Project Settings → Edge Functions → Secrets → adiciona `RESEND_API_KEY`

### "Email só chega pra mim mesmo"
→ EMAIL_FROM ainda no default `onboarding@resend.dev` (modo sandbox).
→ Verifique seu domínio em https://resend.com/domains
→ Configure `EMAIL_FROM=Nomade Drive Brasil <noreply@nomadedrive.com.br>` nos secrets

### "Function not found"
→ Faça deploy: `supabase functions deploy <nome>`

### "Auth bypass send-tier-promotion"
→ Agora exige `event_id` real (Fase 43 fix #2). Veja seção B do TESTE_SEGURANCA_FASE43.sql
