-- Prelude: functions needed by generated columns / early table definitions.

CREATE OR REPLACE FUNCTION public.to_local_date_toronto(ts timestamp with time zone)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  select (ts at time zone 'America/Toronto')::date
$function$;

-- Must match the baseline signature exactly to avoid "cannot change name of input parameter".
CREATE OR REPLACE FUNCTION public.normalize_name(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  select trim(regexp_replace(lower(coalesce(txt,'')), '\s+', ' ', 'g'))
$function$;

