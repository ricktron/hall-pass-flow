-- Create the missing analytics views that the Teacher Dashboard functions depend on
-- Using CREATE OR REPLACE VIEW to avoid conflicts

-- Summary statistics by window
CREATE OR REPLACE VIEW public.hp_summary_windows WITH (security_invoker = true) AS
SELECT 
    w.window,
    COUNT(bp.id) as passes,
    COALESCE(SUM(bp.duration_min), 0) as minutes_out
FROM public.hp_windows w
LEFT JOIN public.bathroom_passes bp ON 
    bp.timeout >= w.start_ct AT TIME ZONE 'America/Toronto' AND 
    bp.timeout < w.end_ct AT TIME ZONE 'America/Toronto'
GROUP BY w.window;

-- Pass statistics by period and window
CREATE OR REPLACE VIEW public.hp_by_period_windows WITH (security_invoker = true) AS
SELECT 
    w.window,
    COALESCE(bp.period, 'Unknown') as period,
    COUNT(bp.id) as passes,
    COALESCE(SUM(bp.duration_min), 0) as minutes_out
FROM public.hp_windows w
LEFT JOIN public.bathroom_passes bp ON 
    bp.timeout >= w.start_ct AT TIME ZONE 'America/Toronto' AND 
    bp.timeout < w.end_ct AT TIME ZONE 'America/Toronto'
GROUP BY w.window, bp.period;

-- Frequent flyers by window
CREATE OR REPLACE VIEW public.hp_frequent_flyers_windows WITH (security_invoker = true) AS
SELECT 
    w.window,
    bp.student_name,
    COUNT(bp.id) as passes,
    COALESCE(SUM(bp.duration_min), 0) as minutes_out
FROM public.hp_windows w
LEFT JOIN public.bathroom_passes bp ON 
    bp.timeout >= w.start_ct AT TIME ZONE 'America/Toronto' AND 
    bp.timeout < w.end_ct AT TIME ZONE 'America/Toronto'
WHERE bp.student_name IS NOT NULL
GROUP BY w.window, bp.student_name
HAVING COUNT(bp.id) > 0;

-- Longest passes with full details by window
CREATE OR REPLACE VIEW public.hp_longest_windows WITH (security_invoker = true) AS
SELECT 
    w.window,
    bp.id,
    bp.student_name,
    bp.period,
    bp.destination,
    bp.duration_min as duration,
    bp.timeout,
    bp.timein
FROM public.hp_windows w
LEFT JOIN public.bathroom_passes bp ON 
    bp.timeout >= w.start_ct AT TIME ZONE 'America/Toronto' AND 
    bp.timeout < w.end_ct AT TIME ZONE 'America/Toronto'
WHERE bp.id IS NOT NULL;

-- Return rate statistics by window
CREATE OR REPLACE VIEW public.hp_return_rate_windows WITH (security_invoker = true) AS
SELECT 
    w.window,
    COUNT(bp.id) as total,
    COUNT(bp.timein) as returned,
    COUNT(bp.id) - COUNT(bp.timein) as still_out,
    CASE 
        WHEN COUNT(bp.id) > 0 THEN COUNT(bp.timein)::numeric / COUNT(bp.id)
        ELSE 0
    END as pct_returned
FROM public.hp_windows w
LEFT JOIN public.bathroom_passes bp ON 
    bp.timeout >= w.start_ct AT TIME ZONE 'America/Toronto' AND 
    bp.timeout < w.end_ct AT TIME ZONE 'America/Toronto'
GROUP BY w.window;

-- Destination statistics by window
CREATE OR REPLACE VIEW public.hp_by_destination_windows WITH (security_invoker = true) AS
WITH destination_stats AS (
    SELECT 
        w.window,
        COALESCE(bp.destination, 'Unknown') as destination,
        COUNT(bp.id) as passes,
        COALESCE(SUM(bp.duration_min), 0) as minutes_out,
        COALESCE(AVG(bp.duration_min), 0) as avg_min,
        COALESCE(
            percentile_cont(0.5) WITHIN GROUP (ORDER BY bp.duration_min),
            0
        ) as median_min
    FROM public.hp_windows w
    LEFT JOIN public.bathroom_passes bp ON 
        bp.timeout >= w.start_ct AT TIME ZONE 'America/Toronto' AND 
        bp.timeout < w.end_ct AT TIME ZONE 'America/Toronto'
    GROUP BY w.window, bp.destination
)
SELECT * FROM destination_stats WHERE passes > 0;

-- Grant SELECT permissions to authenticated role for all analytics views
GRANT SELECT ON public.hp_summary_windows TO authenticated;
GRANT SELECT ON public.hp_by_period_windows TO authenticated;
GRANT SELECT ON public.hp_frequent_flyers_windows TO authenticated;
GRANT SELECT ON public.hp_longest_windows TO authenticated;
GRANT SELECT ON public.hp_return_rate_windows TO authenticated;
GRANT SELECT ON public.hp_by_destination_windows TO authenticated;