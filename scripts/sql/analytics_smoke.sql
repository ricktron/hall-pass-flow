-- Analytics Smoke Test Script
-- Exercises each analytics card's query pattern to verify views work correctly.
-- Run each query block in the Supabase SQL editor.
-- KPIs should return exactly 1 row; list views return 0+ rows.

--------------------------------------------------------------------------------
-- KPI: passes (should return 1 row)
--------------------------------------------------------------------------------
SELECT COALESCE(s.passes,0) AS passes
FROM public.hp_summary_windows s
WHERE lower(s."window")='week';

--------------------------------------------------------------------------------
-- KPI: total minutes (should return 1 row)
--------------------------------------------------------------------------------
SELECT COALESCE(s.minutes_out,0)::bigint AS total_minutes
FROM public.hp_summary_windows s
WHERE lower(s."window")='week';

--------------------------------------------------------------------------------
-- KPI: return rate (should return 1 row)
--------------------------------------------------------------------------------
SELECT ROUND(COALESCE(r.pct_returned,0)*100.0,1) AS return_rate_pct,
       COALESCE(r.still_out,0) AS still_out,
       COALESCE(r.total,0)     AS total
FROM public.hp_return_rate_windows r
WHERE lower(r."window")='week';

--------------------------------------------------------------------------------
-- Trips by Period (0+ rows)
--------------------------------------------------------------------------------
SELECT period, passes, minutes_out
FROM public.hp_by_period_windows
WHERE lower("window")='week'
ORDER BY passes DESC;

--------------------------------------------------------------------------------
-- Destinations (0+ rows)
--------------------------------------------------------------------------------
SELECT destination, passes, minutes_out, median_min, p90_min
FROM public.hp_by_destination_windows
WHERE lower("window")='week'
ORDER BY passes DESC;

--------------------------------------------------------------------------------
-- Frequent Flyers (0+ rows)
--------------------------------------------------------------------------------
SELECT student_name, passes, minutes_out
FROM public.hp_frequent_flyers_windows
WHERE lower("window")='week'
ORDER BY passes DESC, minutes_out DESC;

--------------------------------------------------------------------------------
-- Longest (0+ rows)
--------------------------------------------------------------------------------
SELECT student_name, period, destination, duration, "timeout", "timein"
FROM public.hp_longest_windows
WHERE lower("window")='week'
ORDER BY duration DESC, "timeout" DESC;
