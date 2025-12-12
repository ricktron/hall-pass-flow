-- Migration: hp_grade_compare_with_grades
-- Only return rows that have a grade (for cleaner UI wiring)
-- This view can be used instead of hp_grade_compare_windows when you only
-- want students with grade data, avoiding the need for client-side filtering.

-- Verification: Fail fast if hp_grade_compare_windows doesn't exist or is missing avg_grade
DO $$
BEGIN
  -- Check that hp_grade_compare_windows exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'hp_grade_compare_windows'
  ) THEN
    RAISE EXCEPTION 'DEPENDENCY MISSING: public.hp_grade_compare_windows view does not exist. Run the grades scaffold migration first.';
  END IF;

  -- Check that avg_grade column exists on hp_grade_compare_windows
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hp_grade_compare_windows'
      AND column_name = 'avg_grade'
  ) THEN
    RAISE EXCEPTION 'DEPENDENCY MISSING: public.hp_grade_compare_windows is missing the avg_grade column. Check schema.';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.hp_grade_compare_with_grades AS
SELECT *
FROM public.hp_grade_compare_windows
WHERE avg_grade IS NOT NULL;
