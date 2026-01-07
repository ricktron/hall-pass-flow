-- Patch3: make analytics views converge with linked DB.
-- These views keep reappearing in `supabase db diff --linked` because view reloptions
-- (especially security_invoker) are not being reconciled by CREATE OR REPLACE VIEW alone.

-- Canonical definitions are taken from /tmp/linked_public.sql (your linked schema dump).

CREATE OR REPLACE VIEW "public"."hp_frequent_flyers_bathroom_windows" AS
 WITH "now_local" AS (
         SELECT ("now"() AT TIME ZONE 'America/Chicago'::"text") AS "t"
        ), "win" AS (
         SELECT 'day'::"text" AS "window",
            "date_trunc"('day'::"text", "now_local"."t") AS "s",
            ("date_trunc"('day'::"text", "now_local"."t") + '1 day'::interval) AS "e"
           FROM "now_local"
        UNION ALL
         SELECT 'week'::"text",
            "date_trunc"('week'::"text", "now_local"."t") AS "date_trunc",
            ("date_trunc"('week'::"text", "now_local"."t") + '7 days'::interval)
           FROM "now_local"
        UNION ALL
         SELECT 'month'::"text",
            "date_trunc"('month'::"text", "now_local"."t") AS "date_trunc",
            ("date_trunc"('month'::"text", "now_local"."t") + '1 mon'::interval)
           FROM "now_local"
        UNION ALL
         SELECT 'quarter'::"text",
            "date_trunc"('quarter'::"text", "now_local"."t") AS "date_trunc",
            ("date_trunc"('quarter'::"text", "now_local"."t") + '3 mons'::interval)
           FROM "now_local"
        ), "all_bounds" AS (
         SELECT 'all'::"text" AS "window",
            COALESCE(( SELECT "min"("hp_base"."timeout") AS "min"
                   FROM "public"."hp_base"), (( SELECT "now_local"."t"
                   FROM "now_local"))::timestamp with time zone) AS "s",
            ( SELECT "now_local"."t"
                   FROM "now_local") AS "e"
        )
 SELECT "w"."window",
    "b"."student_name",
    ("count"(*))::integer AS "passes",
    (COALESCE("sum"("b"."duration"), (0)::numeric))::numeric(10,1) AS "total_minutes",
    (COALESCE("avg"("b"."duration"), (0)::numeric))::numeric(10,1) AS "avg_minutes"
   FROM (( SELECT "win"."window",
            "win"."s",
            "win"."e"
           FROM "win"
        UNION ALL
         SELECT "all_bounds"."window",
            "all_bounds"."s",
            "all_bounds"."e"
           FROM "all_bounds") "w"
     JOIN "public"."hp_base" "b" ON ((("b"."timeout" >= "w"."s") AND ("b"."timeout" < "w"."e"))))
  WHERE ("b"."destination" ~~* ANY (ARRAY['%bath%'::"text", '%restroom%'::"text", '%rr%'::"text"]))
  GROUP BY "w"."window", "b"."student_name";

CREATE OR REPLACE VIEW "public"."hp_student_metrics_windows" AS
 WITH "now_local" AS (
         SELECT ("now"() AT TIME ZONE 'America/Chicago'::"text") AS "t"
        ), "win" AS (
         SELECT 'day'::"text" AS "window",
            "date_trunc"('day'::"text", "now_local"."t") AS "s",
            ("date_trunc"('day'::"text", "now_local"."t") + '1 day'::interval) AS "e"
           FROM "now_local"
        UNION ALL
         SELECT 'week'::"text",
            "date_trunc"('week'::"text", "now_local"."t") AS "date_trunc",
            ("date_trunc"('week'::"text", "now_local"."t") + '7 days'::interval)
           FROM "now_local"
        UNION ALL
         SELECT 'month'::"text",
            "date_trunc"('month'::"text", "now_local"."t") AS "date_trunc",
            ("date_trunc"('month'::"text", "now_local"."t") + '1 mon'::interval)
           FROM "now_local"
        UNION ALL
         SELECT 'quarter'::"text",
            "date_trunc"('quarter'::"text", "now_local"."t") AS "date_trunc",
            ("date_trunc"('quarter'::"text", "now_local"."t") + '3 mons'::interval)
           FROM "now_local"
        ), "all_bounds" AS (
         SELECT 'all'::"text" AS "window",
            COALESCE(( SELECT "min"("hp_base"."timeout") AS "min"
                   FROM "public"."hp_base"), (( SELECT "now_local"."t"
                   FROM "now_local"))::timestamp with time zone) AS "s",
            ( SELECT "now_local"."t"
                   FROM "now_local") AS "e"
        ), "windows" AS (
         SELECT "win"."window",
            "win"."s",
            "win"."e"
           FROM "win"
        UNION ALL
         SELECT "all_bounds"."window",
            "all_bounds"."s",
            "all_bounds"."e"
           FROM "all_bounds"
        ), "base" AS (
         SELECT "b"."id",
            "b"."student_name",
            "b"."period",
            "b"."timeout",
            "b"."timein",
            "b"."duration",
            "b"."dayOfWeek",
            "b"."destination",
            "b"."earlyDismissal",
            "b"."classroom",
            "lower"("b"."student_name") AS "student_key"
           FROM "public"."hp_base" "b"
        ), "scoped" AS (
         SELECT "w"."window",
            'bathroom'::"text" AS "scope",
            "b"."student_key",
            ("count"(*))::integer AS "passes",
            (COALESCE("sum"("b"."duration"), (0)::numeric))::numeric(10,1) AS "total_minutes",
            (COALESCE("avg"("b"."duration"), (0)::numeric))::numeric(10,1) AS "avg_minutes"
           FROM ("windows" "w"
             JOIN "base" "b" ON ((("b"."timeout" >= "w"."s") AND ("b"."timeout" < "w"."e"))))
          WHERE ("b"."destination" ~~* ANY (ARRAY['%bath%'::"text", '%restroom%'::"text", '%rr%'::"text"]))
          GROUP BY "w"."window", "b"."student_key"
        UNION ALL
         SELECT "w"."window",
            'all'::"text" AS "scope",
            "b"."student_key",
            ("count"(*))::integer AS "passes",
            (COALESCE("sum"("b"."duration"), (0)::numeric))::numeric(10,1) AS "total_minutes",
            (COALESCE("avg"("b"."duration"), (0)::numeric))::numeric(10,1) AS "avg_minutes"
           FROM ("windows" "w"
             JOIN "base" "b" ON ((("b"."timeout" >= "w"."s") AND ("b"."timeout" < "w"."e"))))
          GROUP BY "w"."window", "b"."student_key"
        )
 SELECT "scoped"."window",
    "scoped"."scope",
    "scoped"."student_key",
    "scoped"."passes",
    "scoped"."total_minutes",
    "scoped"."avg_minutes"
   FROM "scoped";


-- Force reloptions to match linked DB (linked dump shows no security_invoker on these two views).
ALTER VIEW public.hp_frequent_flyers_bathroom_windows RESET (security_invoker);
ALTER VIEW public.hp_student_metrics_windows RESET (security_invoker);

-- Match linked ownership (pg_dump uses ALTER TABLE for views; either works).
ALTER TABLE "public"."hp_frequent_flyers_bathroom_windows" OWNER TO "postgres";
ALTER TABLE "public"."hp_student_metrics_windows" OWNER TO "postgres";

-- Match linked grants (from your dump).
GRANT ALL ON TABLE "public"."hp_frequent_flyers_bathroom_windows" TO "anon";
GRANT ALL ON TABLE "public"."hp_frequent_flyers_bathroom_windows" TO "authenticated";
GRANT ALL ON TABLE "public"."hp_frequent_flyers_bathroom_windows" TO "service_role";

GRANT ALL ON TABLE "public"."hp_student_metrics_windows" TO "anon";
GRANT ALL ON TABLE "public"."hp_student_metrics_windows" TO "authenticated";
GRANT ALL ON TABLE "public"."hp_student_metrics_windows" TO "service_role";
