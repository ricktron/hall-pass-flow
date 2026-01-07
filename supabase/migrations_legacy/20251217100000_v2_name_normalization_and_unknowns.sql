-- =============================================================================
-- V2: Server-side name normalization with unknown names tracking
-- =============================================================================
-- This migration adds:
-- 1) hp_unknown_names table to track unmatched names for review
-- 2) hp_norm_name() function for consistent name normalization
-- 3) hp_resolve_student() function to resolve raw names to canonical roster entries
-- 4) BEFORE INSERT trigger on bathroom_passes to auto-normalize names
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Create hp_unknown_names table for tracking unmatched names
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hp_unknown_names (
    raw_norm text PRIMARY KEY,
    raw_example text NOT NULL,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    seen_count int NOT NULL DEFAULT 1,
    resolved_at timestamptz NULL,
    resolved_to_student_id uuid NULL REFERENCES public.users(id)
);

-- RLS: Mirror existing bathroom_passes pattern
ALTER TABLE public.hp_unknown_names ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (teachers need to see and resolve these)
DROP POLICY IF EXISTS "Authenticated full access to hp_unknown_names" ON public.hp_unknown_names;
CREATE POLICY "Authenticated full access to hp_unknown_names"
ON public.hp_unknown_names
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Deny anonymous access
DROP POLICY IF EXISTS "Deny anonymous access to hp_unknown_names" ON public.hp_unknown_names;
CREATE POLICY "Deny anonymous access to hp_unknown_names"
ON public.hp_unknown_names
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

GRANT ALL ON public.hp_unknown_names TO authenticated;

COMMENT ON TABLE public.hp_unknown_names IS 
'Tracks raw student names that could not be auto-resolved to roster entries. Used by Name Corrections UI.';

-- -----------------------------------------------------------------------------
-- 2) Create hp_norm_name() function for consistent name normalization
-- -----------------------------------------------------------------------------
-- More aggressive normalization than existing normalize_name():
-- - lowercase
-- - trim
-- - collapse multiple spaces to single space
-- - remove apostrophes, hyphens (O'Brien -> obrien, Mary-Jane -> maryjane)
-- - remove periods (J.R. -> jr)

CREATE OR REPLACE FUNCTION public.hp_norm_name(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
    SELECT TRIM(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                LOWER(COALESCE(input, '')),
                '[''.\-]', '', 'g'  -- Remove apostrophes, periods, hyphens
            ),
            '\s+', ' ', 'g'  -- Collapse whitespace
        )
    )
$$;

COMMENT ON FUNCTION public.hp_norm_name IS 
'Normalizes a student name for matching: lowercase, collapse whitespace, strip punctuation.';

-- -----------------------------------------------------------------------------
-- 3) Create hp_resolve_student() function
-- -----------------------------------------------------------------------------
-- Resolution order:
--   a) exact normalized match to roster (users.first_name + last_name where role='student')
--   b) match to student_name_synonyms.raw_input (normalized compare)
--   c) return NULLs if not found

CREATE OR REPLACE FUNCTION public.hp_resolve_student(input_name text)
RETURNS TABLE(canonical_name text, canonical_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_norm text;
    v_found_name text;
    v_found_id uuid;
BEGIN
    -- Normalize the input
    v_norm := public.hp_norm_name(input_name);
    
    -- Return empty if input is null/blank
    IF v_norm IS NULL OR v_norm = '' THEN
        RETURN;
    END IF;
    
    -- a) Try exact match against roster (users with role='student')
    SELECT 
        CONCAT(u.first_name, ' ', u.last_name),
        u.id
    INTO v_found_name, v_found_id
    FROM public.users u
    WHERE u.role = 'student'
      AND public.hp_norm_name(CONCAT(u.first_name, ' ', u.last_name)) = v_norm
    LIMIT 1;
    
    IF v_found_id IS NOT NULL THEN
        canonical_name := v_found_name;
        canonical_id := v_found_id;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Also try matching "last, first" format -> "first last"
    SELECT 
        CONCAT(u.first_name, ' ', u.last_name),
        u.id
    INTO v_found_name, v_found_id
    FROM public.users u
    WHERE u.role = 'student'
      AND public.hp_norm_name(CONCAT(u.last_name, ' ', u.first_name)) = v_norm
    LIMIT 1;
    
    IF v_found_id IS NOT NULL THEN
        canonical_name := v_found_name;
        canonical_id := v_found_id;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- b) Try match against student_name_synonyms
    SELECT 
        CONCAT(u.first_name, ' ', u.last_name),
        sns.student_id
    INTO v_found_name, v_found_id
    FROM public.student_name_synonyms sns
    JOIN public.users u ON u.id = sns.student_id
    WHERE public.hp_norm_name(sns.raw_input) = v_norm
    LIMIT 1;
    
    IF v_found_id IS NOT NULL THEN
        canonical_name := v_found_name;
        canonical_id := v_found_id;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- c) Not found - return empty (no rows)
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.hp_resolve_student IS 
'Attempts to resolve a raw student name to a canonical roster entry. Returns empty if not found.';

GRANT EXECUTE ON FUNCTION public.hp_resolve_student(text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Create BEFORE INSERT trigger function for bathroom_passes
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
    ELSE
        -- Not found: track in hp_unknown_names
        INSERT INTO public.hp_unknown_names (raw_norm, raw_example, first_seen_at, last_seen_at, seen_count)
        VALUES (v_raw_norm, NEW.raw_student_name, NOW(), NOW(), 1)
        ON CONFLICT (raw_norm) DO UPDATE SET
            last_seen_at = NOW(),
            seen_count = public.hp_unknown_names.seen_count + 1,
            -- Update example if different (captures variations)
            raw_example = CASE 
                WHEN public.hp_unknown_names.raw_example != EXCLUDED.raw_example 
                THEN EXCLUDED.raw_example 
                ELSE public.hp_unknown_names.raw_example 
            END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_bathroom_passes_normalize_name ON public.bathroom_passes;
CREATE TRIGGER trg_bathroom_passes_normalize_name
    BEFORE INSERT ON public.bathroom_passes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_bathroom_passes_normalize_name();

COMMENT ON FUNCTION public.trg_bathroom_passes_normalize_name IS 
'Trigger function that auto-normalizes student names on insert. 
Resolves to canonical roster names or tracks unknown names for review.';

-- -----------------------------------------------------------------------------
-- 5) Update link_student_name function to also mark hp_unknown_names as resolved
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_student_name(
    p_raw_name TEXT,
    p_student_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_updated_count INTEGER;
    v_user_name TEXT;
    v_synonym_exists BOOLEAN;
    v_raw_norm TEXT;
BEGIN
    -- Validate inputs
    IF p_raw_name IS NULL OR TRIM(p_raw_name) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Raw name cannot be empty'
        );
    END IF;

    IF p_student_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student ID cannot be null'
        );
    END IF;

    -- Verify the student exists in users table
    SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
    FROM public.users
    WHERE id = p_student_id;

    IF v_user_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;

    -- Compute normalized form
    v_raw_norm := public.hp_norm_name(p_raw_name);

    -- Check if this synonym already exists
    SELECT EXISTS (
        SELECT 1 FROM public.student_name_synonyms
        WHERE raw_input = TRIM(p_raw_name)
          AND student_id = p_student_id
    ) INTO v_synonym_exists;

    -- Update all bathroom_passes records with this raw_student_name
    UPDATE public.bathroom_passes
    SET 
        student_id = p_student_id,
        student_name = v_user_name,
        updated_at = NOW()
    WHERE raw_student_name = TRIM(p_raw_name)
      AND (student_id IS NULL OR student_id != p_student_id);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Insert into student_name_synonyms if it doesn't already exist
    IF NOT v_synonym_exists THEN
        INSERT INTO public.student_name_synonyms (raw_input, student_id)
        VALUES (TRIM(p_raw_name), p_student_id);
    END IF;

    -- Mark as resolved in hp_unknown_names
    UPDATE public.hp_unknown_names
    SET resolved_at = NOW(),
        resolved_to_student_id = p_student_id
    WHERE raw_norm = v_raw_norm
      AND resolved_at IS NULL;

    RETURN json_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'student_name', v_user_name,
        'synonym_created', NOT v_synonym_exists
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.link_student_name(TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.link_student_name IS 
'Links a raw student name to a user ID. Updates all past bathroom_passes with this raw name, 
creates a synonym entry for future automatic resolution, and marks the name as resolved in hp_unknown_names.';

-- -----------------------------------------------------------------------------
-- 6) Create view for Name Corrections UI (unresolved unknown names)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.hp_unmatched_names AS
SELECT 
    un.raw_norm,
    un.raw_example AS raw_student_name,
    un.seen_count AS count,
    un.first_seen_at,
    un.last_seen_at
FROM public.hp_unknown_names un
WHERE un.resolved_at IS NULL
ORDER BY un.seen_count DESC, un.last_seen_at DESC;

COMMENT ON VIEW public.hp_unmatched_names IS 
'View for Name Corrections UI showing unresolved student names. 
Matches the existing UI contract: raw_student_name, count.';

GRANT SELECT ON public.hp_unmatched_names TO authenticated;

