-- ====================================================================
-- Nomade Drive Brasil — Fase 50: Sistema de avaliação bidirecional
-- --------------------------------------------------------------------
-- Após cada locação encerrada:
--   1. Cliente avalia owner (1-5 estrelas + comentário)
--   2. Owner avalia cliente (1-5 estrelas + comentário)
--
-- BENEFÍCIOS:
--   - Social proof pra plataforma (média de estrelas pública)
--   - Owner escolhe não aceitar cliente de avaliação ruim
--   - Reputação cria diferenciação entre owners
--   - Confiança aumenta conversão de novos clientes
--
-- COMPONENTES:
--   1. Tabela ratings
--   2. View vehicle_ratings_summary (média por veículo + total)
--   3. View owner_ratings_summary (média por owner + total)
--   4. View client_ratings_summary (média por cliente + total)
--   5. RLS: ambos os lados podem ler avaliações, mas cada lado só
--      escreve a sua
-- ====================================================================

-- Enum: quem está avaliando quem
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rating_direction') then
    create type rating_direction as enum (
      'client_rates_owner',
      'owner_rates_client'
    );
  end if;
end $$;

-- Tabela principal
create table if not exists public.ratings (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  direction       rating_direction not null,

  -- Quem avalia (rater) → quem é avaliado (ratee)
  rater_id        uuid not null references auth.users(id) on delete cascade,
  ratee_id        uuid not null references auth.users(id) on delete cascade,
  vehicle_id      uuid references public.vehicles(id) on delete set null,

  -- Avaliação
  stars           int not null check (stars >= 1 and stars <= 5),
  comment         text,

  -- Aspectos opcionais (granular)
  cleanliness     int check (cleanliness is null or (cleanliness >= 1 and cleanliness <= 5)),
  communication   int check (communication is null or (communication >= 1 and communication <= 5)),
  punctuality     int check (punctuality is null or (punctuality >= 1 and punctuality <= 5)),

  -- Resposta do avaliado (opcional)
  response        text,
  response_at     timestamptz,

  -- Visibilidade
  is_public       boolean not null default true,
  hidden_reason   text,  -- se admin esconde (ofensa, spam)

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Constraints
  constraint uq_rating_per_booking_per_direction unique (booking_id, direction),
  constraint chk_rater_not_ratee check (rater_id <> ratee_id)
);

create index if not exists ratings_ratee_idx on public.ratings(ratee_id);
create index if not exists ratings_vehicle_idx on public.ratings(vehicle_id) where vehicle_id is not null;
create index if not exists ratings_booking_idx on public.ratings(booking_id);
create index if not exists ratings_direction_idx on public.ratings(direction);

-- Trigger updated_at
create or replace function public.touch_ratings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_ratings_updated_at on public.ratings;
create trigger trg_ratings_updated_at
  before update on public.ratings
  for each row execute function public.touch_ratings_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.ratings enable row level security;

-- Read: avaliações públicas qualquer um vê, privadas só rater/ratee/admin
drop policy if exists "ratings_public_read" on public.ratings;
create policy "ratings_public_read" on public.ratings
  for select using (
    is_public = true
    OR auth.uid() = rater_id
    OR auth.uid() = ratee_id
    OR exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
        and status = 'aprovado'
    )
  );

-- Insert: só rater_id = auth.uid() E booking está encerrada E
--        rater está no lado certo da booking (cliente/owner)
drop policy if exists "ratings_insert" on public.ratings;
create policy "ratings_insert" on public.ratings
  for insert with check (
    auth.uid() = rater_id
    AND exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.status = 'encerrada'
        and (
          (direction = 'client_rates_owner' and b.client_id = auth.uid() and b.owner_id = ratee_id)
          OR
          (direction = 'owner_rates_client' and b.owner_id = auth.uid() and b.client_id = ratee_id)
        )
    )
  );

-- Update: só o próprio rater pode editar OU o ratee pode responder
drop policy if exists "ratings_update_rater" on public.ratings;
create policy "ratings_update_rater" on public.ratings
  for update using (auth.uid() = rater_id);

drop policy if exists "ratings_update_response" on public.ratings;
create policy "ratings_update_response" on public.ratings
  for update using (auth.uid() = ratee_id);

-- Delete: só super_admin (em caso de violação de termos)
drop policy if exists "ratings_delete_admin" on public.ratings;
create policy "ratings_delete_admin" on public.ratings
  for delete using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'super_admin'
        and status = 'aprovado'
    )
  );

-- ============================================================
-- View: resumo de avaliações por VEÍCULO (média + total + last 5)
-- ============================================================
create or replace view public.vehicle_ratings_summary
with (security_invoker = true) as
select
  v.id as vehicle_id,
  count(r.id) as total_ratings,
  round(avg(r.stars)::numeric, 1) as avg_stars,
  count(*) filter (where r.stars = 5) as five_stars,
  count(*) filter (where r.stars = 4) as four_stars,
  count(*) filter (where r.stars = 3) as three_stars,
  count(*) filter (where r.stars = 2) as two_stars,
  count(*) filter (where r.stars = 1) as one_star
from public.vehicles v
left join public.ratings r on r.vehicle_id = v.id
  and r.direction = 'client_rates_owner'
  and r.is_public = true
group by v.id;

comment on view public.vehicle_ratings_summary is
  'Fase 50: média de estrelas por veículo (só avaliações públicas client→owner).';

-- ============================================================
-- View: resumo por OWNER (todas as avaliações que recebeu)
-- ============================================================
create or replace view public.owner_ratings_summary
with (security_invoker = true) as
select
  o.id as owner_id,
  count(r.id) as total_ratings,
  round(avg(r.stars)::numeric, 1) as avg_stars,
  round(avg(r.cleanliness)::numeric, 1) as avg_cleanliness,
  round(avg(r.communication)::numeric, 1) as avg_communication,
  round(avg(r.punctuality)::numeric, 1) as avg_punctuality,
  count(*) filter (where r.stars >= 4) as positive_count,
  count(*) filter (where r.stars <= 2) as negative_count
from public.profiles o
left join public.ratings r on r.ratee_id = o.id
  and r.direction = 'client_rates_owner'
  and r.is_public = true
where o.main_role = 'owner'
group by o.id;

comment on view public.owner_ratings_summary is
  'Fase 50: reputação consolidada do owner (visível pra clientes escolherem).';

-- ============================================================
-- View: resumo por CLIENTE (avaliações recebidas dos owners)
-- ============================================================
create or replace view public.client_ratings_summary
with (security_invoker = true) as
select
  c.id as client_id,
  count(r.id) as total_ratings,
  round(avg(r.stars)::numeric, 1) as avg_stars,
  round(avg(r.cleanliness)::numeric, 1) as avg_cleanliness,
  round(avg(r.communication)::numeric, 1) as avg_communication,
  round(avg(r.punctuality)::numeric, 1) as avg_punctuality
from public.profiles c
left join public.ratings r on r.ratee_id = c.id
  and r.direction = 'owner_rates_client'
where c.main_role = 'client'
group by c.id;

comment on view public.client_ratings_summary is
  'Fase 50: reputação do cliente vista pelos owners (decisão de aceitar pedido).';

-- ============================================================
-- View: bookings pendentes de avaliação (pro dashboard mostrar CTA)
-- ============================================================
create or replace view public.pending_ratings
with (security_invoker = true) as
select
  b.id as booking_id,
  b.client_id,
  b.owner_id,
  b.vehicle_id,
  b.end_date,
  b.updated_at as booking_closed_at,
  v.make, v.model, v.year_model,

  -- Cliente já avaliou owner?
  exists (
    select 1 from public.ratings
    where booking_id = b.id and direction = 'client_rates_owner'
  ) as client_rated,

  -- Owner já avaliou cliente?
  exists (
    select 1 from public.ratings
    where booking_id = b.id and direction = 'owner_rates_client'
  ) as owner_rated

from public.bookings b
left join public.vehicles v on v.id = b.vehicle_id
where b.status = 'encerrada'
  and b.updated_at >= now() - interval '30 days';  -- só janelas recentes (30d)

comment on view public.pending_ratings is
  'Fase 50: bookings recentes encerradas onde cliente/owner ainda não avaliaram.';

-- ============================================================
-- Verificação
-- ============================================================
do $$
declare
  total int;
begin
  raise notice '=== Fase 50 — Sistema de avaliação ===';
  select count(*) into total from public.ratings;
  raise notice 'Total ratings existentes: %', total;
  raise notice '';
  raise notice 'Views criadas:';
  raise notice '  - vehicle_ratings_summary (média por veículo)';
  raise notice '  - owner_ratings_summary (reputação owner)';
  raise notice '  - client_ratings_summary (reputação cliente)';
  raise notice '  - pending_ratings (CTA pra avaliar)';
  raise notice '';
  raise notice 'Pra testar inserir (precisa booking encerrada):';
  raise notice '  insert into ratings (booking_id, direction, rater_id, ratee_id, vehicle_id, stars, comment)';
  raise notice '  values (''<bid>'', ''client_rates_owner'', ''<client>'', ''<owner>'', ''<vid>'', 5, ''Owner muito atencioso!'');';
end $$;
