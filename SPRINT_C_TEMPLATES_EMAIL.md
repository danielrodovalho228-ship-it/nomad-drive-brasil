# ✉ Sprint C — 24 Templates de E-mail v3

> Aplicado: 04/06/2026
> Edge Function: `send-template v1`
> Catálogo JS (preview): `emails/email-templates.js` (24 novos + 54 legados)
> Catálogo Deno (runtime): `supabase/functions/_shared/template-catalog.ts`

## 🎯 O que é

24 e-mails transacionais novos do modelo **mensal frota própria** (v3), separados em:
- **11 cliente** (prefixo `mensal_*`) — funil Lead → KYC → Contrato → Pagamento → Entrega → Uso → Devolução
- **13 equipe** (prefixo `team_*`) — alertas internos pro Danilo + sócios

Os 54 templates legados (modelo P2P: owner/partner/workshop/protection) ficam no catálogo do JS pra preview, mas NÃO são despachados por esta Edge Function — eles continuam saindo pelas Edge Functions específicas que já existiam (`stripe-webhook`, `send-rating-request`, `approve-rental-request`, etc.).

## 📋 Os 24 templates

### Cliente (11) — `mensal_*`

| Key | Quando dispara | Prioridade |
|---|---|---|
| `mensal_lead_recebido` | Form `reservar.html` submit | Alta |
| `mensal_orcamento_enviado` | Danilo responde com proposta | Alta |
| `mensal_documentos_solicitados` | Cliente aceitou proposta | Alta |
| `mensal_documentos_aprovados` | KYC aprovado (manual ou Caf) | Alta |
| `mensal_documentos_reprovados` | KYC reprovado | Alta |
| `mensal_contrato_pronto` | Contrato gerado no Autentique | Crítica |
| `mensal_pagamento_aguardando` | Contrato assinado, falta pagamento | Crítica |
| `mensal_pagamento_confirmado` | Stripe webhook payment_intent.succeeded | Crítica |
| `mensal_entrega_agendada` | Entrega marcada por Danilo | Alta |
| `mensal_lembrete_devolucao` | Cron D-3 antes do fim do plano | Média |
| `mensal_devolucao_confirmada` | Check-out fotos OK | Alta |

### Equipe (13) — `team_*` (interno: Danilo + sócios)

| Key | Quando dispara | Prioridade |
|---|---|---|
| `team_novo_lead` | Form reservar.html submit (SLA 2h) | Alta |
| `team_documentos_para_revisar` | Cliente enviou KYC | Alta |
| `team_contrato_assinado` | Autentique webhook (assinatura completa) | Alta |
| `team_pagamento_recebido` | Stripe webhook (succeeded) | Alta |
| `team_pagamento_falhou` | Stripe webhook (failed) | Crítica |
| `team_devolucao_atrasada` | Data devolução + carro não voltou | Crítica |
| `team_uso_suspeito_app` | Telemetria detectou padrão Uber/iFood (Cláusula 7h) | Crítica |
| `team_manutencao_proxima` | Edge Function `maintenance-trigger` (km próx limite) | Alta |
| `team_documento_veiculo_vencendo` | Cron diário D-30 IPVA/licenciamento | Alta |
| `team_nps_baixo` | Cliente respondeu NPS ≤ 6 | Alta |
| `team_parceiro_indicou` | Lead com `referral_partner_id` preenchido | Média |
| `team_recorrencia_nao_renovou` | D+3 após devolução sem nova reserva | Média |
| `team_capacidade_ocupacao` | Cron diário se ocupação ≥ 85% | Média |

## ⚙ Edge Function `send-template`

**Endpoint**: `https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-template`
**Auth**: `verify_jwt: true`

### Entrada

```json
{
  "template_key": "mensal_pagamento_confirmado",
  "vars": {
    "first_name": "João",
    "price_total_brl": "R$ 3.999,00",
    "payment_method": "Cartão de crédito",
    "receipt_url": "https://stripe.com/receipts/..."
  },
  "to": "joao@email.com"
}
```

### Resolução do destinatário

A função aceita 3 formas (em ordem de prioridade):

1. **`to: "email@..."`** — destinatário direto
2. **`to_user_id: "uuid"`** — resolve via `auth.admin.getUserById` (precisa de `SUPABASE_SERVICE_ROLE_KEY`); auto-popula `first_name` se ausente
3. **`team_recipients: ["..."]`** — só pra templates `team_*` (sobrescreve `TEAM_EMAIL_RECIPIENTS` env)

Pra templates `team_*` sem `to`/`team_recipients` no body, usa o env `TEAM_EMAIL_RECIPIENTS` (CSV de e-mails da equipe).

### Resposta

```json
{
  "ok": true,
  "template_key": "mensal_pagamento_confirmado",
  "resend_id": "re_abc123...",
  "resolved_to": "joao@email.com",
  "profile": "cliente",
  "priority": "critica"
}
```

### Secrets necessários

| Secret | Já configurado? | Propósito |
|---|---|---|
| `RESEND_API_KEY` | ✅ (Sprint anteriores) | API key do Resend |
| `SUPABASE_URL` | ✅ (auto) | URL do projeto |
| `SUPABASE_ANON_KEY` | ✅ (auto) | Auth do caller |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (auto) | Resolver `to_user_id` sem RLS |
| `EMAIL_FROM` | ⚠ opcional | Remetente padrão. Default = `onboarding@resend.dev` (só envia pra conta Resend) — verificar domínio em resend.com pra ativar `noreply@nomadedrive.com.br` |
| `EMAIL_REPLY_TO` | ⚠ opcional | Reply-to default. Sobreposto por `getReplyTo(key)` que escolhe `pagamentos@`, `contato@` ou `operacional@` conforme key |
| `TEAM_EMAIL_RECIPIENTS` | ❌ **FALTA configurar** | CSV de e-mails da equipe pra destinatário default dos templates `team_*` (ex: `danilo@nomadedrive.com.br,daniel@nomadedrive.com.br`) |

### Setup pendente do Daniel

1. Acessa Supabase → Project Settings → Edge Functions → Secrets
2. Cria/atualiza:
   ```
   TEAM_EMAIL_RECIPIENTS=danilo@nomadedrive.com.br,daniel@nomadedrive.com.br
   ```
3. (Se domínio Resend já verificado) atualiza `EMAIL_FROM`:
   ```
   EMAIL_FROM=Nomade Drive Brasil <noreply@nomadedrive.com.br>
   ```

## 🔧 Exemplo de uso (TypeScript)

```ts
// Dentro de outra Edge Function ou backend
const resp = await fetch(
  "https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-template",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      template_key: "team_novo_lead",
      vars: {
        first_name: "Maria",
        last_name: "Silva",
        user_email: "maria@gmail.com",
        phone: "(34) 99999-0000",
        phone_e164: "5534999990000",
        car_name: "HB20 Hatch",
        plan_name: "Estendido",
        period_days: 60,
        start_date: "15/06/2026",
        source: "site direto"
      }
    })
  }
);
```

## 🪝 Onde plugar cada template

Quando integrar com os webhooks/cron, basta chamar `send-template` no momento certo:

| Trigger | Edge Function que chama send-template | Template a disparar |
|---|---|---|
| Form `reservar.html` submit | `nova-lead` (já existe) | `mensal_lead_recebido` (cliente) + `team_novo_lead` (equipe) |
| Admin aprova KYC | `approve-kyc` (a criar — Sprint D) | `mensal_documentos_aprovados` |
| Admin reprova KYC | `reject-kyc` (a criar) | `mensal_documentos_reprovados` |
| Autentique webhook signed | `autentique-webhook` (a criar — Fase 98) | `mensal_pagamento_aguardando` + `team_contrato_assinado` |
| Stripe payment_intent.succeeded | `stripe-webhook` (já existe — adicionar handler) | `mensal_pagamento_confirmado` + `team_pagamento_recebido` |
| Stripe payment_intent.payment_failed | `stripe-webhook` | `team_pagamento_falhou` |
| Cron D-3 antes da devolução | `pg_cron` job | `mensal_lembrete_devolucao` |
| Check-out admin marca devolvido | `close-rental` | `mensal_devolucao_confirmada` |
| Telemetria Cobli — alerta gerado | `maintenance-trigger` (já existe) | `team_manutencao_proxima` OU `team_uso_suspeito_app` |
| Cron diário ocupação ≥ 85% | `pg_cron` job (a criar) | `team_capacidade_ocupacao` |

## 🧪 Testar localmente (preview)

O catálogo JS continua sendo a fonte de preview pra Daniel ver os e-mails sem disparar nada real:

1. Abre `emails/preview.html` no navegador (já existe)
2. Lista todos 78 templates (54 legados + 24 v3)
3. Clica em qualquer um pra ver o HTML renderizado com vars de exemplo

## ⚠ Decisões e gaps conhecidos

- **WhatsApp não está acoplado**: muitos templates falam "vamos contatar pelo WhatsApp", mas isso ainda é manual. Fase 82-6 (Z-API) ativa esse loop automaticamente.
- **`mensal_pagamento_confirmado` ainda não tem Stripe LIVE conectado**: Fase 81-2 pendente. Em test mode, os webhook handlers vão chamar `send-template` corretamente.
- **CNPJ ausente**: Resend funciona normalmente, mas pra emitir NF (`receipt_url` real), Daniel precisa abrir ME.
- **`getReplyTo()` aponta pra endereços que ainda não foram criados**: `pagamentos@`, `contato@`, `operacional@`. Quando o domínio for verificado no Resend e os aliases criados no provedor de e-mail, replies caem certinho.

## 📋 Tasks relacionadas

- ✅ Sprint C (esta) — 24 templates + Edge Function send-template
- ⏸ Sprint D — Dashboard admin (precisa renderizar logs de envio + reenvio manual)
- ⏸ Fase 82-6 — WhatsApp Z-API (acopla templates ao WhatsApp também)
- ⏸ Fase 99 — Resend v8 (limpar links arquivados; ainda há referências P2P legadas)
- ⏸ Fase 100 — Fluxo 100% automático (Caf + Autentique + Stripe + send-template encadeados)
