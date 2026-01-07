-- Create dedicated analytics functions to replace generic exec_sql calls
-- This eliminates SQL injection vulnerabilities

-- Function 1: Get analytics summary (passes and total minutes)
CREATE OR REPLACE FUNCTION get_analytics_summary(time_frame_arg TEXT)
RETURNS TABLE(passes BIGINT, total_minutes BIGINT)
LANGUAGE plpgsql
AS $$
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
$$;

-- Function 2: Get analytics return rate
CREATE OR REPLACE FUNCTION get_analytics_return_rate(time_frame_arg TEXT)
RETURNS TABLE(return_rate_pct NUMERIC, still_out BIGINT, total BIGINT)
LANGUAGE plpgsql
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

-- Function 3: Get analytics average minutes
CREATE OR REPLACE FUNCTION get_analytics_avg_minutes(time_frame_arg TEXT)
RETURNS TABLE(avg_minutes NUMERIC)
LANGUAGE plpgsql
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

-- Function 4: Get analytics by period
CREATE OR REPLACE FUNCTION get_analytics_by_period(time_frame_arg TEXT)
RETURNS TABLE(
    period TEXT,
    period_label TEXT,
    passes BIGINT,
    total_minutes BIGINT,
    avg_minutes NUMERIC
)
LANGUAGE plpgsql
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

-- Function 5: Get analytics by destination
CREATE OR REPLACE FUNCTION get_analytics_by_destination(time_frame_arg TEXT)
RETURNS TABLE(
    destination TEXT,
    passes BIGINT,
    total_minutes BIGINT,
    median_minutes DOUBLE PRECISION,
    p90_minutes DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        bd.destination,
        bd.passes,
        bd.minutes_out AS total_minutes,
        bd.median_min AS median_minutes,
        bd.p90_min AS p90_minutes
    FROM public.hp_by_destination_windows bd
    WHERE lower(bd."window") = normalized_frame
    ORDER BY bd.passes DESC;
END;
$$;

-- Function 6: Get analytics frequent flyers
CREATE OR REPLACE FUNCTION get_analytics_frequent_flyers(time_frame_arg TEXT)
RETURNS TABLE(
    student_name TEXT,
    passes BIGINT,
    total_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        ff.student_name,
        ff.passes,
        ff.minutes_out AS total_minutes
    FROM public.hp_frequent_flyers_windows ff
    WHERE lower(ff."window") = normalized_frame
    ORDER BY ff.passes DESC, ff.minutes_out DESC
    LIMIT 10;
END;
$$;

-- Function 7: Get analytics longest passes
CREATE OR REPLACE FUNCTION get_analytics_longest_passes(time_frame_arg TEXT)
RETURNS TABLE(
    student_name TEXT,
    period TEXT,
    destination TEXT,
    duration_minutes INTEGER,
    timeout TIMESTAMP WITH TIME ZONE,
    timein TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
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
        lp.duration AS duration_minutes,
        lp.timeout,
        lp.timein
    FROM public.hp_longest_windows lp
    WHERE lower(lp."window") = normalized_frame
    ORDER BY lp.duration DESC, lp.timeout DESC
    LIMIT 10;
END;
$$;