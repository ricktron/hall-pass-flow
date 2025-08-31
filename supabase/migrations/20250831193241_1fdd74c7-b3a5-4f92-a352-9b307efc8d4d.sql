-- Comprehensive Security Fix Migration (Safe Version)
-- This migration secures all tables while maintaining kiosk functionality
-- Safely handles existing policies and configurations

-- 1. Enable Row Level Security on tables (safe to run if already enabled)
ALTER TABLE public.bathroom_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_name_synonyms ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies safely to recreate them with proper security

-- Drop all existing policies from bathroom_passes
DO $$
BEGIN
    DROP POLICY IF EXISTS "anon_select" ON public.bathroom_passes;
    DROP POLICY IF EXISTS "anon_insert" ON public.bathroom_passes;
    DROP POLICY IF EXISTS "anon_update_timein" ON public.bathroom_passes;
    DROP POLICY IF EXISTS "Authenticated full access to bathroom_passes" ON public.bathroom_passes;
    DROP POLICY IF EXISTS "Deny anonymous access to bathroom_passes" ON public.bathroom_passes;
END $$;

-- Drop all existing policies from students
DO $$
BEGIN
    DROP POLICY IF EXISTS "Deny all anonymous access to students" ON public.students;
    DROP POLICY IF EXISTS "Authenticated users can read students" ON public.students;
    DROP POLICY IF EXISTS "Deny insert to students" ON public.students;
    DROP POLICY IF EXISTS "Deny update to students" ON public.students;
    DROP POLICY IF EXISTS "Deny delete to students" ON public.students;
    DROP POLICY IF EXISTS "Authenticated full access to students" ON public.students;
    DROP POLICY IF EXISTS "Deny anonymous access to students" ON public.students;
END $$;

-- Drop all existing policies from classrooms
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated full access to classrooms" ON public.classrooms;
    DROP POLICY IF EXISTS "Deny anonymous access to classrooms" ON public.classrooms;
END $$;

-- Drop all existing policies from student_name_synonyms
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated full access to student_name_synonyms" ON public.student_name_synonyms;
    DROP POLICY IF EXISTS "Deny anonymous access to student_name_synonyms" ON public.student_name_synonyms;
END $$;

-- 3. Create new secure policies for authenticated-only access

-- Bathroom passes policies
CREATE POLICY "Authenticated full access to bathroom_passes"
ON public.bathroom_passes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Deny anonymous access to bathroom_passes"
ON public.bathroom_passes
FOR ALL
TO anon
USING (false);

-- Classrooms policies  
CREATE POLICY "Authenticated full access to classrooms"
ON public.classrooms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Deny anonymous access to classrooms"
ON public.classrooms
FOR ALL
TO anon
USING (false);

-- Students policies
CREATE POLICY "Authenticated full access to students"
ON public.students
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Deny anonymous access to students"
ON public.students
FOR ALL
TO anon
USING (false);

-- Student name synonyms policies
CREATE POLICY "Authenticated full access to student_name_synonyms"
ON public.student_name_synonyms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Deny anonymous access to student_name_synonyms"
ON public.student_name_synonyms
FOR ALL
TO anon
USING (false);

-- 4. Update functions to use secure search paths
CREATE OR REPLACE FUNCTION public.get_analytics_by_period(time_frame_arg text)
 RETURNS TABLE(period text, period_label text, passes bigint, total_minutes bigint, avg_minutes numeric)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT
        bp.period,
        CASE WHEN bp.period ILIKE 'house%' THEN 'House Small Group'
             ELSE 'Period ' || bp.period END AS period_label,
        bp.passes,
        bp.minutes_out AS total_minutes,
        ROUND(bp.minutes_out::numeric / NULLIF(bp.passes,0), 1) AS avg_minutes
    FROM public.hp_by_period_windows bp
    WHERE lower(bp."window") = normalized_frame
    ORDER BY bp.passes DESC, period_label;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_summary(time_frame_arg text)
 RETURNS TABLE(passes bigint, total_minutes bigint)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
    normalized_frame TEXT;
BEGIN
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    RETURN QUERY
    SELECT 
        COALESCE(s.passes, 0) AS passes,
        COALESCE(s.minutes_out, 0)::bigint AS total_minutes
    FROM (SELECT normalized_frame AS k) tf
    LEFT JOIN public.hp_summary_windows s
        ON lower(s."window") = tf.k;
END;
$function$;