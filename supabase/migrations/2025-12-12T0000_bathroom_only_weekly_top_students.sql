-- Migration: Bathroom-only weekly top students
-- Updates get_weekly_top_students() to only count bathroom/restroom trips,
-- matching the expected behavior for "This Week's Most Active Students" card.

CREATE OR REPLACE FUNCTION public.get_weekly_top_students()
RETURNS json
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    week_start_iso TIMESTAMPTZ;
    end_iso TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Get this week's start (Monday) in Toronto timezone
    week_start_iso := (date_trunc('week', current_date) AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';

    -- Get current time as end boundary
    end_iso := now();

    -- Get top 5 students with most cumulative bathroom minutes this week
    -- (excluding auto-closed passes, filtering to bathroom/restroom destinations only)
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
          -- Filter to bathroom/restroom destinations only
          AND destination ILIKE ANY(ARRAY['%bath%','%restroom%','%rr%'])
        GROUP BY student_name
        HAVING SUM(duration_min) > 0
        ORDER BY total_minutes DESC
        LIMIT 5
    ) weekly_students;

    RETURN result;
END;
$function$;
