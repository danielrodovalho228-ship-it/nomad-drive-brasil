# SQL — Criar Nova Reserva para Fluxo C (avaria)

**Por que:** A reserva atual (Onix, `53e86074...`) provavelmente foi consumida no Fluxo B. Pro Fluxo C precisamos de uma reserva NOVA, ainda não-paga, com outro veículo (HB20).

---

## Passo 1 — Verificar se o veículo HB20 existe

```sql
-- Lista veículos do qa-proprietario
select v.id, v.make, v.model, v.year_model, v.status, v.fipe_value, v.tracker_installed
  from public.vehicles v
  join public.profiles p on p.id = v.owner_id
 where p.email = 'qa-proprietario@nomadedrive.com.br'
 order by v.created_at;
```

**Esperado:** ao menos 1 linha. Se aparecer só a Onix, vai pro **Passo 1b** pra criar a HB20. Se já tiver HB20, **anota o `id`** dela e vai pro Passo 2.

---

## Passo 1b (opcional) — Criar veículo HB20 se não existir

```sql
insert into public.vehicles (
  owner_id, category, make, model, year_model,
  mileage, fipe_value, plate_last_digits, license_plate, renavam,
  city, state, status, tracker_installed
)
select
  p.id,
  'sedan',
  'Hyundai',
  'HB20',
  2023,
  35000,
  72500.00,
  '4567',
  'BRA4567',
  '12345678901',
  'Uberlândia',
  'MG',
  'aprovado',
  true                          -- já com rastreador (pra simplificar)
from public.profiles p
where p.email = 'qa-proprietario@nomadedrive.com.br'
returning id, make, model, year_model;
```

**Copia o `id` retornado** — vai usar no Passo 2.

---

## Passo 2 — Criar reserva nova

> Substitui `'<VEHICLE_ID_HB20>'` pelo UUID que veio do Passo 1 ou 1b.

```sql
insert into public.bookings (
  client_id, owner_id, vehicle_id,
  start_date, end_date,
  monthly_price, platform_fee, owner_estimated_amount, deposit_amount,
  status, billing_mode
)
select
  c.id,                                          -- client_id (qa-cliente)
  o.id,                                          -- owner_id (qa-proprietario)
  '<VEHICLE_ID_HB20>'::uuid,                     -- ⚠️ trocar pelo id real
  current_date,
  current_date + interval '90 days',
  2500.00,                                       -- mensalidade
  250.00,                                        -- platform_fee (10%)
  2250.00,                                       -- owner_estimated_amount (90%)
  1000.00,                                       -- caução
  'aprovado',
  'monthly'
from public.profiles c, public.profiles o
where c.email = 'qa-cliente@nomadedrive.com.br'
  and o.email = 'qa-proprietario@nomadedrive.com.br'
returning id, vehicle_id, status, billing_mode, monthly_price, deposit_amount;
```

**Copia o `id` retornado** — esse é o ID da nova reserva. URL fica:
```
https://nomadedrive.com.br/reserva-detalhe.html?id=<NOVO_ID>
```

---

## Passo 3 — Verificar

```sql
select b.id, b.status, b.billing_mode, b.monthly_price, b.deposit_amount,
       b.stripe_subscription_id,
       v.make, v.model, v.year_model
  from public.bookings b
  join public.profiles p on p.id = b.client_id
  left join public.vehicles v on v.id = b.vehicle_id
 where p.email = 'qa-cliente@nomadedrive.com.br'
 order by b.created_at desc;
```

**Esperado:**
- Ao menos 2 linhas (Onix antiga + HB20 nova)
- HB20 com `status = aprovado`, `stripe_subscription_id = NULL`

---

## Pronto pra começar o Fluxo C

Abre a URL `https://nomadedrive.com.br/reserva-detalhe.html?id=<NOVO_ID>` logado como `qa-cliente@` e segue o roteiro em `PASSO_A_PASSO_TESTES.md` seção Fluxo C.

⚠️ **Não esquece:** antes de testar a avaria propriamente, **paga a mensalidade + autoriza a caução** dessa reserva nova (Fluxo A novamente). Sem isso, não tem caução pra capturar nos passos finais.
