-- Fix the security issue by modifying the existing function to set search_path
-- This avoids dropping the function which has trigger dependencies

CREATE OR REPLACE FUNCTION public.map_student_from_synonym()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF new.student_id IS NULL AND new.raw_student_name IS NOT NULL THEN
    SELECT sns.student_id INTO new.student_id
    FROM public.student_name_synonyms sns
    WHERE sns.raw_input = new.raw_student_name;
  END IF;
  RETURN new;
END;
$function$;