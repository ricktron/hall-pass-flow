-- Only return rows that have a grade (for cleaner UI wiring)
-- This view can be used instead of hp_grade_compare_windows when you only
-- want students with grade data, avoiding the need for client-side filtering.
CREATE OR REPLACE VIEW public.hp_grade_compare_with_grades AS
SELECT *
FROM public.hp_grade_compare_windows
WHERE avg_grade IS NOT NULL;
