-- =============================================================================
-- Unknown Student PIN Override + Resolution Queue
-- =============================================================================
-- This migration adds:
-- 1) Redesigned hp_unknown_names table with UUID PK and status tracking
-- 2) Add is_unknown and unknown_name_id columns to bathroom_passes
-- 3) Create placeholder "Unknown Student" in users table for FK constraint
-- 4) create_unknown_signout RPC for PIN-verified unknown pass creation
-- 5) resolve_unknown_signout RPC for atomic resolution
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Recreate hp_unknown_names with UUID primary key and status enum
-- -----------------------------------------------------------------------------
-- First, drop dependent views and constraints
DROP VIEW IF EXISTS public.hp_unmatched_names;

-- Backup existing data if table exists
CREATE TABLE IF NOT EXISTS public._hp_unknown_names_backup AS 
SELECT * FROM public.hp_unknown_names WHERE false;

INSERT INTO public._hp_unknown_names_backup
SELECT * FROM public.hp_unknown_names
ON CONFLICT DO NOTHING;

-- Drop old table
DROP TABLE IF EXISTS public.hp_unknown_names CASCADE;

-- Create new table with UUID PK
CREATE TABLE public.hp_unknown_names (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_name text NOT NULL,
    raw_norm text NOT NULL,
    period text,
    destination text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_student_id uuid REFERENCES public.users(id),
    resolved_by text,
    seen_count int NOT NULL DEFAULT 1
);

CREATE INDEX idx_hp_unknown_names_status ON public.hp_unknown_names(status);
CREATE INDEX idx_hp_unknown_names_raw_norm ON public.hp_unknown_names(raw_norm);

-- RLS
ALTER TABLE public.hp_unknown_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access to hp_unknown_names" ON public.hp_unknown_names;
CREATE POLICY "Authenticated full access to hp_unknown_names"
ON public.hp_unknown_names
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON public.hp_unknown_names TO authenticated;

COMMENT ON TABLE public.hp_unknown_names IS 
'Tracks unknown student names that were PIN-verified for sign-out. Pending items appear in resolution queue.';

-- -----------------------------------------------------------------------------
-- 2) Add is_unknown and unknown_name_id to bathroom_passes
-- -----------------------------------------------------------------------------
ALTER TABLE public.bathroom_passes 
ADD COLUMN IF NOT EXISTS is_unknown boolean NOT NULL DEFAULT false;

ALTER TABLE public.bathroom_passes 
ADD COLUMN IF NOT EXISTS unknown_name_id uuid REFERENCES public.hp_unknown_names(id);

CREATE INDEX IF NOT EXISTS idx_bathroom_passes_is_unknown 
ON public.bathroom_passes(is_unknown) WHERE is_unknown = true;

-- -----------------------------------------------------------------------------
-- 3) Create or get placeholder "Unknown Student" user
-- -----------------------------------------------------------------------------
-- Use a deterministic UUID so we can reference it
-- UUID v5 namespace: 6ba7b810-9dad-11d1-80b4-00c04fd430c8 (DNS namespace)
-- Name: "unknown.student.placeholder"
DO $$
DECLARE
    v_unknown_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Insert placeholder user if not exists
    INSERT INTO public.users (id, email, first_name, last_name, role)
    VALUES (
        v_unknown_id,
        'unknown.placeholder@system.local',
        'Unknown',
        'Student',
        'student'
    )
    ON CONFLICT (id) DO NOTHING;
END $$;

-- -----------------------------------------------------------------------------
-- 4) create_unknown_signout RPC
-- -----------------------------------------------------------------------------
-- Verifies PIN, creates unknown entry, creates bathroom pass
CREATE OR REPLACE FUNCTION public.create_unknown_signout(
    p_pin text,
    p_raw_name text,
    p_period text,
    p_destination text,
    p_classroom text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_pin_valid boolean;
    v_unknown_id uuid;
    v_pass_id uuid;
    v_placeholder_student_id uuid := '00000000-0000-0000-0000-000000000001';
    v_raw_norm text;
BEGIN
    -- Validate inputs
    IF p_raw_name IS NULL OR TRIM(p_raw_name) = '' THEN
        RETURN json_build_object('success', false, 'error', 'Student name is required');
    END IF;
    
    IF p_period IS NULL OR TRIM(p_period) = '' THEN
        RETURN json_build_object('success', false, 'error', 'Period is required');
    END IF;
    
    IF p_destination IS NULL OR TRIM(p_destination) = '' THEN
        RETURN json_build_object('success', false, 'error', 'Destination is required');
    END IF;

    -- Verify PIN (reuse existing function)
    SELECT public.verify_teacher_pin(p_pin) INTO v_pin_valid;
    
    IF NOT v_pin_valid THEN
        RETURN json_build_object('success', false, 'error', 'Invalid PIN');
    END IF;
    
    -- Normalize the name for tracking
    v_raw_norm := public.hp_norm_name(p_raw_name);
    
    -- Create unknown entry
    INSERT INTO public.hp_unknown_names (raw_name, raw_norm, period, destination, status, created_at)
    VALUES (TRIM(p_raw_name), v_raw_norm, p_period, p_destination, 'pending', NOW())
    RETURNING id INTO v_unknown_id;
    
    -- Create bathroom pass linked to unknown entry
    INSERT INTO public.bathroom_passes (
        student_id,
        student_name,
        raw_student_name,
        period,
        destination,
        timeout,
        classroom,
        is_unknown,
        unknown_name_id
    ) VALUES (
        v_placeholder_student_id,
        TRIM(p_raw_name),
        TRIM(p_raw_name),
        p_period,
        p_destination,
        NOW(),
        p_classroom,
        true,
        v_unknown_id
    )
    RETURNING id INTO v_pass_id;
    
    RETURN json_build_object(
        'success', true,
        'unknown_id', v_unknown_id,
        'pass_id', v_pass_id,
        'student_name', TRIM(p_raw_name)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_unknown_signout(text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_unknown_signout IS 
'Creates a hall pass for an unknown student after PIN verification. Creates tracking entry for resolution queue.';

-- -----------------------------------------------------------------------------
-- 5) resolve_unknown_signout RPC
-- -----------------------------------------------------------------------------
-- Atomically resolves unknown entry and updates associated passes
CREATE OR REPLACE FUNCTION public.resolve_unknown_signout(
    p_unknown_id uuid,
    p_student_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_unknown RECORD;
    v_student_name text;
    v_updated_count integer;
BEGIN
    -- Validate inputs
    IF p_unknown_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Unknown ID is required');
    END IF;
    
    IF p_student_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Student ID is required');
    END IF;
    
    -- Get the unknown entry
    SELECT * INTO v_unknown
    FROM public.hp_unknown_names
    WHERE id = p_unknown_id;
    
    IF v_unknown IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Unknown entry not found');
    END IF;
    
    IF v_unknown.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Unknown entry already resolved');
    END IF;
    
    -- Get student's canonical name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_student_name
    FROM public.users
    WHERE id = p_student_id;
    
    IF v_student_name IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Student not found');
    END IF;
    
    -- Update the unknown entry
    UPDATE public.hp_unknown_names
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        resolved_student_id = p_student_id
    WHERE id = p_unknown_id;
    
    -- Update all bathroom_passes linked to this unknown entry
    UPDATE public.bathroom_passes
    SET 
        student_id = p_student_id,
        student_name = v_student_name,
        is_unknown = false,
        updated_at = NOW()
    WHERE unknown_name_id = p_unknown_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Also create a synonym for future auto-matching
    INSERT INTO public.student_name_synonyms (raw_input, student_id)
    VALUES (v_unknown.raw_name, p_student_id)
    ON CONFLICT DO NOTHING;
    
    RETURN json_build_object(
        'success', true,
        'student_name', v_student_name,
        'passes_updated', v_updated_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_unknown_signout(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.resolve_unknown_signout IS 
'Resolves an unknown student entry by linking it to a real student. Updates all associated passes atomically.';

-- -----------------------------------------------------------------------------
-- 6) dismiss_unknown RPC (optional - for dismissing invalid entries)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dismiss_unknown(p_unknown_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.hp_unknown_names
    SET status = 'dismissed', resolved_at = NOW()
    WHERE id = p_unknown_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Unknown entry not found or already resolved');
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_unknown(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7) Recreate hp_unmatched_names view for backward compatibility
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.hp_unmatched_names AS
SELECT 
    un.id,
    un.raw_name AS raw_student_name,
    un.raw_norm,
    un.period,
    un.destination,
    un.seen_count AS count,
    un.created_at AS first_seen_at,
    un.created_at AS last_seen_at
FROM public.hp_unknown_names un
WHERE un.status = 'pending'
ORDER BY un.created_at DESC;

COMMENT ON VIEW public.hp_unmatched_names IS 
'View for Unknown resolution queue. Shows pending unknown names with pass details.';

GRANT SELECT ON public.hp_unmatched_names TO authenticated;

-- -----------------------------------------------------------------------------
-- 8) Update the BEFORE INSERT trigger to not block unknown inserts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_bathroom_passes_normalize_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_raw_norm text;
    v_resolved RECORD;
BEGIN
    -- Skip normalization for unknown passes (handled by create_unknown_signout RPC)
    IF NEW.is_unknown = true THEN
        RETURN NEW;
    END IF;

    -- Skip if student_name is null
    IF NEW.student_name IS NULL OR TRIM(NEW.student_name) = '' THEN
        RETURN NEW;
    END IF;
    
    -- Always preserve the raw input
    IF NEW.raw_student_name IS NULL THEN
        NEW.raw_student_name := NEW.student_name;
    END IF;
    
    -- Compute normalized form for matching
    v_raw_norm := public.hp_norm_name(NEW.student_name);
    
    -- Attempt to resolve to canonical name
    SELECT * INTO v_resolved
    FROM public.hp_resolve_student(NEW.student_name)
    LIMIT 1;
    
    IF v_resolved.canonical_id IS NOT NULL THEN
        -- Found: update to canonical name and set student_id
        NEW.student_name := v_resolved.canonical_name;
        IF NEW.student_id IS NULL THEN
            NEW.student_id := v_resolved.canonical_id;
        END IF;
    END IF;
    -- Note: We no longer auto-insert into hp_unknown_names here
    -- Unknown tracking is now handled explicitly via create_unknown_signout
    
    RETURN NEW;
END;
$$;

-- Cleanup backup table after successful migration
-- DROP TABLE IF EXISTS public._hp_unknown_names_backup;

