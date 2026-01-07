# Roster Schema Audit: 2025-2026 Semester 2

**Date:** 2025-01-XX  
**Purpose:** Investigate existing Supabase roster/enrollment schema and app query path to enable loading 2025-2026 S2 roster data.

## 1. Current Roster Query Path

### App Entry Point
- **File:** `src/components/TeacherView.tsx`
- **Function:** `checkRosterHealth(period: string)` (lines 215-232)
- **Trigger:** User clicks "Roster Health" collapsible section in Teacher Dashboard

### Query Flow
1. **Primary Path:** `fetchRosterStudentsWithMeta({ period })`
   - **File:** `src/lib/roster.ts` (lines 221-281)
   - **Context:** `getAcademicContext()` returns `{ schoolYear: "2025-2026", semester: "S2" }` (defaults, configurable via env vars)
   - **Query 1:** `student_enrollments` table
     ```typescript
     .from("student_enrollments")
     .select("student_id")
     .eq("school_year", context.schoolYear)  // "2025-2026"
     .eq("semester", context.semester)        // "S2"
     .eq("period", filter.period)             // e.g., "A"
     // Optional: .eq("course", filter.course)
     ```
   - **Query 2:** `users` table (if enrollments found)
     ```typescript
     .from("users")
     .select("id, first_name, last_name, email")
     .in("id", studentIds)
     .eq("role", "student")
     ```

2. **Fallback Path:** `fetchStudents()` (legacy)
   - **File:** `src/lib/studentsRepository.ts` (lines 111-137)
   - **Query:** `users` table where `role = 'student'` (no filtering by period/course/semester)

### Filter Fields Used
- `school_year`: Text field, defaults to "2025-2026"
- `semester`: Text field, defaults to "S2"
- `period`: Text field (e.g., "A", "B", "C", "D", "E", "F", "G", "H", "House Small Group")
- `course`: Optional text field (e.g., "ESS", "ECO") - not currently used in TeacherView roster health check

## 2. Legacy Fallback Trigger

### Conditions That Trigger Fallback
The app falls back to legacy roster (`fetchStudents()`) when:

1. **Query Error:** `enrollError` is present
   - RLS blocked (error code "PGRST301" or status 401/403)
   - Table doesn't exist
   - Other database error
   - **Reason:** `"RLS or query error (${errorCode})"`

2. **Empty Result:** `enrollments` is null or empty array
   - No rows match the filter `school_year="2025-2026" AND semester="S2" AND period={period}`
   - **Reason:** `"No enrollments found for this period"`

3. **No User Details:** After fetching enrollments, the `users` query returns empty
   - Student IDs from enrollments don't exist in `users` table
   - Or users don't have `role='student'`

### UI Display
- **File:** `src/components/TeacherView.tsx` (lines 460-479)
- Shows "Enrollments" (green) if `source === 'enrollments'`
- Shows "Legacy Fallback" (amber) if `source === 'legacy'`
- Displays reason message: "Enrollments unavailable or empty. Check RLS/policies or roster sync."

## 3. Canonical Roster Objects (Tables/Views)

### Primary Table: `student_enrollments`
- **Schema:** `public`
- **Definition:** `supabase/migrations/20260106211359_baseline.sql` (lines 363-371)

**Columns:**
- `id` (uuid, NOT NULL, default: `gen_random_uuid()`) - Primary key
- `student_id` (uuid, NOT NULL) - Foreign key to `users.id` (ON DELETE CASCADE)
- `school_year` (text, NOT NULL) - e.g., "2025-2026"
- `semester` (text, NOT NULL) - e.g., "S2"
- `course` (text, NOT NULL) - e.g., "ESS", "ECO"
- `period` (text, NOT NULL) - e.g., "A", "B", "C"
- `created_at` (timestamptz, NOT NULL, default: `now()`)

**Constraints:**
- Primary key: `student_enrollments_pkey` on `id`
- Unique constraint: `student_enrollments_student_id_school_year_semester_course_key` on `(student_id, school_year, semester, course)`
  - **Note:** This allows same student in same course across different periods, but not duplicate enrollments for same course+semester+year
- Foreign key: `student_enrollments_student_id_fkey` → `users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_student_enrollments_lookup` on `(school_year, semester, course, period)` - from baseline migration
- `idx_student_enrollments_roster_lookup` on `(school_year, semester, period, course)` - from legacy migration `20260106104642_align_enrollments_rls_and_indexes.sql`
- `idx_student_enrollments_student_id` on `(student_id)` - for joins with users table

**RLS Status:**
- RLS is **enabled** (via migration `20260106104642_align_enrollments_rls_and_indexes.sql`)
- **Policies:**
  - `"Authenticated users can view student enrollments"` - SELECT for `authenticated` role, USING (true)
  - `"Deny anonymous access to student_enrollments"` - ALL for `anon` role, USING (false)
- **Grants:** Both `anon` and `authenticated` roles have SELECT/INSERT/UPDATE/DELETE grants (from baseline), but RLS policies restrict `anon` access

### Supporting Table: `users`
- **Schema:** `public`
- **Purpose:** Student identity (id, name, email, role)
- **Required columns for roster:**
  - `id` (uuid, NOT NULL) - Primary key, referenced by `student_enrollments.student_id`
  - `first_name` (text, NOT NULL)
  - `last_name` (text, NOT NULL)
  - `email` (text, NOT NULL, unique)
  - `role` (enum `user_role`, NOT NULL) - Must be `'student'` for roster queries

**RLS Status:**
- RLS enabled
- Policy: `"Authenticated users can view all users"` - SELECT for `authenticated` role

### Legacy Table: `students` (fallback only)
- **Schema:** `public`
- **Columns:** `id` (uuid, FK to `users.id`), `sis_id` (text), `grade_level` (integer)
- **Not used by primary roster path**, but referenced by legacy `fetchStudents()` fallback

### Other Related Tables (Not Directly Queried by Roster)
- `classrooms` - Has `id` (text, e.g., "B12") and `teacher_email` (text, nullable, unique)
- `courses` - Has `id` (bigint), `course_code` (text), `course_name` (text)
- `rosters` - Legacy table with `student_id`, `course_id`, `academic_term_id`, `period_code` - **Not used by current roster query path**

## 4. Required Columns and Keys

### For `student_enrollments` Inserts
**Required (NOT NULL):**
- `student_id` (uuid) - Must exist in `users.id`
- `school_year` (text) - e.g., "2025-2026"
- `semester` (text) - e.g., "S2"
- `course` (text) - e.g., "ESS", "ECO"
- `period` (text) - e.g., "A", "B", "C", etc.

**Optional (has defaults):**
- `id` (uuid) - Auto-generated if not provided
- `created_at` (timestamptz) - Defaults to `now()`

**Unique Constraint:**
- Cannot insert duplicate `(student_id, school_year, semester, course)` - same student can be in same course across different periods, but not duplicate enrollments for same course+semester+year

### For `users` Inserts (if student doesn't exist)
**Required (NOT NULL):**
- `id` (uuid) - Can be generated or provided
- `first_name` (text)
- `last_name` (text)
- `email` (text, unique)
- `role` (enum) - Must be `'student'` for roster queries

**Optional:**
- `nickname` (text, nullable)

### Foreign Key Dependencies
- `student_enrollments.student_id` → `users.id` (must exist before inserting enrollment)
- If `users` row is deleted, `student_enrollments` rows are CASCADE deleted

## 5. RLS and Access Constraints

### RLS Policies on `student_enrollments`
1. **"Authenticated users can view student enrollments"**
   - **Command:** SELECT
   - **Role:** `authenticated`
   - **Using:** `true` (allows all rows if authenticated)
   - **Effect:** Authenticated users can read all enrollments

2. **"Deny anonymous access to student_enrollments"**
   - **Command:** ALL
   - **Role:** `anon`
   - **Using:** `false` (blocks all access)
   - **Effect:** Anonymous users cannot read/write enrollments

### RLS Policies on `users`
- **"Authenticated users can view all users"** - SELECT for `authenticated` role
- **"Authenticated users can insert users"** - INSERT for `authenticated` role
- **"Authenticated users can update users"** - UPDATE for `authenticated` role
- **"Authenticated users can delete users"** - DELETE for `authenticated` role

### Access Requirements
- **For roster queries to work:** App must be authenticated (not anonymous)
- **For inserts:** Must use `authenticated` role (or `service_role` for bulk operations)
- **Anonymous access:** Will trigger fallback due to RLS blocking

### Grants (from baseline migration)
- Both `anon` and `authenticated` have SELECT/INSERT/UPDATE/DELETE grants on `student_enrollments`
- RLS policies override grants, so `anon` cannot actually access despite having grants

## 6. Minimum Insert Plan for 2025-2026 S2 (No SQL Yet)

### Prerequisites
1. **KB Roster Files:** Expected at `kb/rosters/_index.md` and `kb/rosters/*.csv` - **NOT FOUND in repo** (searched: `docs/KB/`, `kb/rosters/`, root directory)
   - If missing, will need to create from source data or obtain from school system
   - Expected CSV columns (based on app code patterns): `Email`, `First`, `Last`, `Class` (course code), `Period`, possibly `School Year`, `Semester`

2. **Academic Context:**
   - `school_year`: "2025-2026"
   - `semester`: "S2"

### Entity Mapping

#### Step 1: Users (Student Identity)
**Table:** `users`
**Source:** CSV column `Email` (e.g., "26rgarnett@student.nchstx.org")
**Mapping:**
- `email` ← CSV `Email` (must be unique)
- `first_name` ← CSV `First`
- `last_name` ← CSV `Last`
- `role` ← `'student'` (constant)
- `id` ← Generate UUID or lookup existing by email

**Deduplication:** If student already exists in `users` (by email), use existing `id`. Otherwise, insert new user.

**Test Student:** "Rick Garnett" (26rgarnett@student.nchstx.org) - Add to users table, then reference in enrollments.

#### Step 2: Student Enrollments
**Table:** `student_enrollments`
**Source:** CSV rows (one per student per course per period)
**Mapping:**
- `student_id` ← Lookup `users.id` by `Email` from CSV
- `school_year` ← "2025-2026" (constant for S2)
- `semester` ← "S2" (constant)
- `course` ← CSV `Class` (e.g., "ESS", "ECO")
- `period` ← CSV `Period` (e.g., "A", "B", "C")

**Unique Constraint:** Cannot insert duplicate `(student_id, school_year, semester, course)`. If same student is in same course across multiple periods, each period needs a separate enrollment row. **Wait:** The unique constraint is on `(student_id, school_year, semester, course)` - this means one student can only be enrolled in a course once per semester, regardless of period. But the app queries by period. **Investigation needed:** Check if the schema allows same student in same course across periods, or if period is part of the unique constraint.

**Re-checking constraint:** From baseline migration line 512: `student_enrollments_student_id_school_year_semester_course_key` on `(student_id, school_year, semester, course)` - **Period is NOT in unique constraint**. This means:
- One student can only have ONE enrollment per course per semester, regardless of period
- If a student is in "ESS" in period "A", they cannot also be in "ESS" in period "B" (same semester/year)
- **This may be a schema limitation** - need to verify if this matches real-world enrollment patterns

### Required Data Entities

#### 1. Users (Students)
- **Minimum:** One row per unique student email from CSV
- **Required fields:** `id`, `first_name`, `last_name`, `email`, `role='student'`
- **Lookup key:** `email` (unique)

#### 2. Student Enrollments
- **Minimum:** One row per (student, course, period) combination from CSV
- **Required fields:** `student_id`, `school_year="2025-2026"`, `semester="S2"`, `course`, `period`
- **Lookup keys:** `student_id` (from users), `school_year`, `semester`, `course`, `period`

#### 3. Optional Supporting Data (Not Required for Roster Query)
- `classrooms` - If needed for classroom filtering (currently not used by roster query)
- `courses` - If needed for course name lookup (currently not used by roster query)
- `students` - Legacy table, not used by primary roster path

### Data Flow
1. **Parse CSV:** Read roster CSV(s) from `kb/rosters/` (or provided source)
2. **Upsert Users:** For each unique email in CSV:
   - Check if `users` row exists (by email)
   - If not, insert new user with generated UUID
   - Store mapping: `email → users.id`
3. **Insert Enrollments:** For each CSV row:
   - Lookup `student_id` from email mapping
   - Insert `student_enrollments` row with `school_year="2025-2026"`, `semester="S2"`, `course`, `period`
   - Handle unique constraint violations (skip if duplicate `(student_id, school_year, semester, course)`)
4. **Verify:** Query `student_enrollments` with `school_year="2025-2026"`, `semester="S2"`, `period="A"` to confirm rows exist

### Test Student: Rick Garnett
- **Email:** 26rgarnett@student.nchstx.org
- **Action:** Add to `users` table first, then add enrollment(s) to `student_enrollments` for appropriate course(s) and period(s)
- **Note:** Do not insert yet - this is investigation only

## 7. Risks / Unknowns

### Schema Risks
1. **Unique Constraint Limitation:** `student_enrollments` unique constraint on `(student_id, school_year, semester, course)` does NOT include `period`. This means:
   - A student can only be enrolled in a course ONCE per semester, even if they attend that course in multiple periods
   - **Risk:** If real-world enrollment has same student in same course across periods, inserts will fail with unique constraint violation
   - **Mitigation:** Need to verify if this is intentional (one enrollment per course) or if schema needs adjustment

2. **Missing Period in Unique Constraint:** The app queries by period, but the unique constraint doesn't include period. This suggests:
   - Either: One student = one enrollment per course (period is informational only)
   - Or: Schema needs to include period in unique constraint: `(student_id, school_year, semester, course, period)`
   - **Action needed:** Verify with school enrollment data whether students can be in same course across multiple periods

3. **RLS Authentication Requirement:** Roster queries require `authenticated` role. If app runs in anonymous mode, it will always fall back to legacy roster.
   - **Risk:** If authentication is not properly configured, roster health will always show "Legacy Fallback"
   - **Mitigation:** Ensure app authenticates users before querying roster

### Data Risks
1. **Missing KB Roster Files:** `kb/rosters/_index.md` and `kb/rosters/*.csv` not found in repo
   - **Risk:** Cannot proceed with data load without roster CSV files
   - **Action needed:** Obtain or create roster CSV files with required columns

2. **Email Format Consistency:** Student emails must match exactly between CSV and `users` table
   - **Risk:** Typos or format differences (e.g., "26rgarnett@student.nchstx.org" vs "26RGarnett@student.nchstx.org") will cause lookup failures
   - **Mitigation:** Normalize email to lowercase before lookup/insert

3. **Course Code Consistency:** Course codes in CSV must match exactly what's expected (e.g., "ESS", "ECO")
   - **Risk:** Variations like "ESS1", "ESS-A", "Environmental Systems" will create separate enrollments
   - **Mitigation:** Normalize course codes to canonical values

4. **Period Code Consistency:** Period codes must match exactly (e.g., "A", "B", "C" vs "Period A", "1st Period")
   - **Risk:** Variations will cause period filter to miss students
   - **Mitigation:** Normalize period codes to match app expectations

### Missing Information
1. **KB Roster Index:** `kb/rosters/_index.md` not found - cannot verify expected CSV format
2. **Roster CSV Files:** `kb/rosters/*.csv` not found - cannot verify actual data format
3. **Generated Types:** `student_enrollments` table is NOT in `src/integrations/supabase/types.ts` - app uses `(supabase as any)` type assertion
   - **Action needed:** Regenerate Supabase types after confirming schema: `supabase gen types typescript --project-id <project_id> > src/integrations/supabase/types.ts`

### Schema Catalog Outdated
- `docs/KB/hallpass_tables_catalog_v1.csv` does NOT include `student_enrollments` table
- `docs/KB/hallpass_columns_catalog_v1.csv` does NOT include `student_enrollments` columns
- `docs/KB/hallpass_policies_catalog_v1.csv` does NOT include `student_enrollments` RLS policies
- **Action needed:** Update KB schema catalogs to include `student_enrollments` table (per AGENTS.md guidance)

### Next Steps (After Investigation)
1. **Verify Unique Constraint:** Confirm if `(student_id, school_year, semester, course)` constraint is correct, or if period should be included
2. **Obtain Roster CSV Files:** Get 2025-2026 S2 roster data in CSV format
3. **Create Migration Script:** Write SQL migration to:
   - Upsert users from CSV emails
   - Insert enrollments with proper foreign key references
   - Handle unique constraint violations gracefully
4. **Update KB Schema Catalogs:** Regenerate KB artifacts to include `student_enrollments`
5. **Regenerate Supabase Types:** Update `src/integrations/supabase/types.ts` to include `student_enrollments` table
6. **Test Roster Health:** After data load, verify Teacher Dashboard "Roster Health" shows "Enrollments" (not "Legacy Fallback")

