-- Create Classroom_Arrivals table for sign-in functionality
CREATE TABLE public.Classroom_Arrivals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    student_name TEXT NOT NULL,
    period TEXT NOT NULL,
    time_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    arrival_reason TEXT
);

-- Enable Row Level Security
ALTER TABLE public.Classroom_Arrivals ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to have full access
CREATE POLICY "Allow authenticated users to select arrivals" 
ON public.Classroom_Arrivals 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert arrivals" 
ON public.Classroom_Arrivals 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update arrivals" 
ON public.Classroom_Arrivals 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete arrivals" 
ON public.Classroom_Arrivals 
FOR DELETE 
TO authenticated 
USING (true);