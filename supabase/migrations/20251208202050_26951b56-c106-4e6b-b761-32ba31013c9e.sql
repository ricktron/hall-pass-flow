-- Create period_meta table for timing/flag information
CREATE TABLE IF NOT EXISTS public.period_meta (
  period text PRIMARY KEY,
  start_local time,
  end_local time,
  is_after_lunch boolean DEFAULT false,
  is_last_period boolean DEFAULT false
);

-- Seed rows with default period times
INSERT INTO public.period_meta(period, start_local, end_local, is_after_lunch, is_last_period) VALUES
  ('A', '07:55:00', '09:10:00', false, false),
  ('B', '09:15:00', '10:30:00', false, false),
  ('C', '10:35:00', '11:50:00', false, false),
  ('D', '11:55:00', '13:05:00', false, false),
  ('E', '13:10:00', '14:25:00', true, false),
  ('F', '14:30:00', '15:45:00', false, true),
  ('G', '07:55:00', '09:10:00', false, false),
  ('H', '09:15:00', '10:30:00', false, false)
ON CONFLICT (period) DO NOTHING;

-- Enable RLS
ALTER TABLE public.period_meta ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read period_meta
CREATE POLICY "Anyone can view period_meta"
ON public.period_meta
FOR SELECT
USING (true);

-- Update get_full_analytics function to include new analytics cards
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
    buddy_leaves_data JSONB;
    bell_edge_data JSONB;
    lunch_friction_data JSONB;
    streak_data JSONB;
    outlier_data JSONB;
    long_trip_data JSONB;
    nurse_detour_data JSONB;
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
    
    -- Set time boundaries based on frame (using America/Chicago timezone)
    CASE normalized_frame
        WHEN 'day' THEN
            start_time := date_trunc('day', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
            end_time := start_time + interval '1 day';
        WHEN 'week' THEN
            start_time := date_trunc('week', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
            end_time := start_time + interval '7 days';
        WHEN 'month' THEN
            start_time := date_trunc('month', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
            end_time := start_time + interval '1 month';
        WHEN 'quarter' THEN
            start_time := date_trunc('quarter', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
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
    
    -- Get heatmap data with blue gradient and bucket calculations
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

    -- Card 1: Buddy Leaves (pairs within 2 min on ≥3 days)
    WITH b AS (
        SELECT student_name, period, timeout::date AS d, timeout
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND student_name IS NOT NULL
    ),
    pairs AS (
        SELECT
            LEAST(a.student_name, bb.student_name) AS s1,
            GREATEST(a.student_name, bb.student_name) AS s2,
            a.period,
            a.d,
            ABS(EXTRACT(EPOCH FROM (a.timeout - bb.timeout))/60.0) AS gap_min
        FROM b a
        JOIN b bb
          ON a.d = bb.d
         AND a.period = bb.period
         AND a.student_name <> bb.student_name
         AND ABS(EXTRACT(EPOCH FROM (a.timeout - bb.timeout))/60.0) <= 2
    ),
    roll AS (
        SELECT s1, s2, period,
               COUNT(DISTINCT d) AS days_together,
               ROUND(AVG(gap_min)::numeric, 1) AS avg_gap_min,
               MAX(d) AS last_seen
        FROM pairs
        GROUP BY s1, s2, period
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_a', s1,
            'student_b', s2,
            'period', period,
            'days', days_together,
            'avg_gap_min', avg_gap_min,
            'last_seen', last_seen::text
        )
        ORDER BY days_together DESC, last_seen DESC
    ), '[]'::json)::jsonb INTO buddy_leaves_data
    FROM roll
    WHERE days_together >= 3
    LIMIT 20;

    -- Card 2: Bell-Edge Leavers (first 5 min / last 10 min of period)
    WITH b AS (
        SELECT bp.*, pm.start_local, pm.end_local
        FROM public.bathroom_passes bp
        JOIN public.period_meta pm ON pm.period = TRIM(bp.period)
        WHERE (start_time IS NULL OR (bp.timeout >= start_time AND bp.timeout < end_time))
          AND COALESCE(bp.was_auto_closed, false) = false
          AND pm.start_local IS NOT NULL AND pm.end_local IS NOT NULL
    ),
    edges AS (
        SELECT
            period,
            COUNT(*) FILTER (
                WHERE timeout::time BETWEEN start_local AND start_local + interval '5 minutes'
            ) AS early_5,
            COUNT(*) FILTER (
                WHERE timeout::time BETWEEN end_local - interval '10 minutes' AND end_local
            ) AS late_10,
            COUNT(*) AS total
        FROM b
        GROUP BY period
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period', period,
            'early_5', early_5,
            'late_10', late_10,
            'total', total,
            'early_pct', ROUND(100.0 * early_5 / NULLIF(total, 0), 1),
            'late_pct', ROUND(100.0 * late_10 / NULLIF(total, 0), 1)
        )
        ORDER BY ROUND(100.0 * late_10 / NULLIF(total, 0), 1) DESC NULLS LAST
    ), '[]'::json)::jsonb INTO bell_edge_data
    FROM edges;

    -- Card 3: Lunch-Transition Friction (first 10 min of after-lunch periods)
    WITH b AS (
        SELECT bp.*, pm.start_local
        FROM public.bathroom_passes bp
        JOIN public.period_meta pm ON pm.period = TRIM(bp.period)
        WHERE (start_time IS NULL OR (bp.timeout >= start_time AND bp.timeout < end_time))
          AND COALESCE(bp.was_auto_closed, false) = false
          AND pm.is_after_lunch = true
          AND pm.start_local IS NOT NULL
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period', period,
            'first_10_min', first_10,
            'total', total,
            'share_pct', ROUND(100.0 * first_10 / NULLIF(total, 0), 1)
        )
        ORDER BY ROUND(100.0 * first_10 / NULLIF(total, 0), 1) DESC NULLS LAST
    ), '[]'::json)::jsonb INTO lunch_friction_data
    FROM (
        SELECT
            period,
            COUNT(*) FILTER (
                WHERE timeout::time BETWEEN start_local AND start_local + interval '10 minutes'
            ) AS first_10,
            COUNT(*) AS total
        FROM b
        GROUP BY period
    ) sub;

    -- Card 4: Streak Detector (N consecutive days with passes)
    WITH b AS (
        SELECT student_name, period, timeout::date AS class_date
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND student_name IS NOT NULL
        GROUP BY student_name, period, timeout::date
    ),
    meet AS (
        SELECT period, class_date
        FROM b
        GROUP BY period, class_date
    ),
    grid AS (
        SELECT m.period, m.class_date, s.student_name,
               CASE WHEN EXISTS (
                   SELECT 1 FROM b bb
                   WHERE bb.period = m.period AND bb.class_date = m.class_date AND bb.student_name = s.student_name
               ) THEN 1 ELSE 0 END AS any_leave
        FROM meet m
        CROSS JOIN (SELECT DISTINCT student_name FROM b) s
    ),
    runs AS (
        SELECT *,
               SUM(CASE WHEN any_leave = 0 THEN 1 ELSE 0 END)
                 OVER (PARTITION BY student_name, period ORDER BY class_date) AS zero_block
        FROM grid
    ),
    streaks AS (
        SELECT student_name, period, class_date,
               SUM(any_leave) OVER (
                   PARTITION BY student_name, period, zero_block
                   ORDER BY class_date
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
               ) AS run_len
        FROM runs
        WHERE any_leave = 1
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', student_name,
            'period', period,
            'max_streak', max_streak
        )
        ORDER BY max_streak DESC
    ), '[]'::json)::jsonb INTO streak_data
    FROM (
        SELECT student_name, period, MAX(run_len) AS max_streak
        FROM streaks
        GROUP BY student_name, period
        HAVING MAX(run_len) >= 3
        LIMIT 50
    ) sub;

    -- Card 5: Personal Outlier Index (robust z-score)
    WITH b AS (
        SELECT * FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND duration_min IS NOT NULL
          AND student_name IS NOT NULL
    ),
    hist AS (
        SELECT student_name, duration_min
        FROM public.bathroom_passes
        WHERE duration_min IS NOT NULL AND student_name IS NOT NULL
    ),
    med AS (
        SELECT student_name,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_min) AS p50
        FROM hist
        GROUP BY student_name
    ),
    mad AS (
        SELECT h.student_name,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY ABS(h.duration_min - m.p50)) AS mad
        FROM hist h
        JOIN med m USING (student_name)
        GROUP BY h.student_name
    ),
    events AS (
        SELECT b.student_name, b.period, b.destination, b.timeout, b.timein, b.duration_min,
               m.p50, a.mad,
               CASE WHEN a.mad = 0 THEN NULL
                    ELSE ROUND((b.duration_min - m.p50)::numeric / (1.4826 * a.mad), 2)
               END AS z_robust
        FROM b
        JOIN med m USING (student_name)
        JOIN mad a USING (student_name)
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', student_name,
            'period', period,
            'destination', destination,
            'duration_min', duration_min,
            'personal_median', ROUND(p50::numeric, 1),
            'z_robust', z_robust,
            'timeout', timeout::text,
            'timein', timein::text
        )
        ORDER BY z_robust DESC
    ), '[]'::json)::jsonb INTO outlier_data
    FROM events
    WHERE z_robust IS NOT NULL AND z_robust >= 2
    LIMIT 50;

    -- Card 6: Long-Trip Share (≥12 min) by student
    WITH b AS (
        SELECT student_name, period, duration_min
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND student_name IS NOT NULL
    ),
    agg AS (
        SELECT student_name,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE duration_min >= 12) AS long_cnt
        FROM b
        GROUP BY student_name
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', student_name,
            'long_count', long_cnt,
            'total', total,
            'share_pct', ROUND(100.0 * long_cnt / NULLIF(total, 0), 1)
        )
        ORDER BY ROUND(100.0 * long_cnt / NULLIF(total, 0), 1) DESC
    ), '[]'::json)::jsonb INTO long_trip_data
    FROM agg
    WHERE total >= 2
    LIMIT 50;

    -- Card 7: Nurse Detour Detector
    WITH base AS (
        SELECT *, 
            CASE
                WHEN destination ILIKE '%nurse%' THEN 'nurse'
                WHEN destination ILIKE '%bath%' OR destination ILIKE '%restroom%' THEN 'bathroom'
                ELSE 'other'
            END AS dest_norm
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
    ),
    seq AS (
        SELECT
            student_name, period, timeout::date AS d, timeout, timein, dest_norm,
            LEAD(timeout) OVER (PARTITION BY student_name, timeout::date ORDER BY timeout) AS next_out,
            LEAD(dest_norm) OVER (PARTITION BY student_name, timeout::date ORDER BY timeout) AS next_dest
        FROM base
    ),
    pairs AS (
        SELECT student_name, period, d,
               dest_norm AS first_dest, next_dest AS second_dest,
               ROUND(EXTRACT(EPOCH FROM (next_out - COALESCE(timein, timeout)))/60.0, 1) AS gap_min
        FROM seq
        WHERE next_out IS NOT NULL
          AND ((dest_norm = 'nurse' AND next_dest = 'bathroom') OR (dest_norm = 'bathroom' AND next_dest = 'nurse'))
          AND (next_out - COALESCE(timein, timeout)) <= interval '10 minutes'
    ),
    hist AS (
        SELECT student_name, duration_min
        FROM public.bathroom_passes
        WHERE destination ILIKE '%nurse%' AND duration_min IS NOT NULL
    ),
    p90 AS (
        SELECT student_name,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_min) AS p90_nurse
        FROM hist
        GROUP BY student_name
    ),
    long_nurse AS (
        SELECT b.student_name, b.period, b.timeout::date AS d, b.duration_min,
               p.p90_nurse
        FROM base b
        JOIN p90 p USING (student_name)
        WHERE b.dest_norm = 'nurse' AND b.duration_min >= p.p90_nurse
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'type', type,
            'student_name', student_name,
            'period', period,
            'date', d::text,
            'pattern', pattern,
            'gap_min', gap_min,
            'duration_min', duration_min
        )
        ORDER BY d DESC, type DESC
    ), '[]'::json)::jsonb INTO nurse_detour_data
    FROM (
        SELECT 'NURSE↔BATH' AS type, student_name, period, d,
               first_dest || '→' || second_dest AS pattern, gap_min, NULL::numeric AS duration_min
        FROM pairs
        UNION ALL
        SELECT 'LONG NURSE', student_name, period, d, 'nurse', NULL, duration_min
        FROM long_nurse
    ) sub
    LIMIT 50;
    
    -- Build the final result object with all 7 new cards
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
        'disruptionScores', disruption_scores_data,
        'buddyLeaves', buddy_leaves_data,
        'bellEdge', bell_edge_data,
        'lunchFriction', lunch_friction_data,
        'streaks', streak_data,
        'outliers', outlier_data,
        'longTrips', long_trip_data,
        'nurseDetour', nurse_detour_data
    )::jsonb;
    
    RETURN result;
END;
$function$;