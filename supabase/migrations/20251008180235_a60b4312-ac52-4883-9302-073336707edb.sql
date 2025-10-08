-- Enable Row Level Security on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for users table (authenticated only)
CREATE POLICY "Authenticated users can view all users"
ON public.users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert users"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update users"
ON public.users FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete users"
ON public.users FOR DELETE
TO authenticated
USING (true);

-- Policies for students table (authenticated only)
CREATE POLICY "Authenticated users can view all students"
ON public.students FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert students"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
ON public.students FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete students"
ON public.students FOR DELETE
TO authenticated
USING (true);

-- Policies for rosters table (authenticated only)
CREATE POLICY "Authenticated users can view all rosters"
ON public.rosters FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert rosters"
ON public.rosters FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rosters"
ON public.rosters FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rosters"
ON public.rosters FOR DELETE
TO authenticated
USING (true);

-- Policies for hall_passes table (public kiosk access)
CREATE POLICY "Anyone can view all hall passes"
ON public.hall_passes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create hall passes"
ON public.hall_passes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update hall passes"
ON public.hall_passes FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Policies for academic_terms table (read-only public access)
CREATE POLICY "Anyone can view academic terms"
ON public.academic_terms FOR SELECT
TO anon, authenticated
USING (true);

-- Policies for courses table (read-only public access)
CREATE POLICY "Anyone can view courses"
ON public.courses FOR SELECT
TO anon, authenticated
USING (true);

-- Policies for locations table (read-only public access)
CREATE POLICY "Anyone can view locations"
ON public.locations FOR SELECT
TO anon, authenticated
USING (true);

-- Policies for settings table (read-only public access)
CREATE POLICY "Anyone can view settings"
ON public.settings FOR SELECT
TO anon, authenticated
USING (true);