-- Grant correct permissions to authenticated role on public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Drop existing views first to avoid column name conflicts
DROP VIEW IF EXISTS public."Hall_Passes" CASCADE;
DROP VIEW IF EXISTS public."Hall_Passes_api" CASCADE;

-- Recreate Hall_Passes view with proper security settings and correct column names
CREATE VIEW public."Hall_Passes" 
WITH (security_invoker = true) 
AS SELECT 
    bp.id,
    bp.student_id as "studentId",
    bp.timeout as "timeOut", 
    bp.timein as "timeIn",
    bp.student_name as "studentName",
    bp.period,
    bp.destination,
    bp.notes,
    bp.classroom
FROM public.bathroom_passes bp;

-- Recreate Hall_Passes_api view with proper security settings  
CREATE VIEW public."Hall_Passes_api"
WITH (security_invoker = true)
AS SELECT 
    bp.id,
    bp.timeout as "timeOut",
    bp.timein as "timeIn", 
    bp.duration_min as duration,
    CASE WHEN bp.timein IS NULL THEN true ELSE false END as "needsReview",
    bp.student_id as "studentId",
    bp.student_name as "studentName",
    bp.period,
    bp.destination,
    SPLIT_PART(bp.student_name, ' ', 1) as "firstName",
    SPLIT_PART(bp.student_name, ' ', 2) as "lastName",
    bp.raw_student_name as "typedName"
FROM public.bathroom_passes bp;

-- Grant explicit permissions on views to authenticated role
GRANT SELECT ON public."Hall_Passes" TO authenticated;
GRANT SELECT ON public."Hall_Passes_api" TO authenticated;

-- Grant permissions on core tables to authenticated role
GRANT ALL ON public.student_name_synonyms TO authenticated;
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.bathroom_passes TO authenticated;