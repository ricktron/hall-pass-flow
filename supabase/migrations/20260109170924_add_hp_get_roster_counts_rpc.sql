-- =============================================================================
-- Add RPC function for roster counts by period
-- =============================================================================
-- This function returns student counts grouped by period for a given school year
-- and semester. Uses SECURITY DEFINER to bypass RLS on student_enrollments and
-- users tables, similar to hp_get_roster.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hp_get_roster_counts(
  p_school_year text,
  p_semester text
)
RETURNS TABLE (
  period text,
  student_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
BEGIN
  -- Return counts grouped by period for the given school year and semester
  -- Only count enrollments where the user has role = 'student'
  RETURN QUERY
  SELECT
    se.period,
    COUNT(DISTINCT se.student_id) AS student_count
  FROM public.student_enrollments se
  INNER JOIN public.users u ON u.id = se.student_id
  WHERE se.school_year = p_school_year
    AND se.semester = p_semester
    AND u.role = 'student'::user_role
  GROUP BY se.period
  ORDER BY se.period;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.hp_get_roster_counts(text, text) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.hp_get_roster_counts(text, text) IS 
'RLS-safe function to fetch student counts grouped by period for a given school year and semester. Returns period and count for each period. Uses SECURITY DEFINER to bypass RLS on underlying tables.';

