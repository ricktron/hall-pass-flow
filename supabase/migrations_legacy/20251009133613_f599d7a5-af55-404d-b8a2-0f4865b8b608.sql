-- MASTER ANALYTICS REBUILD SCRIPT (Final, Comprehensive)
-- This script safely DROPS all old analytics views before recreating
-- every necessary view with the correct schema and security settings.

-- Step 1: Drop all existing analytics views to ensure a clean slate.
DROP VIEW IF EXISTS public.hp_summary_windows CASCADE;
DROP VIEW IF EXISTS public.hp_by_period_windows CASCADE;
DROP VIEW IF EXISTS public.hp_by_destination_windows CASCADE;
DROP VIEW IF EXISTS public.hp_frequent_flyers_windows CASCADE;
DROP VIEW IF EXISTS public.hp_longest_windows CASCADE;
DROP VIEW IF EXISTS public.hp_return_rate_windows CASCADE;
DROP VIEW IF EXISTS public.hp_base CASCADE;


-- Step 2: Recreate the base view with the correct column names from the source table.
CREATE OR REPLACE VIEW public.hp_base WITH (security_invoker=true) AS
SELECT
    id,
    student_name,
    period,
    timeout,
    timein,
    duration_min AS duration,
    to_char(timeout, 'Day') AS "dayOfWeek",
    destination,
    overrode_period AS "earlyDismissal",
    classroom
FROM public.bathroom_passes;


-- Step 3: Recreate all the windowed summary views for analytics.
CREATE OR REPLACE VIEW public.hp_summary_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS window, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('day', now()) GROUP BY 1 UNION ALL
SELECT 'week'::text AS window, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('week', now()) GROUP BY 1 UNION ALL
SELECT 'month'::text AS window, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('month', now()) GROUP BY 1 UNION ALL
SELECT 'quarter'::text AS window, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('quarter', now()) GROUP BY 1 UNION ALL
SELECT 'all'::text AS window, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base GROUP BY 1;

CREATE OR REPLACE VIEW public.hp_by_period_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS window, period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('day', now()) GROUP BY 1, 2 UNION ALL
SELECT 'week'::text AS window, period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('week', now()) GROUP BY 1, 2 UNION ALL
SELECT 'month'::text AS window, period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('month', now()) GROUP BY 1, 2 UNION ALL
SELECT 'quarter'::text AS window, period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('quarter', now()) GROUP BY 1, 2 UNION ALL
SELECT 'all'::text AS window, period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.hp_by_destination_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS window, destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min, percentile_cont(0.9) WITHIN GROUP (ORDER BY duration) AS p90_min FROM hp_base WHERE timeout >= date_trunc('day', now()) GROUP BY 1, 2 UNION ALL
SELECT 'week'::text AS window, destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min, percentile_cont(0.9) WITHIN GROUP (ORDER BY duration) AS p90_min FROM hp_base WHERE timeout >= date_trunc('week', now()) GROUP BY 1, 2 UNION ALL
SELECT 'month'::text AS window, destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min, percentile_cont(0.9) WITHIN GROUP (ORDER BY duration) AS p90_min FROM hp_base WHERE timeout >= date_trunc('month', now()) GROUP BY 1, 2 UNION ALL
SELECT 'quarter'::text AS window, destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min, percentile_cont(0.9) WITHIN GROUP (ORDER BY duration) AS p90_min FROM hp_base WHERE timeout >= date_trunc('quarter', now()) GROUP BY 1, 2 UNION ALL
SELECT 'all'::text AS window, destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min, percentile_cont(0.9) WITHIN GROUP (ORDER BY duration) AS p90_min FROM hp_base GROUP BY 1, 2;


-- Step 4: Grant permissions on all the new views to the authenticated (teacher) role.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;