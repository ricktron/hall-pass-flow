-- Optimize Database Schema Migration
-- 1. First, let's modify the Hall_Passes table to make duration a computed column

-- Drop the existing duration column if it exists
ALTER TABLE public."Hall_Passes" DROP COLUMN IF EXISTS duration;

-- Add a new computed duration column that automatically calculates the difference
-- Duration will be in minutes, and only calculated when timeIn is not null
ALTER TABLE public."Hall_Passes" 
ADD COLUMN duration INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN "timeIn" IS NOT NULL AND "timeOut" IS NOT NULL 
    THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("timeIn" - "timeOut")) / 60.0))::INTEGER
    ELSE NULL 
  END
) STORED;

-- 2. Update the existing get_teacher_dashboard_data function to be more comprehensive
CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SET search_path = 'public'
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
    
    -- Get currently out students with more details
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
    
    -- Get today's comprehensive stats
    WITH today_passes AS (
        SELECT 
            "studentName",
            period,
            "timeOut",
            "timeIn",
            duration
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
                ORDER BY trip_count DESC
            ), '[]'::json)
            FROM student_counts
        ),
        'avgDurationMinutes', (
            SELECT COALESCE(ROUND(AVG(duration::numeric), 1), 0)
            FROM today_passes
            WHERE duration IS NOT NULL
        ),
        'longestDurationMinutes', (
            SELECT COALESCE(MAX(duration), 0)
            FROM today_passes
            WHERE duration IS NOT NULL
        ),
        'totalStudentsOut', (
            SELECT COUNT(DISTINCT "studentName")
            FROM today_passes
        ),
        'returnRate', (
            SELECT CASE 
                WHEN COUNT(*) > 0 
                THEN ROUND((COUNT(*) FILTER (WHERE "timeIn" IS NOT NULL)::numeric / COUNT(*)) * 100, 1)
                ELSE 0 
            END
            FROM today_passes
        )
    ) INTO today_stats;
    
    -- Build final result with enhanced data
    result := json_build_object(
        'currentlyOutStudents', currently_out_students,
        'currentlyOutCount', json_array_length(currently_out_students),
        'todayStats', today_stats,
        'lastUpdated', now()
    );
    
    RETURN result;
END;
$function$;