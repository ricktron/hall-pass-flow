-- =============================================================================
-- V2: Auto-close overdue passes and add destination sort_order
-- =============================================================================
-- This migration adds:
-- 1) Database function hp_auto_close_overdue_passes to auto-close passes >45min old
-- 2) Cron job to run the function every minute (if pg_cron available)
-- 3) ui_test destination for dev testing
-- 4) Ensures sort_order is set for all destinations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Ensure was_auto_closed column exists
-- -----------------------------------------------------------------------------
ALTER TABLE public.bathroom_passes 
ADD COLUMN IF NOT EXISTS was_auto_closed BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- 2) Create function to auto-close overdue passes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hp_auto_close_overdue_passes()
RETURNS TABLE(closed_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_cutoff_time timestamptz;
    v_closed_count int := 0;
BEGIN
    -- Calculate cutoff time (45 minutes ago)
    v_cutoff_time := now() - interval '45 minutes';
    
    -- Update passes that are overdue
    WITH updated AS (
        UPDATE public.bathroom_passes
        SET 
            timein = timeout + interval '45 minutes',
            duration_min = 45,
            was_auto_closed = true
        WHERE 
            timein IS NULL
            AND timeout < v_cutoff_time
        RETURNING id
    )
    SELECT COUNT(*) INTO v_closed_count FROM updated;
    
    RETURN QUERY SELECT v_closed_count;
END;
$$;

COMMENT ON FUNCTION public.hp_auto_close_overdue_passes IS 
'Auto-closes hall passes that are older than 45 minutes. Sets timein, duration_min=45, and was_auto_closed=true.';

GRANT EXECUTE ON FUNCTION public.hp_auto_close_overdue_passes() TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) Schedule cron job to run every minute (if pg_cron is available)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    -- Check if pg_cron extension exists
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Unschedule any existing job with this name
        PERFORM cron.unschedule('hp_auto_close_overdue_passes_job')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'hp_auto_close_overdue_passes_job'
        );
        
        -- Schedule the new job to run every minute
        PERFORM cron.schedule(
            'hp_auto_close_overdue_passes_job',
            '* * * * *',  -- Every minute
            $$SELECT public.hp_auto_close_overdue_passes()$$
        );
        
        RAISE NOTICE 'Scheduled hp_auto_close_overdue_passes to run every minute via pg_cron';
    ELSE
        RAISE NOTICE 'pg_cron extension not available. Auto-close function created but not scheduled.';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) Add ui_test destination for dev testing
-- -----------------------------------------------------------------------------
INSERT INTO public.hall_pass_destinations (key, label, synonyms, active, sort_order)
VALUES 
    ('ui_test', 'UI Test', ARRAY['ui test', 'test', 'dev test']::text[], true, 99)
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    synonyms = EXCLUDED.synonyms,
    active = EXCLUDED.active,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- -----------------------------------------------------------------------------
-- 5) Ensure sort_order is set for all destinations (idempotent)
-- -----------------------------------------------------------------------------
-- Ensure sort_order column exists
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

-- Set sort order for all destinations (update existing, set defaults for new)
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
UPDATE public.hall_pass_destinations SET sort_order = 99 WHERE key = 'ui_test';

-- Set default sort_order for any destinations that don't have one set
UPDATE public.hall_pass_destinations 
SET sort_order = 100 
WHERE sort_order IS NULL OR sort_order = 100 AND key NOT IN (
    'bathroom', 'nurse', 'locker', 'counselor', 'dean_students', 
    'dean_academics', 'testing_center', 'college_visit', 'football_meeting', 
    'other', 'early_dismissal', 'ui_test'
);

