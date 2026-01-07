-- Create view for bathroom trips in the current quarter (America/Chicago timezone)
CREATE OR REPLACE VIEW public.hp_bathroom_trips_current_quarter AS
WITH bounds AS (
  SELECT date_trunc('quarter', (now() AT TIME ZONE 'America/Chicago'))       AS s,
         date_trunc('quarter', (now() AT TIME ZONE 'America/Chicago')) + interval '3 months' AS e
)
SELECT
  lower(b.student_name)                         AS student_key,
  b.timeout,
  b.timein,
  b.duration,
  b.destination,
  b.period,
  b.classroom
FROM public.hp_base b, bounds
WHERE b.timeout IS NOT NULL
  AND b.timeout >= bounds.s AND b.timeout < bounds.e
  AND b.destination ILIKE ANY(ARRAY['%bath%','%restroom%','%rr%']);