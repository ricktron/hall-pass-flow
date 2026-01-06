-- Safe rename for a misspelled student across all relevant tables
-- Handles either studentName or student_name column in Hall_Passes,
-- and also updates bathroom_passes and grades_normalized if they exist.
DO $$
DECLARE
  col_name text;
  cnt int;
BEGIN
  -- Figure out which column Hall_Passes uses for the student name
  SELECT CASE
           WHEN EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='Hall_Passes' AND column_name='student_name'
           ) THEN 'student_name'
           WHEN EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='Hall_Passes' AND column_name='studentName'
           ) THEN 'studentName'
           ELSE NULL
         END
  INTO col_name;

  IF col_name IS NOT NULL THEN
    -- Update Hall_Passes
    EXECUTE format('UPDATE public."Hall_Passes" SET %I = $1 WHERE lower(%I) = $2', col_name, col_name)
    USING 'andrew gandara', 'dreww gadnata';
  END IF;

  -- Update optional bathroom_passes table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='bathroom_passes'
  ) THEN
    UPDATE public.bathroom_passes
    SET student_name = 'andrew gandara'
    WHERE lower(student_name) = 'dreww gadnata';
  END IF;

  -- Update grades_normalized if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='grades_normalized'
  ) THEN
    UPDATE public.grades_normalized
    SET student_key = 'andrew gandara'
    WHERE lower(student_key) = 'dreww gadnata';
  END IF;

  -- Sanity check for Hall_Passes (column-aware)
  IF col_name IS NOT NULL THEN
    EXECUTE format('SELECT COUNT(*) FROM public."Hall_Passes" WHERE lower(%I) = $1', col_name)
    INTO cnt
    USING 'dreww gadnata';
    RAISE NOTICE 'still_misspelled in Hall_Passes = %', cnt;
  ELSE
    RAISE NOTICE 'No student name column found in Hall_Passes.';
  END IF;
END $$;

-- Optional alias (if you use a synonyms table)
-- Uncomment if the student_name_synonyms table exists:
-- INSERT INTO public.student_name_synonyms (canonical_name, alt_name)
-- VALUES ('andrew gandara', 'dreww gadnata')
-- ON CONFLICT DO NOTHING;
