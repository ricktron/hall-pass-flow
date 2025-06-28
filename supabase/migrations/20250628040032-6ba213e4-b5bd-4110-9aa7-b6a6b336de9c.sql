
-- Remove existing RLS policies on Hall_Passes table (with correct case)
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Users can view all hall passes" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Users can create hall passes" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Users can update hall passes" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Users can delete hall passes" ON public."Hall_Passes";

-- Create consolidated RLS policies - one per action type (with correct table name case)
CREATE POLICY "Authenticated users can select hall passes" 
ON public."Hall_Passes" 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert hall passes" 
ON public."Hall_Passes" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update hall passes" 
ON public."Hall_Passes" 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete hall passes" 
ON public."Hall_Passes" 
FOR DELETE 
TO authenticated 
USING (true);
