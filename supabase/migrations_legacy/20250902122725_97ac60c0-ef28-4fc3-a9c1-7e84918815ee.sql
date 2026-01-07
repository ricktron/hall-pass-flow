-- Create a consolidated RPC function for teacher dashboard data
CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_data()
RETURNS JSON
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
    result JSON;
    currently_out_students JSON;
    today_stats JSON;
    frequent_flyers JSON;
    start_iso TEXT;
    end_iso TEXT;
BEGIN
    -- Get today's bounds in ISO format (Toronto timezone)
    start_iso := (current_date AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    end_iso := ((current_date + interval '1 day') AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
    -- Get currently out students
    SELECT COALESCE(json_agg(
        json_build_object(
            'studentName', "studentName",
            'period', period,
            'timeOut', "timeOut",
            'destination', COALESCE(destination, 'Unknown')
        )
    ), '[]'::json) INTO currently_out_students
    FROM public."Hall_Passes"
    WHERE "timeIn" IS NULL;
    
    -- Get today's basic stats
    WITH today_passes AS (
        SELECT 
            "studentName",
            period,
            "timeOut",
            "timeIn",
            CASE 
                WHEN "timeIn" IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM ("timeIn" - "timeOut")) / 60.0
                ELSE NULL 
            END as duration_minutes
        FROM public."Hall_Passes"
        WHERE "timeOut" >= start_iso::timestamp with time zone
        AND "timeOut" < end_iso::timestamp with time zone
    ),
    period_counts AS (
        SELECT period, COUNT(*) as count
        FROM today_passes
        GROUP BY period
    ),
    student_counts AS (
        SELECT "studentName", COUNT(*) as trip_count
        FROM today_passes
        GROUP BY "studentName"
        ORDER BY trip_count DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'totalPasses', (SELECT COUNT(*) FROM today_passes),
        'byPeriod', (
            SELECT COALESCE(json_object_agg(period, count), '{}'::json)
            FROM period_counts
        ),
        'topLeavers', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'studentName', "studentName",
                    'tripCount', trip_count
                )
            ), '[]'::json)
            FROM student_counts
        ),
        'avgDurationMinutes', (
            SELECT COALESCE(AVG(duration_minutes), 0)
            FROM today_passes
            WHERE duration_minutes IS NOT NULL
        ),
        'longestDurationMinutes', (
            SELECT COALESCE(MAX(duration_minutes), 0)
            FROM today_passes
            WHERE duration_minutes IS NOT NULL
        )
    ) INTO today_stats;
    
    -- Build final result
    result := json_build_object(
        'currentlyOutStudents', currently_out_students,
        'currentlyOutCount', json_array_length(currently_out_students),
        'todayStats', today_stats
    );
    
    RETURN result;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_teacher_dashboard_data() TO authenticated;