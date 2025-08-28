-- Migration to enhance analytics functions

-- 1. Modify the get_analytics_frequent_flyers function to include avg_minutes_per_trip
CREATE OR REPLACE FUNCTION get_analytics_frequent_flyers(time_frame_arg TEXT)
RETURNS TABLE (
    student_name TEXT,
    passes BIGINT,
    total_minutes BIGINT,
    avg_minutes_per_trip NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql;

-- 2. Create a new function to get behavioral insights based on time of day
CREATE OR REPLACE FUNCTION get_behavioral_insights(time_frame_arg TEXT)
RETURNS TABLE (
    insight_type TEXT,
    pass_count BIGINT,
    avg_duration NUMERIC
) AS $$
DECLARE
    -- Define time windows based on the provided schedule
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
        WHERE lower(p."window") = lower(time_frame_arg) AND p.duration IS NOT NULL
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
        ROUND(AVG(cp.duration), 1) AS avg_duration
    FROM categorized_passes cp
    WHERE cp.category IS NOT NULL
    GROUP BY cp.category;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a new function to get pass counts by day of the week
CREATE OR REPLACE FUNCTION get_passes_by_day_of_week(time_frame_arg TEXT)
RETURNS TABLE (
    day_of_week TEXT,
    pass_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_char(p.timeout, 'Day') AS day_of_week,
        COUNT(p.id)::BIGINT AS pass_count
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = lower(time_frame_arg)
    GROUP BY day_of_week
    ORDER BY to_char(p.timeout, 'ID'); -- Order by day index (1=Monday)
END;
$$ LANGUAGE plpgsql;