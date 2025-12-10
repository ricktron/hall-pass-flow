-- Migration: Student metrics windows, grades scaffold, and grade compare view
-- Purpose: Add grades-vs-bathroom analytics end-to-end

-- View: hp_student_metrics_windows
-- Per-student metrics for two scopes ('bathroom', 'all'), windowed by day/week/month/quarter/all.
-- Uses hp_base, which already aliases bathroom_passes.duration_min AS duration.
CREATE OR REPLACE VIEW public.hp_student_metrics_windows AS
WITH now_local AS (
  SELECT (NOW() AT TIME ZONE 'America/Chicago') AS t
),
win AS (
  SELECT 'day'::text AS "window",
         date_trunc('day', t) AS s, date_trunc('day', t) + interval '1 day' AS e FROM now_local
  UNION ALL SELECT 'week',
         date_trunc('week', t),
         date_trunc('week', t) + interval '7 days' FROM now_local
  UNION ALL SELECT 'month',
         date_trunc('month', t),
         date_trunc('month', t) + interval '1 month' FROM now_local
  UNION ALL SELECT 'quarter',
         date_trunc('quarter', t),
         date_trunc('quarter', t) + interval '3 months' FROM now_local
),
all_bounds AS (
  SELECT 'all'::text AS "window",
         COALESCE((SELECT MIN(timeout) FROM public.hp_base),
                  (SELECT t FROM now_local)) AS s,
         (SELECT t FROM now_local) AS e
),
windows AS (
  SELECT * FROM win UNION ALL SELECT * FROM all_bounds
),
base AS (
  SELECT
    lower(b.student_name) AS student_key,
    b.timeout,
    b.duration,
    b.destination
  FROM public.hp_base b
  WHERE b.timeout IS NOT NULL
)
-- bathroom scope
SELECT w.window, 'bathroom'::text AS scope, b.student_key,
       COUNT(*)::int AS passes,
       COALESCE(SUM(b.duration),0)::numeric(10,1) AS total_minutes,
       COALESCE(AVG(b.duration),0)::numeric(10,1) AS avg_minutes
FROM windows w
JOIN base b ON b.timeout >= w.s AND b.timeout < w.e
WHERE b.destination ILIKE ANY(ARRAY['%bath%','%restroom%','%rr%'])
GROUP BY w.window, b.student_key
UNION ALL
-- all scope
SELECT w.window, 'all'::text AS scope, b.student_key,
       COUNT(*)::int AS passes,
       COALESCE(SUM(b.duration),0)::numeric(10,1) AS total_minutes,
       COALESCE(AVG(b.duration),0)::numeric(10,1) AS avg_minutes
FROM windows w
JOIN base b ON b.timeout >= w.s AND b.timeout < w.e
GROUP BY w.window, b.student_key;

-- Scaffold: grades_normalized
-- If you already have a grades table, you can skip this and instead create a view
-- named grades_normalized with the same columns. Otherwise this table gives you
-- a simple import target (CSV or manual upsert).
CREATE TABLE IF NOT EXISTS public.grades_normalized (
  student_key text NOT NULL,     -- lower-cased student display name or your canonical key
  term        text NULL,         -- e.g., 'Q2', 'Fall25', etc.
  course      text NULL,
  avg_grade   numeric(5,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS grades_norm_student_idx ON public.grades_normalized(student_key);
CREATE INDEX IF NOT EXISTS grades_norm_term_idx    ON public.grades_normalized(term);

-- Join view: relates grades to bathroom metrics for easy UI queries
CREATE OR REPLACE VIEW public.hp_grade_compare_windows AS
SELECT
  m.window,
  m.scope,             -- 'bathroom' or 'all'
  m.student_key,
  g.term,
  g.course,
  g.avg_grade,
  m.passes,
  m.total_minutes,
  m.avg_minutes
FROM public.hp_student_metrics_windows m
LEFT JOIN public.grades_normalized g
  ON g.student_key = m.student_key;

-- Optional: quick check counts
-- SELECT window, scope, COUNT(*) FROM public.hp_student_metrics_windows GROUP BY 1,2 ORDER BY 1,2;
-- SELECT COUNT(*) FROM public.hp_grade_compare_windows;
