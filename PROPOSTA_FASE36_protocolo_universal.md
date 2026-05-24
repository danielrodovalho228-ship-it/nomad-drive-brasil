# Fase 36 — Protocolo único universal (reserva, vistoria, pagamento)

> **Tipo:** spec de implementação (prompt pro code)
> **Autor:** Claude (QA) — 2026-05-24
> **Origem:** ideia do Daniel — "falta número de protocolo pra tudo quando a plataforma crescer".
> **Esforço:** baixo/médio · **Bloqueia algo?** Não (melhoria de produto/operação).

---

## Objetivo
Dar a **toda entidade operacional** um número de protocolo único, curto e legível,
exibido na UI e em **todos os e-mails**, pra suporte/rastreio quando o volume crescer
("me passa o protocolo da sua reserva/avaria/pagamento").

## O que JÁ existe (não mexer, só reaproveitar o padrão)
| Entidade | Coluna | Formato | Origem |
|---|---|---|---|
| applications (cadastros) | `protocol` | `NDB-AAAA-000000` | Fase 1 |
| protection_cases (ocorrências) | `protocol_number` | `PR-AAAA-0000` | Fase 34 |
| damages (avarias) | `protocol_number` | `AV-AAAA-0000` | Fase 34 |

## O que FALTA (escopo desta fase)
| Entidade | Coluna nova | Prefixo proposto | Exemplo |
|---|---|---|---|
| **bookings** (reservas) | `protocol_number` | `RS-` | `RS-2026-0001` |
| **rental_inspections** (vistorias/check-in-out) | `protocol_number` | `VS-` | `VS-2026-0001` |
| **payments** (pagamentos) | `protocol_number` | `PG-` | `PG-2026-0001` |

Padrão consistente com a Fase 34: `PREFIXO-AAAA-####` (4 dígitos, `lpad`, sequência própria,
ano via `to_char(created_at,'YYYY')`).

---

## 1. SQL — `supabase-fase36-protocolo-universal.sql`
Seguir o mesmo padrão da Fase 34 (sequência + coluna + trigger BEFORE INSERT + backfill).
Para cada uma das 3 tabelas (bookings, rental_inspections, payments):

```sql
-- exemplo pra bookings (replicar pra rental_inspections=VS / payments=PG)
create sequence if not exists booking_protocol_seq;
alter table public.bookings add column if not exists protocol_number text;

create or replace function public.set_booking_protocol()
returns trigger language plpgsql as $$
begin
  if new.protocol_number is null or new.protocol_number = '' then
    new.protocol_number := 'RS-' ||
      to_char(coalesce(new.created_at, now()), 'YYYY') || '-' ||
      lpad(nextval('booking_protocol_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_booking_protocol on public.bookings;
create trigger trg_booking_protocol before insert on public.bookings
  for each row execute function public.set_booking_protocol();

-- BACKFILL dos registros existentes (ordenados por created_at p/ numeração estável)
do $$
declare r record;
begin
  for r in select id from public.bookings where protocol_number is null order by created_at loop
    update public.bookings
      set protocol_number = 'RS-' || to_char(coalesce(
            (select created_at from public.bookings where id=r.id), now()),'YYYY')
            || '-' || lpad(nextval('booking_protocol_seq')::text,4,'0')
      where id = r.id;
  end loop;
end $$;

create unique index if not exists bookings_protocol_uidx on public.bookings(protocol_number);
```
Idempotente (add column if not exists / create seq if not exists). Sem `ALTER TYPE`.
**Atenção ao backfill:** se Fase 34 já tem exemplo de backfill, reusar o mesmo estilo.

## 2. Frontend (HTML/JS) — exibir o protocolo
- **reserva-detalhe.html:** mostrar `RS-...` no topo do card da reserva (ao lado do status).
- **dashboard-cliente / dashboard-proprietario:** mostrar o protocolo da reserva no card
  e o da avaria/vistoria onde aparecem.
- **dashboard-protecao:** já mostra PR-/AV- (Fase 34) — só garantir consistência.
- **Pagamentos (reserva-detalhe):** mostrar `PG-...` em cada linha de pagamento.

## 3. E-mails — incluir o protocolo
- No **rodapé de todos os templates** (`emails-runtime.js` + Edge Functions
  `close-rental`, `damage-capture`, `send-email`, `stripe-webhook`, `stripe-subscription`):
  linha "Protocolo: <número>" referente à entidade do e-mail (reserva/avaria/pagamento).
- Passar o `protocol_number` no payload de cada `notify`/`sendEmail`.
- Não quebra e-mails existentes (campo novo opcional no template).

## 4. (Opcional, alto valor de suporte) Busca por protocolo
- Estender a ideia da `application_status_by_protocol` (Fase 1) pra uma RPC/админ que,
  dado qualquer protocolo (`RS-/VS-/PG-/AV-/PR-/NDB-`), retorne a entidade + status.
  Útil pro suporte localizar qualquer coisa por 1 número.

---

## Critério de aceite
- Toda reserva/vistoria/pagamento novo recebe `protocol_number` automático no formato certo.
- Registros antigos têm protocolo via backfill (sem duplicados — índice único).
- Protocolo aparece na UI (reserva, avaria, pagamento) e no rodapé dos e-mails.
- Nenhuma regressão nos fluxos A–D / Fase 35.

## Observações
- Há uma **inconsistência herdada**: `applications` usa `NDB-` + 6 dígitos; Fase 34 usa 4 dígitos.
  Sugestão: manter como está (compatibilidade) e padronizar os NOVOS em 4 dígitos como a Fase 34.
  Se quiser unificar tudo num só padrão, é decisão de produto (migração de exibição, não de dados).
- Implementar como fase própria; testável de forma isolada (criar 1 reserva/pagamento e conferir o número + e-mail).
