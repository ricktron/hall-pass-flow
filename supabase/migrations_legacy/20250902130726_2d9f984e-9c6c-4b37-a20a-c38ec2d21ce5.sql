-- Create the student_name_synonyms table
CREATE TABLE public.student_name_synonyms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    raw_input TEXT NOT NULL,
    student_id UUID NOT NULL,
    CONSTRAINT fk_student_name_synonyms_student_id 
        FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.student_name_synonyms ENABLE ROW LEVEL SECURITY;

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