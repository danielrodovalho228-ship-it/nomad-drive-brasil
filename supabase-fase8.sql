-- ============================================================
-- Nomade Drive Brasil — Fase 8 (antifraude): trava de quilometragem
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente: pode ser executado novamente com segurança.
-- ============================================================

-- O km de um veículo NUNCA pode regredir. Se uma atualização tentar
-- reduzir o km, o valor anterior (maior) é mantido — bloqueio — e a
-- tentativa é registrada em admin_audit_logs como alerta ao admin.
create or replace function public.guard_vehicle_mileage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mileage is not null and old.mileage is not null
     and new.mileage < old.mileage then
    insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata_json)
    values (
      auth.uid(),
      'km_regressao_bloqueada',
      'vehicle',
      old.id,
      jsonb_build_object('km_anterior', old.mileage, 'km_tentado', new.mileage)
    );
    new.mileage := old.mileage;   -- bloqueia: mantém o km anterior
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_vehicle_mileage on public.vehicles;
create trigger trg_guard_vehicle_mileage
  before update on public.vehicles
  for each row execute function public.guard_vehicle_mileage();

-- ============================================================
-- Fim — Fase 8 (antifraude: quilometragem).
-- ============================================================
