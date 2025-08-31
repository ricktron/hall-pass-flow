-- Comprehensive Security Fix Migration
-- This migration secures all tables while maintaining kiosk functionality
-- by allowing full access to authenticated users only

-- 1. Enable Row Level Security on all required tables
ALTER TABLE public.bathroom_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_name_synonyms ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insecure policies that grant public/anon access

-- Drop anon policies from bathroom_passes
DROP POLICY IF EXISTS "anon_select" ON public.bathroom_passes;
DROP POLICY IF EXISTS "anon_insert" ON public.bathroom_passes;
DROP POLICY IF EXISTS "anon_update_timein" ON public.bathroom_passes;

-- Drop existing policies from students (to recreate with proper permissions)
DROP POLICY IF EXISTS "Deny all anonymous access to students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can read students" ON public.students;
DROP POLICY IF EXISTS "Deny insert to students" ON public.students;
DROP POLICY IF EXISTS "Deny update to students" ON public.students;
DROP POLICY IF EXISTS "Deny delete to students" ON public.students;

-- 3. Create secure policies for authenticated users only

-- Bathroom passes - full access for authenticated users
CREATE POLICY "Authenticated full access to bathroom_passes"
ON public.bathroom_passes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Deny all anonymous access to bathroom_passes
CREATE POLICY "Deny anonymous access to bathroom_passes"
ON public.bathroom_passes
FOR ALL
TO anon
USING (false);

-- Classrooms - full access for authenticated users
CREATE POLICY "Authenticated full access to classrooms"
ON public.classrooms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Deny all anonymous access to classrooms
CREATE POLICY "Deny anonymous access to classrooms"
ON public.classrooms
FOR ALL
TO anon
USING (false);

-- Students - full access for authenticated users
CREATE POLICY "Authenticated full access to students"
ON public.students
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Deny all anonymous access to students
CREATE POLICY "Deny anonymous access to students"
ON public.students
FOR ALL
TO anon
USING (false);

-- Student name synonyms - full access for authenticated users
CREATE POLICY "Authenticated full access to student_name_synonyms"
ON public.student_name_synonyms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Deny all anonymous access to student_name_synonyms
CREATE POLICY "Deny anonymous access to student_name_synonyms"
ON public.student_name_synonyms
FOR ALL
TO anon
USING (false);

-- 4. Fix functions with mutable search paths by setting secure search path
-- Update existing functions to use secure search path

CREATE OR REPLACE FUNCTION public.get_analytics_by_period(time_frame_arg text)
 RETURNS TABLE(period text, period_label text, passes bigint, total_minutes bigint, avg_minutes numeric)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_summary(time_frame_arg text)
 RETURNS TABLE(passes bigint, total_minutes bigint)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
    normalized_frame TEXT;
BEGIN
    -- Normalize the time frame input
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT 
        COALESCE(s.passes, 0) AS passes,
        COALESCE(s.minutes_out, 0)::bigint AS total_minutes
    FROM (SELECT normalized_frame AS k) tf
    LEFT JOIN public.hp_summary_windows s
        ON lower(s."window") = tf.k;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_return_rate(time_frame_arg text)
 RETURNS TABLE(return_rate_pct numeric, still_out bigint, total bigint)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_avg_minutes(time_frame_arg text)
 RETURNS TABLE(avg_minutes numeric)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_longest_passes(time_frame_arg text)
 RETURNS TABLE(student_name text, period text, destination text, duration_minutes integer, timeout timestamp with time zone, timein timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        lp.student_name,
        lp.period,
        lp.destination,
        lp.duration AS duration_minutes,
        lp.timeout,
        lp.timein
    FROM public.hp_longest_windows lp
    WHERE lower(lp."window") = normalized_frame
    ORDER BY lp.duration DESC, lp.timeout DESC
    LIMIT 10;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_frequent_flyers(time_frame_arg text)
 RETURNS TABLE(student_name text, passes bigint, total_minutes bigint, avg_minutes_per_trip numeric)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        flyers.student_name,
        flyers.passes,
        flyers.minutes_out AS total_minutes,
        ROUND(flyers.minutes_out::numeric / NULLIF(flyers.passes, 0), 1) AS avg_minutes_per_trip
    FROM public.hp_frequent_flyers_windows AS flyers
    WHERE lower(flyers."window") = lower(time_frame_arg)
    ORDER BY flyers.passes DESC, flyers.minutes_out DESC
    LIMIT 10;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_passes_by_day_of_week(time_frame_arg text)
 RETURNS TABLE(day_of_week text, pass_count bigint)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
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
    WHERE lower(p."window") = lower(time_frame_arg)
    AND p.timeout IS NOT NULL
    GROUP BY EXTRACT(DOW FROM p.timeout)::INTEGER
    ORDER BY EXTRACT(DOW FROM p.timeout)::INTEGER;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_behavioral_insights(time_frame_arg text)
 RETURNS TABLE(insight_type text, pass_count bigint, avg_duration numeric)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
    -- Define time windows based on school schedule
    morning_start TIME := '07:55:00';
    morning_end TIME := '09:30:00';
    before_lunch_start TIME := '09:30:00';
    before_lunch_end TIME := '11:05:00';
    after_lunch_start TIME := '13:05:00';
    after_lunch_end TIME := '14:00:00';
    last_period_start TIME := '14:00:00';
    last_period_end TIME := '15:15:00';
BEGIN
    RETURN QUERY
    WITH passes_in_window AS (
        SELECT
            p.id,
            p.timeout::TIME AS pass_time,
            p.duration
        FROM public.hp_longest_windows p
        WHERE lower(p."window") = lower(time_frame_arg) 
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
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_by_destination(time_frame_arg text)
 RETURNS TABLE(destination text, passes bigint, total_minutes bigint, median_minutes double precision, q1_minutes double precision, q3_minutes double precision)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    RETURN QUERY
    WITH destination_passes AS (
        SELECT
            bd.destination,
            bd.passes,
            bd.minutes_out AS total_minutes,
            bd.median_min AS median_minutes
        FROM public.hp_by_destination_windows bd
        WHERE lower(bd."window") = lower(time_frame_arg)
    ),
    pass_durations AS (
        SELECT
            p.destination,
            p.duration
        FROM public.hp_longest_windows p
        WHERE lower(p."window") = lower(time_frame_arg) 
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
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_heatmap_data(time_frame_arg text)
 RETURNS TABLE(day_of_week text, period text, pass_count bigint)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
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
    WHERE lower(p."window") = lower(time_frame_arg)
    AND p.timeout IS NOT NULL
    AND p.period IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) BETWEEN 1 AND 5  -- Monday to Friday only
    GROUP BY EXTRACT(DOW FROM p.timeout)::INTEGER, p.period
    ORDER BY EXTRACT(DOW FROM p.timeout)::INTEGER, p.period;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_schedule_type_analysis(time_frame_arg text)
 RETURNS TABLE(schedule_type text, total_passes bigint, instructional_minutes integer, passes_per_100_min numeric)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
    monday_passes BIGINT;
    block_day_passes BIGINT;
    monday_minutes INTEGER := 338;  -- Standard day instructional minutes
    block_day_minutes INTEGER := 1352;  -- Block days total (338 * 4 approximate)
BEGIN
    -- Get Monday passes (Standard Day)
    SELECT COUNT(p.id)::BIGINT INTO monday_passes
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = lower(time_frame_arg)
    AND p.timeout IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) = 1;  -- Monday
    
    -- Get Tuesday-Friday passes (Block Days)
    SELECT COUNT(p.id)::BIGINT INTO block_day_passes
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = lower(time_frame_arg)
    AND p.timeout IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) BETWEEN 2 AND 5;  -- Tuesday to Friday
    
    -- Return results
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
$function$;