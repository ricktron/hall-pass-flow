-- Ensure student_name_synonyms table exists with correct structure
CREATE TABLE IF NOT EXISTS public.student_name_synonyms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    raw_input TEXT NOT NULL,
    student_id UUID NOT NULL
);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_student_name_synonyms_student_id') THEN
        ALTER TABLE public.student_name_synonyms 
        ADD CONSTRAINT fk_student_name_synonyms_student_id 
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.student_name_synonyms ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Authenticated full access to student_name_synonyms" ON public.student_name_synonyms;
DROP POLICY IF EXISTS "Deny anonymous access to student_name_synonyms" ON public.student_name_synonyms;

-- Create RLS policy for authenticated users - full access
CREATE POLICY "Authenticated full access to student_name_synonyms" 
ON public.student_name_synonyms 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policy to deny anonymous access
CREATE POLICY "Deny anonymous access to student_name_synonyms" 
ON public.student_name_synonyms 
FOR ALL 
TO anon
USING (false);

-- Grant explicit permissions to authenticated role
GRANT ALL ON public.student_name_synonyms TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;