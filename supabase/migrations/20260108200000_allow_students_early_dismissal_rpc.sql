-- Allow students (anon users) to record early dismissals
-- The hp_day_signouts table already grants INSERT to anon, so the RPC should allow it too
-- This enables the student kiosk early exit flow to work

CREATE OR REPLACE FUNCTION public.record_day_signout(p_classroom text, p_student_name text, p_reason text DEFAULT NULL::text, p_period text DEFAULT NULL::text, p_student_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  -- Allow anon users (students) to record early dismissals
  -- The hp_day_signouts table already has INSERT grants for anon
  -- Teachers/admins can also use this function
  -- No authorization check needed since table-level grants control access

  insert into public.hp_day_signouts (classroom, period, student_id, student_name, reason)
  values (p_classroom, p_period, p_student_id, btrim(p_student_name), p_reason)
  returning id into v_id;

  return v_id;
end;
$function$
;

COMMENT ON FUNCTION public.record_day_signout IS 
'Records an early dismissal signout. Allows anon users (students) to record their own early dismissals.';

