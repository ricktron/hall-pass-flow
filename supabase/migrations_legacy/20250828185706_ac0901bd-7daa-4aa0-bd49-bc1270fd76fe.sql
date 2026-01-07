-- Create function for weekly heatmap data
CREATE OR REPLACE FUNCTION public.get_weekly_heatmap_data(time_frame_arg text)
RETURNS TABLE(day_of_week text, period text, pass_count bigint)
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        CASE EXTRACT(DOW FROM p.timeout)::INTEGER
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday' 
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
        END AS day_of_week,
        p.period,
        COUNT(p.id)::BIGINT AS pass_count
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = lower(time_frame_arg)
    AND p.timeout IS NOT NULL
    AND p.period IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) BETWEEN 1 AND 5  -- Monday to Friday only
    GROUP BY EXTRACT(DOW FROM p.timeout)::INTEGER, p.period
    ORDER BY EXTRACT(DOW FROM p.timeout)::INTEGER, p.period;
END;
$function$;

-- Create function for schedule type analysis
CREATE OR REPLACE FUNCTION public.get_schedule_type_analysis(time_frame_arg text)
RETURNS TABLE(schedule_type text, total_passes bigint, instructional_minutes integer, passes_per_100_min numeric)
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
    monday_passes BIGINT;
    block_day_passes BIGINT;
    monday_minutes INTEGER := 338;  -- Standard day instructional minutes
    block_day_minutes INTEGER := 1352;  -- Block days total (338 * 4 approximate)
BEGIN
    -- Get Monday passes (Standard Day)
    SELECT COUNT(p.id)::BIGINT INTO monday_passes
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = lower(time_frame_arg)
    AND p.timeout IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) = 1;  -- Monday
    
    -- Get Tuesday-Friday passes (Block Days)
    SELECT COUNT(p.id)::BIGINT INTO block_day_passes
    FROM public.hp_longest_windows p
    WHERE lower(p."window") = lower(time_frame_arg)
    AND p.timeout IS NOT NULL
    AND EXTRACT(DOW FROM p.timeout) BETWEEN 2 AND 5;  -- Tuesday to Friday
    
    -- Return results
    RETURN QUERY
    SELECT 
        'Standard Day (Mon)'::text AS schedule_type,
        COALESCE(monday_passes, 0) AS total_passes,
        monday_minutes AS instructional_minutes,
        CASE WHEN monday_minutes > 0 
             THEN ROUND((COALESCE(monday_passes, 0)::numeric / monday_minutes) * 100, 2)
             ELSE 0::numeric 
        END AS passes_per_100_min
    UNION ALL
    SELECT 
        'Block Days (Tue-Fri)'::text AS schedule_type,
        COALESCE(block_day_passes, 0) AS total_passes,
        block_day_minutes AS instructional_minutes,
        CASE WHEN block_day_minutes > 0 
             THEN ROUND((COALESCE(block_day_passes, 0)::numeric / block_day_minutes) * 100, 2)
             ELSE 0::numeric 
        END AS passes_per_100_min;
END;
$function$;