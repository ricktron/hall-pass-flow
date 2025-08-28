-- Migration to update analytics functions v2

-- 1. Re-define get_analytics_frequent_flyers to ensure avg_minutes_per_trip calculation
CREATE OR REPLACE FUNCTION get_analytics_frequent_flyers(time_frame_arg TEXT)
RETURNS TABLE (
    student_name TEXT,
    passes BIGINT,
    total_minutes BIGINT,
    avg_minutes_per_trip NUMERIC
)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
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
$$;

-- 2. Update get_analytics_by_destination to replace p90 with q1 and q3 percentiles
CREATE OR REPLACE FUNCTION get_analytics_by_destination(time_frame_arg TEXT)
RETURNS TABLE (
    destination TEXT,
    passes BIGINT,
    total_minutes BIGINT,
    median_minutes DOUBLE PRECISION,
    q1_minutes DOUBLE PRECISION,
    q3_minutes DOUBLE PRECISION
)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
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

-- 3. Create behavioral insights function for time-based analysis
CREATE OR REPLACE FUNCTION get_behavioral_insights(time_frame_arg TEXT)
RETURNS TABLE (
    insight_type TEXT,
    pass_count BIGINT,
    avg_duration NUMERIC
)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
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
$$;

-- 4. Create passes by day of week function
CREATE OR REPLACE FUNCTION get_passes_by_day_of_week(time_frame_arg TEXT)
RETURNS TABLE (
    day_of_week TEXT,
    pass_count BIGINT
)
LANGUAGE plpgsql
SET search_path TO ''
AS $$
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
$$;