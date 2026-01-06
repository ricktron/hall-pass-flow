-- =============================================================================
-- Align student_enrollments RLS with existing roster read pattern + add indexes
-- =============================================================================
-- This migration ensures student_enrollments can be read in production the
-- same way the current roster dropdown reads users/students (authenticated only).
-- Adds performance indexes for roster queries.
-- =============================================================================

-- Enable RLS on student_enrollments (if not already enabled)
ALTER TABLE IF EXISTS public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view student enrollments" ON public.student_enrollments;
DROP POLICY IF EXISTS "Anyone can view student enrollments" ON public.student_enrollments;
DROP POLICY IF EXISTS "Deny anonymous access to student_enrollments" ON public.student_enrollments;

-- Create SELECT policy for authenticated users only (matching users/students table pattern)
-- This aligns with the existing roster read path which requires authenticated role
CREATE POLICY "Authenticated users can view student enrollments"
ON public.student_enrollments
FOR SELECT
TO authenticated
USING (true);

-- Deny anonymous access (matching the pattern from users/students tables)
CREATE POLICY "Deny anonymous access to student_enrollments"
ON public.student_enrollments
FOR ALL
TO anon
USING (false);

-- =============================================================================
-- Performance indexes for roster queries
-- =============================================================================

-- Composite index for the primary query pattern in src/lib/roster.ts:
-- WHERE school_year = ? AND semester = ? AND period = ? AND course = ?
-- This index supports queries with or without the course filter
CREATE INDEX IF NOT EXISTS idx_student_enrollments_roster_lookup
ON public.student_enrollments(school_year, semester, period, course);

-- Index on student_id for the join with users table
-- This speeds up the second query: SELECT ... FROM users WHERE id IN (...)
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id
ON public.student_enrollments(student_id);

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON POLICY "Authenticated users can view student enrollments" ON public.student_enrollments IS
'Allows authenticated users to read student enrollments for roster display. Matches the access pattern of users and students tables.';

COMMENT ON INDEX idx_student_enrollments_roster_lookup IS
'Composite index for roster queries filtering by school_year, semester, period, and optional course.';

COMMENT ON INDEX idx_student_enrollments_student_id IS
'Index on student_id for efficient joins with users table when fetching student details.';

