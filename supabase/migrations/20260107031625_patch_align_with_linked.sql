revoke delete on table "public"."bathroom_passes" from "anon";

revoke references on table "public"."bathroom_passes" from "anon";

revoke trigger on table "public"."bathroom_passes" from "anon";

revoke truncate on table "public"."bathroom_passes" from "anon";

revoke update on table "public"."bathroom_passes" from "anon";

revoke delete on table "public"."hall_pass_corrections" from "anon";

revoke insert on table "public"."hall_pass_corrections" from "anon";

revoke references on table "public"."hall_pass_corrections" from "anon";

revoke select on table "public"."hall_pass_corrections" from "anon";

revoke trigger on table "public"."hall_pass_corrections" from "anon";

revoke truncate on table "public"."hall_pass_corrections" from "anon";

revoke update on table "public"."hall_pass_corrections" from "anon";

set check_function_bodies = off;

create or replace view "public"."hp_frequent_flyers_bathroom_windows" as  WITH now_local AS (
         SELECT (now() AT TIME ZONE 'America/Chicago'::text) AS t
        ), win AS (
         SELECT 'day'::text AS "window",
            date_trunc('day'::text, now_local.t) AS s,
            (date_trunc('day'::text, now_local.t) + '1 day'::interval) AS e
           FROM now_local
        UNION ALL
         SELECT 'week'::text,
            date_trunc('week'::text, now_local.t) AS date_trunc,
            (date_trunc('week'::text, now_local.t) + '7 days'::interval)
           FROM now_local
        UNION ALL
         SELECT 'month'::text,
            date_trunc('month'::text, now_local.t) AS date_trunc,
            (date_trunc('month'::text, now_local.t) + '1 mon'::interval)
           FROM now_local
        UNION ALL
         SELECT 'quarter'::text,
            date_trunc('quarter'::text, now_local.t) AS date_trunc,
            (date_trunc('quarter'::text, now_local.t) + '3 mons'::interval)
           FROM now_local
        ), all_bounds AS (
         SELECT 'all'::text AS "window",
            COALESCE(( SELECT min(hp_base.timeout) AS min
                   FROM public.hp_base), (( SELECT now_local.t
                   FROM now_local))::timestamp with time zone) AS s,
            ( SELECT now_local.t
                   FROM now_local) AS e
        )
 SELECT w."window",
    b.student_name,
    (count(*))::integer AS passes,
    (COALESCE(sum(b.duration), (0)::numeric))::numeric(10,1) AS total_minutes,
    (COALESCE(avg(b.duration), (0)::numeric))::numeric(10,1) AS avg_minutes
   FROM (( SELECT win."window",
            win.s,
            win.e
           FROM win
        UNION ALL
         SELECT all_bounds."window",
            all_bounds.s,
            all_bounds.e
           FROM all_bounds) w
     JOIN public.hp_base b ON (((b.timeout >= w.s) AND (b.timeout < w.e))))
  WHERE (b.destination ~~* ANY (ARRAY['%bath%'::text, '%restroom%'::text, '%rr%'::text]))
  GROUP BY w."window", b.student_name;


create or replace view "public"."hp_student_metrics_windows" as  WITH now_local AS (
         SELECT (now() AT TIME ZONE 'America/Chicago'::text) AS t
        ), win AS (
         SELECT 'day'::text AS "window",
            date_trunc('day'::text, now_local.t) AS s,
            (date_trunc('day'::text, now_local.t) + '1 day'::interval) AS e
           FROM now_local
        UNION ALL
         SELECT 'week'::text,
            date_trunc('week'::text, now_local.t) AS date_trunc,
            (date_trunc('week'::text, now_local.t) + '7 days'::interval)
           FROM now_local
        UNION ALL
         SELECT 'month'::text,
            date_trunc('month'::text, now_local.t) AS date_trunc,
            (date_trunc('month'::text, now_local.t) + '1 mon'::interval)
           FROM now_local
        UNION ALL
         SELECT 'quarter'::text,
            date_trunc('quarter'::text, now_local.t) AS date_trunc,
            (date_trunc('quarter'::text, now_local.t) + '3 mons'::interval)
           FROM now_local
        ), all_bounds AS (
         SELECT 'all'::text AS "window",
            COALESCE(( SELECT min(hp_base.timeout) AS min
                   FROM public.hp_base), (( SELECT now_local.t
                   FROM now_local))::timestamp with time zone) AS s,
            ( SELECT now_local.t
                   FROM now_local) AS e
        ), windows AS (
         SELECT win."window",
            win.s,
            win.e
           FROM win
        UNION ALL
         SELECT all_bounds."window",
            all_bounds.s,
            all_bounds.e
           FROM all_bounds
        ), base AS (
         SELECT b.id,
            b.student_name,
            b.period,
            b.timeout,
            b.timein,
            b.duration,
            b."dayOfWeek",
            b.destination,
            b."earlyDismissal",
            b.classroom,
            lower(b.student_name) AS student_key
           FROM public.hp_base b
        ), scoped AS (
         SELECT w."window",
            'bathroom'::text AS scope,
            b.student_key,
            (count(*))::integer AS passes,
            (COALESCE(sum(b.duration), (0)::numeric))::numeric(10,1) AS total_minutes,
            (COALESCE(avg(b.duration), (0)::numeric))::numeric(10,1) AS avg_minutes
           FROM (windows w
             JOIN base b ON (((b.timeout >= w.s) AND (b.timeout < w.e))))
          WHERE (b.destination ~~* ANY (ARRAY['%bath%'::text, '%restroom%'::text, '%rr%'::text]))
          GROUP BY w."window", b.student_key
        UNION ALL
         SELECT w."window",
            'all'::text AS scope,
            b.student_key,
            (count(*))::integer AS passes,
            (COALESCE(sum(b.duration), (0)::numeric))::numeric(10,1) AS total_minutes,
            (COALESCE(avg(b.duration), (0)::numeric))::numeric(10,1) AS avg_minutes
           FROM (windows w
             JOIN base b ON (((b.timeout >= w.s) AND (b.timeout < w.e))))
          GROUP BY w."window", b.student_key
        )
 SELECT scoped."window",
    scoped.scope,
    scoped.student_key,
    scoped.passes,
    scoped.total_minutes,
    scoped.avg_minutes
   FROM scoped;


CREATE OR REPLACE FUNCTION public.to_local_date_toronto(ts timestamp with time zone)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (ts at time zone 'America/Toronto')::date;
$function$
;



