# Hall Pass Tracker — Public Schema Data Dictionary v1

Generated: 2025-12-17T15:27:00

## Snapshot
- Tables: 19
- Views: 27 (includes `hp_*` analytics views and legacy-compatible `Hall_Passes*` views)
- Enums: 3
- Triggers: 2
- Functions: 10
- RLS enabled tables: 16

## High-signal notes
- **Duplicate arrivals tables (case-differing):** `Classroom_Arrivals` and `classroom_arrivals`.
- **Legacy/backup artifact:** `Hall_Passes_deleted_backup` exists alongside current models.
- **Legacy-compatible views:** `Hall_Passes` and `Hall_Passes_api` map `bathroom_passes` into camelCase fields.
- **Server-side inserts are mutated:** `bathroom_passes` has BEFORE triggers for student-name handling and synonym mapping.
- **Open-pass enforcement:** unique partial indexes on `bathroom_passes` (one_open_pass_per_raw_name, one_open_pass_per_student).
- **Computed fields:** `bathroom_passes` has generated columns (period_norm, date_local, duration_min, pass_status).

## Enums
- `location_type`: `classroom`, `restroom`, `library`, `office`, `other`, `athletics`, `hallway`, `chapel`, `theater`
- `pass_status`: `ACTIVE`, `RETURNED`, `LATE`
- `user_role`: `student`, `teacher`, `admin`

## Foreign keys
- `bathroom_passes`(`classroom`) → `classrooms`(`id`) [fk_bathroom_passes_classroom]
- `hall_passes`(`destination_id`) → `locations`(`id`) [hall_passes_destination_id_fkey]
- `hall_passes`(`issued_by`) → `users`(`id`) [hall_passes_issued_by_fkey]
- `hall_passes`(`origin_id`) → `locations`(`id`) [hall_passes_origin_id_fkey]
- `hall_passes`(`student_id`) → `users`(`id`) [hall_passes_student_id_fkey]
- `locations`(`user_id`) → `users`(`id`) [locations_user_id_fkey]
- `rosters`(`academic_term_id`) → `academic_terms`(`id`) [rosters_academic_term_id_fkey]
- `rosters`(`course_id`) → `courses`(`id`) [rosters_course_id_fkey]
- `rosters`(`student_id`) → `users`(`id`) [rosters_student_id_fkey]
- `students`(`id`) → `users`(`id`) [students_id_fkey]

## Tables
### `academic_terms` (RLS; PK: id)
- `id` bigint NOT NULL
- `name` text NOT NULL
- `start_date` date NOT NULL
- `end_date` date NOT NULL

### `bathroom_passes` (RLS; PK: id)
- `id` uuid NOT NULL default gen_random_uuid()
- `raw_student_name` text NULL
- `student_id` uuid NULL
- `period` text NULL
- `timeout` timestamp with time zone NULL
- `timein` timestamp with time zone NULL
- `destination` text NULL
- `notes` text NULL
- `was_auto_closed` boolean NOT NULL default false
- `manual_adjust_min` numeric NULL
- `manual_adjust_reason` text NULL
- `created_at` timestamp with time zone NOT NULL default now()
- `updated_at` timestamp with time zone NOT NULL default now()
- `period_norm` text NULL generated AS (upper(TRIM(BOTH FROM period)))
- `date_local` date NULL generated AS (public.to_local_date_toronto(timeout))
- `duration_min` numeric NOT NULL generated AS (CASE
    WHEN ((timein IS NOT NULL) AND (timeout IS NOT NULL)) THEN (EXTRACT(epoch FROM (timein - timeout)) / 60.0)
    ELSE NULL::numeric
END)
- `pass_status` text NOT NULL generated AS (CASE
    WHEN ((timein IS NULL) AND (timeout IS NOT NULL)) THEN 'out'::text
    WHEN (timein IS NOT NULL) THEN 'returned'::text
    ELSE 'draft'::text
END)
- `overrode_period` boolean NOT NULL default false
- `override_reason` text NULL
- `student_name` text NULL
- `classroom` text NULL
- Indexes:
  - `bathroom_passes_destination_trgm` USING gin (destination public.gin_trgm_ops)
  - `bathroom_passes_timeout_period_idx` USING btree (timeout, period)
  - `idx_bathroom_passes_classroom` USING btree (classroom)
  - `idx_bathroom_passes_period` USING btree (period)
  - `idx_bathroom_passes_timeout` USING btree (timeout)
  - `idx_passes_date_local` USING btree (date_local)
  - `idx_passes_period_norm` USING btree (period_norm)
  - `idx_passes_status` USING btree (pass_status)
  - `idx_passes_student_id` USING btree (student_id)
  - UNIQUE `one_open_pass_per_raw_name` USING btree (raw_student_name) WHERE ((student_id IS NULL) AND (raw_student_name IS NOT NULL) AND (timein IS NULL))
  - UNIQUE `one_open_pass_per_student` USING btree (student_id) WHERE ((student_id IS NOT NULL) AND (timein IS NULL))

### `Classroom_Arrivals` (RLS; PK: id)
- `id` uuid NOT NULL default gen_random_uuid()
- `created_at` timestamp with time zone NOT NULL default now()
- `student_name` text NULL
- `period` text NULL
- `time_in` timestamp with time zone NULL default now()
- `arrival_reason` text NULL

### `classroom_arrivals` (RLS; PK: id)
- `id` uuid NOT NULL default gen_random_uuid()
- `created_at` timestamp with time zone NOT NULL default now()
- `student_name` text NOT NULL
- `period` text NOT NULL
- `time_in` timestamp with time zone NOT NULL default now()
- `arrival_reason` text NULL

### `classrooms` (RLS; PK: id)
- `id` text NOT NULL
- `teacher_email` text NULL

### `courses` (RLS; PK: id)
- `id` bigint NOT NULL
- `course_code` text NOT NULL
- `course_name` text NULL

### `destinations` (no RLS; PK: name)
- `name` text NOT NULL
- `active` boolean NOT NULL default true
- `sort` integer NOT NULL default 100

### `grades_normalized` (no RLS; PK: (none found))
- `student_key` text NOT NULL
- `term` text NULL
- `course` text NULL
- `avg_grade` numeric(5,2) NOT NULL
- Indexes:
  - `grades_norm_student_idx` USING btree (student_key)
  - `grades_norm_term_idx` USING btree (term)

### `hall_pass_corrections` (RLS; PK: pass_id)
- `pass_id` uuid NOT NULL
- `corrected_duration` integer NOT NULL
- `corrected_by` text NULL
- `corrected_reason` text NULL
- `corrected_at` timestamp with time zone NULL default now()

### `hall_pass_destinations` (no RLS; PK: key)
- `key` text NOT NULL
- `label` text NOT NULL
- `active` boolean NOT NULL default true
- `synonyms` text[] NOT NULL default '{}'::text[]
- `created_at` timestamp with time zone NOT NULL default now()
- `updated_at` timestamp with time zone NOT NULL default now()

### `hall_passes` (RLS; PK: id)
- `id` bigint NOT NULL
- `student_id` uuid NOT NULL
- `issued_by` uuid NOT NULL
- `origin_id` bigint NOT NULL
- `destination_id` bigint NOT NULL
- `time_out` timestamp with time zone NOT NULL default now()
- `time_in` timestamp with time zone NULL
- `status` public.pass_status NOT NULL default 'ACTIVE'::public.pass_status

### `Hall_Passes_deleted_backup` (RLS; PK: (none found))
- `id` uuid NULL
- `studentName` text NULL
- `studentId` uuid NULL
- `period` text NULL
- `destination` text NULL
- `timeOut` timestamp with time zone NULL
- `timeIn` timestamp with time zone NULL
- `notes` text NULL
- `classroom` text NULL

### `locations` (RLS; PK: id)
- `id` bigint NOT NULL
- `name` text NOT NULL
- `type` public.location_type NULL
- `user_id` uuid NULL

### `period_meta` (RLS; PK: period)
- `period` text NOT NULL
- `start_local` time without time zone NULL
- `end_local` time without time zone NULL
- `is_after_lunch` boolean NULL default false
- `is_last_period` boolean NULL default false

### `rosters` (RLS; PK: id)
- `id` bigint NOT NULL
- `student_id` uuid NOT NULL
- `course_id` bigint NOT NULL
- `academic_term_id` bigint NOT NULL
- `period_code` text NULL

### `settings` (RLS; PK: id)
- `id` bigint NOT NULL
- `setting_name` text NOT NULL
- `value` text NULL
- `description` text NULL

### `student_name_synonyms` (RLS; PK: id)
- `id` uuid NOT NULL default gen_random_uuid()
- `created_at` timestamp with time zone NOT NULL default now()
- `raw_input` text NOT NULL
- `student_id` uuid NOT NULL

### `students` (RLS; PK: id)
- `id` uuid NOT NULL
- `sis_id` text NULL
- `grade_level` integer NULL

### `users` (RLS; PK: id)
- `id` uuid NOT NULL default gen_random_uuid()
- `first_name` text NOT NULL
- `last_name` text NOT NULL
- `email` text NOT NULL
- `role` public.user_role NOT NULL
- `nickname` text NULL

## Views
View definitions are in `hallpass_views_catalog_v1.csv` and `hallpass_data_dictionary_v1.json`.

- `Hall_Passes`
- `Hall_Passes_api`
- `hp_base`
- `hp_bathroom_flyers_all`
- `hp_bathroom_trips_current_quarter`
- `hp_behavior_hourly_windows`
- `hp_by_destination_windows`
- `hp_by_period_windows`
- `hp_dayofweek_windows`
- `hp_disruption_windows`
- `hp_frequent_flyers_bathroom_windows`
- `hp_frequent_flyers_windows`
- `hp_grade_compare_windows`
- `hp_grade_compare_with_grades`
- `hp_grade_corr_windows`
- `hp_grade_outliers_windows`
- `hp_heatmap_windows`
- `hp_longest_windows`
- `hp_month_window`
- `hp_nurse_bathroom_pairs`
- `hp_quarter_window`
- `hp_return_rate_windows`
- `hp_streaks_by_period_windows`
- `hp_student_metrics_windows`
- `hp_summary_windows`
- `hp_week_window`
- `hp_windows`

## RLS policies
Policy catalog is in `hallpass_policies_catalog_v1.csv`.

- `academic_terms`: 1 policies
- `bathroom_passes`: 4 policies
- `classroom_arrivals`: 6 policies
- `classrooms`: 2 policies
- `courses`: 1 policies
- `hall_pass_corrections`: 1 policies
- `hall_passes`: 3 policies
- `Hall_Passes_deleted_backup`: 1 policies
- `locations`: 1 policies
- `period_meta`: 1 policies
- `rosters`: 4 policies
- `settings`: 1 policies
- `student_name_synonyms`: 1 policies
- `students`: 4 policies
- `users`: 4 policies

## Server-side logic
### Triggers
- `_bp_copy_student_name_biu` on `bathroom_passes` (BEFORE INSERT OR UPDATE) → `public._bp_copy_student_name()`
- `trg_map_student_from_synonym` on `bathroom_passes` (BEFORE INSERT) → `public.map_student_from_synonym()`

### Functions
- `public._bp_copy_student_name()` → trigger
- `public.enforce_period_match()` → trigger
- `public.get_full_analytics(time_frame_arg text)` → jsonb
- `public.get_teacher_dashboard_data()` → json
- `public.get_weekly_top_students()` → json
- `public.map_student_from_synonym()` → trigger
- `public.normalize_name(txt text)` → text
- `public.set_duration_minutes()` → trigger
- `public.to_local_date_toronto(ts timestamp with time zone)` → date
- `public.verify_teacher_pin(pin_to_check text)` → boolean