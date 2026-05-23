-- ====================================================================
-- Nomade Drive Brasil — Fase 26: auditoria de quilometragem (#9)
-- --------------------------------------------------------------------
-- Bloqueia REGRESSÃO de km nos veículos (NEW.mileage < OLD.mileage)
-- a menos que o caller seja admin/super-admin. Toda regressão (mesmo
-- as autorizadas pelo admin) é registrada em admin_audit_logs.
--
-- Cenário de uso:
--   - Owner aprovou check-out com km MENOR que o atual? Bloqueia.
--   - Admin precisa corrigir manualmente um erro? Passa, mas fica
--     o registro de auditoria automático.
--
-- Idempotente.
-- ====================================================================

-- 1. Função do trigger
create or replace function public.guard_vehicle_mileage_regression()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_admin boolean;
begin
  -- Se km não mudou ou aumentou, deixa passar sem alarde
  if new.mileage is null or old.mileage is null then
    return new;
  end if;
  if new.mileage >= old.mileage then
    return new;
  end if;

  -- Regressão detectada: km novo é MENOR que o anterior
  select public.is_admin() into v_is_admin;

  if not v_is_admin then
    raise exception 'KM_REGRESSAO: tentativa de gravar km menor (% < %) no veículo %. Apenas admin pode corrigir regressões de quilometragem.',
      new.mileage, old.mileage, new.id
      using errcode = 'P0001';
  end if;

  -- Admin OK — registra no audit
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata_json)
  values (
    auth.uid(),
    'vehicle_mileage_regression',
    'vehicle',
    new.id,
    jsonb_build_object(
      'old_mileage', old.mileage,
      'new_mileage', new.mileage,
      'delta',       new.mileage - old.mileage,
      'reason',      'Admin sobrescreveu km manualmente.'
    )
  );

  return new;
end $$;

-- 2. Trigger before update em vehicles.mileage
drop trigger if exists trg_guard_vehicle_mileage on public.vehicles;
create trigger trg_guard_vehicle_mileage
  before update of mileage on public.vehicles
  for each row execute function public.guard_vehicle_mileage_regression();

-- 3. Comentário
comment on function public.guard_vehicle_mileage_regression() is
  'Bloqueia regressão de vehicles.mileage. Permite só admin, sempre auditando em admin_audit_logs.';

-- 4. Atualiza o catálogo de ações conhecidas em audit (Fase 11 cria
--    audit_actions, mas só se rodada). Inserção idempotente.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='audit_actions'
  ) then
    insert into public.audit_actions (action, label, severity)
    values ('vehicle_mileage_regression', 'Quilometragem regredida', 'critica')
    on conflict (action) do nothing;
  end if;
end $$;

-- 5. Verificação
do $$
declare
  v_trg int;
begin
  select count(*) into v_trg
    from pg_trigger
    where tgname = 'trg_guard_vehicle_mileage';
  if v_trg = 0 then
    raise exception 'FALHA: trigger trg_guard_vehicle_mileage não foi criado.';
  end if;
  raise notice 'OK — Fase 26 instalada. Guard de regressão de km ativo.';
end $$;

-- ====================================================================
-- Fim — Fase 26 (auditoria de km).
-- ====================================================================
