-- ====================================================================
-- Nomade Drive Brasil — Fase 36: Protocolo único universal
-- --------------------------------------------------------------------
-- Adiciona protocol_number (texto único, legível) a:
--   bookings           → RS-AAAA-####  (reserva)
--   rental_inspections → VS-AAAA-####  (vistoria / check-in-out)
--   payments           → PG-AAAA-####  (pagamento)
--
-- Mesmo padrão da Fase 34 (protection_cases=PR-, damages=AV-) e Fase 1
-- (applications=NDB-). Sequência própria + trigger BEFORE INSERT +
-- backfill ordenado por created_at + índice único.
--
-- Idempotente: pode rodar de novo sem duplicar (if not exists / where null).
-- Sem ALTER TYPE. Pode colar e rodar tudo de uma vez no SQL Editor.
-- ====================================================================

-- ============================ 1. BOOKINGS (RS-) =====================
create sequence if not exists public.booking_protocol_seq;
alter table public.bookings add column if not exists protocol_number text;

create or replace function public.set_booking_protocol()
returns trigger language plpgsql as $$
begin
  if new.protocol_number is null or new.protocol_number = '' then
    new.protocol_number := 'RS-' ||
      to_char(coalesce(new.created_at, now()), 'YYYY') || '-' ||
      lpad(nextval('public.booking_protocol_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_booking_protocol on public.bookings;
create trigger trg_booking_protocol before insert on public.bookings
  for each row execute function public.set_booking_protocol();

-- backfill (ordenado p/ numeração estável)
do $$
declare r record;
begin
  for r in select id, created_at from public.bookings
           where protocol_number is null order by created_at, id loop
    update public.bookings
       set protocol_number = 'RS-' || to_char(coalesce(r.created_at, now()), 'YYYY')
           || '-' || lpad(nextval('public.booking_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
end $$;

create unique index if not exists bookings_protocol_uidx
  on public.bookings(protocol_number);

-- ===================== 2. RENTAL_INSPECTIONS (VS-) ==================
create sequence if not exists public.inspection_protocol_seq;
alter table public.rental_inspections add column if not exists protocol_number text;

create or replace function public.set_inspection_protocol()
returns trigger language plpgsql as $$
begin
  if new.protocol_number is null or new.protocol_number = '' then
    new.protocol_number := 'VS-' ||
      to_char(coalesce(new.created_at, now()), 'YYYY') || '-' ||
      lpad(nextval('public.inspection_protocol_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_inspection_protocol on public.rental_inspections;
create trigger trg_inspection_protocol before insert on public.rental_inspections
  for each row execute function public.set_inspection_protocol();

do $$
declare r record;
begin
  for r in select id, created_at from public.rental_inspections
           where protocol_number is null order by created_at, id loop
    update public.rental_inspections
       set protocol_number = 'VS-' || to_char(coalesce(r.created_at, now()), 'YYYY')
           || '-' || lpad(nextval('public.inspection_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
end $$;

create unique index if not exists rental_inspections_protocol_uidx
  on public.rental_inspections(protocol_number);

-- ============================ 3. PAYMENTS (PG-) =====================
create sequence if not exists public.payment_protocol_seq;
alter table public.payments add column if not exists protocol_number text;

create or replace function public.set_payment_protocol()
returns trigger language plpgsql as $$
begin
  if new.protocol_number is null or new.protocol_number = '' then
    new.protocol_number := 'PG-' ||
      to_char(coalesce(new.created_at, now()), 'YYYY') || '-' ||
      lpad(nextval('public.payment_protocol_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_payment_protocol on public.payments;
create trigger trg_payment_protocol before insert on public.payments
  for each row execute function public.set_payment_protocol();

do $$
declare r record;
begin
  for r in select id, created_at from public.payments
           where protocol_number is null order by created_at, id loop
    update public.payments
       set protocol_number = 'PG-' || to_char(coalesce(r.created_at, now()), 'YYYY')
           || '-' || lpad(nextval('public.payment_protocol_seq')::text, 4, '0')
     where id = r.id;
  end loop;
end $$;

create unique index if not exists payments_protocol_uidx
  on public.payments(protocol_number);

-- ============================ 4. Verificação ========================
do $$
declare
  n_bk int; n_in int; n_pg int;
begin
  select count(*) into n_bk from public.bookings where protocol_number is not null;
  select count(*) into n_in from public.rental_inspections where protocol_number is not null;
  select count(*) into n_pg from public.payments where protocol_number is not null;
  raise notice 'Fase 36 OK — protocolos: bookings=% (RS-), rental_inspections=% (VS-), payments=% (PG-)', n_bk, n_in, n_pg;
end $$;
-- ====================================================================
-- Fim — Fase 36. Próximo: exibir protocol_number na UI + rodapé dos e-mails.
-- ====================================================================
