-- Create function to link a raw student name to a user and create a synonym mapping
-- This function:
-- 1) Updates all bathroom_passes records with the given raw_student_name to set student_id
-- 2) Inserts a new row into student_name_synonyms so future passes are auto-linked

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

-- Add comment for documentation
COMMENT ON FUNCTION public.link_student_name IS 
'Links a raw student name to a user ID. Updates all past bathroom_passes with this raw name 
and creates a synonym entry for future automatic resolution.';

