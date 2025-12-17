-- =============================================================================
-- V2: DB-driven destinations + Early Dismissal signouts
-- =============================================================================
-- This migration adds:
-- 1) Seeds hall_pass_destinations with standard destinations including College Visit
-- 2) Creates hp_day_signouts table for tracking daily early dismissals
-- 3) Creates hp_day_signouts_today view for teacher dashboard
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Seed hall_pass_destinations with standard destinations
-- -----------------------------------------------------------------------------
-- Uses INSERT ... ON CONFLICT to be idempotent

INSERT INTO public.hall_pass_destinations (key, label, synonyms, active)
VALUES 
    ('bathroom', 'Bathroom', ARRAY['bathroom', 'restroom', 'rr', 'br']::text[], true),
    ('locker', 'Locker', ARRAY['locker', 'locker room']::text[], true),
    ('counselor', 'Counselor', ARRAY['counselor', 'guidance', 'guidance counselor']::text[], true),
    ('dean_students', 'Dean of Students', ARRAY['dean of students', 'dean', 'student dean']::text[], true),
    ('dean_academics', 'Dean of Academics', ARRAY['dean of academics', 'academic dean']::text[], true),
    ('nurse', 'Nurse', ARRAY['nurse', 'clinic', 'health office', 'health room']::text[], true),
    ('testing_center', 'Testing Center', ARRAY['testing center', 'testing', 'test center']::text[], true),
    ('college_visit', 'College Visit', ARRAY['college visit', 'college', 'university visit', 'campus visit']::text[], true),
    ('football_meeting', 'Football Meeting', ARRAY['football meeting', 'football', 'athletics meeting']::text[], true),
    ('early_dismissal', 'Early Dismissal', ARRAY['early dismissal', 'dismissal', 'leaving early', 'going home']::text[], true),
    ('other', 'Other', ARRAY['other']::text[], true)
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    synonyms = EXCLUDED.synonyms,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Add a sort_order column if it doesn't exist (for frontend ordering)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hall_pass_destinations' 
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.hall_pass_destinations 
        ADD COLUMN sort_order int NOT NULL DEFAULT 100;
    END IF;
END $$;

-- Set sort order for destinations (controls display order in UI)
UPDATE public.hall_pass_destinations SET sort_order = 1 WHERE key = 'bathroom';
UPDATE public.hall_pass_destinations SET sort_order = 2 WHERE key = 'nurse';
UPDATE public.hall_pass_destinations SET sort_order = 3 WHERE key = 'locker';
UPDATE public.hall_pass_destinations SET sort_order = 4 WHERE key = 'counselor';
UPDATE public.hall_pass_destinations SET sort_order = 5 WHERE key = 'dean_students';
UPDATE public.hall_pass_destinations SET sort_order = 6 WHERE key = 'dean_academics';
UPDATE public.hall_pass_destinations SET sort_order = 7 WHERE key = 'testing_center';
UPDATE public.hall_pass_destinations SET sort_order = 8 WHERE key = 'college_visit';
UPDATE public.hall_pass_destinations SET sort_order = 9 WHERE key = 'football_meeting';
UPDATE public.hall_pass_destinations SET sort_order = 90 WHERE key = 'other';
UPDATE public.hall_pass_destinations SET sort_order = 95 WHERE key = 'early_dismissal';

-- Enable RLS on hall_pass_destinations if not already
ALTER TABLE public.hall_pass_destinations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read destinations
DROP POLICY IF EXISTS "Authenticated read access to hall_pass_destinations" ON public.hall_pass_destinations;
CREATE POLICY "Authenticated read access to hall_pass_destinations"
ON public.hall_pass_destinations
FOR SELECT
TO authenticated
USING (true);

-- Allow anon to read destinations (needed for student kiosk)
DROP POLICY IF EXISTS "Anon read access to hall_pass_destinations" ON public.hall_pass_destinations;
CREATE POLICY "Anon read access to hall_pass_destinations"
ON public.hall_pass_destinations
FOR SELECT
TO anon
USING (true);

GRANT SELECT ON public.hall_pass_destinations TO authenticated, anon;

COMMENT ON TABLE public.hall_pass_destinations IS 
'Canonical destination list for hall passes. Used by student kiosk UI.';

-- -----------------------------------------------------------------------------
-- 2) Create hp_day_signouts table for tracking daily early dismissals
-- -----------------------------------------------------------------------------
-- This is SEPARATE from bathroom_passes to avoid affecting:
--   - "Currently Out" calculations
--   - Bathroom-only analytics
--   - Existing hp_*_windows views

CREATE TABLE IF NOT EXISTS public.hp_day_signouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    date_local date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Chicago')::date),
    classroom text NOT NULL,
    student_name text NOT NULL,
    student_id uuid NULL REFERENCES public.users(id),
    reason text NULL,
    recorded_by text NULL  -- Teacher who recorded the signout
);

-- Unique constraint: one signout per student per classroom per day
CREATE UNIQUE INDEX IF NOT EXISTS hp_day_signouts_unique_idx 
ON public.hp_day_signouts (classroom, date_local, lower(student_name));

-- Index for today's query
CREATE INDEX IF NOT EXISTS hp_day_signouts_date_idx 
ON public.hp_day_signouts (date_local);

-- RLS: Mirror existing bathroom_passes pattern
ALTER TABLE public.hp_day_signouts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DROP POLICY IF EXISTS "Authenticated full access to hp_day_signouts" ON public.hp_day_signouts;
CREATE POLICY "Authenticated full access to hp_day_signouts"
ON public.hp_day_signouts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Deny anonymous access (teachers only)
DROP POLICY IF EXISTS "Deny anonymous access to hp_day_signouts" ON public.hp_day_signouts;
CREATE POLICY "Deny anonymous access to hp_day_signouts"
ON public.hp_day_signouts
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

GRANT ALL ON public.hp_day_signouts TO authenticated;

COMMENT ON TABLE public.hp_day_signouts IS 
'Tracks students signed out for the day (early dismissal). Separate from bathroom_passes to not affect Currently Out or analytics.';

-- -----------------------------------------------------------------------------
-- 3) Create hp_day_signouts_today view for teacher dashboard
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.hp_day_signouts_today AS
SELECT 
    id,
    classroom,
    student_name,
    student_id,
    reason,
    recorded_by,
    created_at,
    date_local
FROM public.hp_day_signouts
WHERE date_local = (now() AT TIME ZONE 'America/Chicago')::date
ORDER BY created_at DESC;

COMMENT ON VIEW public.hp_day_signouts_today IS 
'View showing today''s early dismissal signouts. Used by Teacher Dashboard Overview.';

GRANT SELECT ON public.hp_day_signouts_today TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Create helper function to record an early dismissal signout
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_day_signout(
    p_classroom text,
    p_student_name text,
    p_reason text DEFAULT NULL,
    p_recorded_by text DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_resolved RECORD;
    v_final_name text;
    v_final_id uuid;
    v_signout_id uuid;
BEGIN
    -- Validate inputs
    IF p_classroom IS NULL OR TRIM(p_classroom) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Classroom is required'
        );
    END IF;
    
    IF p_student_name IS NULL OR TRIM(p_student_name) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student name is required'
        );
    END IF;
    
    -- Try to resolve the student name
    SELECT * INTO v_resolved
    FROM public.hp_resolve_student(p_student_name)
    LIMIT 1;
    
    IF v_resolved.canonical_id IS NOT NULL THEN
        v_final_name := v_resolved.canonical_name;
        v_final_id := v_resolved.canonical_id;
    ELSE
        v_final_name := TRIM(p_student_name);
        v_final_id := NULL;
    END IF;
    
    -- Insert the signout record
    INSERT INTO public.hp_day_signouts (
        classroom,
        student_name,
        student_id,
        reason,
        recorded_by
    )
    VALUES (
        TRIM(p_classroom),
        v_final_name,
        v_final_id,
        NULLIF(TRIM(COALESCE(p_reason, '')), ''),
        NULLIF(TRIM(COALESCE(p_recorded_by, '')), '')
    )
    ON CONFLICT (classroom, date_local, lower(student_name)) DO UPDATE SET
        reason = COALESCE(EXCLUDED.reason, public.hp_day_signouts.reason),
        recorded_by = COALESCE(EXCLUDED.recorded_by, public.hp_day_signouts.recorded_by),
        created_at = NOW()
    RETURNING id INTO v_signout_id;
    
    RETURN json_build_object(
        'success', true,
        'id', v_signout_id,
        'student_name', v_final_name,
        'resolved', v_resolved.canonical_id IS NOT NULL
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_day_signout(text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.record_day_signout IS 
'Records an early dismissal signout for the day. Auto-resolves student name when possible.';

