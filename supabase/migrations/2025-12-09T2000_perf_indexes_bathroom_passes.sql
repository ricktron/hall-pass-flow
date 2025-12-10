-- Enable trigram for ILIKE acceleration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Timeout index cleanup - keep the canonical name
DROP INDEX IF EXISTS public.idx_passes_timeout;
CREATE INDEX IF NOT EXISTS idx_bathroom_passes_timeout
  ON public.bathroom_passes ("timeout");

-- Useful single-column indexes
CREATE INDEX IF NOT EXISTS idx_bathroom_passes_period
  ON public.bathroom_passes ("period");

-- Trigram index for destination contains
CREATE INDEX IF NOT EXISTS bathroom_passes_destination_trgm
  ON public.bathroom_passes USING gin ("destination" gin_trgm_ops);
