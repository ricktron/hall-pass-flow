-- =================================================================
-- COMPLETE ANALYTICS SYSTEM REBUILD - FINAL COMPREHENSIVE RESET (FIXED)
-- This migration completely rebuilds all analytics views and functions
-- Fixes reserved keyword "window" quoting issues
-- =================================================================

-- Step 1: Drop ALL existing analytics objects to ensure clean slate
DROP VIEW IF EXISTS public.hp_summary_windows CASCADE;
DROP VIEW IF EXISTS public.hp_return_rate_windows CASCADE;
DROP VIEW IF EXISTS public.hp_by_period_windows CASCADE;
DROP VIEW IF EXISTS public.hp_by_destination_windows CASCADE;
DROP VIEW IF EXISTS public.hp_frequent_flyers_windows CASCADE;
DROP VIEW IF EXISTS public.hp_longest_windows CASCADE;
DROP VIEW IF EXISTS public.hp_base CASCADE;

-- Drop all analytics functions
DROP FUNCTION IF EXISTS public.get_analytics_summary(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_return_rate(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_by_period(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_by_destination(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_frequent_flyers(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_longest_passes(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_avg_minutes(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_passes_by_day_of_week(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_weekly_heatmap_data(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_behavioral_insights(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_schedule_type_analysis(text) CASCADE;

-- Step 2: Create the base view with correct column mappings
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

-- Step 3: Create all windowed views
CREATE OR REPLACE VIEW public.hp_summary_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS "window", count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('day', now()) 
UNION ALL
SELECT 'week'::text AS "window", count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('week', now()) 
UNION ALL
SELECT 'month'::text AS "window", count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('month', now()) 
UNION ALL
SELECT 'quarter'::text AS "window", count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('quarter', now()) 
UNION ALL
SELECT 'all'::text AS "window", count(*) AS passes, sum(duration) AS minutes_out FROM hp_base;

CREATE OR REPLACE VIEW public.hp_return_rate_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS "window", sum(case when timein is null then 1 else 0 end) as still_out, count(*) as total, sum(case when timein is not null then 1 else 0 end)::decimal / NULLIF(count(*), 0) as pct_returned FROM hp_base WHERE timeout >= date_trunc('day', now()) 
UNION ALL
SELECT 'week'::text AS "window", sum(case when timein is null then 1 else 0 end) as still_out, count(*) as total, sum(case when timein is not null then 1 else 0 end)::decimal / NULLIF(count(*), 0) as pct_returned FROM hp_base WHERE timeout >= date_trunc('week', now()) 
UNION ALL
SELECT 'month'::text AS "window", sum(case when timein is null then 1 else 0 end) as still_out, count(*) as total, sum(case when timein is not null then 1 else 0 end)::decimal / NULLIF(count(*), 0) as pct_returned FROM hp_base WHERE timeout >= date_trunc('month', now()) 
UNION ALL
SELECT 'quarter'::text AS "window", sum(case when timein is null then 1 else 0 end) as still_out, count(*) as total, sum(case when timein is not null then 1 else 0 end)::decimal / NULLIF(count(*), 0) as pct_returned FROM hp_base WHERE timeout >= date_trunc('quarter', now()) 
UNION ALL
SELECT 'all'::text AS "window", sum(case when timein is null then 1 else 0 end) as still_out, count(*) as total, sum(case when timein is not null then 1 else 0 end)::decimal / NULLIF(count(*), 0) as pct_returned FROM hp_base;

CREATE OR REPLACE VIEW public.hp_by_period_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS "window", period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('day', now()) GROUP BY period 
UNION ALL
SELECT 'week'::text AS "window", period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('week', now()) GROUP BY period 
UNION ALL
SELECT 'month'::text AS "window", period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('month', now()) GROUP BY period 
UNION ALL
SELECT 'quarter'::text AS "window", period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('quarter', now()) GROUP BY period 
UNION ALL
SELECT 'all'::text AS "window", period, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base GROUP BY period;

CREATE OR REPLACE VIEW public.hp_by_destination_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS "window", destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min FROM hp_base WHERE timeout >= date_trunc('day', now()) AND destination IS NOT NULL GROUP BY destination
UNION ALL
SELECT 'week'::text AS "window", destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min FROM hp_base WHERE timeout >= date_trunc('week', now()) AND destination IS NOT NULL GROUP BY destination
UNION ALL
SELECT 'month'::text AS "window", destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min FROM hp_base WHERE timeout >= date_trunc('month', now()) AND destination IS NOT NULL GROUP BY destination
UNION ALL
SELECT 'quarter'::text AS "window", destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min FROM hp_base WHERE timeout >= date_trunc('quarter', now()) AND destination IS NOT NULL GROUP BY destination
UNION ALL
SELECT 'all'::text AS "window", destination, count(*) AS passes, sum(duration) AS minutes_out, percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS median_min FROM hp_base WHERE destination IS NOT NULL GROUP BY destination;

CREATE OR REPLACE VIEW public.hp_frequent_flyers_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS "window", student_name, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('day', now') GROUP BY student_name 
UNION ALL
SELECT 'week'::text AS "window", student_name, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('week', now()) GROUP BY student_name 
UNION ALL
SELECT 'month'::text AS "window", student_name, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('month', now()) GROUP BY student_name 
UNION ALL
SELECT 'quarter'::text AS "window", student_name, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base WHERE timeout >= date_trunc('quarter', now()) GROUP BY student_name 
UNION ALL
SELECT 'all'::text AS "window", student_name, count(*) AS passes, sum(duration) AS minutes_out FROM hp_base GROUP BY student_name;

CREATE OR REPLACE VIEW public.hp_longest_windows WITH (security_invoker=true) AS
SELECT 'day'::text AS "window", id, student_name, period, destination, duration, timeout, timein FROM hp_base WHERE timeout >= date_trunc('day', now())
UNION ALL
SELECT 'week'::text AS "window", id, student_name, period, destination, duration, timeout, timein FROM hp_base WHERE timeout >= date_trunc('week', now())
UNION ALL
SELECT 'month'::text AS "window", id, student_name, period, destination, duration, timeout, timein FROM hp_base WHERE timeout >= date_trunc('month', now())
UNION ALL
SELECT 'quarter'::text AS "window", id, student_name, period, destination, duration, timeout, timein FROM hp_base WHERE timeout >= date_trunc('quarter', now())
UNION ALL
SELECT 'all'::text AS "window", id, student_name, period, destination, duration, timeout, timein FROM hp_base;

-- Step 4: Recreate all analytics functions with proper quoting
CREATE OR REPLACE FUNCTION public.get_analytics_summary(time_frame_arg text)
RETURNS TABLE(passes bigint, total_minutes bigint)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT 
        COALESCE(s.passes, 0) AS passes,
        COALESCE(s.minutes_out, 0)::bigint AS total_minutes
    FROM (SELECT normalized_frame AS k) tf
    LEFT JOIN public.hp_summary_windows s
        ON lower(s."window") = tf.k;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_return_rate(time_frame_arg text)
RETURNS TABLE(return_rate_pct numeric, still_out bigint, total bigint)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        ROUND(COALESCE(r.pct_returned, 0) * 100.0, 1) AS return_rate_pct,
        COALESCE(r.still_out, 0) AS still_out,
        COALESCE(r.total, 0) AS total
    FROM (SELECT normalized_frame AS k) tf
    LEFT JOIN public.hp_return_rate_windows r
        ON lower(r."window") = tf.k;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_by_period(time_frame_arg text)
RETURNS TABLE(period text, period_label text, passes bigint, total_minutes bigint, avg_minutes numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        bp.period,
        CASE WHEN bp.period ILIKE 'house%' THEN 'House Small Group'
             ELSE 'Period ' || bp.period END AS period_label,
        bp.passes,
        bp.minutes_out AS total_minutes,
        ROUND(bp.minutes_out::numeric / NULLIF(bp.passes,0), 1) AS avg_minutes
    FROM public.hp_by_period_windows bp
    WHERE lower(bp."window") = normalized_frame
    ORDER BY bp.passes DESC, period_label;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_by_destination(time_frame_arg text)
RETURNS TABLE(destination text, passes bigint, total_minutes bigint, median_minutes double precision, q1_minutes double precision, q3_minutes double precision)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    WITH destination_passes AS (
        SELECT
            bd.destination,
            bd.passes,
            bd.minutes_out AS total_minutes,
            bd.median_min AS median_minutes
        FROM public.hp_by_destination_windows bd
        WHERE lower(bd."window") = normalized_frame
    ),
    pass_durations AS (
        SELECT
            p.destination,
            p.duration
        FROM public.hp_longest_windows p
        WHERE lower(p."window") = normalized_frame 
        AND p.destination IS NOT NULL
        AND p.duration IS NOT NULL
    ),
    percentiles AS (
        SELECT
            pd.destination,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY pd.duration) AS q1_minutes,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY pd.duration) AS q3_minutes
        FROM pass_durations pd
        GROUP BY pd.destination
    )
    SELECT
        dp.destination,
        dp.passes,
        dp.total_minutes,
        dp.median_minutes,
        COALESCE(p.q1_minutes, 0.0) AS q1_minutes,
        COALESCE(p.q3_minutes, 0.0) AS q3_minutes
    FROM destination_passes dp
    LEFT JOIN percentiles p ON dp.destination = p.destination
    ORDER BY dp.passes DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_frequent_flyers(time_frame_arg text)
RETURNS TABLE(student_name text, passes bigint, total_minutes bigint, avg_minutes_per_trip numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        flyers.student_name,
        flyers.passes,
        flyers.minutes_out AS total_minutes,
        ROUND(flyers.minutes_out::numeric / NULLIF(flyers.passes, 0), 1) AS avg_minutes_per_trip
    FROM public.hp_frequent_flyers_windows AS flyers
    WHERE lower(flyers."window") = normalized_frame
    ORDER BY flyers.passes DESC, flyers.minutes_out DESC
    LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_longest_passes(time_frame_arg text)
RETURNS TABLE(student_name text, period text, destination text, duration_minutes integer, timeout timestamp with time zone, timein timestamp with time zone)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        lp.student_name,
        lp.period,
        lp.destination,
        lp.duration::integer AS duration_minutes,
        lp.timeout,
        lp.timein
    FROM public.hp_longest_windows lp
    WHERE lower(lp."window") = normalized_frame
    ORDER BY lp.duration DESC, lp.timeout DESC
    LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_avg_minutes(time_frame_arg text)
RETURNS TABLE(avg_minutes numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    WITH s AS (
        SELECT passes, minutes_out
        FROM public.hp_summary_windows
        WHERE lower("window") = normalized_frame
    )
    SELECT CASE WHEN COALESCE((SELECT passes FROM s),0)=0 THEN NULL
                ELSE ROUND((SELECT minutes_out FROM s)::numeric / (SELECT passes FROM s), 1)
           END AS avg_minutes;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_passes_by_day_of_week(time_frame_arg text)
RETURNS TABLE(day_of_week text, pass_count bigint)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        CASE EXTRACT(DOW FROM p.timeout)::INTEGER
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday' 
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 0 THEN 'Sunday'
        END AS day_of_week,
        COUNT(p.id)::BIGINT AS pass_count
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = normalized_frame
    AND p.timeout IS NOT NULL
    GROUP BY EXTRACT(DOW FROM p.timeout)::INTEGER
    ORDER BY EXTRACT(DOW FROM p.timeout)::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_heatmap_data(time_frame_arg text)
RETURNS TABLE(day_of_week text, period text, pass_count bigint)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        CASE EXTRACT(DOW FROM p.timeout)::INTEGER
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday' 
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
        END AS day_of_week,
        p.period,
        COUNT(p.id)::BIGINT AS pass_count
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = normalized_frame
    AND p.timeout IS NOT NULL
    AND p.period IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) BETWEEN 1 AND 5
    GROUP BY EXTRACT(DOW FROM p.timeout)::INTEGER, p.period
    ORDER BY EXTRACT(DOW FROM p.timeout)::INTEGER, p.period;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_behavioral_insights(time_frame_arg text)
RETURNS TABLE(insight_type text, pass_count bigint, avg_duration numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
    morning_start TIME := '07:55:00';
    morning_end TIME := '09:30:00';
    before_lunch_start TIME := '09:30:00';
    before_lunch_end TIME := '11:05:00';
    after_lunch_start TIME := '13:05:00';
    after_lunch_end TIME := '14:00:00';
    last_period_start TIME := '14:00:00';
    last_period_end TIME := '15:15:00';
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    WITH passes_in_window AS (
        SELECT
            p.id,
            p.timeout::TIME AS pass_time,
            p.duration
        FROM public.hp_longest_windows p
        WHERE lower(p."window") = normalized_frame 
        AND p.duration IS NOT NULL 
        AND p.timeout IS NOT NULL
    ),
    categorized_passes AS (
        SELECT
            CASE
                WHEN p.pass_time BETWEEN morning_start AND morning_end THEN 'Morning'
                WHEN p.pass_time BETWEEN before_lunch_start AND before_lunch_end THEN 'Before Lunch'
                WHEN p.pass_time BETWEEN after_lunch_start AND after_lunch_end THEN 'After Lunch'
                WHEN p.pass_time BETWEEN last_period_start AND last_period_end THEN 'Last Period'
                ELSE NULL
            END AS category,
            p.duration
        FROM passes_in_window p
    )
    SELECT
        cp.category AS insight_type,
        COUNT(cp.duration)::BIGINT AS pass_count,
        ROUND(AVG(cp.duration::numeric), 1) AS avg_duration
    FROM categorized_passes cp
    WHERE cp.category IS NOT NULL
    GROUP BY cp.category
    ORDER BY pass_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_schedule_type_analysis(time_frame_arg text)
RETURNS TABLE(schedule_type text, total_passes bigint, instructional_minutes integer, passes_per_100_min numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    normalized_frame TEXT;
    monday_passes BIGINT;
    block_day_passes BIGINT;
    monday_minutes INTEGER := 338;
    block_day_minutes INTEGER := 1352;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    SELECT COUNT(p.id)::BIGINT INTO monday_passes
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = normalized_frame
    AND p.timeout IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) = 1;
    
    SELECT COUNT(p.id)::BIGINT INTO block_day_passes
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = normalized_frame
    AND p.timeout IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) BETWEEN 2 AND 5;
    
    RETURN QUERY
    SELECT 
        'Standard Day (Mon)'::text AS schedule_type,
        COALESCE(monday_passes, 0) AS total_passes,
        monday_minutes AS instructional_minutes,
        CASE WHEN monday_minutes > 0 
             THEN ROUND((COALESCE(monday_passes, 0)::numeric / monday_minutes) * 100, 2)
             ELSE 0::numeric 
        END AS passes_per_100_min
    UNION ALL
    SELECT 
        'Block Days (Tue-Fri)'::text AS schedule_type,
        COALESCE(block_day_passes, 0) AS total_passes,
        block_day_minutes AS instructional_minutes,
        CASE WHEN block_day_minutes > 0 
             THEN ROUND((COALESCE(block_day_passes, 0)::numeric / block_day_minutes) * 100, 2)
             ELSE 0::numeric 
        END AS passes_per_100_min;
END;
$$;

-- Step 5: Grant all necessary permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;