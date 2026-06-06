-- =====================================================================
-- P4: Adicionais opcionais no schema (bookings + rental_requests)
-- ---------------------------------------------------------------------
-- Aplicada via MCP em 2026-06-06. Arquivo aqui é histórico/replay.
-- =====================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS addons_monthly_brl NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addons_period_brl  NUMERIC DEFAULT 0;

ALTER TABLE public.rental_requests
  ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS addons_monthly_brl NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addons_period_brl  NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_addons_gin ON public.bookings USING GIN (addons);
CREATE INDEX IF NOT EXISTS idx_rental_requests_addons_gin ON public.rental_requests USING GIN (addons);

CREATE OR REPLACE VIEW public.vw_admin_addons_revenue AS
SELECT
  b.id AS booking_id,
  b.protocol_number,
  b.client_id,
  b.status,
  b.start_date,
  b.end_date,
  b.monthly_price AS mensalidade_base_brl,
  b.addons_monthly_brl,
  b.addons_period_brl,
  (b.monthly_price + COALESCE(b.addons_monthly_brl, 0)) AS total_mensal_brl,
  b.addons,
  CASE
    WHEN b.start_date IS NOT NULL AND b.end_date IS NOT NULL
    THEN GREATEST(1, ROUND( (b.end_date - b.start_date) / 30.0 ))
    ELSE 1
  END AS meses_aprox
FROM public.bookings b;

ALTER VIEW public.vw_admin_addons_revenue SET (security_invoker = on);
