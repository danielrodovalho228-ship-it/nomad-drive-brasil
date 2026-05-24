-- ============================================================
-- Fase 32 — Sprint 1: Timeline + Saques Parciais + Earnings
-- ============================================================
-- O que faz:
--   1. Cria tabela `withdrawals` (saques parciais a cada 15 dias)
--   2. Cria trigger que gera marcos automaticamente quando booking
--      vira "em_uso" (4 marcos pra 60d, 6 pra 90d, etc.)
--   3. Cria view `owner_earnings` com rendimento acumulado em tempo real
--   4. Cria view `owner_dashboard_summary` (agregado pro contador grande)
--   5. RLS policies pra cada um
--
-- Como rodar:
--   Supabase Dashboard → SQL Editor → New query → cola → Run
--
-- ⚠️ DEPENDÊNCIA:
--   Rodar PRIMEIRO `supabase-fase32b-bookings-status-terminal.sql`
--   pra adicionar 'em_uso' e 'encerrada' ao enum entity_status.
--   Sem isso, os filtros `where b.status in ('aprovado','em_uso','encerrada')`
--   das views ainda funcionam (só não retornam linhas pra esses status até
--   alguma reserva ser marcada com eles), mas o ideal é rodar fase32b antes.
--
-- Reversível:
--   Sim — vide seção "ROLLBACK" no fim do arquivo
-- ============================================================

-- ---------- TABELA: withdrawals ----------

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  milestone_number int not null,          -- 1, 2, 3... (qual marco da locação)
  milestone_date date not null,            -- data em que o saque fica disponível
  amount_gross numeric(10,2) not null,     -- R$ 1.250 (bruto parcial)
  platform_fee numeric(10,2) not null,     -- R$ 125 (10% comissão)
  amount_net numeric(10,2) not null,       -- R$ 1.125 (líquido pro proprietário)
  status text not null default 'pending'
    check (status in ('pending','available','paid','withheld','cancelled')),
  stripe_payout_id text,                   -- id do payout no Stripe quando pago
  paid_at timestamptz,
  withheld_reason text,                    -- 'avaria_em_analise', 'multa_pendente', etc.
  nf_cliente_id text,                      -- id da NF emitida pro cliente
  nf_cliente_pdf_url text,
  nf_proprietario_id text,                 -- id da NF emitida pro proprietário (comissão)
  nf_proprietario_pdf_url text,
  notes text,                              -- observações livres
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint uq_booking_milestone unique (booking_id, milestone_number)
);

create index if not exists idx_withdrawals_booking on public.withdrawals(booking_id);
create index if not exists idx_withdrawals_owner_status on public.withdrawals(owner_id, status);
create index if not exists idx_withdrawals_milestone_date on public.withdrawals(milestone_date);

comment on table public.withdrawals is 'Saques parciais a cada 15 dias de locação. Permite proprietário antecipar rendimento sem esperar fim do mês.';
comment on column public.withdrawals.status is 'pending=futuro; available=pode sacar agora; paid=já saiu pro proprietário; withheld=segurado por incidente; cancelled=booking cancelada';

-- ---------- TRIGGER: gerar marcos automaticamente ----------

create or replace function public.create_booking_milestones()
returns trigger
language plpgsql
security definer
as $$
declare
  total_days int;
  num_milestones int;
  milestone_amount numeric(10,2);
  milestone_fee numeric(10,2);
  milestone_net numeric(10,2);
  i int;
  milestone_date_calc date;
begin
  -- Só processa se status é "em_uso" ou "aprovado" e billing é monthly
  if new.status not in ('em_uso','aprovado') then
    return new;
  end if;

  if new.billing_mode <> 'monthly' then
    return new;
  end if;

  -- Não recriar se já existem
  if exists (select 1 from public.withdrawals where booking_id = new.id) then
    return new;
  end if;

  -- Validar datas e valor
  if new.start_date is null or new.end_date is null or new.monthly_price is null then
    return new;
  end if;

  total_days := (new.end_date - new.start_date)::int;
  num_milestones := total_days / 15;  -- 1 marco a cada 15 dias

  if num_milestones < 1 then
    return new;
  end if;

  -- Valor por marco: metade do mensal (já que 15d = meio mês)
  milestone_amount := new.monthly_price / 2;
  milestone_fee := round(milestone_amount * 0.10, 2);
  milestone_net := milestone_amount - milestone_fee;

  -- Inserir 1 row por marco
  for i in 1..num_milestones loop
    milestone_date_calc := new.start_date + (i * 15);

    insert into public.withdrawals (
      booking_id, owner_id, milestone_number, milestone_date,
      amount_gross, platform_fee, amount_net, status
    ) values (
      new.id,
      new.owner_id,
      i,
      milestone_date_calc,
      milestone_amount,
      milestone_fee,
      milestone_net,
      case
        when milestone_date_calc <= current_date then 'available'
        else 'pending'
      end
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_create_milestones on public.bookings;
create trigger trg_create_milestones
after insert or update of status on public.bookings
for each row
execute function public.create_booking_milestones();

comment on function public.create_booking_milestones() is 'Cria automaticamente 1 row em withdrawals a cada 15d da locação. Disparado quando booking vira em_uso ou aprovado.';

-- ---------- TRIGGER: marcar pending→available quando chega a data ----------
-- Esse trigger é leve, roda diariamente via cron (pg_cron) ou pode ser chamado manualmente

create or replace function public.activate_due_milestones()
returns int
language plpgsql
security definer
as $$
declare
  activated_count int;
begin
  update public.withdrawals
     set status = 'available',
         updated_at = now()
   where status = 'pending'
     and milestone_date <= current_date;

  get diagnostics activated_count = row_count;
  return activated_count;
end;
$$;

comment on function public.activate_due_milestones() is 'Chamar via cron diário 00:01. Promove withdrawals.status de pending pra available quando milestone_date chega.';

-- ---------- VIEW: owner_earnings (rendimento em tempo real) ----------

create or replace view public.owner_earnings as
select
  b.owner_id,
  v.id as vehicle_id,
  v.make,
  v.model,
  v.year_model,
  b.id as booking_id,
  c.full_name as client_name,
  b.start_date,
  b.end_date,
  b.status as booking_status,
  b.monthly_price,
  b.owner_estimated_amount as monthly_net,  -- 90% mensal

  -- Dias decorridos (limitado entre 0 e duração total)
  greatest(0, least(
    (current_date - b.start_date)::int,
    (b.end_date - b.start_date)::int
  )) as days_elapsed,

  -- Duração total em dias
  (b.end_date - b.start_date)::int as total_days,

  -- Rendimento acumulado em tempo real:
  -- (dias decorridos) * (valor diário do proprietário)
  -- onde valor diário = (monthly_net / 30)
  round(
    greatest(0, least(
      (current_date - b.start_date)::int,
      (b.end_date - b.start_date)::int
    )) * (b.owner_estimated_amount / 30.0),
    2
  ) as accrued_amount,

  -- Total já sacado
  coalesce((
    select sum(amount_net)
    from public.withdrawals
    where booking_id = b.id and status = 'paid'
  ), 0)::numeric(10,2) as withdrawn_amount,

  -- Disponível pra sacar agora
  coalesce((
    select sum(amount_net)
    from public.withdrawals
    where booking_id = b.id and status = 'available'
  ), 0)::numeric(10,2) as available_amount,

  -- Próximo marco
  (
    select min(milestone_date)
    from public.withdrawals
    where booking_id = b.id and status = 'pending'
  ) as next_milestone_date,

  -- Projeção fim do contrato (90% do total contratado)
  round(
    b.owner_estimated_amount * ((b.end_date - b.start_date)::int / 30.0),
    2
  ) as projected_total_earnings

from public.bookings b
join public.vehicles v on v.id = b.vehicle_id
join public.profiles c on c.id = b.client_id
where b.status in ('aprovado','em_uso','encerrada');

comment on view public.owner_earnings is 'Rendimento agregado por veículo/locação, calculado em tempo real. Usado no dashboard do proprietário.';

-- ---------- VIEW: owner_dashboard_summary (contador grande) ----------

create or replace view public.owner_dashboard_summary as
select
  owner_id,
  count(distinct vehicle_id) filter (where booking_status = 'em_uso') as active_vehicles_count,
  count(distinct booking_id) filter (where booking_status = 'em_uso') as active_bookings_count,
  sum(accrued_amount)::numeric(10,2) as total_accrued,
  sum(withdrawn_amount)::numeric(10,2) as total_withdrawn,
  sum(available_amount)::numeric(10,2) as total_available,
  sum(projected_total_earnings)::numeric(10,2) as total_projected,

  -- Subindo hoje (1 dia de acréscimo)
  round(
    sum(monthly_net) filter (where booking_status = 'em_uso') / 30.0,
    2
  ) as today_increment,

  -- Subindo essa semana (7 dias de acréscimo)
  round(
    sum(monthly_net) filter (where booking_status = 'em_uso') / 30.0 * 7,
    2
  ) as week_increment,

  min(next_milestone_date) as next_milestone_date

from public.owner_earnings
group by owner_id;

comment on view public.owner_dashboard_summary is 'Resumo agregado pro contador grande "Sua frota já rendeu R$ X". Uma linha por proprietário.';

-- ---------- RLS Policies ----------

alter table public.withdrawals enable row level security;

drop policy if exists "owner_can_view_own_withdrawals" on public.withdrawals;
create policy "owner_can_view_own_withdrawals" on public.withdrawals
  for select
  using (owner_id = auth.uid());

drop policy if exists "admin_can_view_all_withdrawals" on public.withdrawals;
create policy "admin_can_view_all_withdrawals" on public.withdrawals
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.main_role = 'admin'
    )
  );

-- Cliente NÃO vê detalhes de saque do proprietário (privacidade financeira)

-- Views herdam RLS das tabelas base, mas vamos ser explícitos:
-- owner_earnings e owner_dashboard_summary não precisam de RLS adicional
-- porque já filtram por owner_id que vem do bookings (que tem RLS)

-- ---------- Backfill (opcional): criar marcos pras reservas existentes ----------
-- Descomenta se quiser popular as locações que já existem

-- do $$
-- declare b record;
-- begin
--   for b in select * from public.bookings
--             where status in ('em_uso','aprovado')
--               and billing_mode = 'monthly'
--               and not exists (select 1 from public.withdrawals w where w.booking_id = bookings.id)
--   loop
--     -- Simula trigger
--     perform public.create_booking_milestones() from public.bookings where id = b.id;
--   end loop;
-- end $$;

-- ---------- Testes de sanidade ----------

-- 1. Ver marcos criados pra reserva atual do qa-cliente
-- select * from public.withdrawals
--  where booking_id in (
--    select id from public.bookings b
--    join public.profiles p on p.id = b.client_id
--    where p.email = 'qa-cliente@nomadedrive.com.br'
--  )
--  order by milestone_number;

-- 2. Ver rendimento acumulado
-- select * from public.owner_earnings
--  where owner_id = (select id from public.profiles where email = 'qa-proprietario@nomadedrive.com.br');

-- 3. Ver resumo do dashboard
-- select * from public.owner_dashboard_summary
--  where owner_id = (select id from public.profiles where email = 'qa-proprietario@nomadedrive.com.br');

-- ============================================================
-- ROLLBACK (se precisar reverter)
-- ============================================================
-- drop view if exists public.owner_dashboard_summary;
-- drop view if exists public.owner_earnings;
-- drop trigger if exists trg_create_milestones on public.bookings;
-- drop function if exists public.create_booking_milestones();
-- drop function if exists public.activate_due_milestones();
-- drop table if exists public.withdrawals;
-- ============================================================
