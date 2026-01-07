-- Replace the heatmap calculation in get_full_analytics with improved blue gradient logic
CREATE OR REPLACE FUNCTION public.get_full_analytics(time_frame_arg text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized_frame TEXT;
    result JSONB;
    summary_data JSONB;
    return_rate_data JSONB;
    avg_data JSONB;
    period_data JSONB;
    destination_data JSONB;
    frequent_flyer_data JSONB;
    longest_pass_data JSONB;
    behavioral_data JSONB;
    day_of_week_data JSONB;
    heatmap_data JSONB;
    schedule_data JSONB;
    disruption_scores_data JSONB;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    
    morning_start TIME := '07:55:00';
    morning_end TIME := '09:30:00';
    before_lunch_start TIME := '09:30:00';
    before_lunch_end TIME := '11:05:00';
    after_lunch_start TIME := '13:05:00';
    after_lunch_end TIME := '14:00:00';
    last_period_start TIME := '14:00:00';
    last_period_end TIME := '15:15:00';
    monday_minutes INTEGER := 338;
    block_day_minutes INTEGER := 1352;
BEGIN
    -- Normalize the time frame parameter
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    -- Set time boundaries based on frame
    CASE normalized_frame
        WHEN 'day' THEN
            start_time := date_trunc('day', now());
            end_time := start_time + interval '1 day';
        WHEN 'week' THEN
            start_time := date_trunc('week', now());
            end_time := start_time + interval '1 week';
        WHEN 'month' THEN
            start_time := date_trunc('month', now());
            end_time := start_time + interval '1 month';
        WHEN 'quarter' THEN
            start_time := date_trunc('quarter', now());
            end_time := start_time + interval '3 months';
        ELSE
            -- 'all' case
            start_time := '1900-01-01'::timestamptz;
            end_time := '2100-01-01'::timestamptz;
    END CASE;
    
    -- Get summary data (passes and total minutes) - excluding auto-closed passes
    WITH summary_cte AS (
        SELECT 
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_build_object(
        'passes', s.passes,
        'total_minutes', s.total_minutes
    )::jsonb INTO summary_data
    FROM summary_cte s;
    
    -- Get return rate data - excluding auto-closed passes
    WITH return_rate_cte AS (
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE timein IS NULL) AS still_out,
            COUNT(*) FILTER (WHERE timein IS NOT NULL) AS returned
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_build_object(
        'return_rate_pct', CASE WHEN r.total > 0 THEN ROUND((r.returned::numeric / r.total) * 100.0, 1) ELSE 0 END,
        'still_out', r.still_out,
        'total', r.total
    )::jsonb INTO return_rate_data
    FROM return_rate_cte r;
    
    -- Get average minutes data - excluding auto-closed passes
    WITH avg_cte AS (
        SELECT
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_build_object(
        'avg_minutes', CASE WHEN a.passes > 0 THEN ROUND(a.total_minutes::numeric / a.passes, 1) ELSE NULL END
    )::jsonb INTO avg_data
    FROM avg_cte a;
    
    -- Get period data - excluding auto-closed passes
    WITH period_cte AS (
        SELECT
            period,
            CASE WHEN period ILIKE 'house%' THEN 'House Small Group'
                 ELSE 'Period ' || period END AS period_label,
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes,
            ROUND(COALESCE(SUM(duration_min), 0)::numeric / NULLIF(COUNT(*), 0), 1) AS avg_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND period IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY period
        ORDER BY passes DESC, period_label
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period_label', p.period_label,
            'passes', p.passes,
            'total_minutes', p.total_minutes,
            'avg_minutes', p.avg_minutes
        )
    ), '[]'::json)::jsonb INTO period_data
    FROM period_cte p;
    
    -- Get destination data - excluding auto-closed passes
    WITH destination_cte AS (
        SELECT
            destination,
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_min) AS median_minutes,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY duration_min) AS q1_minutes,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY duration_min) AS q3_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND destination IS NOT NULL
          AND duration_min IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY destination
        ORDER BY passes DESC
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'destination', d.destination,
            'passes', d.passes,
            'total_minutes', d.total_minutes,
            'median_minutes', COALESCE(d.median_minutes, 0),
            'q1_minutes', COALESCE(d.q1_minutes, 0),
            'q3_minutes', COALESCE(d.q3_minutes, 0)
        )
    ), '[]'::json)::jsonb INTO destination_data
    FROM destination_cte d;
    
    -- Get frequent flyer data - excluding auto-closed passes
    WITH flyer_cte AS (
        SELECT
            student_name,
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes,
            ROUND(COALESCE(SUM(duration_min), 0)::numeric / NULLIF(COUNT(*), 0), 1) AS avg_minutes_per_trip
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND student_name IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY student_name
        ORDER BY passes DESC, total_minutes DESC
        LIMIT 10
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', f.student_name,
            'passes', f.passes,
            'total_minutes', f.total_minutes,
            'avg_minutes_per_trip', f.avg_minutes_per_trip
        )
    ), '[]'::json)::jsonb INTO frequent_flyer_data
    FROM flyer_cte f;
    
    -- Get longest pass data - excluding auto-closed passes
    WITH longest_cte AS (
        SELECT
            student_name,
            period,
            destination,
            duration_min::integer AS duration_minutes,
            timeout,
            timein
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND duration_min IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        ORDER BY duration_min DESC, timeout DESC
        LIMIT 10
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', l.student_name,
            'period', l.period,
            'destination', l.destination,
            'duration_minutes', l.duration_minutes,
            'timeout', l.timeout::text,
            'timein', l.timein::text
        )
    ), '[]'::json)::jsonb INTO longest_pass_data
    FROM longest_cte l;
    
    -- Get behavioral insights data - excluding auto-closed passes
    WITH behavioral_cte AS (
        SELECT
            CASE
                WHEN timeout::TIME BETWEEN morning_start AND morning_end THEN 'Morning'
                WHEN timeout::TIME BETWEEN before_lunch_start AND before_lunch_end THEN 'Before Lunch'
                WHEN timeout::TIME BETWEEN after_lunch_start AND after_lunch_end THEN 'After Lunch'
                WHEN timeout::TIME BETWEEN last_period_start AND last_period_end THEN 'Last Period'
                ELSE NULL
            END AS insight_type,
            duration_min
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND duration_min IS NOT NULL
          AND timeout IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
    ),
    behavioral_grouped AS (
        SELECT
            insight_type,
            COUNT(*) AS pass_count,
            ROUND(AVG(duration_min::numeric), 1) AS avg_duration
        FROM behavioral_cte
        WHERE insight_type IS NOT NULL
        GROUP BY insight_type
        ORDER BY pass_count DESC
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'insight_type', b.insight_type,
            'pass_count', b.pass_count,
            'avg_duration', b.avg_duration
        )
    ), '[]'::json)::jsonb INTO behavioral_data
    FROM behavioral_grouped b;
    
    -- Get day of week data - excluding auto-closed passes
    WITH dow_cte AS (
        SELECT
            CASE EXTRACT(DOW FROM timeout)::INTEGER
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday' 
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
                WHEN 0 THEN 'Sunday'
            END AS day_of_week,
            COUNT(*) AS pass_count
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND timeout IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY EXTRACT(DOW FROM timeout)::INTEGER
        ORDER BY EXTRACT(DOW FROM timeout)::INTEGER
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'day_of_week', d.day_of_week,
            'pass_count', d.pass_count
        )
    ), '[]'::json)::jsonb INTO day_of_week_data
    FROM dow_cte d;
    
    -- NEW: Get heatmap data with blue gradient and bucket calculations
    WITH periods AS (
        SELECT unnest(ARRAY['A','B','C','D','E','F','G','H']) AS period
    ),
    days AS (
        SELECT * FROM (VALUES
            (1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri')
        ) AS d(dow,label)
    ),
    counts AS (
        SELECT
            p.period,
            d.label AS dow_label,
            COALESCE((
                SELECT COUNT(*)
                FROM public.bathroom_passes b
                WHERE TRIM(b.period) = p.period
                  AND EXTRACT(DOW FROM b.timeout)::int = d.dow
                  AND b.timeout >= start_time
                  AND b.timeout < end_time
                  AND COALESCE(b.was_auto_closed, false) = false
            ), 0) AS passes
        FROM periods p
        CROSS JOIN days d
    ),
    q AS (
        SELECT
            COALESCE((percentile_disc(0.20) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 1) AS q20,
            COALESCE((percentile_disc(0.40) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 2) AS q40,
            COALESCE((percentile_disc(0.60) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 3) AS q60,
            COALESCE((percentile_disc(0.80) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 4) AS q80
        FROM counts
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period', c.period,
            'day_of_week', c.dow_label,
            'pass_count', c.passes,
            'bucket', CASE
                WHEN c.passes = 0 THEN 0
                WHEN c.passes <= (SELECT q20 FROM q) THEN 1
                WHEN c.passes <= (SELECT q40 FROM q) THEN 2
                WHEN c.passes <= (SELECT q60 FROM q) THEN 3
                WHEN c.passes <= (SELECT q80 FROM q) THEN 4
                ELSE 5
            END,
            'color_hex', CASE
                WHEN c.passes = 0 THEN '#f5f8ff'
                WHEN c.passes <= (SELECT q20 FROM q) THEN '#dbeafe'
                WHEN c.passes <= (SELECT q40 FROM q) THEN '#bfdbfe'
                WHEN c.passes <= (SELECT q60 FROM q) THEN '#93c5fd'
                WHEN c.passes <= (SELECT q80 FROM q) THEN '#60a5fa'
                ELSE '#2563eb'
            END
        )
        ORDER BY c.period, c.dow_label
    ), '[]'::json)::jsonb INTO heatmap_data
    FROM counts c;
    
    -- Get schedule analysis data - excluding auto-closed passes
    WITH schedule_cte AS (
        SELECT
            COUNT(*) FILTER (WHERE EXTRACT(DOW FROM timeout) = 1) AS monday_passes,
            COUNT(*) FILTER (WHERE EXTRACT(DOW FROM timeout) BETWEEN 2 AND 5) AS block_day_passes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND timeout IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_agg(
        schedule_row
    )::jsonb INTO schedule_data
    FROM (
        SELECT json_build_object(
            'schedule_type', 'Standard Day (Mon)',
            'total_passes', s.monday_passes,
            'instructional_minutes', monday_minutes,
            'passes_per_100_min', CASE WHEN monday_minutes > 0 
                 THEN ROUND((s.monday_passes::numeric / monday_minutes) * 100, 2)
                 ELSE 0::numeric 
            END
        ) AS schedule_row
        FROM schedule_cte s
        UNION ALL
        SELECT json_build_object(
            'schedule_type', 'Block Days (Tue-Fri)',
            'total_passes', s.block_day_passes,
            'instructional_minutes', block_day_minutes,
            'passes_per_100_min', CASE WHEN block_day_minutes > 0 
                 THEN ROUND((s.block_day_passes::numeric / block_day_minutes) * 100, 2)
                 ELSE 0::numeric 
            END
        ) AS schedule_row
        FROM schedule_cte s
    ) schedule_rows;
    
    -- Get disruption scores data
    WITH period_schedule AS (
        SELECT 'A' AS period, '07:55:00'::time AS period_start, '09:10:00'::time AS period_end
        UNION ALL SELECT 'B', '09:15:00'::time, '10:30:00'::time
        UNION ALL SELECT 'C', '10:35:00'::time, '11:50:00'::time
        UNION ALL SELECT 'D', '11:55:00'::time, '13:05:00'::time
        UNION ALL SELECT 'E', '13:10:00'::time, '14:25:00'::time
        UNION ALL SELECT 'F', '14:30:00'::time, '15:45:00'::time
        UNION ALL SELECT 'G', '07:55:00'::time, '09:10:00'::time
        UNION ALL SELECT 'H', '09:15:00'::time, '10:30:00'::time
    ),
    period_zones AS (
        SELECT 
            period,
            period_start,
            period_end,
            period_start AS green_start_1,
            period_start + (period_end - period_start) * 0.2 AS green_end_1,
            period_start + (period_end - period_start) * 0.2 AS red_start,
            period_start + (period_end - period_start) * 0.8 AS red_end,
            period_start + (period_end - period_start) * 0.8 AS green_start_2,
            period_end AS green_end_2
        FROM period_schedule
    ),
    passes_with_scores AS (
        SELECT
            bp.student_name,
            bp.duration_min,
            bp.timeout::time AS timeout_time,
            pz.period,
            CASE
                WHEN bp.timeout::time >= pz.red_start AND bp.timeout::time < pz.red_end 
                THEN bp.duration_min * 3
                ELSE bp.duration_min * 1
            END AS pass_score
        FROM public.bathroom_passes bp
        INNER JOIN period_zones pz ON TRIM(bp.period) = pz.period
        WHERE bp.timeout >= start_time 
          AND bp.timeout < end_time
          AND bp.duration_min IS NOT NULL
          AND bp.student_name IS NOT NULL
          AND COALESCE(bp.was_auto_closed, false) = false
          AND bp.timeout::time >= pz.period_start 
          AND bp.timeout::time < pz.period_end
    ),
    student_disruption_totals AS (
        SELECT
            student_name,
            SUM(pass_score) AS disruption_score
        FROM passes_with_scores
        GROUP BY student_name
        ORDER BY disruption_score DESC
        LIMIT 10
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', sdt.student_name,
            'disruption_score', ROUND(sdt.disruption_score::numeric, 1)
        )
    ), '[]'::json)::jsonb INTO disruption_scores_data
    FROM student_disruption_totals sdt;
    
    -- Build the final result object
    result := json_build_object(
        'summary', summary_data,
        'returnRate', return_rate_data,
        'avg', avg_data,
        'byPeriod', period_data,
        'byDestination', destination_data,
        'frequentFlyers', frequent_flyer_data,
        'longestPasses', longest_pass_data,
        'behavioralInsights', behavioral_data,
        'dayOfWeek', day_of_week_data,
        'heatmap', heatmap_data,
        'scheduleAnalysis', schedule_data,
        'disruptionScores', disruption_scores_data
    )::jsonb;
    
    RETURN result;
END;
$function$;