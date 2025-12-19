-- =============================================================================
-- Fix: raw_student_name should only be populated for unknown passes
-- =============================================================================
-- This migration updates the trigger to ensure:
-- - Normal roster-selected sign-outs: raw_student_name is NULL
-- - Unknown override sign-outs: raw_student_name is populated (handled by RPC)
-- =============================================================================

-- Update the trigger function to NOT set raw_student_name for normal passes
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
    
    -- For normal passes (when student_id is already set), ensure raw_student_name is NULL
    -- raw_student_name should only be populated for unknown passes (handled by RPC)
    IF NEW.student_id IS NOT NULL THEN
        NEW.raw_student_name := NULL;
        -- Still normalize the name, but don't try to resolve (already has student_id)
        RETURN NEW;
    END IF;
    
    -- For legacy cases where student_id is NULL, attempt to resolve
    -- But ensure raw_student_name is cleared once we have student_id
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
        NEW.student_id := v_resolved.canonical_id;
        -- Clear raw_student_name for normal passes (now that we have student_id)
        NEW.raw_student_name := NULL;
    END IF;
    -- Note: We no longer auto-insert into hp_unknown_names here
    -- Unknown tracking is now handled explicitly via create_unknown_signout
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trg_bathroom_passes_normalize_name IS 
'Trigger function that auto-normalizes student names on insert. 
For normal passes (with student_id), raw_student_name is kept NULL.
For unknown passes (is_unknown=true), normalization is skipped (handled by RPC).';

