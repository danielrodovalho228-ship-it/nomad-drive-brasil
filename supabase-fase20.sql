-- ============================================================
-- Nomade Drive Brasil — Fase 20: gate de KYC para solicitações
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente e reexecutável.
--
-- O OBJETIVO:
--   Cliente só pode criar uma nova solicitação de locação
--   (rental_request) APÓS ter o perfil aprovado pela equipe.
--   Isso garante que sem documentos enviados e aprovados,
--   a fila de novas solicitações não cresce indevidamente.
--
-- COMO FUNCIONA:
--   1. Trigger BEFORE INSERT em public.rental_requests.
--   2. Lê verification_status do profile do dono da inserção
--      (new.user_id, fallback auth.uid()).
--   3. Se profile não existe → permite (é a 1ª vez, onboarding).
--   4. Se profile aprovado → permite.
--   5. Se profile em qualquer outro estado (em_analise,
--      documentos_pendentes, recusado, suspenso, bloqueado_*)
--      → bloqueia com RAISE EXCEPTION + código KYC_PENDENTE.
--
--   O front-end captura o erro e mostra mensagem amigável; o
--   banco é a única fonte de verdade — não confia no client.
-- ============================================================

-- ------------------------------------------------------------
-- 1. FUNÇÃO DO GATE
-- ------------------------------------------------------------
create or replace function public.guard_rental_request_kyc()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid;
  v_status  text;
begin
  v_uid := coalesce(new.user_id, auth.uid());
  if v_uid is null then
    -- não dá pra resolver — bloqueia preventivamente
    raise exception 'KYC_PENDENTE: usuário não identificado para a solicitação.';
  end if;

  select verification_status::text into v_status
  from public.profiles
  where id = v_uid;

  -- profile ainda não existe → permite (1ª inserção é o próprio onboarding)
  if v_status is null then
    return new;
  end if;

  -- aprovado (ou com ressalvas) → sempre permite
  if v_status in ('aprovado', 'aprovado_com_ressalvas') then
    return new;
  end if;

  -- ainda não tem nenhuma rental_request → permite (1ª vez no fluxo)
  if not exists (
    select 1 from public.rental_requests where user_id = v_uid
  ) then
    return new;
  end if;

  -- já tem ao menos 1 solicitação e profile não aprovado → BLOQUEIA
  raise exception
    'KYC_PENDENTE: para criar uma nova solicitação de locação, seus documentos precisam ser aprovados primeiro. Status atual: %', v_status;
end $$;

-- ------------------------------------------------------------
-- 2. TRIGGER
-- ------------------------------------------------------------
drop trigger if exists trg_guard_rental_request_kyc on public.rental_requests;
create trigger trg_guard_rental_request_kyc
  before insert on public.rental_requests
  for each row execute function public.guard_rental_request_kyc();

-- ------------------------------------------------------------
-- 3. VERIFICAÇÃO RÁPIDA (saída amigável)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_guard_rental_request_kyc'
  ) then
    raise exception 'FALHA: trigger trg_guard_rental_request_kyc não foi criada.';
  end if;
  raise notice 'OK — gate de KYC instalado em rental_requests.';
end $$;

-- ============================================================
-- Fim — Fase 20 (gate de KYC para solicitações de locação).
-- ============================================================
