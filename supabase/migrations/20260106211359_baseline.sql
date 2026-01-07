create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create schema if not exists "archive";

create extension if not exists "pg_trgm" with schema "public";

create type "public"."location_type" as enum ('classroom', 'restroom', 'library', 'office', 'other', 'athletics', 'hallway', 'chapel', 'theater');

create type "public"."pass_status" as enum ('ACTIVE', 'RETURNED', 'LATE');

create type "public"."user_role" as enum ('student', 'teacher', 'admin');

create sequence "public"."academic_terms_id_seq";

create sequence "public"."courses_id_seq";

create sequence "public"."hall_passes_id_seq";

create sequence "public"."locations_id_seq";

create sequence "public"."rosters_id_seq";

create sequence "public"."settings_id_seq";


  create table "archive"."bathroom_passes_20250820" (
    "id" uuid,
    "raw_student_name" text,
    "student_id" uuid,
    "period" text,
    "timeout" timestamp with time zone,
    "timein" timestamp with time zone,
    "destination" text,
    "notes" text,
    "was_auto_closed" boolean,
    "manual_adjust_min" numeric,
    "manual_adjust_reason" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "period_norm" text,
    "date_local" date,
    "duration_min" numeric,
    "pass_status" text,
    "overrode_period" boolean,
    "override_reason" text
      );



  create table "archive"."passes_period_check" (
    "pass_id" uuid,
    "timeout" timestamp with time zone,
    "date_local" date,
    "student_display" text,
    "student_id" uuid,
    "entered_period" text,
    "roster_period" text,
    "period_matches" boolean
      );



  create table "archive"."passes_period_check_loose" (
    "pass_id" uuid,
    "timeout" timestamp with time zone,
    "date_local" date,
    "student_display" text,
    "student_id" uuid,
    "entered_period" text,
    "roster_period" text,
    "period_matches" boolean,
    "candidate_count" bigint
      );



  create table "archive"."passes_weekly_digest" (
    "week_start" date,
    "period_norm" text,
    "trips" bigint,
    "median_min" numeric,
    "p90_min" numeric
      );



  create table "archive"."students_id_import" (
    "first_name" text,
    "last_name" text,
    "sis_id" text
      );



  create table "archive"."students_import" (
    "first_name" text,
    "last_name" text,
    "preferred_name" text,
    "roster_block" text,
    "period_code" text,
    "email" text
      );



  create table "public"."Classroom_Arrivals" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "student_name" text,
    "period" text,
    "time_in" timestamp with time zone default now(),
    "arrival_reason" text
      );


alter table "public"."Classroom_Arrivals" enable row level security;


  create table "public"."Hall_Passes_deleted_backup" (
    "id" uuid,
    "studentName" text,
    "studentId" uuid,
    "period" text,
    "destination" text,
    "timeOut" timestamp with time zone,
    "timeIn" timestamp with time zone,
    "notes" text,
    "classroom" text
      );


alter table "public"."Hall_Passes_deleted_backup" enable row level security;


  create table "public"."academic_terms" (
    "id" bigint not null default nextval('public.academic_terms_id_seq'::regclass),
    "name" text not null,
    "start_date" date not null,
    "end_date" date not null
      );


alter table "public"."academic_terms" enable row level security;


  create table "public"."bathroom_passes" (
    "id" uuid not null default gen_random_uuid(),
    "raw_student_name" text,
    "student_id" uuid not null,
    "period" text,
    "timeout" timestamp with time zone,
    "timein" timestamp with time zone,
    "destination" text,
    "notes" text,
    "was_auto_closed" boolean not null default false,
    "manual_adjust_min" numeric,
    "manual_adjust_reason" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "period_norm" text generated always as (upper(TRIM(BOTH FROM period))) stored,
    "date_local" date generated always as (public.to_local_date_toronto(timeout)) stored,
    "duration_min" numeric generated always as (
CASE
    WHEN ((timein IS NOT NULL) AND (timeout IS NOT NULL)) THEN (EXTRACT(epoch FROM (timein - timeout)) / 60.0)
    ELSE NULL::numeric
END) stored,
    "pass_status" text generated always as (
CASE
    WHEN ((timein IS NULL) AND (timeout IS NOT NULL)) THEN 'out'::text
    WHEN (timein IS NOT NULL) THEN 'returned'::text
    ELSE 'draft'::text
END) stored,
    "overrode_period" boolean not null default false,
    "override_reason" text,
    "student_name" text,
    "classroom" text,
    "destination_key" text,
    "unknown_name_id" uuid,
    "is_unknown" boolean not null default false
      );


alter table "public"."bathroom_passes" enable row level security;


  create table "public"."classroom_arrivals" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "student_name" text not null,
    "period" text not null,
    "time_in" timestamp with time zone not null default now(),
    "arrival_reason" text
      );


alter table "public"."classroom_arrivals" enable row level security;


  create table "public"."classrooms" (
    "id" text not null,
    "teacher_email" text
      );


alter table "public"."classrooms" enable row level security;


  create table "public"."courses" (
    "id" bigint not null default nextval('public.courses_id_seq'::regclass),
    "course_code" text not null,
    "course_name" text
      );


alter table "public"."courses" enable row level security;


  create table "public"."destinations" (
    "name" text not null,
    "active" boolean not null default true,
    "sort" integer not null default 100
      );



  create table "public"."enrollment_import" (
    "student_email" text not null,
    "school_year" text not null,
    "semester" text not null,
    "course" text not null,
    "period" text not null
      );



  create table "public"."grades_normalized" (
    "student_key" text not null,
    "term" text,
    "course" text,
    "avg_grade" numeric(5,2) not null
      );



  create table "public"."hall_pass_corrections" (
    "pass_id" uuid not null,
    "corrected_duration" integer not null,
    "corrected_by" text,
    "corrected_reason" text,
    "corrected_at" timestamp with time zone default now()
      );


alter table "public"."hall_pass_corrections" enable row level security;


  create table "public"."hall_pass_destinations" (
    "key" text not null,
    "label" text not null,
    "active" boolean not null default true,
    "synonyms" text[] not null default '{}'::text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "sort_order" integer
      );



  create table "public"."hall_passes" (
    "id" bigint not null default nextval('public.hall_passes_id_seq'::regclass),
    "student_id" uuid not null,
    "issued_by" uuid not null,
    "origin_id" bigint not null,
    "destination_id" bigint not null,
    "time_out" timestamp with time zone not null default now(),
    "time_in" timestamp with time zone,
    "status" public.pass_status not null default 'ACTIVE'::public.pass_status
      );


alter table "public"."hall_passes" enable row level security;


  create table "public"."hp_day_signouts" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "classroom" text not null,
    "period" text,
    "student_id" uuid,
    "student_name" text not null,
    "reason" text,
    "created_by" uuid default auth.uid()
      );



  create table "public"."hp_unknown_names" (
    "id" uuid not null default gen_random_uuid(),
    "raw_name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "status" text not null default 'pending'::text,
    "resolved_student_id" uuid,
    "resolved_at" timestamp with time zone,
    "notes" text,
    "example_raw" text,
    "raw_examples" text[] not null default '{}'::text[],
    "seen_count" integer not null default 0,
    "first_seen_at" timestamp with time zone not null default now(),
    "last_seen_at" timestamp with time zone not null default now()
      );



  create table "public"."locations" (
    "id" bigint not null default nextval('public.locations_id_seq'::regclass),
    "name" text not null,
    "type" public.location_type,
    "user_id" uuid
      );


alter table "public"."locations" enable row level security;


  create table "public"."period_meta" (
    "period" text not null,
    "start_local" time without time zone,
    "end_local" time without time zone,
    "is_after_lunch" boolean default false,
    "is_last_period" boolean default false
      );


alter table "public"."period_meta" enable row level security;


  create table "public"."rosters" (
    "id" bigint not null default nextval('public.rosters_id_seq'::regclass),
    "student_id" uuid not null,
    "course_id" bigint not null,
    "academic_term_id" bigint not null,
    "period_code" text
      );


alter table "public"."rosters" enable row level security;


  create table "public"."settings" (
    "id" bigint not null default nextval('public.settings_id_seq'::regclass),
    "setting_name" text not null,
    "value" text,
    "description" text
      );


alter table "public"."settings" enable row level security;


  create table "public"."student_enrollments" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid not null,
    "school_year" text not null,
    "semester" text not null,
    "course" text not null,
    "period" text not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."student_name_synonyms" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "raw_input" text not null,
    "student_id" uuid not null
      );


alter table "public"."student_name_synonyms" enable row level security;


  create table "public"."students" (
    "id" uuid not null,
    "sis_id" text,
    "grade_level" integer
      );


alter table "public"."students" enable row level security;


  create table "public"."teacher_pin_config" (
    "scope" text not null,
    "pin_hash" text not null,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."teacher_pins" (
    "teacher_id" uuid not null,
    "pin_hash" text not null,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "first_name" text not null,
    "last_name" text not null,
    "email" text not null,
    "role" public.user_role not null,
    "nickname" text
      );


alter table "public"."users" enable row level security;

alter sequence "public"."academic_terms_id_seq" owned by "public"."academic_terms"."id";

alter sequence "public"."courses_id_seq" owned by "public"."courses"."id";

alter sequence "public"."hall_passes_id_seq" owned by "public"."hall_passes"."id";

alter sequence "public"."locations_id_seq" owned by "public"."locations"."id";

alter sequence "public"."rosters_id_seq" owned by "public"."rosters"."id";

alter sequence "public"."settings_id_seq" owned by "public"."settings"."id";

CREATE UNIQUE INDEX "Classroom_Arrivals_pkey" ON public."Classroom_Arrivals" USING btree (id);

CREATE UNIQUE INDEX academic_terms_pkey ON public.academic_terms USING btree (id);

CREATE INDEX bathroom_passes_destination_trgm ON public.bathroom_passes USING gin (destination public.gin_trgm_ops);

CREATE UNIQUE INDEX bathroom_passes_pkey ON public.bathroom_passes USING btree (id);

CREATE INDEX bathroom_passes_timeout_period_idx ON public.bathroom_passes USING btree (timeout, period);

CREATE UNIQUE INDEX classroom_arrivals_pkey ON public.classroom_arrivals USING btree (id);

CREATE UNIQUE INDEX classrooms_pkey ON public.classrooms USING btree (id);

CREATE UNIQUE INDEX classrooms_teacher_email_key ON public.classrooms USING btree (teacher_email);

CREATE UNIQUE INDEX courses_pkey ON public.courses USING btree (id);

CREATE UNIQUE INDEX destinations_pkey ON public.destinations USING btree (name);

CREATE INDEX grades_norm_student_idx ON public.grades_normalized USING btree (student_key);

CREATE INDEX grades_norm_term_idx ON public.grades_normalized USING btree (term);

CREATE UNIQUE INDEX hall_pass_corrections_pkey ON public.hall_pass_corrections USING btree (pass_id);

CREATE UNIQUE INDEX hall_pass_destinations_pkey ON public.hall_pass_destinations USING btree (key);

CREATE UNIQUE INDEX hall_passes_pkey ON public.hall_passes USING btree (id);

CREATE UNIQUE INDEX hp_day_signouts_pkey ON public.hp_day_signouts USING btree (id);

CREATE UNIQUE INDEX hp_unknown_names_pkey ON public.hp_unknown_names USING btree (id);

CREATE UNIQUE INDEX hp_unknown_names_raw_name_key ON public.hp_unknown_names USING btree (raw_name);

CREATE INDEX idx_bathroom_passes_classroom ON public.bathroom_passes USING btree (classroom);

CREATE INDEX idx_bathroom_passes_destination_key ON public.bathroom_passes USING btree (destination_key);

CREATE INDEX idx_bathroom_passes_period ON public.bathroom_passes USING btree (period);

CREATE INDEX idx_bathroom_passes_timeout ON public.bathroom_passes USING btree (timeout);

CREATE INDEX idx_passes_date_local ON public.bathroom_passes USING btree (date_local);

CREATE INDEX idx_passes_period_norm ON public.bathroom_passes USING btree (period_norm);

CREATE INDEX idx_passes_status ON public.bathroom_passes USING btree (pass_status);

CREATE INDEX idx_passes_student_id ON public.bathroom_passes USING btree (student_id);

CREATE INDEX idx_sns_raw_norm ON public.student_name_synonyms USING btree (public.normalize_name(raw_input));

CREATE INDEX idx_student_enrollments_lookup ON public.student_enrollments USING btree (school_year, semester, course, period);

CREATE INDEX idx_users_full_norm ON public.users USING btree (public.normalize_name(((first_name || ' '::text) || last_name)));

CREATE INDEX idx_users_nicklast_norm ON public.users USING btree (public.normalize_name(((COALESCE(nickname, ''::text) || ' '::text) || last_name))) WHERE (nickname IS NOT NULL);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX one_open_pass_per_raw_name ON public.bathroom_passes USING btree (raw_student_name) WHERE ((student_id IS NULL) AND (raw_student_name IS NOT NULL) AND (timein IS NULL));

CREATE UNIQUE INDEX one_open_pass_per_student ON public.bathroom_passes USING btree (student_id) WHERE ((student_id IS NOT NULL) AND (timein IS NULL));

CREATE UNIQUE INDEX period_meta_pkey ON public.period_meta USING btree (period);

CREATE UNIQUE INDEX rosters_pkey ON public.rosters USING btree (id);

CREATE UNIQUE INDEX settings_pkey ON public.settings USING btree (id);

CREATE UNIQUE INDEX settings_setting_name_key ON public.settings USING btree (setting_name);

CREATE UNIQUE INDEX student_enrollments_pkey ON public.student_enrollments USING btree (id);

CREATE UNIQUE INDEX student_enrollments_student_id_school_year_semester_course_key ON public.student_enrollments USING btree (student_id, school_year, semester, course);

CREATE UNIQUE INDEX student_name_synonyms_pkey ON public.student_name_synonyms USING btree (id);

CREATE UNIQUE INDEX student_name_synonyms_raw_input_key ON public.student_name_synonyms USING btree (raw_input);

CREATE UNIQUE INDEX students_pkey ON public.students USING btree (id);

CREATE UNIQUE INDEX teacher_pin_config_pkey ON public.teacher_pin_config USING btree (scope);

CREATE UNIQUE INDEX teacher_pins_pkey ON public.teacher_pins USING btree (teacher_id);

CREATE UNIQUE INDEX unique_active_pass ON public.bathroom_passes USING btree (student_id) WHERE (timein IS NULL);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."Classroom_Arrivals" add constraint "Classroom_Arrivals_pkey" PRIMARY KEY using index "Classroom_Arrivals_pkey";

alter table "public"."academic_terms" add constraint "academic_terms_pkey" PRIMARY KEY using index "academic_terms_pkey";

alter table "public"."bathroom_passes" add constraint "bathroom_passes_pkey" PRIMARY KEY using index "bathroom_passes_pkey";

alter table "public"."classroom_arrivals" add constraint "classroom_arrivals_pkey" PRIMARY KEY using index "classroom_arrivals_pkey";

alter table "public"."classrooms" add constraint "classrooms_pkey" PRIMARY KEY using index "classrooms_pkey";

alter table "public"."courses" add constraint "courses_pkey" PRIMARY KEY using index "courses_pkey";

alter table "public"."destinations" add constraint "destinations_pkey" PRIMARY KEY using index "destinations_pkey";

alter table "public"."hall_pass_corrections" add constraint "hall_pass_corrections_pkey" PRIMARY KEY using index "hall_pass_corrections_pkey";

alter table "public"."hall_pass_destinations" add constraint "hall_pass_destinations_pkey" PRIMARY KEY using index "hall_pass_destinations_pkey";

alter table "public"."hall_passes" add constraint "hall_passes_pkey" PRIMARY KEY using index "hall_passes_pkey";

alter table "public"."hp_day_signouts" add constraint "hp_day_signouts_pkey" PRIMARY KEY using index "hp_day_signouts_pkey";

alter table "public"."hp_unknown_names" add constraint "hp_unknown_names_pkey" PRIMARY KEY using index "hp_unknown_names_pkey";

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."period_meta" add constraint "period_meta_pkey" PRIMARY KEY using index "period_meta_pkey";

alter table "public"."rosters" add constraint "rosters_pkey" PRIMARY KEY using index "rosters_pkey";

alter table "public"."settings" add constraint "settings_pkey" PRIMARY KEY using index "settings_pkey";

alter table "public"."student_enrollments" add constraint "student_enrollments_pkey" PRIMARY KEY using index "student_enrollments_pkey";

alter table "public"."student_name_synonyms" add constraint "student_name_synonyms_pkey" PRIMARY KEY using index "student_name_synonyms_pkey";

alter table "public"."students" add constraint "students_pkey" PRIMARY KEY using index "students_pkey";

alter table "public"."teacher_pin_config" add constraint "teacher_pin_config_pkey" PRIMARY KEY using index "teacher_pin_config_pkey";

alter table "public"."teacher_pins" add constraint "teacher_pins_pkey" PRIMARY KEY using index "teacher_pins_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."bathroom_passes" add constraint "bathroom_passes_unknown_name_id_fkey" FOREIGN KEY (unknown_name_id) REFERENCES public.hp_unknown_names(id) not valid;

alter table "public"."bathroom_passes" validate constraint "bathroom_passes_unknown_name_id_fkey";

alter table "public"."bathroom_passes" add constraint "ck_duration_nonneg" CHECK (((duration_min IS NULL) OR (duration_min >= (0)::numeric))) not valid;

alter table "public"."bathroom_passes" validate constraint "ck_duration_nonneg";

alter table "public"."bathroom_passes" add constraint "fk_bathroom_passes_classroom" FOREIGN KEY (classroom) REFERENCES public.classrooms(id) not valid;

alter table "public"."bathroom_passes" validate constraint "fk_bathroom_passes_classroom";

alter table "public"."bathroom_passes" add constraint "fk_bathroom_passes_destination_key" FOREIGN KEY (destination_key) REFERENCES public.hall_pass_destinations(key) not valid;

alter table "public"."bathroom_passes" validate constraint "fk_bathroom_passes_destination_key";

alter table "public"."bathroom_passes" add constraint "fk_student_user" FOREIGN KEY (student_id) REFERENCES public.users(id) not valid;

alter table "public"."bathroom_passes" validate constraint "fk_student_user";

alter table "public"."classrooms" add constraint "classrooms_teacher_email_key" UNIQUE using index "classrooms_teacher_email_key";

alter table "public"."hall_passes" add constraint "hall_passes_destination_id_fkey" FOREIGN KEY (destination_id) REFERENCES public.locations(id) not valid;

alter table "public"."hall_passes" validate constraint "hall_passes_destination_id_fkey";

alter table "public"."hall_passes" add constraint "hall_passes_issued_by_fkey" FOREIGN KEY (issued_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."hall_passes" validate constraint "hall_passes_issued_by_fkey";

alter table "public"."hall_passes" add constraint "hall_passes_origin_id_fkey" FOREIGN KEY (origin_id) REFERENCES public.locations(id) not valid;

alter table "public"."hall_passes" validate constraint "hall_passes_origin_id_fkey";

alter table "public"."hall_passes" add constraint "hall_passes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."hall_passes" validate constraint "hall_passes_student_id_fkey";

alter table "public"."hp_day_signouts" add constraint "hp_day_signouts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.users(id) not valid;

alter table "public"."hp_day_signouts" validate constraint "hp_day_signouts_student_id_fkey";

alter table "public"."hp_unknown_names" add constraint "hp_unknown_names_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."hp_unknown_names" validate constraint "hp_unknown_names_created_by_fkey";

alter table "public"."hp_unknown_names" add constraint "hp_unknown_names_raw_name_key" UNIQUE using index "hp_unknown_names_raw_name_key";

alter table "public"."hp_unknown_names" add constraint "hp_unknown_names_resolved_student_id_fkey" FOREIGN KEY (resolved_student_id) REFERENCES public.users(id) not valid;

alter table "public"."hp_unknown_names" validate constraint "hp_unknown_names_resolved_student_id_fkey";

alter table "public"."hp_unknown_names" add constraint "hp_unknown_names_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text, 'rejected'::text]))) not valid;

alter table "public"."hp_unknown_names" validate constraint "hp_unknown_names_status_check";

alter table "public"."locations" add constraint "locations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."locations" validate constraint "locations_user_id_fkey";

alter table "public"."rosters" add constraint "rosters_academic_term_id_fkey" FOREIGN KEY (academic_term_id) REFERENCES public.academic_terms(id) ON DELETE CASCADE not valid;

alter table "public"."rosters" validate constraint "rosters_academic_term_id_fkey";

alter table "public"."rosters" add constraint "rosters_course_id_fkey" FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE not valid;

alter table "public"."rosters" validate constraint "rosters_course_id_fkey";

alter table "public"."rosters" add constraint "rosters_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."rosters" validate constraint "rosters_student_id_fkey";

alter table "public"."settings" add constraint "settings_setting_name_key" UNIQUE using index "settings_setting_name_key";

alter table "public"."student_enrollments" add constraint "student_enrollments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."student_enrollments" validate constraint "student_enrollments_student_id_fkey";

alter table "public"."student_enrollments" add constraint "student_enrollments_student_id_school_year_semester_course_key" UNIQUE using index "student_enrollments_student_id_school_year_semester_course_key";

alter table "public"."student_name_synonyms" add constraint "student_name_synonyms_raw_input_key" UNIQUE using index "student_name_synonyms_raw_input_key";

alter table "public"."students" add constraint "students_id_fkey" FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."students" validate constraint "students_id_fkey";

alter table "public"."teacher_pins" add constraint "teacher_pins_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."teacher_pins" validate constraint "teacher_pins_teacher_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

set check_function_bodies = off;

create or replace view "public"."Hall_Passes" as  SELECT bp.id,
    bp.student_name AS "studentName",
    bp.student_id AS "studentId",
    bp.period,
    bp.destination,
    bp.timeout AS "timeOut",
    bp.timein AS "timeIn",
    bp.notes,
    bp.classroom
   FROM public.bathroom_passes bp;


create or replace view "public"."Hall_Passes_api" as  SELECT bp.id,
    bp.timeout AS "timeOut",
    bp.timein AS "timeIn",
    bp.duration_min AS duration,
    (bp.timein IS NULL) AS "needsReview",
    bp.student_id AS "studentId",
    bp.student_name AS "studentName",
    bp.period,
    bp.destination,
    split_part(bp.student_name, ' '::text, 1) AS "firstName",
    split_part(bp.student_name, ' '::text, 2) AS "lastName",
    bp.raw_student_name AS "typedName",
    bp.destination_key AS "destinationKey",
    bp.classroom
   FROM public.bathroom_passes bp;


CREATE OR REPLACE FUNCTION public._bp_a_resolve_student_bi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_canonical text;
begin
  -- preserve original input
  if new.raw_student_name is null then
    new.raw_student_name := new.student_name;
  end if;

  -- if student_id missing, try to resolve from typed name
  if new.student_id is null then
    v_id := public.hp_try_resolve_student_id(new.student_name);

    if v_id is not null then
      new.student_id := v_id;
    else
      perform public.hp_upsert_unknown_name(new.raw_student_name);
      return new;
    end if;
  end if;

  -- canonicalize student_name when student_id is present
  select concat_ws(' ', u.first_name, u.last_name)
    into v_canonical
  from public.users u
  where u.id = new.student_id;

  if v_canonical is not null then
    new.student_name := v_canonical;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._bp_copy_student_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.raw_student_name is null and new.student_name is not null then
    new.raw_student_name := new.student_name;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public._bp_z_enforce_raw_unknown_only()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Option A: raw_student_name is unknown-only
  if coalesce(new.is_unknown, false) = false then
    new.raw_student_name := null;
    new.unknown_name_id := null;
  end if;

  return new;
end $function$
;

create or replace view "public"."analytics_valid_passes" as  SELECT bathroom_passes.id,
    bathroom_passes.raw_student_name,
    bathroom_passes.student_id,
    bathroom_passes.period,
    bathroom_passes.timeout,
    bathroom_passes.timein,
    bathroom_passes.destination,
    bathroom_passes.notes,
    bathroom_passes.was_auto_closed,
    bathroom_passes.manual_adjust_min,
    bathroom_passes.manual_adjust_reason,
    bathroom_passes.created_at,
    bathroom_passes.updated_at,
    bathroom_passes.period_norm,
    bathroom_passes.date_local,
    bathroom_passes.duration_min,
    bathroom_passes.pass_status,
    bathroom_passes.overrode_period,
    bathroom_passes.override_reason,
    bathroom_passes.student_name,
    bathroom_passes.classroom
   FROM public.bathroom_passes
  WHERE (((bathroom_passes.was_auto_closed = false) OR (bathroom_passes.was_auto_closed IS NULL)) AND ((bathroom_passes.duration_min < (45)::numeric) OR (bathroom_passes.duration_min IS NULL)));


CREATE OR REPLACE FUNCTION public.create_unknown_signout(p_pin text, p_raw_name text, p_period text, p_destination text, p_timeout timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_unknown_id uuid;
  v_pass_id uuid;
begin
  if not public.verify_teacher_pin_global(p_pin) then
    raise exception 'Invalid PIN';
  end if;

  insert into public.hp_unknown_names (raw_name, created_by)
  values (p_raw_name, null)
  returning id into v_unknown_id;

  insert into public.bathroom_passes (
    student_id,
    student_name,
    period,
    destination,
    timeout,
    is_unknown,
    raw_student_name,
    unknown_name_id
  )
  values (
    '00000000-0000-0000-0000-000000000001',
    'Unknown Student',
    p_period,
    p_destination,
    p_timeout,
    true,
    p_raw_name,
    v_unknown_id
  )
  returning id into v_pass_id;

  return v_pass_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.enforce_period_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_roster text;
begin
  if new.student_id is null then
    return new;
  end if;
  select period_code into v_roster from students where id = new.student_id;
  if v_roster is null or new.period_norm is null then
    return new;
  end if;
  if coalesce(new.overrode_period, false) = false and new.period_norm <> v_roster then
    raise exception 'Entered period % does not match roster period % for this student', new.period_norm, v_roster
      using hint = 'Set overrode_period = true and provide override_reason to allow this save.';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_analytics_by_period(time_frame_arg text)
 RETURNS TABLE(period text, passes bigint, total_minutes bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT p.period, p.passes, p.minutes_out
    FROM public.hp_by_period_windows p
    WHERE p.window = lower(time_frame_arg);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_analytics_summary(time_frame_arg text)
 RETURNS TABLE(passes bigint, total_minutes bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT s.passes, s.minutes_out
    FROM public.hp_summary_windows s
    WHERE s.window = lower(time_frame_arg);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_full_analytics(time_frame_arg text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    normalized_frame TEXT;
    result JSONB;
    summary_data JSONB;
    return_rate_data JSONB;
    avg_data JSONB;
    period_data JSONB;
    destination_data JSONB;
    frequent_flyer_data JSONB;
    longest_pass_data JSONB;
    behavioral_data JSONB;
    day_of_week_data JSONB;
    heatmap_data JSONB;
    schedule_data JSONB;
    disruption_scores_data JSONB;
    buddy_leaves_data JSONB;
    bell_edge_data JSONB;
    lunch_friction_data JSONB;
    streak_data JSONB;
    outlier_data JSONB;
    long_trip_data JSONB;
    nurse_detour_data JSONB;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    
    morning_start TIME := '07:55:00';
    morning_end TIME := '09:30:00';
    before_lunch_start TIME := '09:30:00';
    before_lunch_end TIME := '11:05:00';
    after_lunch_start TIME := '13:05:00';
    after_lunch_end TIME := '14:00:00';
    last_period_start TIME := '14:00:00';
    last_period_end TIME := '15:15:00';
    monday_minutes INTEGER := 338;
    block_day_minutes INTEGER := 1352;
BEGIN
    -- Normalize the time frame parameter
    normalized_frame := lower(replace(COALESCE(NULLIF(time_frame_arg,''), 'week'), '"',''));
    
    -- Set time boundaries based on frame (using America/Chicago timezone)
    CASE normalized_frame
        WHEN 'day' THEN
            start_time := date_trunc('day', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
            end_time := start_time + interval '1 day';
        WHEN 'week' THEN
            start_time := date_trunc('week', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
            end_time := start_time + interval '7 days';
        WHEN 'month' THEN
            start_time := date_trunc('month', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
            end_time := start_time + interval '1 month';
        WHEN 'quarter' THEN
            start_time := date_trunc('quarter', (now() AT TIME ZONE 'America/Chicago'))::timestamp AT TIME ZONE 'America/Chicago';
            end_time := start_time + interval '3 months';
        ELSE
            -- 'all' case
            start_time := '1900-01-01'::timestamptz;
            end_time := '2100-01-01'::timestamptz;
    END CASE;
    
    -- Get summary data (passes and total minutes) - excluding auto-closed passes
    WITH summary_cte AS (
        SELECT 
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_build_object(
        'passes', s.passes,
        'total_minutes', s.total_minutes
    )::jsonb INTO summary_data
    FROM summary_cte s;
    
    -- Get return rate data - excluding auto-closed passes
    WITH return_rate_cte AS (
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE timein IS NULL) AS still_out,
            COUNT(*) FILTER (WHERE timein IS NOT NULL) AS returned
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_build_object(
        'return_rate_pct', CASE WHEN r.total > 0 THEN ROUND((r.returned::numeric / r.total) * 100.0, 1) ELSE 0 END,
        'still_out', r.still_out,
        'total', r.total
    )::jsonb INTO return_rate_data
    FROM return_rate_cte r;
    
    -- Get average minutes data - excluding auto-closed passes
    WITH avg_cte AS (
        SELECT
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_build_object(
        'avg_minutes', CASE WHEN a.passes > 0 THEN ROUND(a.total_minutes::numeric / a.passes, 1) ELSE NULL END
    )::jsonb INTO avg_data
    FROM avg_cte a;
    
    -- Get period data - excluding auto-closed passes
    WITH period_cte AS (
        SELECT
            period,
            CASE WHEN period ILIKE 'house%' THEN 'House Small Group'
                 ELSE 'Period ' || period END AS period_label,
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes,
            ROUND(COALESCE(SUM(duration_min), 0)::numeric / NULLIF(COUNT(*), 0), 1) AS avg_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND period IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY period
        ORDER BY passes DESC, period_label
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period_label', p.period_label,
            'passes', p.passes,
            'total_minutes', p.total_minutes,
            'avg_minutes', p.avg_minutes
        )
    ), '[]'::json)::jsonb INTO period_data
    FROM period_cte p;
    
    -- Get destination data - excluding auto-closed passes
    WITH destination_cte AS (
        SELECT
            destination,
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_min) AS median_minutes,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY duration_min) AS q1_minutes,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY duration_min) AS q3_minutes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND destination IS NOT NULL
          AND duration_min IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY destination
        ORDER BY passes DESC
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'destination', d.destination,
            'passes', d.passes,
            'total_minutes', d.total_minutes,
            'median_minutes', COALESCE(d.median_minutes, 0),
            'q1_minutes', COALESCE(d.q1_minutes, 0),
            'q3_minutes', COALESCE(d.q3_minutes, 0)
        )
    ), '[]'::json)::jsonb INTO destination_data
    FROM destination_cte d;
    
    -- Get frequent flyer data - excluding auto-closed passes
    WITH flyer_cte AS (
        SELECT
            student_name,
            COUNT(*) AS passes,
            COALESCE(SUM(duration_min), 0) AS total_minutes,
            ROUND(COALESCE(SUM(duration_min), 0)::numeric / NULLIF(COUNT(*), 0), 1) AS avg_minutes_per_trip
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND student_name IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY student_name
        ORDER BY passes DESC, total_minutes DESC
        LIMIT 10
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', f.student_name,
            'passes', f.passes,
            'total_minutes', f.total_minutes,
            'avg_minutes_per_trip', f.avg_minutes_per_trip
        )
    ), '[]'::json)::jsonb INTO frequent_flyer_data
    FROM flyer_cte f;
    
    -- Get longest pass data - excluding auto-closed passes
    WITH longest_cte AS (
        SELECT
            student_name,
            period,
            destination,
            duration_min::integer AS duration_minutes,
            timeout,
            timein
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND duration_min IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        ORDER BY duration_min DESC, timeout DESC
        LIMIT 10
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', l.student_name,
            'period', l.period,
            'destination', l.destination,
            'duration_minutes', l.duration_minutes,
            'timeout', l.timeout::text,
            'timein', l.timein::text
        )
    ), '[]'::json)::jsonb INTO longest_pass_data
    FROM longest_cte l;
    
    -- Get behavioral insights data - excluding auto-closed passes
    WITH behavioral_cte AS (
        SELECT
            CASE
                WHEN timeout::TIME BETWEEN morning_start AND morning_end THEN 'Morning'
                WHEN timeout::TIME BETWEEN before_lunch_start AND before_lunch_end THEN 'Before Lunch'
                WHEN timeout::TIME BETWEEN after_lunch_start AND after_lunch_end THEN 'After Lunch'
                WHEN timeout::TIME BETWEEN last_period_start AND last_period_end THEN 'Last Period'
                ELSE NULL
            END AS insight_type,
            duration_min
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND duration_min IS NOT NULL
          AND timeout IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
    ),
    behavioral_grouped AS (
        SELECT
            insight_type,
            COUNT(*) AS pass_count,
            ROUND(AVG(duration_min::numeric), 1) AS avg_duration
        FROM behavioral_cte
        WHERE insight_type IS NOT NULL
        GROUP BY insight_type
        ORDER BY pass_count DESC
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'insight_type', b.insight_type,
            'pass_count', b.pass_count,
            'avg_duration', b.avg_duration
        )
    ), '[]'::json)::jsonb INTO behavioral_data
    FROM behavioral_grouped b;
    
    -- Get day of week data - excluding auto-closed passes
    WITH dow_cte AS (
        SELECT
            CASE EXTRACT(DOW FROM timeout)::INTEGER
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday' 
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
                WHEN 0 THEN 'Sunday'
            END AS day_of_week,
            COUNT(*) AS pass_count
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND timeout IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY EXTRACT(DOW FROM timeout)::INTEGER
        ORDER BY EXTRACT(DOW FROM timeout)::INTEGER
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'day_of_week', d.day_of_week,
            'pass_count', d.pass_count
        )
    ), '[]'::json)::jsonb INTO day_of_week_data
    FROM dow_cte d;
    
    -- Get heatmap data with blue gradient and bucket calculations
    WITH periods AS (
        SELECT unnest(ARRAY['A','B','C','D','E','F','G','H']) AS period
    ),
    days AS (
        SELECT * FROM (VALUES
            (1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri')
        ) AS d(dow,label)
    ),
    counts AS (
        SELECT
            p.period,
            d.label AS dow_label,
            COALESCE((
                SELECT COUNT(*)
                FROM public.bathroom_passes b
                WHERE TRIM(b.period) = p.period
                  AND EXTRACT(DOW FROM b.timeout)::int = d.dow
                  AND b.timeout >= start_time
                  AND b.timeout < end_time
                  AND COALESCE(b.was_auto_closed, false) = false
            ), 0) AS passes
        FROM periods p
        CROSS JOIN days d
    ),
    q AS (
        SELECT
            COALESCE((percentile_disc(0.20) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 1) AS q20,
            COALESCE((percentile_disc(0.40) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 2) AS q40,
            COALESCE((percentile_disc(0.60) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 3) AS q60,
            COALESCE((percentile_disc(0.80) WITHIN GROUP (ORDER BY passes) FILTER (WHERE passes > 0)), 4) AS q80
        FROM counts
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period', c.period,
            'day_of_week', c.dow_label,
            'pass_count', c.passes,
            'bucket', CASE
                WHEN c.passes = 0 THEN 0
                WHEN c.passes <= (SELECT q20 FROM q) THEN 1
                WHEN c.passes <= (SELECT q40 FROM q) THEN 2
                WHEN c.passes <= (SELECT q60 FROM q) THEN 3
                WHEN c.passes <= (SELECT q80 FROM q) THEN 4
                ELSE 5
            END,
            'color_hex', CASE
                WHEN c.passes = 0 THEN '#f5f8ff'
                WHEN c.passes <= (SELECT q20 FROM q) THEN '#dbeafe'
                WHEN c.passes <= (SELECT q40 FROM q) THEN '#bfdbfe'
                WHEN c.passes <= (SELECT q60 FROM q) THEN '#93c5fd'
                WHEN c.passes <= (SELECT q80 FROM q) THEN '#60a5fa'
                ELSE '#2563eb'
            END
        )
        ORDER BY c.period, c.dow_label
    ), '[]'::json)::jsonb INTO heatmap_data
    FROM counts c;
    
    -- Get schedule analysis data - excluding auto-closed passes
    WITH schedule_cte AS (
        SELECT
            COUNT(*) FILTER (WHERE EXTRACT(DOW FROM timeout) = 1) AS monday_passes,
            COUNT(*) FILTER (WHERE EXTRACT(DOW FROM timeout) BETWEEN 2 AND 5) AS block_day_passes
        FROM public.bathroom_passes
        WHERE timeout >= start_time 
          AND timeout < end_time
          AND timeout IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
    )
    SELECT json_agg(
        schedule_row
    )::jsonb INTO schedule_data
    FROM (
        SELECT json_build_object(
            'schedule_type', 'Standard Day (Mon)',
            'total_passes', s.monday_passes,
            'instructional_minutes', monday_minutes,
            'passes_per_100_min', CASE WHEN monday_minutes > 0 
                 THEN ROUND((s.monday_passes::numeric / monday_minutes) * 100, 2)
                 ELSE 0::numeric 
            END
        ) AS schedule_row
        FROM schedule_cte s
        UNION ALL
        SELECT json_build_object(
            'schedule_type', 'Block Days (Tue-Fri)',
            'total_passes', s.block_day_passes,
            'instructional_minutes', block_day_minutes,
            'passes_per_100_min', CASE WHEN block_day_minutes > 0 
                 THEN ROUND((s.block_day_passes::numeric / block_day_minutes) * 100, 2)
                 ELSE 0::numeric 
            END
        ) AS schedule_row
        FROM schedule_cte s
    ) schedule_rows;
    
    -- Get disruption scores data
    WITH period_schedule AS (
        SELECT 'A' AS period, '07:55:00'::time AS period_start, '09:10:00'::time AS period_end
        UNION ALL SELECT 'B', '09:15:00'::time, '10:30:00'::time
        UNION ALL SELECT 'C', '10:35:00'::time, '11:50:00'::time
        UNION ALL SELECT 'D', '11:55:00'::time, '13:05:00'::time
        UNION ALL SELECT 'E', '13:10:00'::time, '14:25:00'::time
        UNION ALL SELECT 'F', '14:30:00'::time, '15:45:00'::time
        UNION ALL SELECT 'G', '07:55:00'::time, '09:10:00'::time
        UNION ALL SELECT 'H', '09:15:00'::time, '10:30:00'::time
    ),
    period_zones AS (
        SELECT 
            period,
            period_start,
            period_end,
            period_start AS green_start_1,
            period_start + (period_end - period_start) * 0.2 AS green_end_1,
            period_start + (period_end - period_start) * 0.2 AS red_start,
            period_start + (period_end - period_start) * 0.8 AS red_end,
            period_start + (period_end - period_start) * 0.8 AS green_start_2,
            period_end AS green_end_2
        FROM period_schedule
    ),
    passes_with_scores AS (
        SELECT
            bp.student_name,
            bp.duration_min,
            bp.timeout::time AS timeout_time,
            pz.period,
            CASE
                WHEN bp.timeout::time >= pz.red_start AND bp.timeout::time < pz.red_end 
                THEN bp.duration_min * 3
                ELSE bp.duration_min * 1
            END AS pass_score
        FROM public.bathroom_passes bp
        INNER JOIN period_zones pz ON TRIM(bp.period) = pz.period
        WHERE bp.timeout >= start_time 
          AND bp.timeout < end_time
          AND bp.duration_min IS NOT NULL
          AND bp.student_name IS NOT NULL
          AND COALESCE(bp.was_auto_closed, false) = false
          AND bp.timeout::time >= pz.period_start 
          AND bp.timeout::time < pz.period_end
    ),
    student_disruption_totals AS (
        SELECT
            student_name,
            SUM(pass_score) AS disruption_score
        FROM passes_with_scores
        GROUP BY student_name
        ORDER BY disruption_score DESC
        LIMIT 10
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', sdt.student_name,
            'disruption_score', ROUND(sdt.disruption_score::numeric, 1)
        )
    ), '[]'::json)::jsonb INTO disruption_scores_data
    FROM student_disruption_totals sdt;

    -- Card 1: Buddy Leaves (pairs within 2 min on ≥3 days)
    WITH b AS (
        SELECT student_name, period, timeout::date AS d, timeout
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND student_name IS NOT NULL
    ),
    pairs AS (
        SELECT
            LEAST(a.student_name, bb.student_name) AS s1,
            GREATEST(a.student_name, bb.student_name) AS s2,
            a.period,
            a.d,
            ABS(EXTRACT(EPOCH FROM (a.timeout - bb.timeout))/60.0) AS gap_min
        FROM b a
        JOIN b bb
          ON a.d = bb.d
         AND a.period = bb.period
         AND a.student_name <> bb.student_name
         AND ABS(EXTRACT(EPOCH FROM (a.timeout - bb.timeout))/60.0) <= 2
    ),
    roll AS (
        SELECT s1, s2, period,
               COUNT(DISTINCT d) AS days_together,
               ROUND(AVG(gap_min)::numeric, 1) AS avg_gap_min,
               MAX(d) AS last_seen
        FROM pairs
        GROUP BY s1, s2, period
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_a', s1,
            'student_b', s2,
            'period', period,
            'days', days_together,
            'avg_gap_min', avg_gap_min,
            'last_seen', last_seen::text
        )
        ORDER BY days_together DESC, last_seen DESC
    ), '[]'::json)::jsonb INTO buddy_leaves_data
    FROM roll
    WHERE days_together >= 3
    LIMIT 20;

    -- Card 2: Bell-Edge Leavers (first 5 min / last 10 min of period)
    WITH b AS (
        SELECT bp.*, pm.start_local, pm.end_local
        FROM public.bathroom_passes bp
        JOIN public.period_meta pm ON pm.period = TRIM(bp.period)
        WHERE (start_time IS NULL OR (bp.timeout >= start_time AND bp.timeout < end_time))
          AND COALESCE(bp.was_auto_closed, false) = false
          AND pm.start_local IS NOT NULL AND pm.end_local IS NOT NULL
    ),
    edges AS (
        SELECT
            period,
            COUNT(*) FILTER (
                WHERE timeout::time BETWEEN start_local AND start_local + interval '5 minutes'
            ) AS early_5,
            COUNT(*) FILTER (
                WHERE timeout::time BETWEEN end_local - interval '10 minutes' AND end_local
            ) AS late_10,
            COUNT(*) AS total
        FROM b
        GROUP BY period
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period', period,
            'early_5', early_5,
            'late_10', late_10,
            'total', total,
            'early_pct', ROUND(100.0 * early_5 / NULLIF(total, 0), 1),
            'late_pct', ROUND(100.0 * late_10 / NULLIF(total, 0), 1)
        )
        ORDER BY ROUND(100.0 * late_10 / NULLIF(total, 0), 1) DESC NULLS LAST
    ), '[]'::json)::jsonb INTO bell_edge_data
    FROM edges;

    -- Card 3: Lunch-Transition Friction (first 10 min of after-lunch periods)
    WITH b AS (
        SELECT bp.*, pm.start_local
        FROM public.bathroom_passes bp
        JOIN public.period_meta pm ON pm.period = TRIM(bp.period)
        WHERE (start_time IS NULL OR (bp.timeout >= start_time AND bp.timeout < end_time))
          AND COALESCE(bp.was_auto_closed, false) = false
          AND pm.is_after_lunch = true
          AND pm.start_local IS NOT NULL
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'period', period,
            'first_10_min', first_10,
            'total', total,
            'share_pct', ROUND(100.0 * first_10 / NULLIF(total, 0), 1)
        )
        ORDER BY ROUND(100.0 * first_10 / NULLIF(total, 0), 1) DESC NULLS LAST
    ), '[]'::json)::jsonb INTO lunch_friction_data
    FROM (
        SELECT
            period,
            COUNT(*) FILTER (
                WHERE timeout::time BETWEEN start_local AND start_local + interval '10 minutes'
            ) AS first_10,
            COUNT(*) AS total
        FROM b
        GROUP BY period
    ) sub;

    -- Card 4: Streak Detector (N consecutive days with passes)
    WITH b AS (
        SELECT student_name, period, timeout::date AS class_date
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND student_name IS NOT NULL
        GROUP BY student_name, period, timeout::date
    ),
    meet AS (
        SELECT period, class_date
        FROM b
        GROUP BY period, class_date
    ),
    grid AS (
        SELECT m.period, m.class_date, s.student_name,
               CASE WHEN EXISTS (
                   SELECT 1 FROM b bb
                   WHERE bb.period = m.period AND bb.class_date = m.class_date AND bb.student_name = s.student_name
               ) THEN 1 ELSE 0 END AS any_leave
        FROM meet m
        CROSS JOIN (SELECT DISTINCT student_name FROM b) s
    ),
    runs AS (
        SELECT *,
               SUM(CASE WHEN any_leave = 0 THEN 1 ELSE 0 END)
                 OVER (PARTITION BY student_name, period ORDER BY class_date) AS zero_block
        FROM grid
    ),
    streaks AS (
        SELECT student_name, period, class_date,
               SUM(any_leave) OVER (
                   PARTITION BY student_name, period, zero_block
                   ORDER BY class_date
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
               ) AS run_len
        FROM runs
        WHERE any_leave = 1
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', student_name,
            'period', period,
            'max_streak', max_streak
        )
        ORDER BY max_streak DESC
    ), '[]'::json)::jsonb INTO streak_data
    FROM (
        SELECT student_name, period, MAX(run_len) AS max_streak
        FROM streaks
        GROUP BY student_name, period
        HAVING MAX(run_len) >= 3
        LIMIT 50
    ) sub;

    -- Card 5: Personal Outlier Index (robust z-score)
    WITH b AS (
        SELECT * FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND duration_min IS NOT NULL
          AND student_name IS NOT NULL
    ),
    hist AS (
        SELECT student_name, duration_min
        FROM public.bathroom_passes
        WHERE duration_min IS NOT NULL AND student_name IS NOT NULL
    ),
    med AS (
        SELECT student_name,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_min) AS p50
        FROM hist
        GROUP BY student_name
    ),
    mad AS (
        SELECT h.student_name,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY ABS(h.duration_min - m.p50)) AS mad
        FROM hist h
        JOIN med m USING (student_name)
        GROUP BY h.student_name
    ),
    events AS (
        SELECT b.student_name, b.period, b.destination, b.timeout, b.timein, b.duration_min,
               m.p50, a.mad,
               CASE WHEN a.mad = 0 THEN NULL
                    ELSE ROUND((b.duration_min - m.p50)::numeric / (1.4826 * a.mad), 2)
               END AS z_robust
        FROM b
        JOIN med m USING (student_name)
        JOIN mad a USING (student_name)
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', student_name,
            'period', period,
            'destination', destination,
            'duration_min', duration_min,
            'personal_median', ROUND(p50::numeric, 1),
            'z_robust', z_robust,
            'timeout', timeout::text,
            'timein', timein::text
        )
        ORDER BY z_robust DESC
    ), '[]'::json)::jsonb INTO outlier_data
    FROM events
    WHERE z_robust IS NOT NULL AND z_robust >= 2
    LIMIT 50;

    -- Card 6: Long-Trip Share (≥12 min) by student
    WITH b AS (
        SELECT student_name, period, duration_min
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
          AND student_name IS NOT NULL
    ),
    agg AS (
        SELECT student_name,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE duration_min >= 12) AS long_cnt
        FROM b
        GROUP BY student_name
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'student_name', student_name,
            'long_count', long_cnt,
            'total', total,
            'share_pct', ROUND(100.0 * long_cnt / NULLIF(total, 0), 1)
        )
        ORDER BY ROUND(100.0 * long_cnt / NULLIF(total, 0), 1) DESC
    ), '[]'::json)::jsonb INTO long_trip_data
    FROM agg
    WHERE total >= 2
    LIMIT 50;

    -- Card 7: Nurse Detour Detector
    WITH base AS (
        SELECT *, 
            CASE
                WHEN destination ILIKE '%nurse%' THEN 'nurse'
                WHEN destination ILIKE '%bath%' OR destination ILIKE '%restroom%' THEN 'bathroom'
                ELSE 'other'
            END AS dest_norm
        FROM public.bathroom_passes
        WHERE (start_time IS NULL OR (timeout >= start_time AND timeout < end_time))
          AND COALESCE(was_auto_closed, false) = false
    ),
    seq AS (
        SELECT
            student_name, period, timeout::date AS d, timeout, timein, dest_norm,
            LEAD(timeout) OVER (PARTITION BY student_name, timeout::date ORDER BY timeout) AS next_out,
            LEAD(dest_norm) OVER (PARTITION BY student_name, timeout::date ORDER BY timeout) AS next_dest
        FROM base
    ),
    pairs AS (
        SELECT student_name, period, d,
               dest_norm AS first_dest, next_dest AS second_dest,
               ROUND(EXTRACT(EPOCH FROM (next_out - COALESCE(timein, timeout)))/60.0, 1) AS gap_min
        FROM seq
        WHERE next_out IS NOT NULL
          AND ((dest_norm = 'nurse' AND next_dest = 'bathroom') OR (dest_norm = 'bathroom' AND next_dest = 'nurse'))
          AND (next_out - COALESCE(timein, timeout)) <= interval '10 minutes'
    ),
    hist AS (
        SELECT student_name, duration_min
        FROM public.bathroom_passes
        WHERE destination ILIKE '%nurse%' AND duration_min IS NOT NULL
    ),
    p90 AS (
        SELECT student_name,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_min) AS p90_nurse
        FROM hist
        GROUP BY student_name
    ),
    long_nurse AS (
        SELECT b.student_name, b.period, b.timeout::date AS d, b.duration_min,
               p.p90_nurse
        FROM base b
        JOIN p90 p USING (student_name)
        WHERE b.dest_norm = 'nurse' AND b.duration_min >= p.p90_nurse
    )
    SELECT COALESCE(json_agg(
        json_build_object(
            'type', type,
            'student_name', student_name,
            'period', period,
            'date', d::text,
            'pattern', pattern,
            'gap_min', gap_min,
            'duration_min', duration_min
        )
        ORDER BY d DESC, type DESC
    ), '[]'::json)::jsonb INTO nurse_detour_data
    FROM (
        SELECT 'NURSE↔BATH' AS type, student_name, period, d,
               first_dest || '→' || second_dest AS pattern, gap_min, NULL::numeric AS duration_min
        FROM pairs
        UNION ALL
        SELECT 'LONG NURSE', student_name, period, d, 'nurse', NULL, duration_min
        FROM long_nurse
    ) sub
    LIMIT 50;
    
    -- Build the final result object with all 7 new cards
    result := json_build_object(
        'summary', summary_data,
        'returnRate', return_rate_data,
        'avg', avg_data,
        'byPeriod', period_data,
        'byDestination', destination_data,
        'frequentFlyers', frequent_flyer_data,
        'longestPasses', longest_pass_data,
        'behavioralInsights', behavioral_data,
        'dayOfWeek', day_of_week_data,
        'heatmap', heatmap_data,
        'scheduleAnalysis', schedule_data,
        'disruptionScores', disruption_scores_data,
        'buddyLeaves', buddy_leaves_data,
        'bellEdge', bell_edge_data,
        'lunchFriction', lunch_friction_data,
        'streaks', streak_data,
        'outliers', outlier_data,
        'longTrips', long_trip_data,
        'nurseDetour', nurse_detour_data
    )::jsonb;
    
    RETURN result;
END;
$function$
;

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
            END
        )
        ORDER BY "timeOut" DESC
    ), '[]'::json) INTO currently_out_students
    FROM public."Hall_Passes"
    WHERE "timeIn" IS NULL;
    
    -- Get today's comprehensive stats with single query optimization
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

CREATE OR REPLACE FUNCTION public.get_weekly_top_students()
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    week_start_iso TIMESTAMPTZ;
    end_iso TIMESTAMPTZ;
    result JSON;
BEGIN
    -- Get this week's start (Monday) in Toronto timezone
    week_start_iso := (date_trunc('week', current_date) AT TIME ZONE 'America/Toronto')::timestamp with time zone AT TIME ZONE 'UTC';
    
    -- Get current time as end boundary
    end_iso := now();
    
    -- Get top 5 students with most cumulative minutes this week (excluding auto-closed passes)
    SELECT COALESCE(json_agg(
        json_build_object(
            'studentName', student_name,
            'totalMinutes', total_minutes,
            'tripCount', trip_count
        )
        ORDER BY total_minutes DESC
    ), '[]'::json) INTO result
    FROM (
        SELECT 
            student_name,
            COALESCE(SUM(duration_min), 0)::integer as total_minutes,
            COUNT(*)::integer as trip_count
        FROM public.bathroom_passes
        WHERE timeout >= week_start_iso
          AND timeout < end_iso
          AND student_name IS NOT NULL
          AND COALESCE(was_auto_closed, false) = false
        GROUP BY student_name
        HAVING SUM(duration_min) > 0
        ORDER BY total_minutes DESC
        LIMIT 5
    ) weekly_students;
    
    RETURN result;
END;
$function$
;

create or replace view "public"."hp_base" as  SELECT bathroom_passes.id,
    bathroom_passes.student_name,
    bathroom_passes.period,
    bathroom_passes.timeout,
    bathroom_passes.timein,
    bathroom_passes.duration_min AS duration,
    to_char(bathroom_passes.timeout, 'Day'::text) AS "dayOfWeek",
    bathroom_passes.destination,
    bathroom_passes.overrode_period AS "earlyDismissal",
    bathroom_passes.classroom
   FROM public.bathroom_passes;


create or replace view "public"."hp_bathroom_flyers_all" as  SELECT b.student_name,
    count(*) AS passes,
    sum(
        CASE
            WHEN (b.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - b.timeout)) / 60.0)
            ELSE (EXTRACT(epoch FROM (b.timein - b.timeout)) / 60.0)
        END) AS total_minutes
   FROM public.hp_base b
  WHERE ((b.destination ~~* '%bath%'::text) OR (b.destination ~~* '%restroom%'::text) OR (b.destination ~~* '%rr%'::text))
  GROUP BY b.student_name;


create or replace view "public"."hp_bathroom_trips_current_quarter" as  WITH bounds AS (
         SELECT date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS s,
            (date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval) AS e
        )
 SELECT lower(b.student_name) AS student_key,
    b.timeout,
    b.timein,
    b.duration,
    b.destination,
    b.period,
    b.classroom
   FROM public.hp_base b,
    bounds
  WHERE ((b.timeout IS NOT NULL) AND (b.timeout >= bounds.s) AND (b.timeout < bounds.e) AND (b.destination ~~* ANY (ARRAY['%bath%'::text, '%restroom%'::text, '%rr%'::text])));


create or replace view "public"."hp_behavior_hourly_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    (EXTRACT(hour FROM b.t_local))::integer AS hour_24,
    count(*) AS passes
   FROM (win w
     LEFT JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", (EXTRACT(hour FROM b.t_local))
  ORDER BY w."window", ((EXTRACT(hour FROM b.t_local))::integer);


create or replace view "public"."hp_by_destination_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    COALESCE(x.destination, 'Other'::text) AS destination,
    count(*) AS passes,
    (COALESCE(sum(x.duration_min), (0)::numeric))::integer AS minutes_out,
    (percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((x.duration_min)::double precision)))::numeric(10,1) AS median_min,
    (percentile_cont((0.9)::double precision) WITHIN GROUP (ORDER BY ((x.duration_min)::double precision)))::numeric(10,1) AS p90_min
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  GROUP BY w."window", COALESCE(x.destination, 'Other'::text)
  ORDER BY w."window", (count(*)) DESC;


create or replace view "public"."hp_by_period_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    x.period,
    count(*) AS passes,
    (COALESCE(sum(x.duration_min), (0)::numeric))::integer AS minutes_out
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  GROUP BY w."window", x.period
  ORDER BY w."window", (count(*)) DESC;


create or replace view "public"."hp_day_signouts_today" as  SELECT hp_day_signouts.id,
    hp_day_signouts.created_at,
    hp_day_signouts.classroom,
    hp_day_signouts.period,
    hp_day_signouts.student_id,
    hp_day_signouts.student_name,
    hp_day_signouts.reason,
    hp_day_signouts.created_by
   FROM public.hp_day_signouts
  WHERE (((hp_day_signouts.created_at AT TIME ZONE 'America/Chicago'::text))::date = ((now() AT TIME ZONE 'America/Chicago'::text))::date)
  ORDER BY hp_day_signouts.created_at DESC;


create or replace view "public"."hp_dayofweek_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    to_char(b.t_local, 'Dy'::text) AS dow_short,
    count(*) AS passes
   FROM (win w
     LEFT JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", (to_char(b.t_local, 'Dy'::text))
  ORDER BY w."window", (to_char(b.t_local, 'Dy'::text));


create or replace view "public"."hp_disruption_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    b.student_name,
    count(*) AS passes,
    round(COALESCE(sum(b.duration_min), (0)::numeric), 1) AS minutes_out
   FROM (win w
     JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", b.student_name
  ORDER BY w."window", (round(COALESCE(sum(b.duration_min), (0)::numeric), 1)) DESC, (count(*)) DESC;


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


create or replace view "public"."hp_frequent_flyers_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    x.student_name,
    count(*) AS passes,
    (COALESCE(sum(x.duration_min), (0)::numeric))::integer AS minutes_out
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  GROUP BY w."window", x.student_name
  ORDER BY w."window", (count(*)) DESC, ((COALESCE(sum(x.duration_min), (0)::numeric))::integer) DESC;


create or replace view "public"."hp_heatmap_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,( SELECT COALESCE(min(b_1.t_local), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))) AS "coalesce"
                           FROM b b_1),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    b.period,
    to_char(b.t_local, 'Dy'::text) AS day,
    count(*) AS passes
   FROM (win w
     JOIN b ON (((b.t_local >= w.start_ct) AND (b.t_local < w.end_ct))))
  GROUP BY w."window", b.period, (to_char(b.t_local, 'Dy'::text))
  ORDER BY w."window", b.period, (to_char(b.t_local, 'Dy'::text));


create or replace view "public"."hp_longest_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
                CASE
                    WHEN (hp_base.timein IS NULL) THEN (EXTRACT(epoch FROM (((now() AT TIME ZONE 'America/Chicago'::text))::timestamp with time zone - hp_base.timeout)) / 60.0)
                    ELSE (EXTRACT(epoch FROM (hp_base.timein - hp_base.timeout)) / 60.0)
                END AS duration_min
           FROM public.hp_base
        ), win AS (
         SELECT w_1."window",
            w_1.start_ct,
            w_1.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w_1("window", start_ct, end_ct)
        )
 SELECT w."window",
    x.student_name,
    x.period,
    x.destination,
    x.duration_min AS duration,
    x.timeout,
    x.timein
   FROM (win w
     JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
  ORDER BY w."window", x.duration_min DESC, x.timeout DESC;


create or replace view "public"."hp_month_window" as  SELECT date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS start_ct,
    (date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval) AS end_ct;


create or replace view "public"."hp_nurse_bathroom_pairs" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.destination,
            hp_base.timeout,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local,
            lag(hp_base.destination) OVER (PARTITION BY hp_base.student_name ORDER BY hp_base.timeout) AS prev_dest,
            lag(hp_base.timeout) OVER (PARTITION BY hp_base.student_name ORDER BY hp_base.timeout) AS prev_time
           FROM public.hp_base
        )
 SELECT b.student_name,
    b.prev_dest AS first_dest,
    b.destination AS second_dest,
    b.prev_time,
    b.timeout AS curr_time,
    (EXTRACT(epoch FROM (b.timeout - b.prev_time)) / 60.0) AS minutes_between
   FROM b
  WHERE ((b.prev_dest IS NOT NULL) AND (((lower(b.prev_dest) ~~ 'nurse%'::text) AND (lower(b.destination) ~~ 'bath%'::text)) OR ((lower(b.prev_dest) ~~ 'bath%'::text) AND (lower(b.destination) ~~ 'nurse%'::text))) AND ((EXTRACT(epoch FROM (b.timeout - b.prev_time)) >= (0)::numeric) AND (EXTRACT(epoch FROM (b.timeout - b.prev_time)) <= (600)::numeric)));


create or replace view "public"."hp_quarter_window" as  SELECT date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS start_ct,
    (date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval) AS end_ct;


CREATE OR REPLACE FUNCTION public.hp_resolve_unknown_name(p_raw_input text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_norm text;
  v_canonical text;
  v_pass_rows int := 0;
begin
  -- teacher/admin guard
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('teacher','admin')
  ) then
    raise exception 'Not authorized';
  end if;

  if p_raw_input is null or btrim(p_raw_input) = '' then
    raise exception 'raw_input required';
  end if;

  v_norm := public.normalize_name(p_raw_input);
  if v_norm is null then
    raise exception 'raw_input normalizes to NULL';
  end if;

  select concat_ws(' ', u.first_name, u.last_name)
    into v_canonical
  from public.users u
  where u.id = p_user_id;

  if v_canonical is null then
    raise exception 'student_id not found';
  end if;

  -- store synonym (learning step)
  insert into public.student_name_synonyms (raw_input, student_id)
  values (p_raw_input, p_user_id)
  on conflict (raw_input) do update
    set student_id = excluded.student_id;

  -- backfill legacy pass rows that match normalized string
  update public.bathroom_passes bp
     set student_id = p_user_id,
         student_name = v_canonical
   where bp.student_id is null
     and public.normalize_name(bp.student_name) = v_norm;

  get diagnostics v_pass_rows = row_count;

  -- remove from unknown queue
  delete from public.hp_unknown_names
   where raw_name = v_norm;

  return jsonb_build_object(
    'raw_input', p_raw_input,
    'raw_norm', v_norm,
    'student_id', p_user_id,
    'canonical_name', v_canonical,
    'bathroom_pass_rows_updated', v_pass_rows
  );
end;
$function$
;

create or replace view "public"."hp_return_rate_windows" as  WITH b AS (
         SELECT hp_base.student_name,
            hp_base.period,
            hp_base.destination,
            hp_base.timeout,
            hp_base.timein,
            timezone('America/Chicago'::text, hp_base.timeout) AS t_local
           FROM public.hp_base
        ), win AS (
         SELECT w."window",
            w.start_ct,
            w.end_ct
           FROM ( VALUES ('day'::text,date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('day'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 day'::interval)), ('week'::text,date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval)), ('month'::text,date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('month'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '1 mon'::interval)), ('quarter'::text,date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)),(date_trunc('quarter'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '3 mons'::interval)), ('all'::text,COALESCE(( SELECT min(b.t_local) AS min
                           FROM b), date_trunc('year'::text, (now() AT TIME ZONE 'America/Chicago'::text))),(now() AT TIME ZONE 'America/Chicago'::text))) w("window", start_ct, end_ct)
        ), agg AS (
         SELECT w."window",
            count(*) FILTER (WHERE (x.t_local IS NOT NULL)) AS total,
            count(*) FILTER (WHERE ((x.t_local IS NOT NULL) AND (x.timein IS NULL))) AS still_out
           FROM (win w
             LEFT JOIN b x ON (((x.t_local >= w.start_ct) AND (x.t_local < w.end_ct))))
          GROUP BY w."window"
        )
 SELECT agg."window",
    agg.total,
    agg.still_out,
        CASE
            WHEN (agg.total > 0) THEN round((((agg.total - agg.still_out))::numeric / (agg.total)::numeric), 4)
            ELSE (0)::numeric
        END AS pct_returned
   FROM agg
  ORDER BY agg."window";


create or replace view "public"."hp_streaks_by_period_windows" as  WITH meetings AS (
         SELECT b.student_name,
            b.period,
            (timezone('America/Chicago'::text, b.timeout))::date AS d_local,
            (EXTRACT(dow FROM timezone('America/Chicago'::text, b.timeout)))::integer AS dow
           FROM public.hp_base b
          WHERE (b.timeout IS NOT NULL)
        ), cadence_raw AS (
         SELECT meetings.period,
            sum(((meetings.dow = ANY (ARRAY[1, 3, 5])))::integer) AS cnt_mwf,
            sum(((meetings.dow = ANY (ARRAY[1, 2, 4])))::integer) AS cnt_mtth,
            sum(((meetings.dow <> ALL (ARRAY[1, 2, 4, 3, 5])))::integer) AS cnt_other
           FROM meetings
          GROUP BY meetings.period
        ), cadence AS (
         SELECT cadence_raw.period,
                CASE
                    WHEN (cadence_raw.cnt_mwf > cadence_raw.cnt_mtth) THEN 'M/W/F'::text
                    WHEN (cadence_raw.cnt_mtth > cadence_raw.cnt_mwf) THEN 'M/T/Th'::text
                    ELSE 'Mixed'::text
                END AS cadence
           FROM cadence_raw
        ), filtered AS (
         SELECT m.student_name,
            m.period,
            m.d_local,
            m.dow,
            c.cadence,
            (date_trunc('week'::text, (m.d_local)::timestamp with time zone))::date AS wk
           FROM (meetings m
             JOIN cadence c USING (period))
          WHERE (((c.cadence = 'M/W/F'::text) AND (m.dow = ANY (ARRAY[1, 3, 5]))) OR ((c.cadence = 'M/T/Th'::text) AND (m.dow = ANY (ARRAY[1, 2, 4]))) OR (c.cadence = 'Mixed'::text))
        ), indexed AS (
         SELECT f.student_name,
            f.period,
            f.d_local,
            f.dow,
            f.cadence,
            f.wk,
            (floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer AS week_idx,
                CASE
                    WHEN (f.cadence = 'M/W/F'::text) THEN (((floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer * 3) +
                    CASE
                        WHEN (f.dow = 1) THEN 0
                        WHEN (f.dow = 3) THEN 1
                        WHEN (f.dow = 5) THEN 2
                        ELSE 0
                    END)
                    WHEN (f.cadence = 'M/T/Th'::text) THEN (((floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer * 3) +
                    CASE
                        WHEN (f.dow = 1) THEN 0
                        WHEN (f.dow = 2) THEN 1
                        WHEN (f.dow = 4) THEN 2
                        ELSE 0
                    END)
                    ELSE (((floor((EXTRACT(epoch FROM (f.wk)::timestamp without time zone) / 604800.0)))::integer * 5) + f.dow)
                END AS meeting_index
           FROM filtered f
        ), runs AS (
         SELECT indexed.student_name,
            indexed.period,
            indexed.cadence,
            indexed.d_local,
            indexed.meeting_index,
            (indexed.meeting_index - row_number() OVER (PARTITION BY indexed.student_name, indexed.period ORDER BY indexed.meeting_index)) AS grp
           FROM indexed
        ), streaks AS (
         SELECT runs.student_name,
            runs.period,
            runs.cadence,
            min(runs.d_local) AS start_date,
            max(runs.d_local) AS end_date,
            count(*) AS streak_len
           FROM runs
          GROUP BY runs.student_name, runs.period, runs.cadence, runs.grp
        )
 SELECT 'all'::text AS "window",
    streaks.student_name,
    streaks.period,
    streaks.cadence,
    streaks.start_date,
    streaks.end_date,
    streaks.streak_len
   FROM streaks
  WHERE (streaks.streak_len >= 3);


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


create or replace view "public"."hp_summary_windows" as  SELECT 'day'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('day'::text, now()))
  GROUP BY 'day'::text
UNION ALL
 SELECT 'week'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('week'::text, now()))
  GROUP BY 'week'::text
UNION ALL
 SELECT 'month'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('month'::text, now()))
  GROUP BY 'month'::text
UNION ALL
 SELECT 'quarter'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  WHERE (hp_base.timeout >= date_trunc('quarter'::text, now()))
  GROUP BY 'quarter'::text
UNION ALL
 SELECT 'all'::text AS "window",
    count(*) AS passes,
    sum(hp_base.duration) AS minutes_out
   FROM public.hp_base
  GROUP BY 'all'::text;


CREATE OR REPLACE FUNCTION public.hp_try_resolve_student_id(p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_norm text;
  v_id   uuid;
  v_cnt  int;
begin
  if p_name is null then
    return null;
  end if;

  v_norm := public.normalize_name(p_name);
  if v_norm is null then
    return null;
  end if;

  -- 1) synonym match (normalize raw_input)
  select sns.student_id
    into v_id
  from public.student_name_synonyms sns
  where public.normalize_name(sns.raw_input) = v_norm
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  -- 2) direct roster match (users)
  select count(*)
    into v_cnt
  from public.users u
  where u.role = 'student'
    and (
      public.normalize_name(concat_ws(' ', u.first_name, u.last_name)) = v_norm
      or (u.nickname is not null and public.normalize_name(concat_ws(' ', u.nickname, u.last_name)) = v_norm)
    );

  if v_cnt = 1 then
    select u.id
      into v_id
    from public.users u
    where u.role = 'student'
      and (
        public.normalize_name(concat_ws(' ', u.first_name, u.last_name)) = v_norm
        or (u.nickname is not null and public.normalize_name(concat_ws(' ', u.nickname, u.last_name)) = v_norm)
      )
    limit 1;

    return v_id;
  end if;

  return null;
end;
$function$
;

create or replace view "public"."hp_unmatched_names" as  SELECT hp_unknown_names.raw_name AS raw_norm,
    hp_unknown_names.raw_name,
    hp_unknown_names.example_raw,
    hp_unknown_names.raw_examples,
    hp_unknown_names.seen_count,
    hp_unknown_names.first_seen_at,
    hp_unknown_names.last_seen_at
   FROM public.hp_unknown_names
  ORDER BY hp_unknown_names.last_seen_at DESC;


CREATE OR REPLACE FUNCTION public.hp_upsert_unknown_name(p_raw text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_raw  text := nullif(btrim(coalesce(p_raw,'')), '');
  v_norm text;
begin
  if v_raw is null then
    return;
  end if;

  v_norm := public.normalize_name(v_raw);
  if v_norm is null then
    return;
  end if;

  insert into public.hp_unknown_names (raw_name, example_raw, raw_examples, seen_count, first_seen_at, last_seen_at)
  values (v_norm, v_raw, array[v_raw], 1, now(), now())
  on conflict (raw_name) do update
    set last_seen_at = now(),
        seen_count   = public.hp_unknown_names.seen_count + 1,
        example_raw  = excluded.example_raw,
        raw_examples =
          case
            when excluded.example_raw = any(public.hp_unknown_names.raw_examples) then public.hp_unknown_names.raw_examples
            when array_length(public.hp_unknown_names.raw_examples, 1) >= 5 then public.hp_unknown_names.raw_examples
            else public.hp_unknown_names.raw_examples || excluded.example_raw
          end;
end;
$function$
;

create or replace view "public"."hp_week_window" as  SELECT date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) AS start_ct,
    (date_trunc('week'::text, (now() AT TIME ZONE 'America/Chicago'::text)) + '7 days'::interval) AS end_ct;


create or replace view "public"."hp_windows" as  WITH now_ct AS (
         SELECT (now() AT TIME ZONE 'America/Chicago'::text) AS t
        )
 SELECT 'day'::text AS "window",
    date_trunc('day'::text, now_ct.t) AS start_ct,
    (date_trunc('day'::text, now_ct.t) + '1 day'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'week'::text AS "window",
    date_trunc('week'::text, now_ct.t) AS start_ct,
    (date_trunc('week'::text, now_ct.t) + '7 days'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'month'::text AS "window",
    date_trunc('month'::text, now_ct.t) AS start_ct,
    (date_trunc('month'::text, now_ct.t) + '1 mon'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'quarter'::text AS "window",
    date_trunc('quarter'::text, now_ct.t) AS start_ct,
    (date_trunc('quarter'::text, now_ct.t) + '3 mons'::interval) AS end_ct
   FROM now_ct
UNION ALL
 SELECT 'all'::text AS "window",
    NULL::timestamp without time zone AS start_ct,
    NULL::timestamp without time zone AS end_ct
   FROM now_ct;


CREATE OR REPLACE FUNCTION public.map_destination_key()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  k text;
begin
  if new.destination is null then
    return new;
  end if;

  if new.destination_key is null then
    select d.key into k
    from public.hall_pass_destinations d
    where lower(d.key) = lower(new.destination)
       or lower(d.label) = lower(new.destination)
       or exists (
         select 1 from unnest(d.synonyms) s
         where lower(s) = lower(new.destination)
       )
    limit 1;

    if k is not null then
      new.destination_key := k;
    end if;
  end if;

  if new.destination_key is not null then
    select d.label into new.destination
    from public.hall_pass_destinations d
    where d.key = new.destination_key;
  end if;

  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.map_student_from_synonym()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  raw_norm text;
  ids uuid[];
begin
  if new.student_id is not null then
    return new;
  end if;

  if new.raw_student_name is null then
    return new;
  end if;

  raw_norm := public.normalize_name(new.raw_student_name);
  if raw_norm = '' then
    return new;
  end if;

  -- 1) Synonyms table match (normalized)
  select array_agg(sns.student_id) into ids
  from public.student_name_synonyms sns
  where public.normalize_name(sns.raw_input) = raw_norm;

  if array_length(ids, 1) = 1 then
    new.student_id := ids[1];
    return new;
  end if;

  -- 2) Exact roster full-name match (unambiguous only)
  select array_agg(u.id) into ids
  from public.users u
  where public.normalize_name(u.first_name || ' ' || u.last_name) = raw_norm;

  if array_length(ids, 1) = 1 then
    new.student_id := ids[1];
    return new;
  end if;

  -- 3) Nickname + last match (unambiguous only)
  select array_agg(u.id) into ids
  from public.users u
  where u.nickname is not null
    and public.normalize_name(u.nickname || ' ' || u.last_name) = raw_norm;

  if array_length(ids, 1) = 1 then
    new.student_id := ids[1];
    return new;
  end if;

  -- Otherwise leave NULL so the teacher queue can resolve it
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.normalize_name(txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select trim(regexp_replace(lower(coalesce(txt,'')), '\s+', ' ', 'g'))
$function$
;

CREATE OR REPLACE FUNCTION public.record_day_signout(p_classroom text, p_student_name text, p_reason text DEFAULT NULL::text, p_period text DEFAULT NULL::text, p_student_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('teacher','admin')
  ) then
    raise exception 'Not authorized';
  end if;

  insert into public.hp_day_signouts (classroom, period, student_id, student_name, reason)
  values (p_classroom, p_period, p_student_id, btrim(p_student_name), p_reason)
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_duration_minutes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if NEW."timeOut" is not null and NEW."timeIn" is not null then
    NEW."duration" := greatest(
      0,
      ceil(extract(epoch from (NEW."timeIn" - NEW."timeOut")) / 60.0)
    )::int;
  end if;
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_pin(p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if length(p_pin) < 4 then
    raise exception 'PIN must be at least 4 digits';
  end if;

  insert into public.teacher_pins (teacher_id, pin_hash)
  values (auth.uid(), crypt(p_pin, gen_salt('bf')))
  on conflict (teacher_id)
  do update set pin_hash = excluded.pin_hash, updated_at = now();
end $function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_pin_global(p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.teacher_pin_config (scope, pin_hash)
  values ('default', crypt(p_pin, gen_salt('bf')))
  on conflict (scope)
  do update set pin_hash = excluded.pin_hash,
                updated_at = now();
end $function$
;


CREATE OR REPLACE FUNCTION public.verify_teacher_pin(pin_to_check text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Validate input
    IF pin_to_check IS NULL OR LENGTH(pin_to_check) = 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Simple PIN verification - check if input matches '4311'
    RETURN pin_to_check = '4311';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_teacher_pin_global(p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare v_hash text;
begin
  select pin_hash into v_hash
  from public.teacher_pin_config
  where scope = 'default';

  if v_hash is null then
    return false;
  end if;

  return crypt(p_pin, v_hash) = v_hash;
end $function$
;

create or replace view "public"."hp_grade_compare_windows" as  SELECT m."window",
    m.scope,
    m.student_key,
    g.term,
    g.course,
    g.avg_grade,
    m.passes,
    m.total_minutes,
    m.avg_minutes
   FROM (public.hp_student_metrics_windows m
     LEFT JOIN public.grades_normalized g ON ((g.student_key = m.student_key)));


create or replace view "public"."hp_grade_compare_with_grades" as  SELECT hp_grade_compare_windows."window",
    hp_grade_compare_windows.scope,
    hp_grade_compare_windows.student_key,
    hp_grade_compare_windows.term,
    hp_grade_compare_windows.course,
    hp_grade_compare_windows.avg_grade,
    hp_grade_compare_windows.passes,
    hp_grade_compare_windows.total_minutes,
    hp_grade_compare_windows.avg_minutes
   FROM public.hp_grade_compare_windows
  WHERE (hp_grade_compare_windows.avg_grade IS NOT NULL);


create or replace view "public"."hp_grade_corr_windows" as  SELECT c."window",
    c.scope,
    c.term,
    (count(*))::integer AS n,
    corr((c.avg_grade)::double precision, (c.passes)::double precision) AS corr_grade_vs_passes,
    corr((c.avg_grade)::double precision, (c.total_minutes)::double precision) AS corr_grade_vs_minutes,
    regr_slope((c.avg_grade)::double precision, (c.passes)::double precision) AS slope_grade_vs_passes,
    regr_r2((c.avg_grade)::double precision, (c.passes)::double precision) AS r2_grade_vs_passes,
    regr_slope((c.avg_grade)::double precision, (c.total_minutes)::double precision) AS slope_grade_vs_minutes,
    regr_r2((c.avg_grade)::double precision, (c.total_minutes)::double precision) AS r2_grade_vs_minutes
   FROM public.hp_grade_compare_windows c
  WHERE (c.avg_grade IS NOT NULL)
  GROUP BY c."window", c.scope, c.term;


create or replace view "public"."hp_grade_outliers_windows" as  WITH base AS (
         SELECT c."window",
            c.scope,
            c.term,
            c.student_key,
            (c.avg_grade)::double precision AS avg_grade,
            (COALESCE(c.passes, 0))::double precision AS passes,
            (COALESCE(c.total_minutes, (0)::numeric))::double precision AS total_minutes
           FROM public.hp_grade_compare_windows c
          WHERE (c.avg_grade IS NOT NULL)
        ), z AS (
         SELECT b."window",
            b.scope,
            b.term,
            b.student_key,
            b.avg_grade,
            b.passes,
            b.total_minutes,
            avg(b.avg_grade) OVER (PARTITION BY b."window", b.scope, b.term) AS g_mu,
            stddev_pop(b.avg_grade) OVER (PARTITION BY b."window", b.scope, b.term) AS g_sigma,
            avg(b.passes) OVER (PARTITION BY b."window", b.scope, b.term) AS p_mu,
            stddev_pop(b.passes) OVER (PARTITION BY b."window", b.scope, b.term) AS p_sigma,
            avg(b.total_minutes) OVER (PARTITION BY b."window", b.scope, b.term) AS m_mu,
            stddev_pop(b.total_minutes) OVER (PARTITION BY b."window", b.scope, b.term) AS m_sigma
           FROM base b
        ), scored AS (
         SELECT z."window",
            z.scope,
            z.term,
            z.student_key,
            z.avg_grade,
            z.passes,
            z.total_minutes,
                CASE
                    WHEN (z.g_sigma > (0)::double precision) THEN ((z.avg_grade - z.g_mu) / z.g_sigma)
                    ELSE (0)::double precision
                END AS z_grade,
                CASE
                    WHEN (z.p_sigma > (0)::double precision) THEN ((z.passes - z.p_mu) / z.p_sigma)
                    ELSE (0)::double precision
                END AS z_passes,
                CASE
                    WHEN (z.m_sigma > (0)::double precision) THEN ((z.total_minutes - z.m_mu) / z.m_sigma)
                    ELSE (0)::double precision
                END AS z_minutes
           FROM z
        )
 SELECT scored."window",
    scored.scope,
    scored.term,
    scored.student_key,
    scored.avg_grade,
    scored.passes,
    scored.total_minutes,
    scored.z_grade,
    scored.z_passes,
    scored.z_minutes,
    ((- scored.z_grade) + GREATEST(scored.z_passes, scored.z_minutes)) AS risk_score
   FROM scored;


create or replace view "public"."hp_unmatched_names_queue" as  SELECT public.normalize_name(bp.raw_student_name) AS raw_norm,
    count(*) AS row_count,
    max(bp.timeout) AS last_seen_utc,
    array_agg(DISTINCT bp.raw_student_name) FILTER (WHERE (bp.raw_student_name IS NOT NULL)) AS raw_examples,
    array_agg(DISTINCT bp.period_norm) FILTER (WHERE (bp.period_norm IS NOT NULL)) AS periods,
    array_agg(DISTINCT bp.destination_key) FILTER (WHERE (bp.destination_key IS NOT NULL)) AS destination_keys
   FROM public.bathroom_passes bp
  WHERE ((bp.student_id IS NULL) AND (bp.raw_student_name IS NOT NULL) AND (public.normalize_name(bp.raw_student_name) <> ''::text))
  GROUP BY (public.normalize_name(bp.raw_student_name))
  ORDER BY (count(*)) DESC, (max(bp.timeout)) DESC;


grant delete on table "public"."Classroom_Arrivals" to "anon";

grant insert on table "public"."Classroom_Arrivals" to "anon";

grant references on table "public"."Classroom_Arrivals" to "anon";

grant select on table "public"."Classroom_Arrivals" to "anon";

grant trigger on table "public"."Classroom_Arrivals" to "anon";

grant truncate on table "public"."Classroom_Arrivals" to "anon";

grant update on table "public"."Classroom_Arrivals" to "anon";

grant delete on table "public"."Classroom_Arrivals" to "authenticated";

grant insert on table "public"."Classroom_Arrivals" to "authenticated";

grant references on table "public"."Classroom_Arrivals" to "authenticated";

grant select on table "public"."Classroom_Arrivals" to "authenticated";

grant trigger on table "public"."Classroom_Arrivals" to "authenticated";

grant truncate on table "public"."Classroom_Arrivals" to "authenticated";

grant update on table "public"."Classroom_Arrivals" to "authenticated";

grant delete on table "public"."Classroom_Arrivals" to "service_role";

grant insert on table "public"."Classroom_Arrivals" to "service_role";

grant references on table "public"."Classroom_Arrivals" to "service_role";

grant select on table "public"."Classroom_Arrivals" to "service_role";

grant trigger on table "public"."Classroom_Arrivals" to "service_role";

grant truncate on table "public"."Classroom_Arrivals" to "service_role";

grant update on table "public"."Classroom_Arrivals" to "service_role";

grant delete on table "public"."Hall_Passes_deleted_backup" to "anon";

grant insert on table "public"."Hall_Passes_deleted_backup" to "anon";

grant references on table "public"."Hall_Passes_deleted_backup" to "anon";

grant select on table "public"."Hall_Passes_deleted_backup" to "anon";

grant trigger on table "public"."Hall_Passes_deleted_backup" to "anon";

grant truncate on table "public"."Hall_Passes_deleted_backup" to "anon";

grant update on table "public"."Hall_Passes_deleted_backup" to "anon";

grant delete on table "public"."Hall_Passes_deleted_backup" to "authenticated";

grant insert on table "public"."Hall_Passes_deleted_backup" to "authenticated";

grant references on table "public"."Hall_Passes_deleted_backup" to "authenticated";

grant select on table "public"."Hall_Passes_deleted_backup" to "authenticated";

grant trigger on table "public"."Hall_Passes_deleted_backup" to "authenticated";

grant truncate on table "public"."Hall_Passes_deleted_backup" to "authenticated";

grant update on table "public"."Hall_Passes_deleted_backup" to "authenticated";

grant delete on table "public"."Hall_Passes_deleted_backup" to "service_role";

grant insert on table "public"."Hall_Passes_deleted_backup" to "service_role";

grant references on table "public"."Hall_Passes_deleted_backup" to "service_role";

grant select on table "public"."Hall_Passes_deleted_backup" to "service_role";

grant trigger on table "public"."Hall_Passes_deleted_backup" to "service_role";

grant truncate on table "public"."Hall_Passes_deleted_backup" to "service_role";

grant update on table "public"."Hall_Passes_deleted_backup" to "service_role";

grant delete on table "public"."academic_terms" to "anon";

grant insert on table "public"."academic_terms" to "anon";

grant references on table "public"."academic_terms" to "anon";

grant select on table "public"."academic_terms" to "anon";

grant trigger on table "public"."academic_terms" to "anon";

grant truncate on table "public"."academic_terms" to "anon";

grant update on table "public"."academic_terms" to "anon";

grant delete on table "public"."academic_terms" to "authenticated";

grant insert on table "public"."academic_terms" to "authenticated";

grant references on table "public"."academic_terms" to "authenticated";

grant select on table "public"."academic_terms" to "authenticated";

grant trigger on table "public"."academic_terms" to "authenticated";

grant truncate on table "public"."academic_terms" to "authenticated";

grant update on table "public"."academic_terms" to "authenticated";

grant delete on table "public"."academic_terms" to "service_role";

grant insert on table "public"."academic_terms" to "service_role";

grant references on table "public"."academic_terms" to "service_role";

grant select on table "public"."academic_terms" to "service_role";

grant trigger on table "public"."academic_terms" to "service_role";

grant truncate on table "public"."academic_terms" to "service_role";

grant update on table "public"."academic_terms" to "service_role";

grant insert on table "public"."bathroom_passes" to "anon";

grant select on table "public"."bathroom_passes" to "anon";

grant delete on table "public"."bathroom_passes" to "authenticated";

grant insert on table "public"."bathroom_passes" to "authenticated";

grant references on table "public"."bathroom_passes" to "authenticated";

grant select on table "public"."bathroom_passes" to "authenticated";

grant trigger on table "public"."bathroom_passes" to "authenticated";

grant truncate on table "public"."bathroom_passes" to "authenticated";

grant update on table "public"."bathroom_passes" to "authenticated";

grant delete on table "public"."bathroom_passes" to "service_role";

grant insert on table "public"."bathroom_passes" to "service_role";

grant references on table "public"."bathroom_passes" to "service_role";

grant select on table "public"."bathroom_passes" to "service_role";

grant trigger on table "public"."bathroom_passes" to "service_role";

grant truncate on table "public"."bathroom_passes" to "service_role";

grant update on table "public"."bathroom_passes" to "service_role";

grant delete on table "public"."classroom_arrivals" to "anon";

grant insert on table "public"."classroom_arrivals" to "anon";

grant references on table "public"."classroom_arrivals" to "anon";

grant select on table "public"."classroom_arrivals" to "anon";

grant trigger on table "public"."classroom_arrivals" to "anon";

grant truncate on table "public"."classroom_arrivals" to "anon";

grant update on table "public"."classroom_arrivals" to "anon";

grant delete on table "public"."classroom_arrivals" to "authenticated";

grant insert on table "public"."classroom_arrivals" to "authenticated";

grant references on table "public"."classroom_arrivals" to "authenticated";

grant select on table "public"."classroom_arrivals" to "authenticated";

grant trigger on table "public"."classroom_arrivals" to "authenticated";

grant truncate on table "public"."classroom_arrivals" to "authenticated";

grant update on table "public"."classroom_arrivals" to "authenticated";

grant delete on table "public"."classroom_arrivals" to "service_role";

grant insert on table "public"."classroom_arrivals" to "service_role";

grant references on table "public"."classroom_arrivals" to "service_role";

grant select on table "public"."classroom_arrivals" to "service_role";

grant trigger on table "public"."classroom_arrivals" to "service_role";

grant truncate on table "public"."classroom_arrivals" to "service_role";

grant update on table "public"."classroom_arrivals" to "service_role";

grant delete on table "public"."classrooms" to "anon";

grant insert on table "public"."classrooms" to "anon";

grant references on table "public"."classrooms" to "anon";

grant select on table "public"."classrooms" to "anon";

grant trigger on table "public"."classrooms" to "anon";

grant truncate on table "public"."classrooms" to "anon";

grant update on table "public"."classrooms" to "anon";

grant delete on table "public"."classrooms" to "authenticated";

grant insert on table "public"."classrooms" to "authenticated";

grant references on table "public"."classrooms" to "authenticated";

grant select on table "public"."classrooms" to "authenticated";

grant trigger on table "public"."classrooms" to "authenticated";

grant truncate on table "public"."classrooms" to "authenticated";

grant update on table "public"."classrooms" to "authenticated";

grant delete on table "public"."classrooms" to "service_role";

grant insert on table "public"."classrooms" to "service_role";

grant references on table "public"."classrooms" to "service_role";

grant select on table "public"."classrooms" to "service_role";

grant trigger on table "public"."classrooms" to "service_role";

grant truncate on table "public"."classrooms" to "service_role";

grant update on table "public"."classrooms" to "service_role";

grant delete on table "public"."courses" to "anon";

grant insert on table "public"."courses" to "anon";

grant references on table "public"."courses" to "anon";

grant select on table "public"."courses" to "anon";

grant trigger on table "public"."courses" to "anon";

grant truncate on table "public"."courses" to "anon";

grant update on table "public"."courses" to "anon";

grant delete on table "public"."courses" to "authenticated";

grant insert on table "public"."courses" to "authenticated";

grant references on table "public"."courses" to "authenticated";

grant select on table "public"."courses" to "authenticated";

grant trigger on table "public"."courses" to "authenticated";

grant truncate on table "public"."courses" to "authenticated";

grant update on table "public"."courses" to "authenticated";

grant delete on table "public"."courses" to "service_role";

grant insert on table "public"."courses" to "service_role";

grant references on table "public"."courses" to "service_role";

grant select on table "public"."courses" to "service_role";

grant trigger on table "public"."courses" to "service_role";

grant truncate on table "public"."courses" to "service_role";

grant update on table "public"."courses" to "service_role";

grant delete on table "public"."destinations" to "anon";

grant insert on table "public"."destinations" to "anon";

grant references on table "public"."destinations" to "anon";

grant select on table "public"."destinations" to "anon";

grant trigger on table "public"."destinations" to "anon";

grant truncate on table "public"."destinations" to "anon";

grant update on table "public"."destinations" to "anon";

grant delete on table "public"."destinations" to "authenticated";

grant insert on table "public"."destinations" to "authenticated";

grant references on table "public"."destinations" to "authenticated";

grant select on table "public"."destinations" to "authenticated";

grant trigger on table "public"."destinations" to "authenticated";

grant truncate on table "public"."destinations" to "authenticated";

grant update on table "public"."destinations" to "authenticated";

grant delete on table "public"."destinations" to "service_role";

grant insert on table "public"."destinations" to "service_role";

grant references on table "public"."destinations" to "service_role";

grant select on table "public"."destinations" to "service_role";

grant trigger on table "public"."destinations" to "service_role";

grant truncate on table "public"."destinations" to "service_role";

grant update on table "public"."destinations" to "service_role";

grant delete on table "public"."enrollment_import" to "anon";

grant insert on table "public"."enrollment_import" to "anon";

grant references on table "public"."enrollment_import" to "anon";

grant select on table "public"."enrollment_import" to "anon";

grant trigger on table "public"."enrollment_import" to "anon";

grant truncate on table "public"."enrollment_import" to "anon";

grant update on table "public"."enrollment_import" to "anon";

grant delete on table "public"."enrollment_import" to "authenticated";

grant insert on table "public"."enrollment_import" to "authenticated";

grant references on table "public"."enrollment_import" to "authenticated";

grant select on table "public"."enrollment_import" to "authenticated";

grant trigger on table "public"."enrollment_import" to "authenticated";

grant truncate on table "public"."enrollment_import" to "authenticated";

grant update on table "public"."enrollment_import" to "authenticated";

grant delete on table "public"."enrollment_import" to "service_role";

grant insert on table "public"."enrollment_import" to "service_role";

grant references on table "public"."enrollment_import" to "service_role";

grant select on table "public"."enrollment_import" to "service_role";

grant trigger on table "public"."enrollment_import" to "service_role";

grant truncate on table "public"."enrollment_import" to "service_role";

grant update on table "public"."enrollment_import" to "service_role";

grant delete on table "public"."grades_normalized" to "anon";

grant insert on table "public"."grades_normalized" to "anon";

grant references on table "public"."grades_normalized" to "anon";

grant select on table "public"."grades_normalized" to "anon";

grant trigger on table "public"."grades_normalized" to "anon";

grant truncate on table "public"."grades_normalized" to "anon";

grant update on table "public"."grades_normalized" to "anon";

grant delete on table "public"."grades_normalized" to "authenticated";

grant insert on table "public"."grades_normalized" to "authenticated";

grant references on table "public"."grades_normalized" to "authenticated";

grant select on table "public"."grades_normalized" to "authenticated";

grant trigger on table "public"."grades_normalized" to "authenticated";

grant truncate on table "public"."grades_normalized" to "authenticated";

grant update on table "public"."grades_normalized" to "authenticated";

grant delete on table "public"."grades_normalized" to "service_role";

grant insert on table "public"."grades_normalized" to "service_role";

grant references on table "public"."grades_normalized" to "service_role";

grant select on table "public"."grades_normalized" to "service_role";

grant trigger on table "public"."grades_normalized" to "service_role";

grant truncate on table "public"."grades_normalized" to "service_role";

grant update on table "public"."grades_normalized" to "service_role";

grant delete on table "public"."hall_pass_corrections" to "authenticated";

grant insert on table "public"."hall_pass_corrections" to "authenticated";

grant references on table "public"."hall_pass_corrections" to "authenticated";

grant select on table "public"."hall_pass_corrections" to "authenticated";

grant trigger on table "public"."hall_pass_corrections" to "authenticated";

grant truncate on table "public"."hall_pass_corrections" to "authenticated";

grant update on table "public"."hall_pass_corrections" to "authenticated";

grant delete on table "public"."hall_pass_corrections" to "service_role";

grant insert on table "public"."hall_pass_corrections" to "service_role";

grant references on table "public"."hall_pass_corrections" to "service_role";

grant select on table "public"."hall_pass_corrections" to "service_role";

grant trigger on table "public"."hall_pass_corrections" to "service_role";

grant truncate on table "public"."hall_pass_corrections" to "service_role";

grant update on table "public"."hall_pass_corrections" to "service_role";

grant delete on table "public"."hall_pass_destinations" to "anon";

grant insert on table "public"."hall_pass_destinations" to "anon";

grant references on table "public"."hall_pass_destinations" to "anon";

grant select on table "public"."hall_pass_destinations" to "anon";

grant trigger on table "public"."hall_pass_destinations" to "anon";

grant truncate on table "public"."hall_pass_destinations" to "anon";

grant update on table "public"."hall_pass_destinations" to "anon";

grant delete on table "public"."hall_pass_destinations" to "authenticated";

grant insert on table "public"."hall_pass_destinations" to "authenticated";

grant references on table "public"."hall_pass_destinations" to "authenticated";

grant select on table "public"."hall_pass_destinations" to "authenticated";

grant trigger on table "public"."hall_pass_destinations" to "authenticated";

grant truncate on table "public"."hall_pass_destinations" to "authenticated";

grant update on table "public"."hall_pass_destinations" to "authenticated";

grant delete on table "public"."hall_pass_destinations" to "service_role";

grant insert on table "public"."hall_pass_destinations" to "service_role";

grant references on table "public"."hall_pass_destinations" to "service_role";

grant select on table "public"."hall_pass_destinations" to "service_role";

grant trigger on table "public"."hall_pass_destinations" to "service_role";

grant truncate on table "public"."hall_pass_destinations" to "service_role";

grant update on table "public"."hall_pass_destinations" to "service_role";

grant delete on table "public"."hall_passes" to "anon";

grant insert on table "public"."hall_passes" to "anon";

grant references on table "public"."hall_passes" to "anon";

grant select on table "public"."hall_passes" to "anon";

grant trigger on table "public"."hall_passes" to "anon";

grant truncate on table "public"."hall_passes" to "anon";

grant update on table "public"."hall_passes" to "anon";

grant delete on table "public"."hall_passes" to "authenticated";

grant insert on table "public"."hall_passes" to "authenticated";

grant references on table "public"."hall_passes" to "authenticated";

grant select on table "public"."hall_passes" to "authenticated";

grant trigger on table "public"."hall_passes" to "authenticated";

grant truncate on table "public"."hall_passes" to "authenticated";

grant update on table "public"."hall_passes" to "authenticated";

grant delete on table "public"."hall_passes" to "service_role";

grant insert on table "public"."hall_passes" to "service_role";

grant references on table "public"."hall_passes" to "service_role";

grant select on table "public"."hall_passes" to "service_role";

grant trigger on table "public"."hall_passes" to "service_role";

grant truncate on table "public"."hall_passes" to "service_role";

grant update on table "public"."hall_passes" to "service_role";

grant delete on table "public"."hp_day_signouts" to "anon";

grant insert on table "public"."hp_day_signouts" to "anon";

grant references on table "public"."hp_day_signouts" to "anon";

grant select on table "public"."hp_day_signouts" to "anon";

grant trigger on table "public"."hp_day_signouts" to "anon";

grant truncate on table "public"."hp_day_signouts" to "anon";

grant update on table "public"."hp_day_signouts" to "anon";

grant delete on table "public"."hp_day_signouts" to "authenticated";

grant insert on table "public"."hp_day_signouts" to "authenticated";

grant references on table "public"."hp_day_signouts" to "authenticated";

grant select on table "public"."hp_day_signouts" to "authenticated";

grant trigger on table "public"."hp_day_signouts" to "authenticated";

grant truncate on table "public"."hp_day_signouts" to "authenticated";

grant update on table "public"."hp_day_signouts" to "authenticated";

grant delete on table "public"."hp_day_signouts" to "service_role";

grant insert on table "public"."hp_day_signouts" to "service_role";

grant references on table "public"."hp_day_signouts" to "service_role";

grant select on table "public"."hp_day_signouts" to "service_role";

grant trigger on table "public"."hp_day_signouts" to "service_role";

grant truncate on table "public"."hp_day_signouts" to "service_role";

grant update on table "public"."hp_day_signouts" to "service_role";

grant delete on table "public"."hp_unknown_names" to "anon";

grant insert on table "public"."hp_unknown_names" to "anon";

grant references on table "public"."hp_unknown_names" to "anon";

grant select on table "public"."hp_unknown_names" to "anon";

grant trigger on table "public"."hp_unknown_names" to "anon";

grant truncate on table "public"."hp_unknown_names" to "anon";

grant update on table "public"."hp_unknown_names" to "anon";

grant delete on table "public"."hp_unknown_names" to "authenticated";

grant insert on table "public"."hp_unknown_names" to "authenticated";

grant references on table "public"."hp_unknown_names" to "authenticated";

grant select on table "public"."hp_unknown_names" to "authenticated";

grant trigger on table "public"."hp_unknown_names" to "authenticated";

grant truncate on table "public"."hp_unknown_names" to "authenticated";

grant update on table "public"."hp_unknown_names" to "authenticated";

grant delete on table "public"."hp_unknown_names" to "service_role";

grant insert on table "public"."hp_unknown_names" to "service_role";

grant references on table "public"."hp_unknown_names" to "service_role";

grant select on table "public"."hp_unknown_names" to "service_role";

grant trigger on table "public"."hp_unknown_names" to "service_role";

grant truncate on table "public"."hp_unknown_names" to "service_role";

grant update on table "public"."hp_unknown_names" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."period_meta" to "anon";

grant insert on table "public"."period_meta" to "anon";

grant references on table "public"."period_meta" to "anon";

grant select on table "public"."period_meta" to "anon";

grant trigger on table "public"."period_meta" to "anon";

grant truncate on table "public"."period_meta" to "anon";

grant update on table "public"."period_meta" to "anon";

grant delete on table "public"."period_meta" to "authenticated";

grant insert on table "public"."period_meta" to "authenticated";

grant references on table "public"."period_meta" to "authenticated";

grant select on table "public"."period_meta" to "authenticated";

grant trigger on table "public"."period_meta" to "authenticated";

grant truncate on table "public"."period_meta" to "authenticated";

grant update on table "public"."period_meta" to "authenticated";

grant delete on table "public"."period_meta" to "service_role";

grant insert on table "public"."period_meta" to "service_role";

grant references on table "public"."period_meta" to "service_role";

grant select on table "public"."period_meta" to "service_role";

grant trigger on table "public"."period_meta" to "service_role";

grant truncate on table "public"."period_meta" to "service_role";

grant update on table "public"."period_meta" to "service_role";

grant delete on table "public"."rosters" to "anon";

grant insert on table "public"."rosters" to "anon";

grant references on table "public"."rosters" to "anon";

grant select on table "public"."rosters" to "anon";

grant trigger on table "public"."rosters" to "anon";

grant truncate on table "public"."rosters" to "anon";

grant update on table "public"."rosters" to "anon";

grant delete on table "public"."rosters" to "authenticated";

grant insert on table "public"."rosters" to "authenticated";

grant references on table "public"."rosters" to "authenticated";

grant select on table "public"."rosters" to "authenticated";

grant trigger on table "public"."rosters" to "authenticated";

grant truncate on table "public"."rosters" to "authenticated";

grant update on table "public"."rosters" to "authenticated";

grant delete on table "public"."rosters" to "service_role";

grant insert on table "public"."rosters" to "service_role";

grant references on table "public"."rosters" to "service_role";

grant select on table "public"."rosters" to "service_role";

grant trigger on table "public"."rosters" to "service_role";

grant truncate on table "public"."rosters" to "service_role";

grant update on table "public"."rosters" to "service_role";

grant delete on table "public"."settings" to "anon";

grant insert on table "public"."settings" to "anon";

grant references on table "public"."settings" to "anon";

grant select on table "public"."settings" to "anon";

grant trigger on table "public"."settings" to "anon";

grant truncate on table "public"."settings" to "anon";

grant update on table "public"."settings" to "anon";

grant delete on table "public"."settings" to "authenticated";

grant insert on table "public"."settings" to "authenticated";

grant references on table "public"."settings" to "authenticated";

grant select on table "public"."settings" to "authenticated";

grant trigger on table "public"."settings" to "authenticated";

grant truncate on table "public"."settings" to "authenticated";

grant update on table "public"."settings" to "authenticated";

grant delete on table "public"."settings" to "service_role";

grant insert on table "public"."settings" to "service_role";

grant references on table "public"."settings" to "service_role";

grant select on table "public"."settings" to "service_role";

grant trigger on table "public"."settings" to "service_role";

grant truncate on table "public"."settings" to "service_role";

grant update on table "public"."settings" to "service_role";

grant delete on table "public"."student_enrollments" to "anon";

grant insert on table "public"."student_enrollments" to "anon";

grant references on table "public"."student_enrollments" to "anon";

grant select on table "public"."student_enrollments" to "anon";

grant trigger on table "public"."student_enrollments" to "anon";

grant truncate on table "public"."student_enrollments" to "anon";

grant update on table "public"."student_enrollments" to "anon";

grant delete on table "public"."student_enrollments" to "authenticated";

grant insert on table "public"."student_enrollments" to "authenticated";

grant references on table "public"."student_enrollments" to "authenticated";

grant select on table "public"."student_enrollments" to "authenticated";

grant trigger on table "public"."student_enrollments" to "authenticated";

grant truncate on table "public"."student_enrollments" to "authenticated";

grant update on table "public"."student_enrollments" to "authenticated";

grant delete on table "public"."student_enrollments" to "service_role";

grant insert on table "public"."student_enrollments" to "service_role";

grant references on table "public"."student_enrollments" to "service_role";

grant select on table "public"."student_enrollments" to "service_role";

grant trigger on table "public"."student_enrollments" to "service_role";

grant truncate on table "public"."student_enrollments" to "service_role";

grant update on table "public"."student_enrollments" to "service_role";

grant delete on table "public"."student_name_synonyms" to "anon";

grant insert on table "public"."student_name_synonyms" to "anon";

grant references on table "public"."student_name_synonyms" to "anon";

grant select on table "public"."student_name_synonyms" to "anon";

grant trigger on table "public"."student_name_synonyms" to "anon";

grant truncate on table "public"."student_name_synonyms" to "anon";

grant update on table "public"."student_name_synonyms" to "anon";

grant delete on table "public"."student_name_synonyms" to "authenticated";

grant insert on table "public"."student_name_synonyms" to "authenticated";

grant references on table "public"."student_name_synonyms" to "authenticated";

grant select on table "public"."student_name_synonyms" to "authenticated";

grant trigger on table "public"."student_name_synonyms" to "authenticated";

grant truncate on table "public"."student_name_synonyms" to "authenticated";

grant update on table "public"."student_name_synonyms" to "authenticated";

grant delete on table "public"."student_name_synonyms" to "service_role";

grant insert on table "public"."student_name_synonyms" to "service_role";

grant references on table "public"."student_name_synonyms" to "service_role";

grant select on table "public"."student_name_synonyms" to "service_role";

grant trigger on table "public"."student_name_synonyms" to "service_role";

grant truncate on table "public"."student_name_synonyms" to "service_role";

grant update on table "public"."student_name_synonyms" to "service_role";

grant delete on table "public"."students" to "anon";

grant insert on table "public"."students" to "anon";

grant references on table "public"."students" to "anon";

grant select on table "public"."students" to "anon";

grant trigger on table "public"."students" to "anon";

grant truncate on table "public"."students" to "anon";

grant update on table "public"."students" to "anon";

grant delete on table "public"."students" to "authenticated";

grant insert on table "public"."students" to "authenticated";

grant references on table "public"."students" to "authenticated";

grant select on table "public"."students" to "authenticated";

grant trigger on table "public"."students" to "authenticated";

grant truncate on table "public"."students" to "authenticated";

grant update on table "public"."students" to "authenticated";

grant delete on table "public"."students" to "service_role";

grant insert on table "public"."students" to "service_role";

grant references on table "public"."students" to "service_role";

grant select on table "public"."students" to "service_role";

grant trigger on table "public"."students" to "service_role";

grant truncate on table "public"."students" to "service_role";

grant update on table "public"."students" to "service_role";

grant delete on table "public"."teacher_pin_config" to "anon";

grant insert on table "public"."teacher_pin_config" to "anon";

grant references on table "public"."teacher_pin_config" to "anon";

grant select on table "public"."teacher_pin_config" to "anon";

grant trigger on table "public"."teacher_pin_config" to "anon";

grant truncate on table "public"."teacher_pin_config" to "anon";

grant update on table "public"."teacher_pin_config" to "anon";

grant delete on table "public"."teacher_pin_config" to "authenticated";

grant insert on table "public"."teacher_pin_config" to "authenticated";

grant references on table "public"."teacher_pin_config" to "authenticated";

grant select on table "public"."teacher_pin_config" to "authenticated";

grant trigger on table "public"."teacher_pin_config" to "authenticated";

grant truncate on table "public"."teacher_pin_config" to "authenticated";

grant update on table "public"."teacher_pin_config" to "authenticated";

grant delete on table "public"."teacher_pin_config" to "service_role";

grant insert on table "public"."teacher_pin_config" to "service_role";

grant references on table "public"."teacher_pin_config" to "service_role";

grant select on table "public"."teacher_pin_config" to "service_role";

grant trigger on table "public"."teacher_pin_config" to "service_role";

grant truncate on table "public"."teacher_pin_config" to "service_role";

grant update on table "public"."teacher_pin_config" to "service_role";

grant delete on table "public"."teacher_pins" to "anon";

grant insert on table "public"."teacher_pins" to "anon";

grant references on table "public"."teacher_pins" to "anon";

grant select on table "public"."teacher_pins" to "anon";

grant trigger on table "public"."teacher_pins" to "anon";

grant truncate on table "public"."teacher_pins" to "anon";

grant update on table "public"."teacher_pins" to "anon";

grant delete on table "public"."teacher_pins" to "authenticated";

grant insert on table "public"."teacher_pins" to "authenticated";

grant references on table "public"."teacher_pins" to "authenticated";

grant select on table "public"."teacher_pins" to "authenticated";

grant trigger on table "public"."teacher_pins" to "authenticated";

grant truncate on table "public"."teacher_pins" to "authenticated";

grant update on table "public"."teacher_pins" to "authenticated";

grant delete on table "public"."teacher_pins" to "service_role";

grant insert on table "public"."teacher_pins" to "service_role";

grant references on table "public"."teacher_pins" to "service_role";

grant select on table "public"."teacher_pins" to "service_role";

grant trigger on table "public"."teacher_pins" to "service_role";

grant truncate on table "public"."teacher_pins" to "service_role";

grant update on table "public"."teacher_pins" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Authenticated users access Hall_Passes_deleted_backup"
  on "public"."Hall_Passes_deleted_backup"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Anyone can view academic terms"
  on "public"."academic_terms"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Allow kiosk to create new passes"
  on "public"."bathroom_passes"
  as permissive
  for insert
  to anon
with check (true);



  create policy "Allow kiosk to mark a pass as returned"
  on "public"."bathroom_passes"
  as permissive
  for update
  to anon
using ((timein IS NULL))
with check (true);



  create policy "Allow kiosk to see all passes"
  on "public"."bathroom_passes"
  as permissive
  for select
  to anon
using (true);



  create policy "Students can create passes"
  on "public"."bathroom_passes"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = student_id));



  create policy "Students can update own passes"
  on "public"."bathroom_passes"
  as permissive
  for update
  to authenticated
using ((auth.uid() = student_id))
with check ((auth.uid() = student_id));



  create policy "Students can view own passes"
  on "public"."bathroom_passes"
  as permissive
  for select
  to authenticated
using ((auth.uid() = student_id));



  create policy "Allow authenticated users to delete arrivals"
  on "public"."classroom_arrivals"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Allow authenticated users to insert arrivals"
  on "public"."classroom_arrivals"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to select arrivals"
  on "public"."classroom_arrivals"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to update arrivals"
  on "public"."classroom_arrivals"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Allow public inserts for sign-ins"
  on "public"."classroom_arrivals"
  as permissive
  for insert
  to anon
with check (true);



  create policy "Allow teachers to manage arrivals"
  on "public"."classroom_arrivals"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Authenticated full access to classrooms"
  on "public"."classrooms"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Deny anonymous access to classrooms"
  on "public"."classrooms"
  as permissive
  for all
  to anon
using (false);



  create policy "Anyone can view courses"
  on "public"."courses"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Authenticated users access hall_pass_corrections"
  on "public"."hall_pass_corrections"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Anyone can create hall passes"
  on "public"."hall_passes"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Anyone can update hall passes"
  on "public"."hall_passes"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "Anyone can view all hall passes"
  on "public"."hall_passes"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Anyone can view locations"
  on "public"."locations"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Anyone can view period_meta"
  on "public"."period_meta"
  as permissive
  for select
  to public
using (true);



  create policy "Authenticated users can delete rosters"
  on "public"."rosters"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can insert rosters"
  on "public"."rosters"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can update rosters"
  on "public"."rosters"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can view all rosters"
  on "public"."rosters"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Anyone can view settings"
  on "public"."settings"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Allow authenticated full access to synonyms"
  on "public"."student_name_synonyms"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can delete students"
  on "public"."students"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can insert students"
  on "public"."students"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can update students"
  on "public"."students"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can view all students"
  on "public"."students"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Authenticated users can delete users"
  on "public"."users"
  as permissive
  for delete
  to authenticated
using (true);



  create policy "Authenticated users can insert users"
  on "public"."users"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Authenticated users can update users"
  on "public"."users"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Authenticated users can view all users"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER _bp_a_resolve_student_bi BEFORE INSERT ON public.bathroom_passes FOR EACH ROW EXECUTE FUNCTION public._bp_a_resolve_student_bi();

CREATE TRIGGER _bp_copy_student_name_biu BEFORE INSERT OR UPDATE ON public.bathroom_passes FOR EACH ROW EXECUTE FUNCTION public._bp_copy_student_name();

CREATE TRIGGER _bp_z_enforce_raw_unknown_only_biu BEFORE INSERT OR UPDATE ON public.bathroom_passes FOR EACH ROW EXECUTE FUNCTION public._bp_z_enforce_raw_unknown_only();

CREATE TRIGGER trg_map_destination_key BEFORE INSERT OR UPDATE OF destination, destination_key ON public.bathroom_passes FOR EACH ROW EXECUTE FUNCTION public.map_destination_key();



