-- =============================================================================
-- Add RLS-safe RPC function for roster reads
-- =============================================================================
-- This function allows anonymous clients to read roster data without requiring
-- authenticated role, while maintaining security by only exposing safe fields.
-- Uses SECURITY DEFINER to bypass RLS on student_enrollments and users tables.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hp_get_roster(
  p_school_year text,
  p_semester text,
  p_period text,
  p_course text DEFAULT NULL
)
RETURNS TABLE (
  student_id uuid,
  first_name text,
  last_name text,
  preferred_first_name text,
  display_name text,
  period text,
  course text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_normalized_period text;
BEGIN
  -- Normalize period: remove trailing " Period" (case-insensitive) and trim
  -- Convert to uppercase for consistency
  v_normalized_period := upper(trim(regexp_replace(p_period, '\s*Period\s*$', '', 'i')));
  
  -- Return roster data from student_enrollments joined with users
  RETURN QUERY
  SELECT
    u.id AS student_id,
    u.first_name,
    u.last_name,
    -- preferred_first_name: use nickname if present and non-empty, else first_name
    COALESCE(NULLIF(u.nickname, ''), u.first_name) AS preferred_first_name,
    -- display_name: preferred_first_name + ' ' + last_name
    (COALESCE(NULLIF(u.nickname, ''), u.first_name) || ' ' || u.last_name) AS display_name,
    se.period,
    se.course
  FROM public.student_enrollments se
  INNER JOIN public.users u ON u.id = se.student_id
  WHERE se.school_year = p_school_year
    AND se.semester = p_semester
    AND upper(trim(se.period)) = v_normalized_period
    AND u.role = 'student'
    AND (p_course IS NULL OR se.course = p_course)
  ORDER BY u.last_name, u.first_name;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.hp_get_roster(text, text, text, text) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.hp_get_roster(text, text, text, text) IS 
'RLS-safe function to fetch roster students for a given school year, semester, period, and optional course. Returns student identity fields needed for sign-out UI. Uses SECURITY DEFINER to bypass RLS on underlying tables.';

