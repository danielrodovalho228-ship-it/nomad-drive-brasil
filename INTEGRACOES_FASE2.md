# Roadmap de integrações — FASE 2

Estrutura pronta no schema e nos endpoints. Quando contratar/ativar
cada provedor, basta configurar secrets e mudar o `provider`.

---

## 1. Cofre de chave inteligente (P3 — FASE 2)

**Status atual:** `cofre_provider = 'manual'`. Operador gera senha de 6 dígitos
manualmente pelo admin via Edge Function `cofre-senha`.

**Quando ativar API:**
1. Contratar fechadura inteligente (ex: Igloohome, NUKI, Yale Linus L2)
2. Setar `cofre_provider = 'api_lockbox'` na booking
3. Adicionar secret `COFRE_API_KEY` no Supabase
4. Implementar branch da Edge Function (linha ~110 do `cofre-senha/index.ts`)
   - POST pro provedor pra gerar senha
   - Salvar `cofre_senha`, `cofre_senha_expires_at`
   - Provedor expira automaticamente quando booking termina

**Campos schema (bookings):**
- `cofre_senha` — TEXT
- `cofre_senha_generated_at` — TIMESTAMPTZ
- `cofre_senha_revealed_at` — TIMESTAMPTZ
- `cofre_senha_expires_at` — TIMESTAMPTZ
- `cofre_provider` — TEXT (manual | api_lockbox)
- `cofre_location_label` — TEXT
- `cofre_location_lat`, `cofre_location_lng` — NUMERIC

---

## 2. CAF — verificação de identidade (P5 — FASE 2)

**Status atual:** `caf_provider = 'manual'`. Admin marca status manualmente
(`nao_iniciado | em_analise | aprovado | recusado | dispensado`).

**Quando ativar:**
1. Contratar CAF (https://www.caf.io). Custo ~R$ 5-15 por verificação.
2. Setar `CAF_API_KEY` + `CAF_WEBHOOK_SECRET` em secrets
3. Configurar webhook URL no painel CAF:
   `https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/caf-callback`
4. No cadastro: site dispara verificação, recebe `verification_id`, salva em
   `profiles.caf_verification_id`
5. CAF processa (offline). Quando termina, bate no webhook
6. `caf-callback/index.ts` atualiza `profiles.caf_status` automaticamente
7. Recusado/aprovado dispara e-mail (kyc_rejected/kyc_approved)

**Campos schema (profiles):**
- `caf_status` — TEXT
- `caf_verification_id` — TEXT
- `caf_started_at`, `caf_completed_at` — TIMESTAMPTZ
- `caf_provider` — TEXT (manual | caf_api)
- `caf_result_payload` — JSONB (resposta completa pra auditoria)

---

## 3. Rastreamento veicular (P6 — FASE 2)

**Status atual:** **NÃO ATIVO**. Tabela `tracker_events` existe vazia.
Empresa contratada de rastreamento (positron/suntech/sascar/etc) cuida
do hardware. Site só vai receber eventos quando integrar.

**Quando ativar:**
1. Contratar empresa de rastreamento + hardware embarcado por veículo
2. Pedir pro provedor configurar webhook URL:
   `https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/tracker-webhook`
3. Definir `TRACKER_WEBHOOK_SECRET` (HMAC pra validar)
4. Provedor manda POST por evento: `{ event_type, vehicle_plate, payload }`
5. `tracker-webhook/index.ts` insere em `tracker_events`, resolve `vehicle_id`
   e tenta achar booking ativo
6. **FASE 2.1 (pós-MVP):** notificar operador via push/WhatsApp em eventos
   críticos (`tampered`, `low_battery`, `geofence_exit`)

**Tabela schema (`tracker_events`):**
- `id`, `vehicle_id`, `booking_id`, `event_type`, `event_payload` (JSONB)
- `provider`, `received_at`, `notified_operator_at`, `notes`
- Index GIN no payload + por vehicle + por timestamp

**Eventos esperados:**
- `ignition_on` / `ignition_off`
- `movement_start` / `movement_stop`
- `geofence_enter` / `geofence_exit`
- `low_battery`
- `tampered`

**Observação importante (briefing):**
> "Localização exata em tempo real NÃO exibida ao proprietário por padrão"
> (vide `politica-privacidade.html`). Só em emergência ou inadimplência.

---

## 4. Galeria comparativa de vistoria (P4 — FASE 2)

**Status atual:** apenas e-mail gentil X horas depois pedindo registro
opcional. Cliente manda foto/vídeo pelo WhatsApp ou responde e-mail.

**FASE 2:**
- UI no dashboard cliente pra upload direto (multi-arquivo, drag-drop)
- Storage: `bucket: client-inspections/{booking_id}/pickup` e `/return`
- Admin: galeria comparativa lado a lado (entrega vs devolução)
- Detecção visual automática (Hugging Face / OpenAI Vision) pra pré-flag
  de diferenças

**Campos schema (bookings):**
- `client_pickup_inspection_at`, `client_return_inspection_at` — TIMESTAMPTZ
- `client_pickup_reminder_sent_at`, `client_return_reminder_sent_at` — TIMESTAMPTZ
- `client_inspection_media_url` — TEXT[] (array de URLs)

---

## Variáveis de ambiente necessárias quando ativar

```bash
# P3 — Cofre
COFRE_API_KEY=                # provedor da fechadura inteligente
COFRE_API_URL=                # endpoint base do provedor

# P5 — CAF
CAF_API_KEY=                  # chave API CAF
CAF_WEBHOOK_SECRET=           # secret pra HMAC do webhook

# P6 — Rastreamento
TRACKER_WEBHOOK_SECRET=       # secret pra HMAC
TRACKER_OPERATOR_PHONE=       # WhatsApp pra notificações urgentes
```

---

## Como testar os placeholders agora

```bash
# Cofre — gerar senha manual
curl -X POST "https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/cofre-senha" \
  -H "Authorization: Bearer <SERVICE_ROLE>" \
  -H "Content-Type: application/json" \
  -d '{"action":"generate","booking_id":"<UUID>"}'

# Vistoria — disparar cron manualmente
curl -X GET "https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/cron-vistoria-reminder" \
  -H "Authorization: Bearer <SERVICE_ROLE>"

# Rastreamento — simular evento
curl -X POST "https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/tracker-webhook" \
  -H "Content-Type: application/json" \
  -H "X-Tracker-Provider: test" \
  -d '{"event_type":"ignition_on","vehicle_plate":"ABC1234"}'
```
