-- grades_discovery.sql
-- Helper script to discover existing grade tables and set up grades_normalized

-- Step 1: List candidate grade tables in public schema
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema='public'
  AND (table_name ILIKE '%grade%' OR table_name ILIKE '%score%' OR table_name ILIKE '%gradebook%' OR table_name ILIKE '%assignment%')
ORDER BY table_type, table_name;

-- Step 2: If you find an existing table, inspect its columns:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='<YOUR_GRADES_TABLE>';

-- Step 3: If your grades live elsewhere, create a VIEW named public.grades_normalized that maps
-- your table's columns to (student_key, term, course, avg_grade).
-- Example:
--   CREATE OR REPLACE VIEW public.grades_normalized AS
--   SELECT lower(student_name) AS student_key,
--          term,
--          course,
--          avg_score::numeric(5,2) AS avg_grade
--   FROM public.your_grades_table;

-- Step 4: Verify the view/table works with the analytics join view:
--   SELECT COUNT(*) FROM public.hp_grade_compare_windows WHERE avg_grade IS NOT NULL;

-- Step 5: Sample import into grades_normalized table (if using the scaffold table):
--   INSERT INTO public.grades_normalized (student_key, term, course, avg_grade)
--   VALUES
--     ('john doe', 'Q2', 'Math', 85.5),
--     ('jane smith', 'Q2', 'Math', 92.0);
