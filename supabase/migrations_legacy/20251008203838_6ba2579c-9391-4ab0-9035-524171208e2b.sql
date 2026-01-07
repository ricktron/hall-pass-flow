-- Update get_teacher_dashboard_data to show total minutes instead of trip count
CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    result JSON;
    currently_out_students JSON;
    today_stats JSON;
    start_iso TEXT;
    end_iso TEXT;
BEGIN
    -- Get today's bounds in ISO format (Toronto timezone)
    start_iso := (current_date AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    end_iso := ((current_date + interval '1 day') AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
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
    student_minutes AS (
        SELECT "studentName", COALESCE(SUM(duration_minutes), 0) as total_minutes
        FROM today_passes
        WHERE "studentName" IS NOT NULL
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
            FROM student_minutes
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
$function$;