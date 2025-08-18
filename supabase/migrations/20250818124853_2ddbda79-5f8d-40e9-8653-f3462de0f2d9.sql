-- Remove public access policies from Hall_Passes table to protect student privacy
-- This fixes the security vulnerability where student hall pass records were publicly accessible

-- Drop all public access policies
DROP POLICY IF EXISTS "Public select" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Public insert" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Public update" ON public."Hall_Passes";
DROP POLICY IF EXISTS "Public delete" ON public."Hall_Passes";

-- Also remove the overly broad "Allow Write" policy that allows all operations
DROP POLICY IF EXISTS "Allow Write" ON public."Hall_Passes";

-- The following authenticated user policies remain in place to maintain functionality:
-- - "Authenticated users can select hall passes"
-- - "Authenticated users can insert hall passes" 
-- - "Authenticated users can update hall passes"
-- - "Authenticated users can delete hall passes"
-- 
-- These policies ensure only authenticated users can access student hall pass data,
-- protecting student privacy while maintaining application functionality.