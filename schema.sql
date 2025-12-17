--
-- PostgreSQL database dump
--

\restrict xSgYO9hGro7YS5RvnK6sPfG9zEL0fzI70dZoG7dEriKcweFpKRHd8Dh8BfYAwA2

-- Dumped from database version 15.8
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'Security migration completed: All views set to SECURITY INVOKER, all functions have secure search_path';


--
-- Name: location_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.location_type AS ENUM (
    'classroom',
    'restroom',
    'library',
    'office',
    'other',
    'athletics',
    'hallway',
    'chapel',
    'theater'
);


ALTER TYPE public.location_type OWNER TO postgres;

--
-- Name: pass_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.pass_status AS ENUM (
    'ACTIVE',
    'RETURNED',
    'LATE'
);


ALTER TYPE public.pass_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'student',
    'teacher',
    'admin'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: _bp_copy_student_name(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._bp_copy_student_name() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if new.raw_student_name is null and new.student_name is not null then
    new.raw_student_name := new.student_name;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public._bp_copy_student_name() OWNER TO postgres;

--
-- Name: enforce_period_match(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enforce_period_match() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_roster text;
begin
  if new.student_id is null then
    return new;
  end if;
  select period_code into v_roster from students where id = new.student_id;
  if v_roster is null or new.period_norm is null then
    return new;
  end if;
  if coalesce(new.overrode_period, false) = false and new.period_norm <> v_roster then
    raise exception 'Entered period % does not match roster period % for this student', new.period_norm, v_roster
      using hint = 'Set overrode_period = true and provide override_reason to allow this save.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.enforce_period_match() OWNER TO postgres;

--
-- Name: get_analytics_by_period(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_analytics_by_period(time_frame_arg text) RETURNS TABLE(period text, passes bigint, total_minutes bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT p.period, p.passes, p.minutes_out
    FROM public.hp_by_period_windows p
    WHERE p.window = lower(time_frame_arg);
END;
$$;


ALTER FUNCTION public.get_analytics_by_period(time_frame_arg text) OWNER TO postgres;

--
-- Name: get_analytics_summary(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_analytics_summary(time_frame_arg text) RETURNS TABLE(passes bigint, total_minutes bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT s.passes, s.minutes_out
    FROM public.hp_summary_windows s
    WHERE s.window = lower(time_frame_arg);
END;
$$;


ALTER FUNCTION public.get_analytics_summary(time_frame_arg text) OWNER TO postgres;

--
-- Name: get_full_analytics(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_full_analytics(time_frame_arg text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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
$$;


ALTER FUNCTION public.get_full_analytics(time_frame_arg text) OWNER TO postgres;

--
-- Name: get_teacher_dashboard_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_teacher_dashboard_data() RETURNS json
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    result JSON;
    currently_out_students JSON;
    today_stats JSON;
    start_iso TEXT;
    end_iso TEXT;
    week_start_iso TEXT;
BEGIN
    -- Get today's bounds in ISO format (Toronto timezone)
    start_iso := (current_date AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    end_iso := ((current_date + interval '1 day') AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
    -- Get this week's start (Monday)
    week_start_iso := (date_trunc('week', current_date) AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
    -- Get currently out students with more details (optimized query)
    SELECT COALESCE(json_agg(
        json_build_object(
            'studentName', "studentName",
            'period', period,
            'timeOut', "timeOut",
            'destination', COALESCE(destination, 'Unknown'),
            'minutesOut', CASE 
                WHEN "timeOut" IS NOT NULL 
                THEN CEIL(EXTRACT(EPOCH FROM (now() - "timeOut")) / 60.0)::INTEGER
                ELSE 0 
            END
        )
        ORDER BY "timeOut" DESC
    ), '[]'::json) INTO currently_out_students
    FROM public."Hall_Passes"
    WHERE "timeIn" IS NULL;
    
    -- Get today's comprehensive stats with single query optimization
    WITH today_passes AS (
        SELECT 
            "studentName",
            period,
            "timeOut",
            "timeIn",
            CASE 
                WHEN "timeIn" IS NOT NULL AND "timeOut" IS NOT NULL 
                THEN CEIL(EXTRACT(EPOCH FROM ("timeIn" - "timeOut")) / 60.0)::INTEGER
                ELSE NULL 
            END as duration_minutes
        FROM public."Hall_Passes"
        WHERE "timeOut" >= start_iso::timestamp with time zone
        AND "timeOut" < end_iso::timestamp with time zone
    ),
    aggregated_stats AS (
        SELECT 
            COUNT(*) as total_passes,
            COUNT(DISTINCT "studentName") as unique_students,
            COUNT(*) FILTER (WHERE "timeIn" IS NOT NULL) as returned_passes,
            COALESCE(ROUND(AVG(duration_minutes::numeric), 1), 0) as avg_duration,
            COALESCE(MAX(duration_minutes), 0) as max_duration
        FROM today_passes
    ),
    period_counts AS (
        SELECT period, COUNT(*) as count
        FROM today_passes
        WHERE period IS NOT NULL
        GROUP BY period
    ),
    week_student_minutes AS (
        SELECT 
            "studentName", 
            COALESCE(SUM(
                CASE 
                    WHEN "timeIn" IS NOT NULL AND "timeOut" IS NOT NULL 
                    THEN CEIL(EXTRACT(EPOCH FROM ("timeIn" - "timeOut")) / 60.0)::INTEGER
                    ELSE 0 
                END
            ), 0) as total_minutes
        FROM public."Hall_Passes"
        WHERE "timeOut" >= week_start_iso::timestamp with time zone
        AND "timeOut" < end_iso::timestamp with time zone
        AND "studentName" IS NOT NULL
        GROUP BY "studentName"
        ORDER BY total_minutes DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'totalPasses', agg.total_passes,
        'byPeriod', (
            SELECT COALESCE(json_object_agg(period, count), '{}'::json)
            FROM period_counts
        ),
        'topLeavers', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'studentName', "studentName",
                    'totalMinutes', total_minutes
                )
                ORDER BY total_minutes DESC
            ), '[]'::json)
            FROM week_student_minutes
        ),
        'avgDurationMinutes', agg.avg_duration,
        'longestDurationMinutes', agg.max_duration,
        'totalStudentsOut', agg.unique_students,
        'returnRate', (
            CASE 
                WHEN agg.total_passes > 0 
                THEN ROUND((agg.returned_passes::numeric / agg.total_passes) * 100, 1)
                ELSE 0 
            END
        )
    ) INTO today_stats
    FROM aggregated_stats agg;
    
    -- Build final result with enhanced data structure
    result := json_build_object(
        'currentlyOutStudents', currently_out_students,
        'currentlyOutCount', json_array_length(currently_out_students),
        'todayStats', today_stats,
        'lastUpdated', now(),
        'refreshInterval', 60000
    );
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.get_teacher_dashboard_data() OWNER TO postgres;

--
-- Name: get_weekly_top_students(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_weekly_top_students() RETURNS json
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    week_start_iso TIMESTAMPTZ;
    end_iso TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Get this week's start (Monday) in Toronto timezone
    week_start_iso := (date_trunc('week', current_date) AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
    -- Get current time as end boundary
    end_iso := now();
    
    -- Get top 5 students with most cumulative minutes this week (excluding auto-closed passes)
    SELECT COALESCE(json_agg(
        json_build_object(
            'studentName', student_name,
            'totalMinutes', total_minutes,
            'tripCount', trip_count
        )
        ORDER BY total_minutes DESC
    ), '[]'::json) INTO result
    FROM (
        SELECT 
            student_name,
            COALESCE(SUM(duration_min), 0)::integer as total_minutes,
            COUNT(*)::integer as trip_count
        FROM public.bathroom_passes
        WHERE timeout >= week_start_iso
          AND timeout < end_iso
          AND student_name IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY student_name
        HAVING SUM(duration_min) > 0
        ORDER BY total_minutes DESC
        LIMIT 5
    ) weekly_students;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.get_weekly_top_students() OWNER TO postgres;

--
-- Name: map_student_from_synonym(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.map_student_from_synonym() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF new.student_id IS NULL AND new.raw_student_name IS NOT NULL THEN
    SELECT sns.student_id INTO new.student_id
    FROM public.student_name_synonyms sns
    WHERE sns.raw_input = new.raw_student_name;
  END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION public.map_student_from_synonym() OWNER TO postgres;

--
-- Name: normalize_name(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalize_name(txt text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select trim(regexp_replace(lower(coalesce(txt,'')), '\s+', ' ', 'g'))
$$;


ALTER FUNCTION public.normalize_name(txt text) OWNER TO postgres;

--
-- Name: set_duration_minutes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_duration_minutes() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
  if NEW."timeOut" is not null and NEW."timeIn" is not null then
    NEW."duration" := greatest(
      0,
      ceil(extract(epoch from (NEW."timeIn" - NEW."timeOut")) / 60.0)
    )::int;
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION public.set_duration_minutes() OWNER TO postgres;

--
-- Name: to_local_date_toronto(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.to_local_date_toronto(ts timestamp with time zone) RETURNS date
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
  select (ts at time zone 'America/Toronto')::date
$$;


ALTER FUNCTION public.to_local_date_toronto(ts timestamp with time zone) OWNER TO postgres;

--
-- Name: verify_teacher_pin(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_teacher_pin(pin_to_check text) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    -- Validate input
    IF pin_to_check IS NULL OR LENGTH(pin_to_check) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Simple PIN verification - check if input matches '4311'
    RETURN pin_to_check = '4311';
END;
$$;


ALTER FUNCTION public.verify_teacher_pin(pin_to_check text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Classroom_Arrivals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Classroom_Arrivals" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_name text,
    period text,
    time_in timestamp with time zone DEFAULT now(),
    arrival_reason text
);


ALTER TABLE public."Classroom_Arrivals" OWNER TO postgres;

--
-- Name: bathroom_passes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bathroom_passes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    raw_student_name text,
    student_id uuid,
    period text,
    timeout timestamp with time zone,
    timein timestamp with time zone,
    destination text,
    notes text,
    was_auto_closed boolean DEFAULT false NOT NULL,
    manual_adjust_min numeric,
    manual_adjust_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    period_norm text GENERATED ALWAYS AS (upper(TRIM(BOTH FROM period))) STORED,
    date_local date GENERATED ALWAYS AS (public.to_local_date_toronto(timeout)) STORED,
    duration_min numeric GENERATED ALWAYS AS (
CASE
    WHEN ((timein IS NOT NULL) AND (timeout IS NOT NULL)) THEN (EXTRACT(epoch FROM (timein - timeout)) / 60.0)
    ELSE NULL::numeric
END) STORED,
    pass_status text GENERATED ALWAYS AS (
CASE
    WHEN ((timein IS NULL) AND (timeout IS NOT NULL)) THEN 'out'::text
    WHEN (timein IS NOT NULL) THEN 'returned'::text
    ELSE 'draft'::text
END) STORED,
    overrode_period boolean DEFAULT false NOT NULL,
    override_reason text,
    student_name text,
    classroom text,
    CONSTRAINT ck_duration_nonneg CHECK (((duration_min IS NULL) OR (duration_min >= (0)::numeric)))
);


ALTER TABLE public.bathroom_passes OWNER TO postgres;

--
-- Name: Hall_Passes; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."Hall_Passes" WITH (security_invoker='true') AS
 SELECT bp.id,
    bp.student_name AS "studentName",
    bp.student_id AS "studentId",
    bp.period,
    bp.destination,
    bp.timeout AS "timeOut",
    bp.timein AS "timeIn",
    bp.notes,
    bp.classroom
   FROM public.bathroom_passes bp;


ALTER VIEW public."Hall_Passes" OWNER TO postgres;

--
-- Name: Hall_Passes_api; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public."Hall_Passes_api" WITH (security_invoker='true') AS
 SELECT bp.id,
    bp.timeout AS "timeOut",
    bp.timein AS "timeIn",
    bp.duration_min AS duration,
        CASE
            WHEN (bp.timein IS NULL) THEN true
            ELSE false
        END AS "needsReview",
    bp.student_id AS "studentId",
    bp.student_name AS "studentName",
    bp.period,
    bp.destination,
    split_part(bp.student_name, ' '::text, 1) AS "firstName",
    split_part(bp.student_name, ' '::text, 2) AS "lastName",
    bp.raw_student_name AS "typedName"
   FROM public.bathroom_passes bp;


ALTER VIEW public."Hall_Passes_api" OWNER TO postgres;

--
-- Name: Hall_Passes_deleted_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Hall_Passes_deleted_backup" (
    id uuid,
    "studentName" text,
    "studentId" uuid,
    period text,
    destination text,
    "timeOut" timestamp with time zone,
    "timeIn" timestamp with time zone,
    notes text,
    classroom text
);


ALTER TABLE public."Hall_Passes_deleted_backup" OWNER TO postgres;

--
-- Name: academic_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academic_terms (
    id bigint NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);


ALTER TABLE public.academic_terms OWNER TO postgres;

--
-- Name: academic_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.academic_terms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.academic_terms_id_seq OWNER TO postgres;

--
-- Name: academic_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.academic_terms_id_seq OWNED BY public.academic_terms.id;


--
-- Name: classroom_arrivals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_arrivals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_name text NOT NULL,
    period text NOT NULL,
    time_in timestamp with time zone DEFAULT now() NOT NULL,
    arrival_reason text
);


ALTER TABLE public.classroom_arrivals OWNER TO postgres;

--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classrooms (
    id text NOT NULL,
    teacher_email text
);


ALTER TABLE public.classrooms OWNER TO postgres;

--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id bigint NOT NULL,
    course_code text NOT NULL,
    course_name text
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO postgres;

--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: destinations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.destinations (
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort integer DEFAULT 100 NOT NULL
);


ALTER TABLE public.destinations OWNER TO postgres;

--
-- Name: grades_normalized; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grades_normalized (
    student_key text NOT NULL,
    term text,
    course text,
    avg_grade numeric(5,2) NOT NULL
);


ALTER TABLE public.grades_normalized OWNER TO postgres;

--
-- Name: hall_pass_corrections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hall_pass_corrections (
    pass_id uuid NOT NULL,
    corrected_duration integer NOT NULL,
    corrected_by text,
    corrected_reason text,
    corrected_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.hall_pass_corrections OWNER TO postgres;

--
-- Name: hall_pass_destinations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hall_pass_destinations (
    key text NOT NULL,
    label text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    synonyms text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.hall_pass_destinations OWNER TO postgres;

--
-- Name: hall_passes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hall_passes (
    id bigint NOT NULL,
    student_id uuid NOT NULL,
    issued_by uuid NOT NULL,
    origin_id bigint NOT NULL,
    destination_id bigint NOT NULL,
    time_out timestamp with time zone DEFAULT now() NOT NULL,
    time_in timestamp with time zone,
    status public.pass_status DEFAULT 'ACTIVE'::public.pass_status NOT NULL
);


ALTER TABLE public.hall_passes OWNER TO postgres;

--
-- Name: hall_passes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hall_passes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hall_passes_id_seq OWNER TO postgres;

--
-- Name: hall_passes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hall_passes_id_seq OWNED BY public.hall_passes.id;


--
-- Name: hp_base; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_base WITH (security_invoker='true') AS
 SELECT bathroom_passes.id,
    bathroom_passes.student_name,
    bathroom_passes.period,
    bathroom_passes.timeout,
    bathroom_passes.timein,
    bathroom_passes.duration_min AS duration,
    to_char(bathroom_passes.timeout, 'Day'::text) AS "dayOfWeek",
    bathroom_passes.destination,
    bathroom_passes.overrode_period AS "earlyDismissal",
    bathroom_passes.classroom
   FROM public.bathroom_passes;


ALTER VIEW public.hp_base OWNER TO postgres;

--
-- Name: hp_bathroom_flyers_all; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_bathroom_flyers_all AS
 SELECT b.student_name,
    count(*) AS passes,
    sum(
        CASE
            WHEN (b.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - b.timeout)) / 60.0)
            ELSE (EXTRACT(epoch FROM (b.timein - b.timeout)) / 60.0)
        END) AS total_minutes
   FROM public.hp_base b
  WHERE ((b.destination ~~* '%bath%'::text) OR (b.destination ~~* '%restroom%'::text) OR (b.destination ~~* '%rr%'::text))
  GROUP BY b.student_name;


ALTER VIEW public.hp_bathroom_flyers_all OWNER TO postgres;

--
-- Name: hp_bathroom_trips_current_quarter; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_bathroom_trips_current_quarter AS
 WITH bounds AS (
         SELECT date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS s,
            (date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval) AS e
        )
 SELECT lower(b.student_name) AS student_key,
    b.timeout,
    b.timein,
    b.duration,
    b.destination,
    b.period,
    b.classroom
   FROM public.hp_base b,
    bounds
  WHERE ((b.timeout IS NOT NULL) AND (b.timeout >= bounds.s) AND (b.timeout < bounds.e) AND (b.destination ~~* ANY (ARRAY['%bath%'::text, '%restroom%'::text, '%rr%'::text])));


ALTER VIEW public.hp_bathroom_trips_current_quarter OWNER TO postgres;

--
-- Name: hp_behavior_hourly_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_behavior_hourly_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    (EXTRACT(hour FROM b.t_local))::integer AS hour_24,
    count(*) AS passes
   FROM (win w
     LEFT JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", (EXTRACT(hour FROM b.t_local))
  ORDER BY w."window", ((EXTRACT(hour FROM b.t_local))::integer);


ALTER VIEW public.hp_behavior_hourly_windows OWNER TO postgres;

--
-- Name: hp_by_destination_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_by_destination_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    COALESCE(x.destination, 'Other'::text) AS destination,
    count(*) AS passes,
    (COALESCE(sum(x.duration_min), (0)::numeric))::integer AS minutes_out,
    (percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((x.duration_min)::double precision)))::numeric(10,1) AS median_min,
    (percentile_cont((0.9)::double precision) WITHIN GROUP (ORDER BY ((x.duration_min)::double precision)))::numeric(10,1) AS p90_min
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  GROUP BY w."window", COALESCE(x.destination, 'Other'::text)
  ORDER BY w."window", (count(*)) DESC;


ALTER VIEW public.hp_by_destination_windows OWNER TO postgres;

--
-- Name: hp_by_period_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_by_period_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    x.period,
    count(*) AS passes,
    (COALESCE(sum(x.duration_min), (0)::numeric))::integer AS minutes_out
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  GROUP BY w."window", x.period
  ORDER BY w."window", (count(*)) DESC;


ALTER VIEW public.hp_by_period_windows OWNER TO postgres;

--
-- Name: hp_dayofweek_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_dayofweek_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    to_char(b.t_local, 'Dy'::text) AS dow_short,
    count(*) AS passes
   FROM (win w
     LEFT JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", (to_char(b.t_local, 'Dy'::text))
  ORDER BY w."window", (to_char(b.t_local, 'Dy'::text));


ALTER VIEW public.hp_dayofweek_windows OWNER TO postgres;

--
-- Name: hp_disruption_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_disruption_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    b.student_name,
    count(*) AS passes,
    round(COALESCE(sum(b.duration_min), (0)::numeric), 1) AS minutes_out
   FROM (win w
     JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", b.student_name
  ORDER BY w."window", (round(COALESCE(sum(b.duration_min), (0)::numeric), 1)) DESC, (count(*)) DESC;


ALTER VIEW public.hp_disruption_windows OWNER TO postgres;

--
-- Name: hp_frequent_flyers_bathroom_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_frequent_flyers_bathroom_windows AS
 WITH now_local AS (
         SELECT (now() AT TIME ZONE 'America/Chicago'::text) AS t
        ), win AS (
         SELECT 'day'::text AS "window",
            date_trunc('day'::text, now_local.t) AS s,
            (date_trunc('day'::text, now_local.t) + '1 day'::interval) AS e
           FROM now_local
        UNION ALL
         SELECT 'week'::text,
            date_trunc('week'::text, now_local.t) AS date_trunc,
            (date_trunc('week'::text, now_local.t) + '7 days'::interval)
           FROM now_local
        UNION ALL
         SELECT 'month'::text,
            date_trunc('month'::text, now_local.t) AS date_trunc,
            (date_trunc('month'::text, now_local.t) + '1 mon'::interval)
           FROM now_local
        UNION ALL
         SELECT 'quarter'::text,
            date_trunc('quarter'::text, now_local.t) AS date_trunc,
            (date_trunc('quarter'::text, now_local.t) + '3 mons'::interval)
           FROM now_local
        ), all_bounds AS (
         SELECT 'all'::text AS "window",
            COALESCE(( SELECT min(hp_base.timeout) AS min
                   FROM public.hp_base), (( SELECT now_local.t
                   FROM now_local))::timestamp with time zone) AS s,
            ( SELECT now_local.t
                   FROM now_local) AS e
        )
 SELECT w."window",
    b.student_name,
    (count(*))::integer AS passes,
    (COALESCE(sum(b.duration), (0)::numeric))::numeric(10,1) AS total_minutes,
    (COALESCE(avg(b.duration), (0)::numeric))::numeric(10,1) AS avg_minutes
   FROM (( SELECT win."window",
            win.s,
            win.e
           FROM win
        UNION ALL
         SELECT all_bounds."window",
            all_bounds.s,
            all_bounds.e
           FROM all_bounds) w
     JOIN public.hp_base b ON (((b.timeout >= w.s) AND (b.timeout < w.e))))
  WHERE (b.destination ~~* ANY (ARRAY['%bath%'::text, '%restroom%'::text, '%rr%'::text]))
  GROUP BY w."window", b.student_name;


ALTER VIEW public.hp_frequent_flyers_bathroom_windows OWNER TO postgres;

--
-- Name: hp_frequent_flyers_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_frequent_flyers_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    x.student_name,
    count(*) AS passes,
    (COALESCE(sum(x.duration_min), (0)::numeric))::integer AS minutes_out
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  GROUP BY w."window", x.student_name
  ORDER BY w."window", (count(*)) DESC, ((COALESCE(sum(x.duration_min), (0)::numeric))::integer) DESC;


ALTER VIEW public.hp_frequent_flyers_windows OWNER TO postgres;

--
-- Name: hp_student_metrics_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_student_metrics_windows AS
 WITH now_local AS (
         SELECT (now() AT TIME ZONE 'America/Chicago'::text) AS t
        ), win AS (
         SELECT 'day'::text AS "window",
            date_trunc('day'::text, now_local.t) AS s,
            (date_trunc('day'::text, now_local.t) + '1 day'::interval) AS e
           FROM now_local
        UNION ALL
         SELECT 'week'::text,
            date_trunc('week'::text, now_local.t) AS date_trunc,
            (date_trunc('week'::text, now_local.t) + '7 days'::interval)
           FROM now_local
        UNION ALL
         SELECT 'month'::text,
            date_trunc('month'::text, now_local.t) AS date_trunc,
            (date_trunc('month'::text, now_local.t) + '1 mon'::interval)
           FROM now_local
        UNION ALL
         SELECT 'quarter'::text,
            date_trunc('quarter'::text, now_local.t) AS date_trunc,
            (date_trunc('quarter'::text, now_local.t) + '3 mons'::interval)
           FROM now_local
        ), all_bounds AS (
         SELECT 'all'::text AS "window",
            COALESCE(( SELECT min(hp_base.timeout) AS min
                   FROM public.hp_base), (( SELECT now_local.t
                   FROM now_local))::timestamp with time zone) AS s,
            ( SELECT now_local.t
                   FROM now_local) AS e
        ), windows AS (
         SELECT win."window",
            win.s,
            win.e
           FROM win
        UNION ALL
         SELECT all_bounds."window",
            all_bounds.s,
            all_bounds.e
           FROM all_bounds
        ), base AS (
         SELECT b.id,
            b.student_name,
            b.period,
            b.timeout,
            b.timein,
            b.duration,
            b."dayOfWeek",
            b.destination,
            b."earlyDismissal",
            b.classroom,
            lower(b.student_name) AS student_key
           FROM public.hp_base b
        ), scoped AS (
         SELECT w."window",
            'bathroom'::text AS scope,
            b.student_key,
            (count(*))::integer AS passes,
            (COALESCE(sum(b.duration), (0)::numeric))::numeric(10,1) AS total_minutes,
            (COALESCE(avg(b.duration), (0)::numeric))::numeric(10,1) AS avg_minutes
           FROM (windows w
             JOIN base b ON (((b.timeout >= w.s) AND (b.timeout < w.e))))
          WHERE (b.destination ~~* ANY (ARRAY['%bath%'::text, '%restroom%'::text, '%rr%'::text]))
          GROUP BY w."window", b.student_key
        UNION ALL
         SELECT w."window",
            'all'::text AS scope,
            b.student_key,
            (count(*))::integer AS passes,
            (COALESCE(sum(b.duration), (0)::numeric))::numeric(10,1) AS total_minutes,
            (COALESCE(avg(b.duration), (0)::numeric))::numeric(10,1) AS avg_minutes
           FROM (windows w
             JOIN base b ON (((b.timeout >= w.s) AND (b.timeout < w.e))))
          GROUP BY w."window", b.student_key
        )
 SELECT scoped."window",
    scoped.scope,
    scoped.student_key,
    scoped.passes,
    scoped.total_minutes,
    scoped.avg_minutes
   FROM scoped;


ALTER VIEW public.hp_student_metrics_windows OWNER TO postgres;

--
-- Name: hp_grade_compare_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_grade_compare_windows AS
 SELECT m."window",
    m.scope,
    m.student_key,
    g.term,
    g.course,
    g.avg_grade,
    m.passes,
    m.total_minutes,
    m.avg_minutes
   FROM (public.hp_student_metrics_windows m
     LEFT JOIN public.grades_normalized g ON ((g.student_key = m.student_key)));


ALTER VIEW public.hp_grade_compare_windows OWNER TO postgres;

--
-- Name: hp_grade_compare_with_grades; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_grade_compare_with_grades AS
 SELECT hp_grade_compare_windows."window",
    hp_grade_compare_windows.scope,
    hp_grade_compare_windows.student_key,
    hp_grade_compare_windows.term,
    hp_grade_compare_windows.course,
    hp_grade_compare_windows.avg_grade,
    hp_grade_compare_windows.passes,
    hp_grade_compare_windows.total_minutes,
    hp_grade_compare_windows.avg_minutes
   FROM public.hp_grade_compare_windows
  WHERE (hp_grade_compare_windows.avg_grade IS NOT NULL);


ALTER VIEW public.hp_grade_compare_with_grades OWNER TO postgres;

--
-- Name: hp_grade_corr_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_grade_corr_windows AS
 SELECT c."window",
    c.scope,
    c.term,
    (count(*))::integer AS n,
    corr((c.avg_grade)::double precision, (c.passes)::double precision) AS corr_grade_vs_passes,
    corr((c.avg_grade)::double precision, (c.total_minutes)::double precision) AS corr_grade_vs_minutes,
    regr_slope((c.avg_grade)::double precision, (c.passes)::double precision) AS slope_grade_vs_passes,
    regr_r2((c.avg_grade)::double precision, (c.passes)::double precision) AS r2_grade_vs_passes,
    regr_slope((c.avg_grade)::double precision, (c.total_minutes)::double precision) AS slope_grade_vs_minutes,
    regr_r2((c.avg_grade)::double precision, (c.total_minutes)::double precision) AS r2_grade_vs_minutes
   FROM public.hp_grade_compare_windows c
  WHERE (c.avg_grade IS NOT NULL)
  GROUP BY c."window", c.scope, c.term;


ALTER VIEW public.hp_grade_corr_windows OWNER TO postgres;

--
-- Name: hp_grade_outliers_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_grade_outliers_windows AS
 WITH base AS (
         SELECT c."window",
            c.scope,
            c.term,
            c.student_key,
            (c.avg_grade)::double precision AS avg_grade,
            (COALESCE(c.passes, 0))::double precision AS passes,
            (COALESCE(c.total_minutes, (0)::numeric))::double precision AS total_minutes
           FROM public.hp_grade_compare_windows c
          WHERE (c.avg_grade IS NOT NULL)
        ), z AS (
         SELECT b."window",
            b.scope,
            b.term,
            b.student_key,
            b.avg_grade,
            b.passes,
            b.total_minutes,
            avg(b.avg_grade) OVER (PARTITION BY b."window", b.scope, b.term) AS g_mu,
            stddev_pop(b.avg_grade) OVER (PARTITION BY b."window", b.scope, b.term) AS g_sigma,
            avg(b.passes) OVER (PARTITION BY b."window", b.scope, b.term) AS p_mu,
            stddev_pop(b.passes) OVER (PARTITION BY b."window", b.scope, b.term) AS p_sigma,
            avg(b.total_minutes) OVER (PARTITION BY b."window", b.scope, b.term) AS m_mu,
            stddev_pop(b.total_minutes) OVER (PARTITION BY b."window", b.scope, b.term) AS m_sigma
           FROM base b
        ), scored AS (
         SELECT z."window",
            z.scope,
            z.term,
            z.student_key,
            z.avg_grade,
            z.passes,
            z.total_minutes,
                CASE
                    WHEN (z.g_sigma > (0)::double precision) THEN ((z.avg_grade - z.g_mu) / z.g_sigma)
                    ELSE (0)::double precision
                END AS z_grade,
                CASE
                    WHEN (z.p_sigma > (0)::double precision) THEN ((z.passes - z.p_mu) / z.p_sigma)
                    ELSE (0)::double precision
                END AS z_passes,
                CASE
                    WHEN (z.m_sigma > (0)::double precision) THEN ((z.total_minutes - z.m_mu) / z.m_sigma)
                    ELSE (0)::double precision
                END AS z_minutes
           FROM z
        )
 SELECT scored."window",
    scored.scope,
    scored.term,
    scored.student_key,
    scored.avg_grade,
    scored.passes,
    scored.total_minutes,
    scored.z_grade,
    scored.z_passes,
    scored.z_minutes,
    ((- scored.z_grade) + GREATEST(scored.z_passes, scored.z_minutes)) AS risk_score
   FROM scored;


ALTER VIEW public.hp_grade_outliers_windows OWNER TO postgres;

--
-- Name: hp_heatmap_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_heatmap_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    b.period,
    to_char(b.t_local, 'Dy'::text) AS day,
    count(*) AS passes
   FROM (win w
     JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", b.period, (to_char(b.t_local, 'Dy'::text))
  ORDER BY w."window", b.period, (to_char(b.t_local, 'Dy'::text));


ALTER VIEW public.hp_heatmap_windows OWNER TO postgres;

--
-- Name: hp_longest_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_longest_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    x.student_name,
    x.period,
    x.destination,
    x.duration_min AS duration,
    x.timeout,
    x.timein
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  ORDER BY w."window", x.duration_min DESC, x.timeout DESC;


ALTER VIEW public.hp_longest_windows OWNER TO postgres;

--
-- Name: hp_month_window; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_month_window WITH (security_invoker='true') AS
 SELECT date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS start_ct,
    (date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval) AS end_ct;


ALTER VIEW public.hp_month_window OWNER TO postgres;

--
-- Name: hp_nurse_bathroom_pairs; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_nurse_bathroom_pairs AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.destination,
            hp_base.timeout,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
            lag(hp_base.destination) OVER (PARTITION BY hp_base.student_name ORDER BY hp_base.timeout) AS prev_dest,
            lag(hp_base.timeout) OVER (PARTITION BY hp_base.student_name ORDER BY hp_base.timeout) AS prev_time
           FROM public.hp_base
        )
 SELECT b.student_name,
    b.prev_dest AS first_dest,
    b.destination AS second_dest,
    b.prev_time,
    b.timeout AS curr_time,
    (EXTRACT(epoch FROM (b.timeout - b.prev_time)) / 60.0) AS minutes_between
   FROM b
  WHERE ((b.prev_dest IS NOT NULL) AND (((lower(b.prev_dest) ~~ 'nurse%'::text) AND (lower(b.destination) ~~ 'bath%'::text)) OR ((lower(b.prev_dest) ~~ 'bath%'::text) AND (lower(b.destination) ~~ 'nurse%'::text))) AND ((EXTRACT(epoch FROM (b.timeout - b.prev_time)) >= (0)::numeric) AND (EXTRACT(epoch FROM (b.timeout - b.prev_time)) <= (600)::numeric)));


ALTER VIEW public.hp_nurse_bathroom_pairs OWNER TO postgres;

--
-- Name: hp_quarter_window; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_quarter_window WITH (security_invoker='true') AS
 SELECT date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS start_ct,
    (date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval) AS end_ct;


ALTER VIEW public.hp_quarter_window OWNER TO postgres;

--
-- Name: hp_return_rate_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_return_rate_windows AS
 WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w."window",
            w.start_ct,
            w.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w("window", start_ct, end_ct)
        ), agg AS (
         SELECT w."window",
            count(*) FILTER (WHERE (x.t_local IS NOT NULL)) AS total,
            count(*) FILTER (WHERE ((x.t_local IS NOT NULL) AND (x.timein IS NULL))) AS still_out
           FROM (win w
             LEFT JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
          GROUP BY w."window"
        )
 SELECT agg."window",
    agg.total,
    agg.still_out,
        CASE
            WHEN (agg.total > 0) THEN round((((agg.total - agg.still_out))::numeric / (agg.total)::numeric), 4)
            ELSE (0)::numeric
        END AS pct_returned
   FROM agg
  ORDER BY agg."window";


ALTER VIEW public.hp_return_rate_windows OWNER TO postgres;

--
-- Name: hp_streaks_by_period_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_streaks_by_period_windows AS
 WITH meetings AS (
         SELECT b.student_name,
            b.period,
            (timezone('America/Chicago'::text, b.timeout))::date AS d_local,
            (EXTRACT(dow FROM timezone('America/Chicago'::text, b.timeout)))::integer AS dow
           FROM public.hp_base b
          WHERE (b.timeout IS NOT NULL)
        ), cadence_raw AS (
         SELECT meetings.period,
            sum(((meetings.dow = ANY (ARRAY[1, 3, 5])))::integer) AS cnt_mwf,
            sum(((meetings.dow = ANY (ARRAY[1, 2, 4])))::integer) AS cnt_mtth,
            sum(((meetings.dow <> ALL (ARRAY[1, 2, 4, 3, 5])))::integer) AS cnt_other
           FROM meetings
          GROUP BY meetings.period
        ), cadence AS (
         SELECT cadence_raw.period,
                CASE
                    WHEN (cadence_raw.cnt_mwf > cadence_raw.cnt_mtth) THEN 'M/W/F'::text
                    WHEN (cadence_raw.cnt_mtth > cadence_raw.cnt_mwf) THEN 'M/T/Th'::text
                    ELSE 'Mixed'::text
                END AS cadence
           FROM cadence_raw
        ), filtered AS (
         SELECT m.student_name,
            m.period,
            m.d_local,
            m.dow,
            c.cadence,
            (date_trunc('week'::text, (m.d_local)::timestamp with time zone))::date AS wk
           FROM (meetings m
             JOIN cadence c USING (period))
          WHERE (((c.cadence = 'M/W/F'::text) AND (m.dow = ANY (ARRAY[1, 3, 5]))) OR ((c.cadence = 'M/T/Th'::text) AND (m.dow = ANY (ARRAY[1, 2, 4]))) OR (c.cadence = 'Mixed'::text))
        ), indexed AS (
         SELECT f.student_name,
            f.period,
            f.d_local,
            f.dow,
            f.cadence,
            f.wk,
            (floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer AS week_idx,
                CASE
                    WHEN (f.cadence = 'M/W/F'::text) THEN (((floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer * 3) +
                    CASE
                        WHEN (f.dow = 1) THEN 0
                        WHEN (f.dow = 3) THEN 1
                        WHEN (f.dow = 5) THEN 2
                        ELSE 0
                    END)
                    WHEN (f.cadence = 'M/T/Th'::text) THEN (((floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer * 3) +
                    CASE
                        WHEN (f.dow = 1) THEN 0
                        WHEN (f.dow = 2) THEN 1
                        WHEN (f.dow = 4) THEN 2
                        ELSE 0
                    END)
                    ELSE (((floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer * 5) + f.dow)
                END AS meeting_index
           FROM filtered f
        ), runs AS (
         SELECT indexed.student_name,
            indexed.period,
            indexed.cadence,
            indexed.d_local,
            indexed.meeting_index,
            (indexed.meeting_index - row_number() OVER (PARTITION BY indexed.student_name, indexed.period ORDER BY indexed.meeting_index)) AS grp
           FROM indexed
        ), streaks AS (
         SELECT runs.student_name,
            runs.period,
            runs.cadence,
            min(runs.d_local) AS start_date,
            max(runs.d_local) AS end_date,
            count(*) AS streak_len
           FROM runs
          GROUP BY runs.student_name, runs.period, runs.cadence, runs.grp
        )
 SELECT 'all'::text AS "window",
    streaks.student_name,
    streaks.period,
    streaks.cadence,
    streaks.start_date,
    streaks.end_date,
    streaks.streak_len
   FROM streaks
  WHERE (streaks.streak_len >= 3);


ALTER VIEW public.hp_streaks_by_period_windows OWNER TO postgres;

--
-- Name: hp_summary_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_summary_windows WITH (security_invoker='true') AS
 SELECT 'day'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('day'::text, now()))
  GROUP BY 'day'::text
UNION ALL
 SELECT 'week'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('week'::text, now()))
  GROUP BY 'week'::text
UNION ALL
 SELECT 'month'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('month'::text, now()))
  GROUP BY 'month'::text
UNION ALL
 SELECT 'quarter'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('quarter'::text, now()))
  GROUP BY 'quarter'::text
UNION ALL
 SELECT 'all'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  GROUP BY 'all'::text;


ALTER VIEW public.hp_summary_windows OWNER TO postgres;

--
-- Name: hp_week_window; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_week_window WITH (security_invoker='true') AS
 SELECT date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS start_ct,
    (date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval) AS end_ct;


ALTER VIEW public.hp_week_window OWNER TO postgres;

--
-- Name: hp_windows; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.hp_windows WITH (security_invoker='true') AS
 WITH now_ct AS (
         SELECT (now() AT TIME ZONE 'America/Chicago'::text) AS t
        )
 SELECT 'day'::text AS "window",
    date_trunc('day'::text, now_ct.t) AS start_ct,
    (date_trunc('day'::text, now_ct.t) + '1 day'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'week'::text AS "window",
    date_trunc('week'::text, now_ct.t) AS start_ct,
    (date_trunc('week'::text, now_ct.t) + '7 days'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'month'::text AS "window",
    date_trunc('month'::text, now_ct.t) AS start_ct,
    (date_trunc('month'::text, now_ct.t) + '1 mon'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'quarter'::text AS "window",
    date_trunc('quarter'::text, now_ct.t) AS start_ct,
    (date_trunc('quarter'::text, now_ct.t) + '3 mons'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'all'::text AS "window",
    NULL::timestamp without time zone AS start_ct,
    NULL::timestamp without time zone AS end_ct
   FROM now_ct;


ALTER VIEW public.hp_windows OWNER TO postgres;

--
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id bigint NOT NULL,
    name text NOT NULL,
    type public.location_type,
    user_id uuid
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: period_meta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.period_meta (
    period text NOT NULL,
    start_local time without time zone,
    end_local time without time zone,
    is_after_lunch boolean DEFAULT false,
    is_last_period boolean DEFAULT false
);


ALTER TABLE public.period_meta OWNER TO postgres;

--
-- Name: rosters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rosters (
    id bigint NOT NULL,
    student_id uuid NOT NULL,
    course_id bigint NOT NULL,
    academic_term_id bigint NOT NULL,
    period_code text
);


ALTER TABLE public.rosters OWNER TO postgres;

--
-- Name: rosters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rosters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rosters_id_seq OWNER TO postgres;

--
-- Name: rosters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rosters_id_seq OWNED BY public.rosters.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    setting_name text NOT NULL,
    value text,
    description text
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: student_name_synonyms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_name_synonyms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_input text NOT NULL,
    student_id uuid NOT NULL
);


ALTER TABLE public.student_name_synonyms OWNER TO postgres;

--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id uuid NOT NULL,
    sis_id text,
    grade_level integer
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    role public.user_role NOT NULL,
    nickname text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: academic_terms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_terms ALTER COLUMN id SET DEFAULT nextval('public.academic_terms_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: hall_passes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_passes ALTER COLUMN id SET DEFAULT nextval('public.hall_passes_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: rosters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters ALTER COLUMN id SET DEFAULT nextval('public.rosters_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: Classroom_Arrivals Classroom_Arrivals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Classroom_Arrivals"
    ADD CONSTRAINT "Classroom_Arrivals_pkey" PRIMARY KEY (id);


--
-- Name: academic_terms academic_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_terms
    ADD CONSTRAINT academic_terms_pkey PRIMARY KEY (id);


--
-- Name: bathroom_passes bathroom_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bathroom_passes
    ADD CONSTRAINT bathroom_passes_pkey PRIMARY KEY (id);


--
-- Name: classroom_arrivals classroom_arrivals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_arrivals
    ADD CONSTRAINT classroom_arrivals_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_teacher_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_teacher_email_key UNIQUE (teacher_email);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: destinations destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (name);


--
-- Name: hall_pass_corrections hall_pass_corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_pass_corrections
    ADD CONSTRAINT hall_pass_corrections_pkey PRIMARY KEY (pass_id);


--
-- Name: hall_pass_destinations hall_pass_destinations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_pass_destinations
    ADD CONSTRAINT hall_pass_destinations_pkey PRIMARY KEY (key);


--
-- Name: hall_passes hall_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_passes
    ADD CONSTRAINT hall_passes_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: period_meta period_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_meta
    ADD CONSTRAINT period_meta_pkey PRIMARY KEY (period);


--
-- Name: rosters rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: settings settings_setting_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_setting_name_key UNIQUE (setting_name);


--
-- Name: student_name_synonyms student_name_synonyms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_name_synonyms
    ADD CONSTRAINT student_name_synonyms_pkey PRIMARY KEY (id);


--
-- Name: student_name_synonyms student_name_synonyms_raw_input_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_name_synonyms
    ADD CONSTRAINT student_name_synonyms_raw_input_key UNIQUE (raw_input);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: bathroom_passes_destination_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bathroom_passes_destination_trgm ON public.bathroom_passes USING gin (destination public.gin_trgm_ops);


--
-- Name: bathroom_passes_timeout_period_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bathroom_passes_timeout_period_idx ON public.bathroom_passes USING btree (timeout, period);


--
-- Name: grades_norm_student_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grades_norm_student_idx ON public.grades_normalized USING btree (student_key);


--
-- Name: grades_norm_term_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX grades_norm_term_idx ON public.grades_normalized USING btree (term);


--
-- Name: idx_bathroom_passes_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bathroom_passes_classroom ON public.bathroom_passes USING btree (classroom);


--
-- Name: idx_bathroom_passes_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bathroom_passes_period ON public.bathroom_passes USING btree (period);


--
-- Name: idx_bathroom_passes_timeout; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bathroom_passes_timeout ON public.bathroom_passes USING btree (timeout);


--
-- Name: idx_passes_date_local; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_passes_date_local ON public.bathroom_passes USING btree (date_local);


--
-- Name: idx_passes_period_norm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_passes_period_norm ON public.bathroom_passes USING btree (period_norm);


--
-- Name: idx_passes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_passes_status ON public.bathroom_passes USING btree (pass_status);


--
-- Name: idx_passes_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_passes_student_id ON public.bathroom_passes USING btree (student_id);


--
-- Name: one_open_pass_per_raw_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX one_open_pass_per_raw_name ON public.bathroom_passes USING btree (raw_student_name) WHERE ((student_id IS NULL) AND (raw_student_name IS NOT NULL) AND (timein IS NULL));


--
-- Name: one_open_pass_per_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX one_open_pass_per_student ON public.bathroom_passes USING btree (student_id) WHERE ((student_id IS NOT NULL) AND (timein IS NULL));


--
-- Name: bathroom_passes _bp_copy_student_name_biu; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER _bp_copy_student_name_biu BEFORE INSERT OR UPDATE ON public.bathroom_passes FOR EACH ROW EXECUTE FUNCTION public._bp_copy_student_name();


--
-- Name: bathroom_passes trg_map_student_from_synonym; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_map_student_from_synonym BEFORE INSERT ON public.bathroom_passes FOR EACH ROW EXECUTE FUNCTION public.map_student_from_synonym();


--
-- Name: bathroom_passes fk_bathroom_passes_classroom; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bathroom_passes
    ADD CONSTRAINT fk_bathroom_passes_classroom FOREIGN KEY (classroom) REFERENCES public.classrooms(id);


--
-- Name: hall_passes hall_passes_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_passes
    ADD CONSTRAINT hall_passes_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.locations(id);


--
-- Name: hall_passes hall_passes_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_passes
    ADD CONSTRAINT hall_passes_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: hall_passes hall_passes_origin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_passes
    ADD CONSTRAINT hall_passes_origin_id_fkey FOREIGN KEY (origin_id) REFERENCES public.locations(id);


--
-- Name: hall_passes hall_passes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hall_passes
    ADD CONSTRAINT hall_passes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: locations locations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: rosters rosters_academic_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_academic_term_id_fkey FOREIGN KEY (academic_term_id) REFERENCES public.academic_terms(id) ON DELETE CASCADE;


--
-- Name: rosters rosters_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: rosters rosters_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: students students_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_name_synonyms Allow authenticated full access to synonyms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated full access to synonyms" ON public.student_name_synonyms TO authenticated USING (true) WITH CHECK (true);


--
-- Name: classroom_arrivals Allow authenticated users to delete arrivals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to delete arrivals" ON public.classroom_arrivals FOR DELETE TO authenticated USING (true);


--
-- Name: classroom_arrivals Allow authenticated users to insert arrivals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to insert arrivals" ON public.classroom_arrivals FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: classroom_arrivals Allow authenticated users to select arrivals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to select arrivals" ON public.classroom_arrivals FOR SELECT TO authenticated USING (true);


--
-- Name: classroom_arrivals Allow authenticated users to update arrivals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to update arrivals" ON public.classroom_arrivals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: bathroom_passes Allow kiosk to create new passes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow kiosk to create new passes" ON public.bathroom_passes FOR INSERT TO anon WITH CHECK (true);


--
-- Name: bathroom_passes Allow kiosk to mark a pass as returned; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow kiosk to mark a pass as returned" ON public.bathroom_passes FOR UPDATE TO anon USING ((timein IS NULL)) WITH CHECK (true);


--
-- Name: bathroom_passes Allow kiosk to see all passes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow kiosk to see all passes" ON public.bathroom_passes FOR SELECT TO anon USING (true);


--
-- Name: classroom_arrivals Allow public inserts for sign-ins; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public inserts for sign-ins" ON public.classroom_arrivals FOR INSERT TO anon WITH CHECK (true);


--
-- Name: classroom_arrivals Allow teachers to manage arrivals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow teachers to manage arrivals" ON public.classroom_arrivals TO authenticated USING (true) WITH CHECK (true);


--
-- Name: hall_passes Anyone can create hall passes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can create hall passes" ON public.hall_passes FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: hall_passes Anyone can update hall passes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can update hall passes" ON public.hall_passes FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: academic_terms Anyone can view academic terms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view academic terms" ON public.academic_terms FOR SELECT TO authenticated, anon USING (true);


--
-- Name: hall_passes Anyone can view all hall passes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view all hall passes" ON public.hall_passes FOR SELECT TO authenticated, anon USING (true);


--
-- Name: courses Anyone can view courses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT TO authenticated, anon USING (true);


--
-- Name: locations Anyone can view locations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT TO authenticated, anon USING (true);


--
-- Name: period_meta Anyone can view period_meta; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view period_meta" ON public.period_meta FOR SELECT USING (true);


--
-- Name: settings Anyone can view settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT TO authenticated, anon USING (true);


--
-- Name: classrooms Authenticated full access to classrooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated full access to classrooms" ON public.classrooms TO authenticated USING (true) WITH CHECK (true);


--
-- Name: Hall_Passes_deleted_backup Authenticated users access Hall_Passes_deleted_backup; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users access Hall_Passes_deleted_backup" ON public."Hall_Passes_deleted_backup" USING ((auth.role() = 'authenticated'::text));


--
-- Name: hall_pass_corrections Authenticated users access hall_pass_corrections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users access hall_pass_corrections" ON public.hall_pass_corrections USING ((auth.role() = 'authenticated'::text));


--
-- Name: rosters Authenticated users can delete rosters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can delete rosters" ON public.rosters FOR DELETE TO authenticated USING (true);


--
-- Name: students Authenticated users can delete students; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can delete students" ON public.students FOR DELETE TO authenticated USING (true);


--
-- Name: users Authenticated users can delete users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can delete users" ON public.users FOR DELETE TO authenticated USING (true);


--
-- Name: rosters Authenticated users can insert rosters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert rosters" ON public.rosters FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: students Authenticated users can insert students; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: users Authenticated users can insert users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: rosters Authenticated users can update rosters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update rosters" ON public.rosters FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: students Authenticated users can update students; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update students" ON public.students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: users Authenticated users can update users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update users" ON public.users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: rosters Authenticated users can view all rosters; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all rosters" ON public.rosters FOR SELECT TO authenticated USING (true);


--
-- Name: students Authenticated users can view all students; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all students" ON public.students FOR SELECT TO authenticated USING (true);


--
-- Name: users Authenticated users can view all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all users" ON public.users FOR SELECT TO authenticated USING (true);


--
-- Name: Classroom_Arrivals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public."Classroom_Arrivals" ENABLE ROW LEVEL SECURITY;

--
-- Name: classrooms Deny anonymous access to classrooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Deny anonymous access to classrooms" ON public.classrooms TO anon USING (false);


--
-- Name: bathroom_passes Enable ALL actions for authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enable ALL actions for authenticated users" ON public.bathroom_passes TO authenticated USING (true) WITH CHECK (true);


--
-- Name: Hall_Passes_deleted_backup; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public."Hall_Passes_deleted_backup" ENABLE ROW LEVEL SECURITY;

--
-- Name: academic_terms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

--
-- Name: bathroom_passes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bathroom_passes ENABLE ROW LEVEL SECURITY;

--
-- Name: classroom_arrivals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classroom_arrivals ENABLE ROW LEVEL SECURITY;

--
-- Name: classrooms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: hall_pass_corrections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.hall_pass_corrections ENABLE ROW LEVEL SECURITY;

--
-- Name: hall_passes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.hall_passes ENABLE ROW LEVEL SECURITY;

--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: period_meta; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.period_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: rosters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: student_name_synonyms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.student_name_synonyms ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION _bp_copy_student_name(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._bp_copy_student_name() TO anon;
GRANT ALL ON FUNCTION public._bp_copy_student_name() TO authenticated;
GRANT ALL ON FUNCTION public._bp_copy_student_name() TO service_role;


--
-- Name: FUNCTION enforce_period_match(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enforce_period_match() TO anon;
GRANT ALL ON FUNCTION public.enforce_period_match() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_period_match() TO service_role;


--
-- Name: FUNCTION get_analytics_by_period(time_frame_arg text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_analytics_by_period(time_frame_arg text) TO anon;
GRANT ALL ON FUNCTION public.get_analytics_by_period(time_frame_arg text) TO authenticated;
GRANT ALL ON FUNCTION public.get_analytics_by_period(time_frame_arg text) TO service_role;


--
-- Name: FUNCTION get_analytics_summary(time_frame_arg text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_analytics_summary(time_frame_arg text) TO anon;
GRANT ALL ON FUNCTION public.get_analytics_summary(time_frame_arg text) TO authenticated;
GRANT ALL ON FUNCTION public.get_analytics_summary(time_frame_arg text) TO service_role;


--
-- Name: FUNCTION get_full_analytics(time_frame_arg text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_full_analytics(time_frame_arg text) TO anon;
GRANT ALL ON FUNCTION public.get_full_analytics(time_frame_arg text) TO authenticated;
GRANT ALL ON FUNCTION public.get_full_analytics(time_frame_arg text) TO service_role;


--
-- Name: FUNCTION get_teacher_dashboard_data(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_teacher_dashboard_data() TO anon;
GRANT ALL ON FUNCTION public.get_teacher_dashboard_data() TO authenticated;
GRANT ALL ON FUNCTION public.get_teacher_dashboard_data() TO service_role;


--
-- Name: FUNCTION get_weekly_top_students(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_weekly_top_students() TO anon;
GRANT ALL ON FUNCTION public.get_weekly_top_students() TO authenticated;
GRANT ALL ON FUNCTION public.get_weekly_top_students() TO service_role;


--
-- Name: FUNCTION map_student_from_synonym(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.map_student_from_synonym() TO anon;
GRANT ALL ON FUNCTION public.map_student_from_synonym() TO authenticated;
GRANT ALL ON FUNCTION public.map_student_from_synonym() TO service_role;


--
-- Name: FUNCTION normalize_name(txt text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.normalize_name(txt text) TO anon;
GRANT ALL ON FUNCTION public.normalize_name(txt text) TO authenticated;
GRANT ALL ON FUNCTION public.normalize_name(txt text) TO service_role;


--
-- Name: FUNCTION set_duration_minutes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_duration_minutes() TO anon;
GRANT ALL ON FUNCTION public.set_duration_minutes() TO authenticated;
GRANT ALL ON FUNCTION public.set_duration_minutes() TO service_role;


--
-- Name: FUNCTION to_local_date_toronto(ts timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.to_local_date_toronto(ts timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.to_local_date_toronto(ts timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.to_local_date_toronto(ts timestamp with time zone) TO service_role;


--
-- Name: FUNCTION verify_teacher_pin(pin_to_check text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_teacher_pin(pin_to_check text) TO anon;
GRANT ALL ON FUNCTION public.verify_teacher_pin(pin_to_check text) TO authenticated;
GRANT ALL ON FUNCTION public.verify_teacher_pin(pin_to_check text) TO service_role;


--
-- Name: TABLE "Classroom_Arrivals"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Classroom_Arrivals" TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Classroom_Arrivals" TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Classroom_Arrivals" TO service_role;


--
-- Name: TABLE bathroom_passes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.bathroom_passes TO service_role;
GRANT SELECT,INSERT ON TABLE public.bathroom_passes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.bathroom_passes TO authenticated;


--
-- Name: COLUMN bathroom_passes.timein; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(timein) ON TABLE public.bathroom_passes TO anon;


--
-- Name: TABLE "Hall_Passes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes" TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes" TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes" TO service_role;


--
-- Name: TABLE "Hall_Passes_api"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes_api" TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes_api" TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes_api" TO service_role;


--
-- Name: TABLE "Hall_Passes_deleted_backup"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes_deleted_backup" TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes_deleted_backup" TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public."Hall_Passes_deleted_backup" TO service_role;


--
-- Name: TABLE academic_terms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.academic_terms TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.academic_terms TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.academic_terms TO service_role;


--
-- Name: SEQUENCE academic_terms_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.academic_terms_id_seq TO anon;
GRANT ALL ON SEQUENCE public.academic_terms_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.academic_terms_id_seq TO service_role;


--
-- Name: TABLE classroom_arrivals; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.classroom_arrivals TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.classroom_arrivals TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.classroom_arrivals TO service_role;


--
-- Name: TABLE classrooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.classrooms TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.classrooms TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.classrooms TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.courses TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.courses TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.courses TO service_role;


--
-- Name: SEQUENCE courses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.courses_id_seq TO anon;
GRANT ALL ON SEQUENCE public.courses_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.courses_id_seq TO service_role;


--
-- Name: TABLE destinations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.destinations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.destinations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.destinations TO service_role;


--
-- Name: TABLE grades_normalized; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grades_normalized TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grades_normalized TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grades_normalized TO service_role;


--
-- Name: TABLE hall_pass_corrections; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_pass_corrections TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_pass_corrections TO service_role;


--
-- Name: TABLE hall_pass_destinations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_pass_destinations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_pass_destinations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_pass_destinations TO service_role;


--
-- Name: TABLE hall_passes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_passes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_passes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hall_passes TO service_role;


--
-- Name: SEQUENCE hall_passes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.hall_passes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.hall_passes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.hall_passes_id_seq TO service_role;


--
-- Name: TABLE hp_base; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_base TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_base TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_base TO service_role;


--
-- Name: TABLE hp_bathroom_flyers_all; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_bathroom_flyers_all TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_bathroom_flyers_all TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_bathroom_flyers_all TO service_role;


--
-- Name: TABLE hp_bathroom_trips_current_quarter; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_bathroom_trips_current_quarter TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_bathroom_trips_current_quarter TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_bathroom_trips_current_quarter TO service_role;


--
-- Name: TABLE hp_behavior_hourly_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_behavior_hourly_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_behavior_hourly_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_behavior_hourly_windows TO service_role;


--
-- Name: TABLE hp_by_destination_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_by_destination_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_by_destination_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_by_destination_windows TO service_role;


--
-- Name: TABLE hp_by_period_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_by_period_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_by_period_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_by_period_windows TO service_role;


--
-- Name: TABLE hp_dayofweek_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_dayofweek_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_dayofweek_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_dayofweek_windows TO service_role;


--
-- Name: TABLE hp_disruption_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_disruption_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_disruption_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_disruption_windows TO service_role;


--
-- Name: TABLE hp_frequent_flyers_bathroom_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_frequent_flyers_bathroom_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_frequent_flyers_bathroom_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_frequent_flyers_bathroom_windows TO service_role;


--
-- Name: TABLE hp_frequent_flyers_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_frequent_flyers_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_frequent_flyers_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_frequent_flyers_windows TO service_role;


--
-- Name: TABLE hp_student_metrics_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_student_metrics_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_student_metrics_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_student_metrics_windows TO service_role;


--
-- Name: TABLE hp_grade_compare_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_compare_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_compare_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_compare_windows TO service_role;


--
-- Name: TABLE hp_grade_compare_with_grades; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_compare_with_grades TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_compare_with_grades TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_compare_with_grades TO service_role;


--
-- Name: TABLE hp_grade_corr_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_corr_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_corr_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_corr_windows TO service_role;


--
-- Name: TABLE hp_grade_outliers_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_outliers_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_outliers_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_grade_outliers_windows TO service_role;


--
-- Name: TABLE hp_heatmap_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_heatmap_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_heatmap_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_heatmap_windows TO service_role;


--
-- Name: TABLE hp_longest_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_longest_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_longest_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_longest_windows TO service_role;


--
-- Name: TABLE hp_month_window; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_month_window TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_month_window TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_month_window TO service_role;


--
-- Name: TABLE hp_nurse_bathroom_pairs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_nurse_bathroom_pairs TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_nurse_bathroom_pairs TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_nurse_bathroom_pairs TO service_role;


--
-- Name: TABLE hp_quarter_window; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_quarter_window TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_quarter_window TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_quarter_window TO service_role;


--
-- Name: TABLE hp_return_rate_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_return_rate_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_return_rate_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_return_rate_windows TO service_role;


--
-- Name: TABLE hp_streaks_by_period_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_streaks_by_period_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_streaks_by_period_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_streaks_by_period_windows TO service_role;


--
-- Name: TABLE hp_summary_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_summary_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_summary_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_summary_windows TO service_role;


--
-- Name: TABLE hp_week_window; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_week_window TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_week_window TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_week_window TO service_role;


--
-- Name: TABLE hp_windows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_windows TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_windows TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.hp_windows TO service_role;


--
-- Name: TABLE locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.locations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.locations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.locations TO service_role;


--
-- Name: SEQUENCE locations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.locations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.locations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.locations_id_seq TO service_role;


--
-- Name: TABLE period_meta; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.period_meta TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.period_meta TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.period_meta TO service_role;


--
-- Name: TABLE rosters; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.rosters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.rosters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.rosters TO service_role;


--
-- Name: SEQUENCE rosters_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rosters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.rosters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.rosters_id_seq TO service_role;


--
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.settings TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.settings TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.settings TO service_role;


--
-- Name: SEQUENCE settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.settings_id_seq TO anon;
GRANT ALL ON SEQUENCE public.settings_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.settings_id_seq TO service_role;


--
-- Name: TABLE student_name_synonyms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_name_synonyms TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_name_synonyms TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_name_synonyms TO service_role;


--
-- Name: TABLE students; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.students TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.students TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.students TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict xSgYO9hGro7YS5RvnK6sPfG9zEL0fzI70dZoG7dEriKcweFpKRHd8Dh8BfYAwA2

