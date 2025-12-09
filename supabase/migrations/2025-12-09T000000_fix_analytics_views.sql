-- Fix Analytics Views Migration
-- Recreates the five missing views for the Teacher Analytics dashboard.
-- This migration does NOT modify hp_base (which must already exist).
-- All views use timezone('America/Chicago', "timeout")::timestamp for local time calculations.

/*********************** hp_return_rate_windows ***********************/
CREATE OR REPLACE VIEW public.hp_return_rate_windows AS
WITH b AS (
  SELECT *, timezone('America/Chicago', "timeout")::timestamp AS t_local
  FROM public.hp_base
),
win AS (
  SELECT * FROM (
    SELECT 'day'::text AS "window",
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') AS start_ct,
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') + interval '1 day'    AS end_ct
    UNION ALL SELECT 'week',
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago'),
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago') + interval '7 days'
    UNION ALL SELECT 'month',
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago'),
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago') + interval '1 month'
    UNION ALL SELECT 'quarter',
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago'),
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago') + interval '3 months'
    UNION ALL SELECT 'all',
           COALESCE((SELECT MIN(t_local) FROM b),
                    date_trunc('year', now() AT TIME ZONE 'America/Chicago')),
           now() AT TIME ZONE 'America/Chicago'
  ) w
),
agg AS (
  SELECT
    w."window",
    COUNT(x.*)                                AS total,
    COUNT(*) FILTER (WHERE x."timein" IS NULL)  AS still_out
  FROM win w
  LEFT JOIN b x
    ON x.t_local >= w.start_ct AND x.t_local < w.end_ct
  GROUP BY w."window"
)
SELECT
  "window",
  total,
  still_out,
  CASE WHEN total > 0
       THEN ROUND((total - still_out)::numeric / total, 4)
       ELSE 0::numeric
  END AS pct_returned
FROM agg
ORDER BY "window";

/*********************** hp_by_period_windows ***********************/
CREATE OR REPLACE VIEW public.hp_by_period_windows AS
WITH b AS (
  SELECT *, timezone('America/Chicago', "timeout")::timestamp AS t_local
  FROM public.hp_base
),
win AS (
  SELECT * FROM (
    SELECT 'day'::text AS "window",
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') AS start_ct,
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') + interval '1 day'    AS end_ct
    UNION ALL SELECT 'week',
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago'),
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago') + interval '7 days'
    UNION ALL SELECT 'month',
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago'),
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago') + interval '1 month'
    UNION ALL SELECT 'quarter',
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago'),
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago') + interval '3 months'
    UNION ALL SELECT 'all',
           COALESCE((SELECT MIN(t_local) FROM b),
                    date_trunc('year', now() AT TIME ZONE 'America/Chicago')),
           now() AT TIME ZONE 'America/Chicago'
  ) w
)
SELECT
  w."window",
  x.period,
  COUNT(*)                             AS passes,
  COALESCE(SUM(x.duration_min),0)::int AS minutes_out
FROM win w
JOIN b x
  ON x.t_local >= w.start_ct AND x.t_local < w.end_ct
GROUP BY w."window", x.period
ORDER BY w."window", passes DESC;

/*********************** hp_by_destination_windows ***********************/
CREATE OR REPLACE VIEW public.hp_by_destination_windows AS
WITH b AS (
  SELECT *, timezone('America/Chicago', "timeout")::timestamp AS t_local
  FROM public.hp_base
),
win AS (
  SELECT * FROM (
    SELECT 'day'::text AS "window",
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') AS start_ct,
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') + interval '1 day'    AS end_ct
    UNION ALL SELECT 'week',
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago'),
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago') + interval '7 days'
    UNION ALL SELECT 'month',
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago'),
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago') + interval '1 month'
    UNION ALL SELECT 'quarter',
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago'),
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago') + interval '3 months'
    UNION ALL SELECT 'all',
           COALESCE((SELECT MIN(t_local) FROM b),
                    date_trunc('year', now() AT TIME ZONE 'America/Chicago')),
           now() AT TIME ZONE 'America/Chicago'
  ) w
)
SELECT
  w."window",
  COALESCE(x.destination,'Other')                        AS destination,
  COUNT(*)                                               AS passes,
  COALESCE(SUM(x.duration_min),0)::int                   AS minutes_out,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY x.duration_min)::numeric(10,1) AS median_min,
  percentile_cont(0.9) WITHIN GROUP (ORDER BY x.duration_min)::numeric(10,1) AS p90_min
FROM win w
JOIN b x
  ON x.t_local >= w.start_ct AND x.t_local < w.end_ct
GROUP BY w."window", COALESCE(x.destination,'Other')
ORDER BY w."window", passes DESC;

/*********************** hp_frequent_flyers_windows ***********************/
CREATE OR REPLACE VIEW public.hp_frequent_flyers_windows AS
WITH b AS (
  SELECT *, timezone('America/Chicago', "timeout")::timestamp AS t_local
  FROM public.hp_base
),
win AS (
  SELECT * FROM (
    SELECT 'day'::text AS "window",
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') AS start_ct,
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') + interval '1 day'    AS end_ct
    UNION ALL SELECT 'week',
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago'),
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago') + interval '7 days'
    UNION ALL SELECT 'month',
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago'),
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago') + interval '1 month'
    UNION ALL SELECT 'quarter',
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago'),
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago') + interval '3 months'
    UNION ALL SELECT 'all',
           COALESCE((SELECT MIN(t_local) FROM b),
                    date_trunc('year', now() AT TIME ZONE 'America/Chicago')),
           now() AT TIME ZONE 'America/Chicago'
  ) w
)
SELECT
  w."window",
  x.student_name,
  COUNT(*)                             AS passes,
  COALESCE(SUM(x.duration_min),0)::int AS minutes_out
FROM win w
JOIN b x
  ON x.t_local >= w.start_ct AND x.t_local < w.end_ct
GROUP BY w."window", x.student_name
ORDER BY w."window", passes DESC, minutes_out DESC;

/*********************** hp_longest_windows ***********************/
CREATE OR REPLACE VIEW public.hp_longest_windows AS
WITH b AS (
  SELECT *, timezone('America/Chicago', "timeout")::timestamp AS t_local
  FROM public.hp_base
),
win AS (
  SELECT * FROM (
    SELECT 'day'::text AS "window",
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') AS start_ct,
           date_trunc('day',     now() AT TIME ZONE 'America/Chicago') + interval '1 day'    AS end_ct
    UNION ALL SELECT 'week',
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago'),
           date_trunc('week',    now() AT TIME ZONE 'America/Chicago') + interval '7 days'
    UNION ALL SELECT 'month',
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago'),
           date_trunc('month',   now() AT TIME ZONE 'America/Chicago') + interval '1 month'
    UNION ALL SELECT 'quarter',
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago'),
           date_trunc('quarter', now() AT TIME ZONE 'America/Chicago') + interval '3 months'
    UNION ALL SELECT 'all',
           COALESCE((SELECT MIN(t_local) FROM b),
                    date_trunc('year', now() AT TIME ZONE 'America/Chicago')),
           now() AT TIME ZONE 'America/Chicago'
  ) w
)
SELECT
  w."window",
  x.student_name,
  x.period,
  x.destination,
  x.duration_min AS duration,
  x."timeout",
  x."timein"
FROM win w
JOIN b x
  ON x.t_local >= w.start_ct AND x.t_local < w.end_ct
ORDER BY w."window", x.duration_min DESC, x."timeout" DESC;

-- Grant permissions on all views
GRANT SELECT ON public.hp_return_rate_windows TO authenticated;
GRANT SELECT ON public.hp_by_period_windows TO authenticated;
GRANT SELECT ON public.hp_by_destination_windows TO authenticated;
GRANT SELECT ON public.hp_frequent_flyers_windows TO authenticated;
GRANT SELECT ON public.hp_longest_windows TO authenticated;
