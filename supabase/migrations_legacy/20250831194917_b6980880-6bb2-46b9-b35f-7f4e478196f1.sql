-- Create secure PIN verification function
CREATE OR REPLACE FUNCTION public.verify_teacher_pin(pin_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Validate input
    IF pin_to_check IS NULL OR LENGTH(pin_to_check) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Simple PIN verification - check if input matches '4311'
    RETURN pin_to_check = '4311';
END;
$$;

-- Enable RLS on hall_pass_corrections table
ALTER TABLE public.hall_pass_corrections ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Hall_Passes_deleted_backup table
ALTER TABLE public."Hall_Passes_deleted_backup" ENABLE ROW LEVEL SECURITY;

-- Create simple policy for hall_pass_corrections - authenticated users only
CREATE POLICY "Authenticated users access hall_pass_corrections"
ON public.hall_pass_corrections
FOR ALL
USING (auth.role() = 'authenticated');

-- Create simple policy for Hall_Passes_deleted_backup - authenticated users only
CREATE POLICY "Authenticated users access Hall_Passes_deleted_backup"
ON public."Hall_Passes_deleted_backup"
FOR ALL
USING (auth.role() = 'authenticated');