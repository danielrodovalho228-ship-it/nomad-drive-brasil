-- ====================================================================
-- Nomade Drive Brasil — Fase 43b: Trigger dispara e-mail de promoção
-- --------------------------------------------------------------------
-- Atualiza check_loyalty_promotion pra também chamar a Edge Function
-- send-tier-promotion via pg_net.http_post quando detecta subida de tier.
--
-- FLUXO COMPLETO:
--   1. Booking vira status='encerrada' (UPDATE)
--   2. Trigger trg_check_loyalty_promotion dispara
--   3. Trigger detecta mudança de tier
--   4. Insere em loyalty_events (audit local)
--   5. Chama pg_net.http_post pra send-tier-promotion
--   6. Edge Function envia e-mail bonito pro cliente
--   7. Edge Function loga em admin_audit_logs (tier_promotion_email_sent)
--
-- DEPENDÊNCIAS:
--   - Fase 43 COMPLETO (loyalty_events, trigger anterior)
--   - Edge Function send-tier-promotion deployada
--   - pg_net habilitado (já está)
--
-- COMO RODAR:
--   Supabase SQL Editor → cola → Run
-- ====================================================================

create extension if not exists pg_net schema extensions;

-- Substitui o trigger anterior com versão que dispara http_post
create or replace function public.check_loyalty_promotion()
returns trigger
language plpgsql
as $$
declare
  prev_months int;
  new_months int;
  prev_tier loyalty_tier;
  new_tier loyalty_tier;
  event_id uuid;
  request_id bigint;
begin
  -- Só dispara quando vira 'encerrada' (transição nova)
  if new.status != 'encerrada' or (old.status = 'encerrada' and new.status = 'encerrada') then
    return new;
  end if;

  -- Meses ANTES dessa booking
  select coalesce(sum(
    case when b.end_date is not null and b.start_date is not null
         then greatest(1, ((b.end_date - b.start_date)::int / 30))
         else 0 end
  ), 0)::int into prev_months
  from public.bookings b
  where b.client_id = new.client_id
    and b.status = 'encerrada'
    and b.id != new.id;

  new_months := prev_months + greatest(1, ((new.end_date - new.start_date)::int / 30));

  prev_tier := case
    when prev_months >= 12 then 'platinum'::loyalty_tier
    when prev_months >= 6  then 'gold'::loyalty_tier
    when prev_months >= 3  then 'silver'::loyalty_tier
    else 'bronze'::loyalty_tier
  end;
  new_tier := case
    when new_months >= 12 then 'platinum'::loyalty_tier
    when new_months >= 6  then 'gold'::loyalty_tier
    when new_months >= 3  then 'silver'::loyalty_tier
    else 'bronze'::loyalty_tier
  end;

  -- Só age se houve mudança de tier
  if prev_tier = new_tier then
    return new;
  end if;

  -- 1) Insere em loyalty_events (audit local)
  insert into public.loyalty_events (
    client_id, event, from_tier, to_tier, metadata
  ) values (
    new.client_id,
    'tier_promoted',
    prev_tier,
    new_tier,
    jsonb_build_object(
      'triggered_by_booking', new.id,
      'prev_months', prev_months,
      'new_months', new_months
    )
  )
  returning id into event_id;

  -- 2) Dispara e-mail comemorativo via Edge Function (best-effort)
  --    Só pra promoções "pra cima" (subida real de tier)
  if new_tier in ('silver', 'gold', 'platinum') then
    begin
      select net.http_post(
        url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-tier-promotion',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
        ),
        body := jsonb_build_object(
          'client_id', new.client_id,
          'from_tier', prev_tier::text,
          'to_tier', new_tier::text,
          'event_id', event_id,
          'prev_months', prev_months,
          'new_months', new_months
        )
      ) into request_id;
      -- request_id ignorado (best-effort)
    exception when others then
      -- E-mail falhou? Tudo bem, o evento já está logado em loyalty_events.
      -- Admin pode re-disparar manualmente se quiser.
      raise notice 'Falha ao disparar e-mail de promoção (event_id=%): %', event_id, sqlerrm;
    end;
  end if;

  return new;
end $$;

-- Re-bind trigger
drop trigger if exists trg_check_loyalty_promotion on public.bookings;
create trigger trg_check_loyalty_promotion
  after update on public.bookings
  for each row execute function public.check_loyalty_promotion();

-- ============================================================
-- Função utilitária: re-disparar e-mail manualmente
-- (útil pra recuperar promoções que falharam o http_post)
-- ============================================================
create or replace function public.resend_tier_promotion_email(p_event_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  evt record;
  v_user uuid;
  prev_months int;
  new_months int;
  request_id bigint;
begin
  v_user := auth.uid();

  -- Só admin pode re-disparar
  if not exists (
    select 1 from public.user_roles
    where user_id = v_user
      and role in ('admin', 'super_admin')
      and status = 'aprovado'
  ) then
    raise exception 'Apenas admin pode reenviar e-mail de promoção';
  end if;

  select * into evt from public.loyalty_events where id = p_event_id;
  if not found then
    raise exception 'Evento % não encontrado', p_event_id;
  end if;

  if evt.event != 'tier_promoted' then
    raise exception 'Evento % não é de promoção (é %)', p_event_id, evt.event;
  end if;

  prev_months := coalesce((evt.metadata->>'prev_months')::int, 0);
  new_months := coalesce((evt.metadata->>'new_months')::int, 0);

  select net.http_post(
    url := 'https://zeexmbgacvsaciojcrwr.supabase.co/functions/v1/send-tier-promotion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8'
    ),
    body := jsonb_build_object(
      'client_id', evt.client_id,
      'from_tier', evt.from_tier::text,
      'to_tier', evt.to_tier::text,
      'event_id', evt.id,
      'prev_months', prev_months,
      'new_months', new_months
    )
  ) into request_id;

  return jsonb_build_object('ok', true, 'request_id', request_id, 'event_id', p_event_id);
end;
$$;

grant execute on function public.resend_tier_promotion_email(uuid) to authenticated;

-- ============================================================
-- Verificação
-- ============================================================
do $$
declare
  trg_exists boolean;
  func_exists boolean;
begin
  select exists(
    select 1 from pg_trigger
    where tgname = 'trg_check_loyalty_promotion'
  ) into trg_exists;

  select exists(
    select 1 from pg_proc
    where proname = 'resend_tier_promotion_email'
  ) into func_exists;

  raise notice '=== Fase 43b — Trigger e-mail promoção ===';
  raise notice 'Trigger atualizado: %', trg_exists;
  raise notice 'Função reenvio criada: %', func_exists;
  raise notice '';
  raise notice 'PRÓXIMO PASSO: deploy da Edge Function';
  raise notice '  supabase functions deploy send-tier-promotion';
  raise notice '';
  raise notice 'Pra testar: marca uma booking como ''encerrada'' com 3+ meses de duração';
  raise notice '  → cliente sobe pelo menos pra Silver → e-mail dispara';
  raise notice '';
  raise notice 'Pra ver eventos: select * from public.loyalty_events order by created_at desc;';
  raise notice 'Pra ver e-mails enviados:';
  raise notice '  select metadata_json from public.admin_audit_logs';
  raise notice '  where action = ''tier_promotion_email_sent'' order by created_at desc;';
end $$;
