-- ============================================================
-- Nomade Drive Brasil — Fase 6: automação por km (manutenção)
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente: pode ser executado novamente com segurança.
-- ============================================================

-- Campos de manutenção no veículo.
-- Preenchidos pelo proprietário/admin; usados para os alertas por km.
alter table public.vehicles
  add column if not exists revision_interval_km int default 10000;   -- km entre revisões

alter table public.vehicles
  add column if not exists last_revision_km int;                     -- km do veículo na última revisão

alter table public.vehicles
  add column if not exists tire_life_km int default 40000;           -- vida útil estimada dos pneus (km)

alter table public.vehicles
  add column if not exists tire_baseline_km int;                     -- km do veículo quando os pneus atuais foram instalados

-- As políticas de RLS de "vehicles" (proprietário + admin) já cobrem
-- estas colunas novas — nada mais a fazer.

-- ============================================================
-- Fim — Fase 6.
-- ============================================================
