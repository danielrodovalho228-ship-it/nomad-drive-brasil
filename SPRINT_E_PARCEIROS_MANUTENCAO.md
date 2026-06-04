# 🔧 Sprint E — Schema Parceiros + Workflow Manutenção

> Aplicado em: 04/06/2026
> Migration: `v3_partners_and_maintenance`
> Edge Function: `maintenance-trigger v1`

## 📊 4 tabelas criadas

### 1. `partners` — cadastro unificado de parceiros operacionais
Substitui o `workshops` antigo (que era P2P) por algo mais amplo. Aceita 6 tipos:

| `partner_type` | Exemplo | Campos específicos no `details` JSONB |
|---|---|---|
| `workshop` | Oficina mecânica parceira | `{ specialties: ['mecânica geral','elétrica'], capacity: '5 carros/dia' }` |
| `insurer` | Seguradora (MAPFRE/Porto/Bradesco) | `{ policy_number, deductible, premium_per_vehicle, claim_phone_24h, broker_name }` |
| `hospital` | HC-UFU, Santa Marta, Madrecor (parceria) | `{ dept: 'RH', target_clients: 'médicos visitantes', dept_phone }` |
| `tech` | Caf, Autentique, Cobli, Stripe | `{ plan: 'Pro', monthly_cost: 150, renewal_date, api_key_env_var: 'CAF_API_KEY' }` |
| `corporate` | Cargill, Algar, Embraer (empresas que indicam) | `{ rh_contact, num_indications, fee_structure }` |
| `other` | Outros | `{}` |

**Status workflow**: `prospect` → `negotiating` → `active` → (`paused`|`churned`)

**Comercial**:
- `commission_pct`: % sobre primeira locação (pra hospital/corporate)
- `discount_pct`: % de desconto pro cliente indicado
- `contract_start/end/url`: vínculo com Autentique
- `rating` (0.0-5.0) + `rating_count`: avaliação interna

### 2. `partner_services` — catálogo de serviços por oficina
Pra cada oficina parceira, lista de serviços com **preço combinado**:

| `service_code` | `service_name` | `price_brl` | `duration_minutes` |
|---|---|---|---|
| `oil_change_popular` | Troca de óleo + filtro (HB20) | 180.00 | 60 |
| `oil_change_sedan` | Troca de óleo + filtro (Cronos) | 220.00 | 60 |
| `tire_replacement` | Troca de 4 pneus | 1600.00 | 120 |
| `brake_pads_front` | Pastilhas dianteiras | 320.00 | 90 |
| `ac_recharge` | Recarga ar-condicionado | 280.00 | 45 |
| `air_filter` | Filtro de ar | 90.00 | 30 |

(Daniel popula esses cadastros quando assinar contrato com cada oficina parceira)

### 3. `vehicle_maintenance` — histórico completo por veículo
Cada manutenção feita fica registrada com:
- Tipo (12 opções: `oil_change`, `tire_replacement`, `brake_pads`, etc.)
- Status (`scheduled` → `in_progress` → `completed`)
- Km no momento do serviço
- Oficina (FK pra `partners`)
- Custo: peças + mão-de-obra → total auto-calculado
- NF, link do invoice
- **Próxima manutenção prevista** (auto)

### 4. `maintenance_alerts` — workflow de alertas
Sistema de alertas com 7 status: `new` → `notified_owner` → `notified_client` → `client_responded` → `scheduled` → `resolved` (ou `dismissed`).

**Disparado por**:
- `telemetry`: Cobli/Maxtrack chama Edge Function quando km próximo do limite
- `manual`: Danilo cria do dashboard
- `schedule`: cron pg_cron (diário 8h, hora em hora)
- `caf_webhook`: validação Caf reprovada

**Campos importantes**:
- `whatsapp_template`: mensagem pronta pra Danilo enviar ao cliente
- `client_response`: rastreia se cliente escolheu opção A/B/C
- `resolved_maintenance_id`: link pra registro real de manutenção criado

## ⚙ Edge Function `maintenance-trigger`

**Endpoint**: `https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/maintenance-trigger`
**Auth**: `verify_jwt: true` (precisa de Authorization Bearer com service_role ou JWT válido)

### Payload de entrada

```json
{
  "vehicle_id": "uuid",
  "trigger_type": "oil_change_due | suspicious_app_usage | document_expiring | tire_wear",
  "trigger_data": {
    "km": 9100,
    "last_service_km": 0
  },
  "indicators": ["Mais de 200 km/dia em média", "30+ paradas curtas/dia"],
  "doc_type": "IPVA",
  "days_until_expiry": 25
}
```

### O que faz

1. **Idempotência**: se já existe alerta ativo do mesmo tipo pro mesmo veículo, retorna sem duplicar
2. Busca dados do veículo + booking ativo + cliente
3. Monta título/descrição + severidade automaticamente conforme tipo
4. **Gera template WhatsApp pronto** com nome real do cliente + dados específicos:
   - `oil_change_due` → 3 opções A/B/C
   - `suspicious_app_usage` → notificação Cláusula 7(h) + prazo 48h
   - `document_expiring` → notificação interna pra equipe
5. Insere em `maintenance_alerts` com status `new`

### Templates WhatsApp embutidos

**Trecho do template de troca de óleo**:
```
Olá [Nome], aqui é Danilo da Nomade Drive.

Seu carro está chegando ao limite de troca de óleo programada (faltam aproximadamente [X] km).

Quero combinar com você o melhor momento. Tenho 3 opções:

A — Busco o carro de manhã, faço a troca e devolvo no fim do dia (4-6h sem o carro)
B — Você leva à nossa oficina parceira em horário agendado (1-2h aguardando)
C — Trocamos por carro reserva temporariamente (sujeito à disponibilidade)

Qual prefere? Sem custo extra em nenhuma das 3 opções — está tudo incluso no seu plano.
```

### Como ativar (quando Cobli estiver integrado)

```js
// No webhook Cobli, quando km do veículo atualizar:
fetch('https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/maintenance-trigger', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    vehicle_id: 'uuid-do-carro',
    trigger_type: 'oil_change_due',
    trigger_data: { km: currentKm }
  })
});
```

## 🔐 Segurança (RLS)

Todas 4 tabelas têm RLS ativo com policy:
- **Read**: `admin` ou `super_admin` (via `user_roles`)
- **Write**: `admin` ou `super_admin`

Clientes finais não veem nada disso — é admin-only.

## 🎯 Como Daniel popula os parceiros (sem CNPJ ainda)

1. Acessa admin (quando dashboard estiver pronto — Sprint D)
2. Cadastra parceiros mesmo em modo `prospect` (pré-contrato)
3. Quando assinar contrato com oficina/seguradora, muda status pra `active`
4. Sistema começa a usar dados reais nos alertas

**Pra começar manualmente agora** (sem dashboard), pode inserir via SQL:
```sql
INSERT INTO partners (partner_type, business_name, status, contact_name, contact_phone, address_city)
VALUES ('workshop', 'Oficina Exemplo UDI', 'prospect', 'Sr. José', '34999991234', 'Uberlândia');
```

## ⏭ O que falta (pra ativar de verdade)

| Item | Bloqueio |
|---|---|
| Telemetria Cobli ativa → chamar Edge Function | Conta Cobli + carros instalados |
| Cron pg_cron pra varredura periódica | Decidir frequência + criar job |
| Dashboard admin pra cadastrar parceiros | Sprint D pendente |
| Cliente recebe template WhatsApp automaticamente | Z-API ou WhatsApp Business API |
| Cobrança quando manutenção for paga | CNPJ + gateway pagamento |

## 📋 Tasks relacionadas

- ✅ Sprint E (esta) — schema + Edge Function
- ⏸ Sprint D — dashboard admin com módulo Parceiros
- ⏸ Fase 82-6 — integração WhatsApp Z-API pra enviar templates automaticamente
- ⏸ Fase 100 — fluxo automático Caf+Autentique (independente desta sprint)
