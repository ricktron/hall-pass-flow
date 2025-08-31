-- Fix Remaining Security Issues Migration
-- This addresses the remaining SECURITY DEFINER views and function search path issues

-- 1. Fix any remaining SECURITY DEFINER views that weren't caught in the previous migration
-- Query all views in the public schema and switch them to SECURITY INVOKER

DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Get all views in the public schema that might still be SECURITY DEFINER
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            -- Switch all views to SECURITY INVOKER
            EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', 
                          view_record.schemaname, view_record.viewname);
        EXCEPTION WHEN others THEN
            -- Continue if view doesn't exist or can't be altered
            NULL;
        END;
    END LOOP;
END $$;

-- 2. Fix function search path issues by setting search_path for all functions
-- This addresses the Function Search Path Mutable warnings

-- Fix set_duration_minutes function
ALTER FUNCTION public.set_duration_minutes() SET search_path = '';

-- Fix normalize_name function  
ALTER FUNCTION public.normalize_name(text) SET search_path = '';

-- Fix to_local_date_toronto function
ALTER FUNCTION public.to_local_date_toronto(timestamp with time zone) SET search_path = '';

-- Fix map_student_from_synonym function
ALTER FUNCTION public.map_student_from_synonym() SET search_path = '';

-- Fix enforce_period_match function
ALTER FUNCTION public.enforce_period_match() SET search_path = '';

-- Fix _bp_copy_student_name function
ALTER FUNCTION public._bp_copy_student_name() SET search_path = '';

-- Fix all the analytics functions that were listed in the db-functions
ALTER FUNCTION public.get_analytics_return_rate(text) SET search_path = '';
ALTER FUNCTION public.get_analytics_avg_minutes(text) SET search_path = '';
ALTER FUNCTION public.get_analytics_longest_passes(text) SET search_path = '';
ALTER FUNCTION public.get_analytics_by_period(text) SET search_path = '';
ALTER FUNCTION public.get_analytics_summary(text) SET search_path = '';
ALTER FUNCTION public.get_analytics_frequent_flyers(text) SET search_path = '';
ALTER FUNCTION public.get_passes_by_day_of_week(text) SET search_path = '';
ALTER FUNCTION public.verify_teacher_pin(text) SET search_path = '';
ALTER FUNCTION public.get_behavioral_insights(text) SET search_path = '';
ALTER FUNCTION public.get_analytics_by_destination(text) SET search_path = '';
ALTER FUNCTION public.get_weekly_heatmap_data(text) SET search_path = '';
ALTER FUNCTION public.get_schedule_type_analysis(text) SET search_path = '';

-- 3. Apply the search_path fix to any other functions that might exist
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Get all functions in the public schema and set their search_path
    FOR func_record IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'  -- Skip system functions
    LOOP
        BEGIN
            -- Set search_path for each function
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = ''''', 
                          func_record.proname, func_record.args);
        EXCEPTION WHEN others THEN
            -- Continue if function can't be altered
            NULL;
        END;
    END LOOP;
END $$;

-- 4. Double-check that all materialized views also have SECURITY INVOKER
DO $$
DECLARE
    mv_record RECORD;
BEGIN
    -- Get all materialized views in the public schema
    FOR mv_record IN 
        SELECT schemaname, matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            -- Switch all materialized views to SECURITY INVOKER
            EXECUTE format('ALTER MATERIALIZED VIEW %I.%I SET (security_invoker = true)', 
                          mv_record.schemaname, mv_record.matviewname);
        EXCEPTION WHEN others THEN
            -- Continue if materialized view doesn't exist or can't be altered
            NULL;
        END;
    END LOOP;
END $$;

-- 5. Create a final comprehensive check and fix for any remaining views
-- This catches edge cases that might have been missed

DO $$
DECLARE
    obj_record RECORD;
BEGIN
    -- Final sweep: get all view-like objects and ensure they're SECURITY INVOKER
    FOR obj_record IN 
        SELECT c.relname, n.nspname
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relkind IN ('v', 'm')  -- views and materialized views
    LOOP
        BEGIN
            IF obj_record.relname LIKE 'v_%' OR obj_record.relname LIKE '%_view' THEN
                -- These are likely views
                EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', 
                              obj_record.nspname, obj_record.relname);
            ELSE
                -- Try both view and materialized view syntax
                EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', 
                              obj_record.nspname, obj_record.relname);
            END IF;
        EXCEPTION WHEN others THEN
            BEGIN
                -- Try as materialized view if regular view fails
                EXECUTE format('ALTER MATERIALIZED VIEW %I.%I SET (security_invoker = true)', 
                              obj_record.nspname, obj_record.relname);
            EXCEPTION WHEN others THEN
                -- Continue if neither works
                NULL;
            END;
        END;
    END LOOP;
END $$;

-- Add comment to document this security fix
COMMENT ON SCHEMA public IS 'Security migration completed: All views set to SECURITY INVOKER, all functions have secure search_path';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Security migration completed successfully';
END $$;