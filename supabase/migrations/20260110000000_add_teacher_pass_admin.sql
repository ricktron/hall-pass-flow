-- Add teacher ability to modify or delete pass entries
-- Uses soft delete to preserve data and auditability
-- 
-- Forward plan:
-- 1) Add soft delete columns to bathroom_passes and hp_day_signouts
-- 2) Create audit table for tracking admin actions
-- 3) Create RPC functions for update/delete with SECURITY DEFINER
-- 4) Update get_teacher_dashboard_data to filter deleted rows
-- 5) Update Hall_Passes view to exclude deleted rows
--
-- Rollback plan:
-- 1) Drop RPC functions
-- 2) Drop audit table
-- 3) Remove soft delete columns (data preserved, just columns removed)

-- ============================================================================
-- PART A: Add soft delete columns to bathroom_passes
-- ============================================================================

ALTER TABLE public.bathroom_passes
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS delete_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS teacher_note text;

-- Add index for filtering deleted rows
CREATE INDEX IF NOT EXISTS idx_bathroom_passes_is_deleted 
  ON public.bathroom_passes(is_deleted) 
  WHERE is_deleted = false;

-- Add trigger to update updated_at on row updates
CREATE OR REPLACE FUNCTION public.update_bathroom_passes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_bathroom_passes_updated_at ON public.bathroom_passes;
CREATE TRIGGER trigger_update_bathroom_passes_updated_at
  BEFORE UPDATE ON public.bathroom_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bathroom_passes_updated_at();

-- ============================================================================
-- PART B: Add soft delete columns to hp_day_signouts (early dismissals)
-- ============================================================================

ALTER TABLE public.hp_day_signouts
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS delete_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text;

-- Add index for filtering deleted rows
CREATE INDEX IF NOT EXISTS idx_hp_day_signouts_is_deleted 
  ON public.hp_day_signouts(is_deleted) 
  WHERE is_deleted = false;

-- Add trigger to update updated_at on row updates
CREATE OR REPLACE FUNCTION public.update_hp_day_signouts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_hp_day_signouts_updated_at ON public.hp_day_signouts;
CREATE TRIGGER trigger_update_hp_day_signouts_updated_at
  BEFORE UPDATE ON public.hp_day_signouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hp_day_signouts_updated_at();

-- ============================================================================
-- PART C: Create audit table for tracking admin actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pass_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL CHECK (action IN ('update', 'delete')),
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  actor text NOT NULL,
  reason text,
  before_data jsonb,
  after_data jsonb
);

-- Index for querying by table and row
CREATE INDEX IF NOT EXISTS idx_pass_admin_audit_table_row 
  ON public.pass_admin_audit(table_name, row_id);

-- Index for querying by actor
CREATE INDEX IF NOT EXISTS idx_pass_admin_audit_actor 
  ON public.pass_admin_audit(actor, created_at DESC);

-- RLS: Only authenticated users can read audit logs
ALTER TABLE public.pass_admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pass_admin_audit"
  ON public.pass_admin_audit
  FOR SELECT
  TO authenticated
  USING (true);

-- Deny all other operations (only RPCs can insert)
CREATE POLICY "Deny all writes to pass_admin_audit"
  ON public.pass_admin_audit
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

GRANT SELECT ON public.pass_admin_audit TO authenticated;

COMMENT ON TABLE public.pass_admin_audit IS 
'Audit log for teacher/admin actions on pass entries. Tracks updates and soft deletes with before/after snapshots.';

-- ============================================================================
-- PART D: Create RPC function for updating passes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hp_admin_update_pass(
  p_row_id uuid,
  p_patch jsonb,
  p_actor text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_allowed_keys text[] := ARRAY['destination', 'timeout', 'timein', 'period', 'teacher_note'];
  v_key text;
  v_update_sql text;
  v_set_clauses text[] := ARRAY[]::text[];
BEGIN
  -- Validate actor
  IF p_actor IS NULL OR TRIM(p_actor) = '' THEN
    RAISE EXCEPTION 'Actor is required';
  END IF;

  -- Validate that row exists and is not deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.bathroom_passes 
    WHERE id = p_row_id AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Pass entry not found or already deleted';
  END IF;

  -- Validate patch keys (only allow specific fields)
  FOR v_key IN SELECT jsonb_object_keys(p_patch)
  LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'Field "%" is not allowed for updates. Allowed fields: %', v_key, array_to_string(v_allowed_keys, ', ');
    END IF;
  END LOOP;

  -- Get before snapshot
  SELECT to_jsonb(bp.*) INTO v_before
  FROM public.bathroom_passes bp
  WHERE bp.id = p_row_id;

  -- Build update statement dynamically
  IF p_patch ? 'destination' THEN
    v_set_clauses := array_append(v_set_clauses, format('destination = %L', p_patch->>'destination'));
  END IF;
  IF p_patch ? 'timeout' THEN
    v_set_clauses := array_append(v_set_clauses, format('timeout = %L::timestamptz', p_patch->>'timeout'));
  END IF;
  IF p_patch ? 'timein' THEN
    v_set_clauses := array_append(v_set_clauses, format('timein = %L::timestamptz', p_patch->>'timein'));
  END IF;
  IF p_patch ? 'period' THEN
    v_set_clauses := array_append(v_set_clauses, format('period = %L', p_patch->>'period'));
  END IF;
  IF p_patch ? 'teacher_note' THEN
    v_set_clauses := array_append(v_set_clauses, format('teacher_note = %L', p_patch->>'teacher_note'));
  END IF;

  -- Always update updated_by and updated_at (trigger handles updated_at)
  v_set_clauses := array_append(v_set_clauses, format('updated_by = %L', p_actor));

  -- Execute update
  v_update_sql := format(
    'UPDATE public.bathroom_passes SET %s WHERE id = %L',
    array_to_string(v_set_clauses, ', '),
    p_row_id
  );
  EXECUTE v_update_sql;

  -- Get after snapshot
  SELECT to_jsonb(bp.*) INTO v_after
  FROM public.bathroom_passes bp
  WHERE bp.id = p_row_id;

  -- Write to audit table
  INSERT INTO public.pass_admin_audit (
    action, table_name, row_id, actor, reason, before_data, after_data
  ) VALUES (
    'update', 'bathroom_passes', p_row_id, p_actor, p_reason, v_before, v_after
  );

  -- Return updated row
  RETURN v_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hp_admin_update_pass(uuid, jsonb, text, text) TO authenticated;

COMMENT ON FUNCTION public.hp_admin_update_pass IS 
'Allows teachers to update pass entries. Validates allowed fields and logs changes to audit table.';

-- ============================================================================
-- PART E: Create RPC function for soft deleting passes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hp_admin_delete_pass(
  p_row_id uuid,
  p_actor text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
BEGIN
  -- Validate inputs
  IF p_actor IS NULL OR TRIM(p_actor) = '' THEN
    RAISE EXCEPTION 'Actor is required';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Delete reason is required';
  END IF;

  -- Validate that row exists and is not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.bathroom_passes 
    WHERE id = p_row_id AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Pass entry not found or already deleted';
  END IF;

  -- Get before snapshot
  SELECT to_jsonb(bp.*) INTO v_before
  FROM public.bathroom_passes bp
  WHERE bp.id = p_row_id;

  -- Soft delete
  UPDATE public.bathroom_passes
  SET 
    is_deleted = true,
    deleted_at = now(),
    deleted_by = p_actor,
    delete_reason = p_reason,
    updated_at = now(),
    updated_by = p_actor
  WHERE id = p_row_id;

  -- Get after snapshot
  SELECT to_jsonb(bp.*) INTO v_after
  FROM public.bathroom_passes bp
  WHERE bp.id = p_row_id;

  -- Write to audit table
  INSERT INTO public.pass_admin_audit (
    action, table_name, row_id, actor, reason, before_data, after_data
  ) VALUES (
    'delete', 'bathroom_passes', p_row_id, p_actor, p_reason, v_before, v_after
  );

  -- Return updated row
  RETURN v_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hp_admin_delete_pass(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.hp_admin_delete_pass IS 
'Soft deletes a pass entry. Sets is_deleted=true and logs to audit table.';

-- ============================================================================
-- PART F: Update Hall_Passes view to exclude deleted rows
-- ============================================================================

CREATE OR REPLACE VIEW public."Hall_Passes" AS
SELECT 
  bp.id::text AS id,
  bp.student_name AS "studentName",
  bp.student_id AS "studentId",
  bp.period,
  bp.destination,
  bp.timeout AS "timeOut",
  bp.timein AS "timeIn",
  bp.notes,
  bp.classroom,
  bp.teacher_note
FROM public.bathroom_passes bp
WHERE bp.is_deleted = false;

-- ============================================================================
-- PART G: Update hp_base view to exclude deleted rows (used by analytics)
-- ============================================================================

CREATE OR REPLACE VIEW public.hp_base WITH (security_invoker=true) AS
SELECT
    id,
    student_name,
    period,
    timeout,
    timein,
    duration_min AS duration,
    to_char(timeout, 'Day') AS "dayOfWeek",
    destination,
    overrode_period AS "earlyDismissal",
    classroom
FROM public.bathroom_passes
WHERE is_deleted = false;

-- ============================================================================
-- PART H: Update get_teacher_dashboard_data RPC to exclude deleted rows
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_teacher_dashboard_data()
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    result JSON;
    currently_out_students JSON;
    today_stats JSON;
    start_iso TEXT;
    end_iso TEXT;
    week_start_iso TEXT;
BEGIN
    -- Get today's bounds in ISO format (Toronto timezone)
    start_iso := (current_date AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    end_iso := ((current_date + interval '1 day') AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
    -- Get this week's start (Monday)
    week_start_iso := (date_trunc('week', current_date) AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
    -- Get currently out students with more details (optimized query)
    -- Filter out deleted rows
    SELECT COALESCE(json_agg(
        json_build_object(
            'studentName', "studentName",
            'period', period,
            'timeOut', "timeOut",
            'destination', COALESCE(destination, 'Unknown'),
            'minutesOut', CASE 
                WHEN "timeOut" IS NOT NULL 
                THEN CEIL(EXTRACT(EPOCH FROM (now() - "timeOut")) / 60.0)::INTEGER
                ELSE 0 
            END,
            'id', id
        )
        ORDER BY "timeOut" DESC
    ), '[]'::json) INTO currently_out_students
    FROM public."Hall_Passes"
    WHERE "timeIn" IS NULL;
    
    -- Get today's comprehensive stats with single query optimization
    -- Filter out deleted rows
    WITH today_passes AS (
        SELECT 
            "studentName",
            period,
            "timeOut",
            "timeIn",
            CASE 
                WHEN "timeIn" IS NOT NULL AND "timeOut" IS NOT NULL 
                THEN CEIL(EXTRACT(EPOCH FROM ("timeIn" - "timeOut")) / 60.0)::INTEGER
                ELSE NULL 
            END as duration_minutes
        FROM public."Hall_Passes"
        WHERE "timeOut" >= start_iso::timestamp with time zone
        AND "timeOut" < end_iso::timestamp with time zone
    ),
    aggregated_stats AS (
        SELECT 
            COUNT(*) as total_passes,
            COUNT(DISTINCT "studentName") as unique_students,
            COUNT(*) FILTER (WHERE "timeIn" IS NOT NULL) as returned_passes,
            COALESCE(ROUND(AVG(duration_minutes::numeric), 1), 0) as avg_duration,
            COALESCE(MAX(duration_minutes), 0) as max_duration
        FROM today_passes
    ),
    period_counts AS (
        SELECT period, COUNT(*) as count
        FROM today_passes
        WHERE period IS NOT NULL
        GROUP BY period
    ),
    week_student_minutes AS (
        SELECT 
            "studentName", 
            COALESCE(SUM(
                CASE 
                    WHEN "timeIn" IS NOT NULL AND "timeOut" IS NOT NULL 
                    THEN CEIL(EXTRACT(EPOCH FROM ("timeIn" - "timeOut")) / 60.0)::INTEGER
                    ELSE 0 
                END
            ), 0) as total_minutes
        FROM public."Hall_Passes"
        WHERE "timeOut" >= week_start_iso::timestamp with time zone
        AND "timeOut" < end_iso::timestamp with time zone
        AND "studentName" IS NOT NULL
        GROUP BY "studentName"
        ORDER BY total_minutes DESC
        LIMIT 5
    )
    SELECT json_build_object(
        'totalPasses', agg.total_passes,
        'byPeriod', (
            SELECT COALESCE(json_object_agg(period, count), '{}'::json)
            FROM period_counts
        ),
        'topLeavers', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'studentName', "studentName",
                    'totalMinutes', total_minutes
                )
                ORDER BY total_minutes DESC
            ), '[]'::json)
            FROM week_student_minutes
        ),
        'avgDurationMinutes', agg.avg_duration,
        'longestDurationMinutes', agg.max_duration,
        'totalStudentsOut', agg.unique_students,
        'returnRate', (
            CASE 
                WHEN agg.total_passes > 0 
                THEN ROUND((agg.returned_passes::numeric / agg.total_passes) * 100, 1)
                ELSE 0 
            END
        )
    ) INTO today_stats
    FROM aggregated_stats agg;
    
    -- Build final result with enhanced data structure
    result := json_build_object(
        'currentlyOutStudents', currently_out_students,
        'currentlyOutCount', json_array_length(currently_out_students),
        'todayStats', today_stats,
        'lastUpdated', now(),
        'refreshInterval', 60000
    );
    
    RETURN result;
END;
$function$
;

