-- ====================================================================
-- Nomade Drive Brasil — Fase 40: Cockpit Crescimento + Qualidade
-- --------------------------------------------------------------------
-- Adiciona 2 painéis ao Cockpit do CEO:
--   📈 Crescimento — funil aquisição, novos por período, top contribuintes
--   ⭐ Qualidade   — NPS, SLA Proteção, churn rate, satisfação
--
-- Tabelas novas:
--   - nps_responses (pesquisas pós-locação)
--
-- Views:
--   - growth_funnel (cadastros → aprovados → ativos)
--   - growth_by_period (novos hoje/semana/mês/ano)
--   - top_contributors (top proprietários, parceiros, oficinas)
--   - quality_summary (NPS médio, SLA cumprimento, churn rate)
--
-- DEPENDÊNCIAS:
--   - Fase 37 (ceo_cockpit_summary)
--   - Fase 34 (protection_cases_full)
-- ====================================================================

-- ============================ 1. nps_responses ======================
-- Pesquisa NPS pós-locação. Cliente recebe 1 e-mail quando reserva
-- encerra perguntando "De 0-10, quanto recomendaria a Nomade Drive?"
-- Resposta vira linha aqui.

create table if not exists public.nps_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  user_role text check (user_role in ('client','owner','partner','workshop')),

  -- NPS score: 0-6 detractor, 7-8 passive, 9-10 promoter
  score int not null check (score between 0 and 10),
  comment text,                            -- comentário opcional

  -- Categoria do feedback (radio buttons no formulário)
  category text check (category in (
    'app_ux', 'pagamento', 'veiculo', 'comunicacao', 'suporte', 'preco', 'outros'
  )),

  responded_at timestamptz default now()
);

create index if not exists nps_responses_score_idx
  on public.nps_responses(score, responded_at desc);
create index if not exists nps_responses_user_role_idx
  on public.nps_responses(user_role);

comment on table public.nps_responses is
  'Respostas NPS pós-locação. NPS = % promoters - % detractors. Cliente/owner/partner/workshop.';

-- ============================ 2. VIEW: growth_funnel ================
-- Funil de aquisição: visita → cadastro → docs → aprovado → reservou

create or replace view public.growth_funnel as
select
  -- Cadastros (qualquer profile criado)
  (select count(*) from public.profiles)::int as total_cadastros,

  -- Verificação iniciada (status != rascunho)
  (select count(*) from public.profiles
    where verification_status != 'rascunho')::int as iniciaram_verificacao,

  -- Em análise+ (proxy pra "enviou docs" — substitui referência a
  -- public.documents que pode não existir no schema base)
  (select count(*) from public.profiles
    where verification_status in (
      'em_analise', 'documentos_pendentes', 'aprovado',
      'aprovado_com_ressalvas', 'recusado'
    ))::int as enviaram_documentos,

  -- Aprovados (verification_status = aprovado)
  (select count(*) from public.profiles
    where verification_status in ('aprovado','aprovado_com_ressalvas'))::int as aprovados,

  -- Solicitaram reserva (rental_requests)
  coalesce((
    select count(distinct client_id)
    from public.rental_requests
  ), 0)::int as solicitaram_reserva,

  -- Reservaram (bookings)
  (select count(distinct client_id) from public.bookings)::int as reservaram,

  -- Reservaram + pagaram (bookings com payment)
  (select count(distinct b.client_id)
   from public.bookings b
   where exists (
     select 1 from public.payments p
     where p.booking_id = b.id and p.status in ('pago','capturado')
   ))::int as pagaram;

comment on view public.growth_funnel is
  'Funil de aquisição: cadastro → docs → aprovado → reservou → pagou. Calcular conversion rate divide etapa N / etapa N-1.';

-- ============================ 3. VIEW: growth_by_period =============
-- Novos cadastros/reservas/veículos por período pra mostrar tendência

create or replace view public.growth_by_period as
select
  -- Cadastros
  (select count(*) from public.profiles where created_at >= current_date)::int as cadastros_hoje,
  (select count(*) from public.profiles where created_at >= now() - interval '7 days')::int as cadastros_7d,
  (select count(*) from public.profiles where created_at >= date_trunc('month', now()))::int as cadastros_mes,
  (select count(*) from public.profiles where created_at >= date_trunc('year', now()))::int as cadastros_ano,

  -- Reservas
  (select count(*) from public.bookings where created_at >= current_date)::int as reservas_hoje,
  (select count(*) from public.bookings where created_at >= now() - interval '7 days')::int as reservas_7d,
  (select count(*) from public.bookings where created_at >= date_trunc('month', now()))::int as reservas_mes,
  (select count(*) from public.bookings where created_at >= date_trunc('year', now()))::int as reservas_ano,

  -- Veículos cadastrados
  (select count(*) from public.vehicles where created_at >= current_date)::int as veiculos_hoje,
  (select count(*) from public.vehicles where created_at >= now() - interval '7 days')::int as veiculos_7d,
  (select count(*) from public.vehicles where created_at >= date_trunc('month', now()))::int as veiculos_mes,

  -- Receita por período (de payments)
  coalesce((select sum(amount) from public.payments
    where status in ('pago','capturado') and created_at >= current_date), 0)::numeric(12,2) as receita_hoje,
  coalesce((select sum(amount) from public.payments
    where status in ('pago','capturado') and created_at >= now() - interval '7 days'), 0)::numeric(12,2) as receita_7d,
  coalesce((select sum(amount) from public.payments
    where status in ('pago','capturado') and created_at >= date_trunc('month', now())), 0)::numeric(12,2) as receita_mes,
  coalesce((select sum(amount) from public.payments
    where status in ('pago','capturado') and created_at >= date_trunc('year', now())), 0)::numeric(12,2) as receita_ano;

comment on view public.growth_by_period is
  'Métricas de crescimento por período (hoje/7d/mês/ano). Cadastros, reservas, veículos, receita.';

-- ============================ 4. VIEW: top_contributors =============
-- Top proprietários e oficinas que mais contribuem

create or replace view public.top_owners as
select
  p.id as user_id,
  p.full_name,
  p.email,
  count(distinct v.id)::int as veiculos_ativos,
  count(distinct b.id)::int as reservas_total,
  count(distinct b.id) filter (where b.status in ('em_uso','aprovado'))::int as reservas_ativas,
  coalesce(sum(pay.amount) filter (where pay.status in ('pago','capturado') and pay.kind = 'mensalidade'), 0)::numeric(12,2) as receita_gerada
from public.profiles p
left join public.vehicles v on v.owner_id = p.id and v.status = 'aprovado'
left join public.bookings b on b.owner_id = p.id
left join public.payments pay on pay.booking_id = b.id
where p.main_role = 'owner'
group by p.id, p.full_name, p.email
having count(distinct v.id) > 0  -- só os que têm veículo
order by receita_gerada desc, reservas_ativas desc
limit 20;

comment on view public.top_owners is
  'Top 20 proprietários por receita gerada. Usado no painel Crescimento.';

-- ============================ 5. VIEW: quality_summary ==============

create or replace view public.quality_summary as
with nps_calc as (
  select
    count(*) filter (where score >= 9)::numeric as promoters,
    count(*) filter (where score <= 6)::numeric as detractors,
    count(*) filter (where score between 7 and 8)::numeric as passives,
    count(*)::numeric as total
  from public.nps_responses
  where responded_at >= now() - interval '90 days'
),
sla_calc as (
  -- Da Fase 34: protection_cases_full tem sla_remaining_hours
  -- "Dentro SLA" = ainda não venceu OU foi resolvido antes
  select
    count(*) filter (where status in ('aprovado','aprovado_com_ressalvas','recusado'))::int as casos_resolvidos,
    count(*) filter (where status in ('aprovado','aprovado_com_ressalvas','recusado')
      and updated_at - created_at <= (case when priority = 'alta' then interval '24 hours'
                                            when priority = 'media' then interval '48 hours'
                                            else interval '72 hours' end))::int as casos_dentro_sla,
    avg(extract(epoch from (updated_at - created_at)) / 3600) filter (
      where status in ('aprovado','aprovado_com_ressalvas','recusado')
    )::numeric(10,2) as tempo_medio_triagem_horas
  from public.protection_cases_full
  where created_at >= now() - interval '90 days'
),
churn_calc as (
  -- Churn cliente = % de clientes que cancelaram subscription nos últimos 30d
  -- (do total de subscriptions ativas no início do período)
  select
    count(distinct b.id) filter (where b.status = 'encerrada' and b.updated_at >= now() - interval '30 days')::int as canceladas_30d,
    count(distinct b.id) filter (where b.status in ('em_uso','aprovado'))::int as ativas_atual
  from public.bookings b
)
select
  -- NPS
  case when nps.total > 0
    then round((nps.promoters - nps.detractors) / nps.total * 100, 1)
    else null end as nps_score,
  nps.total::int as nps_total_respostas,
  nps.promoters::int as nps_promoters,
  nps.detractors::int as nps_detractors,

  -- SLA Proteção
  sla.casos_resolvidos,
  case when sla.casos_resolvidos > 0
    then round((sla.casos_dentro_sla::numeric / sla.casos_resolvidos) * 100, 1)
    else null end as sla_cumprimento_pct,
  sla.tempo_medio_triagem_horas,

  -- Churn
  churn.canceladas_30d,
  churn.ativas_atual,
  case when (churn.canceladas_30d + churn.ativas_atual) > 0
    then round(churn.canceladas_30d::numeric / (churn.canceladas_30d + churn.ativas_atual) * 100, 1)
    else 0 end as churn_rate_30d_pct

from nps_calc nps, sla_calc sla, churn_calc churn;

comment on view public.quality_summary is
  'Métricas de qualidade: NPS últimos 90 dias, SLA cumprimento Proteção, churn rate 30d.';

-- ============================ 6. RLS ================================

alter table public.nps_responses enable row level security;

-- Admin vê tudo
drop policy if exists nps_admin_select on public.nps_responses;
create policy nps_admin_select on public.nps_responses
  for select using (public.is_admin());

-- Usuário vê própria resposta
drop policy if exists nps_own_select on public.nps_responses;
create policy nps_own_select on public.nps_responses
  for select using (user_id = auth.uid());

-- Usuário insere própria resposta
drop policy if exists nps_own_insert on public.nps_responses;
create policy nps_own_insert on public.nps_responses
  for insert with check (user_id = auth.uid());

-- ============================ 7. SEED de teste ======================
-- Cria 3 respostas NPS mockadas pra você ver o painel funcionando

do $$
declare
  v_client_id uuid;    -- prefixo v_ evita colisão com bookings.client_id
  v_booking_id uuid;
begin
  -- Pega 1 cliente + 1 booking pra mockar
  select id into v_client_id from public.profiles
    where email = 'qa-cliente@nomadedrive.com.br' limit 1;
  select b.id into v_booking_id from public.bookings b
    where b.client_id = v_client_id
    limit 1;

  if v_client_id is not null then
    insert into public.nps_responses (user_id, booking_id, user_role, score, comment, category, responded_at)
    select * from (values
      (v_client_id, v_booking_id, 'client', 9, 'Adorei! Plataforma fácil de usar.', 'app_ux', now() - interval '15 days'),
      (v_client_id, v_booking_id, 'client', 10, 'Recomendaria com certeza, tudo muito transparente.', 'comunicacao', now() - interval '10 days'),
      (v_client_id, v_booking_id, 'client', 8, 'Bom! Poderia ter mais opções de carro.', 'veiculo', now() - interval '5 days')
    ) as t(user_id, booking_id, user_role, score, comment, category, responded_at)
    on conflict do nothing;
  end if;
end $$;

-- ============================ 8. Verificação ========================

do $$
declare
  nps_count int;
  funnel_count int;
begin
  select count(*) into nps_count from public.nps_responses;
  select total_cadastros into funnel_count from public.growth_funnel;

  raise notice '=== Fase 40 — Cockpit Crescimento + Qualidade ===';
  raise notice 'nps_responses (seed): %', nps_count;
  raise notice 'growth_funnel.total_cadastros: %', funnel_count;
  raise notice 'views: growth_funnel, growth_by_period, top_owners, quality_summary';
  raise notice '';
  raise notice 'Pra testar: select * from public.quality_summary;';
end $$;

-- ============================ ROLLBACK ==============================
-- drop view if exists public.quality_summary;
-- drop view if exists public.top_owners;
-- drop view if exists public.growth_by_period;
-- drop view if exists public.growth_funnel;
-- drop table if exists public.nps_responses;
-- ====================================================================
