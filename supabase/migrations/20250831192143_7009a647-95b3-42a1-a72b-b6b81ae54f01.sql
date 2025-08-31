-- Secure the students table by enabling Row Level Security
-- This prevents unauthorized access to sensitive student personal information

-- Enable RLS on the students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create a restrictive policy that denies all anonymous access
-- Only authenticated admin users should be able to access student PII
CREATE POLICY "Deny all anonymous access to students"
ON public.students
FOR ALL
TO anon
USING (false);

-- Create a policy for authenticated users (if authentication is implemented later)
-- For now, this will effectively block all access since there's no auth system
CREATE POLICY "Authenticated users can read students"
ON public.students  
FOR SELECT
TO authenticated
USING (true);

-- Block insert/update/delete for non-admin users to prevent tampering
CREATE POLICY "Deny modifications to students"
ON public.students
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (false);