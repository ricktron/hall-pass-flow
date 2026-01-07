-- Optimize Database Schema Migration (Corrected)
-- Work with the actual bathroom_passes table instead of the Hall_Passes view

-- 1. First, let's modify the bathroom_passes table to make duration_min a computed column
-- Drop the existing duration_min column if it exists
ALTER TABLE public.bathroom_passes DROP COLUMN IF EXISTS duration_min;

-- Add a new computed duration column that automatically calculates the difference
-- Duration will be in minutes, and only calculated when timein is not null
ALTER TABLE public.bathroom_passes 
ADD COLUMN duration_min INTEGER GENERATED ALWAYS AS (
  CASE 
    WHEN timein IS NOT NULL AND timeout IS NOT NULL 
    THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (timein - timeout)) / 60.0))::INTEGER
    ELSE NULL 
  END
) STORED;

-- 2. Update the existing get_teacher_dashboard_data function to be more comprehensive
-- and work with the bathroom_passes table directly for better performance
CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_data()
RETURNS json
LANGUAGE plpgsql
SET search_path = 'public'
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
    
    -- Get currently out students with more details
    SELECT COALESCE(json_agg(
        json_build_object(
            'studentName', COALESCE(student_name, raw_student_name, 'Unknown'),
            'period', period,
            'timeOut', timeout,
            'destination', COALESCE(destination, 'Unknown'),
            'minutesOut', CASE 
                WHEN timeout IS NOT NULL 
                THEN CEIL(EXTRACT(EPOCH FROM (now() - timeout)) / 60.0)::INTEGER
                ELSE 0 
            END
        )
        ORDER BY timeout DESC
    ), '[]'::json) INTO currently_out_students
    FROM public.bathroom_passes
    WHERE timein IS NULL;
    
    -- Get today's comprehensive stats
    WITH today_passes AS (
        SELECT 
            COALESCE(student_name, raw_student_name, 'Unknown') as student_name,
            period,
            timeout,
            timein,
            duration_min
        FROM public.bathroom_passes
        WHERE timeout >= start_iso::timestamp with time zone
        AND timeout < end_iso::timestamp with time zone
    ),
    period_counts AS (
        SELECT period, COUNT(*) as count
        FROM today_passes
        WHERE period IS NOT NULL
        GROUP BY period
    ),
    student_counts AS (
        SELECT student_name, COUNT(*) as trip_count
        FROM today_passes
        WHERE student_name IS NOT NULL
        GROUP BY student_name
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
                    'studentName', student_name,
                    'tripCount', trip_count
                )
                ORDER BY trip_count DESC
            ), '[]'::json)
            FROM student_counts
        ),
        'avgDurationMinutes', (
            SELECT COALESCE(ROUND(AVG(duration_min::numeric), 1), 0)
            FROM today_passes
            WHERE duration_min IS NOT NULL
        ),
        'longestDurationMinutes', (
            SELECT COALESCE(MAX(duration_min), 0)
            FROM today_passes
            WHERE duration_min IS NOT NULL
        ),
        'totalStudentsOut', (
            SELECT COUNT(DISTINCT student_name)
            FROM today_passes
            WHERE student_name IS NOT NULL
        ),
        'returnRate', (
            SELECT CASE 
                WHEN COUNT(*) > 0 
                THEN ROUND((COUNT(*) FILTER (WHERE timein IS NOT NULL)::numeric / COUNT(*)) * 100, 1)
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