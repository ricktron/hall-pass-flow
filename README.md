
# Mr. Garnett's Bathroom Pass System

A digital hall pass tracking system for classroom use, designed for public kiosk deployment (e.g., on classroom Chromebooks).

## What It Does

This app tracks student bathroom trips by logging:
- Student name and class period
- Time out and time returned
- Destination (Bathroom, Nurse, Office, etc.)
- Duration of each trip
- Analytics for teachers to monitor patterns

## Features

- **Student Mode**: Simple sign-out interface for students
- **Teacher Dashboard**: PIN-protected analytics and management
- **Real-time Tracking**: Shows currently out students with live timers
- **Data Analytics**: Trip frequency, duration averages, and pattern analysis
- **Kiosk-Friendly**: Always returns to role selector after use

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components  
- **Backend**: Supabase (PostgreSQL database)
- **Routing**: React Router

## Database

The app connects to Supabase and stores data in the `Hall_Passes` table with columns:
- `studentName`, `period`, `timeOut`, `timeIn`, `duration`
- `dayOfWeek`, `destination`, `earlyDismissal`, `classroom`

## Configuration

### Classroom ID
Update the classroom identifier in `src/config/classroom.ts`:
```typescript
export const CLASSROOM_ID = "B12"; // Change this for your classroom
```

### Teacher PIN
The teacher dashboard is protected by a hardcoded PIN. Check `src/components/PinEntryDialog.tsx` to modify the PIN if needed.

### Supabase Connection
Set up your Supabase project and update the connection details in `src/integrations/supabase/client.ts`.

## Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

Deploy using the Lovable platform or any static hosting service that supports React applications.

## Usage

1. **Students**: Walk up to the kiosk, select "Student", enter name/period/destination, and sign out
2. **Teachers**: Select "Teacher", enter PIN, access dashboard with analytics and student management
3. **Return Process**: Students can mark themselves returned, or teachers can do it from the dashboard

The app automatically returns to the role selector after each interaction, making it perfect for shared classroom use.

## Analytics Healthcheck

This section describes how to verify the Teacher Analytics dashboard views are properly configured.

### Required Views

The analytics dashboard depends on these Supabase views:
- `hp_base` - Base view that normalizes the Hall_Passes table
- `hp_summary_windows` - Summary statistics by time window
- `hp_return_rate_windows` - Return rate calculations
- `hp_by_period_windows` - Pass counts by class period
- `hp_by_destination_windows` - Pass counts by destination
- `hp_frequent_flyers_windows` - Students with most passes
- `hp_longest_windows` - Longest duration passes

### Running the Migration

If you're not using the Supabase CLI, you can apply the migration manually:

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/2025-12-09T000000_fix_analytics_views.sql`
4. Paste into the SQL editor and click **Run**

### Running the Healthcheck

To verify all views exist:

1. Open the Supabase **SQL Editor**
2. Copy the contents of `scripts/sql/healthcheck.sql`
3. Run the query
4. Verify all rows show `exists = true`

Expected output:
```
object                      | kind | exists
----------------------------|------|-------
hp_base                     | view | true
hp_by_destination_windows   | view | true
hp_by_period_windows        | view | true
hp_frequent_flyers_windows  | view | true
hp_longest_windows          | view | true
hp_return_rate_windows      | view | true
hp_summary_windows          | view | true
```

### Running Smoke Tests

To verify each analytics card works correctly:

1. Open the Supabase **SQL Editor**
2. Copy and run each query block from `scripts/sql/analytics_smoke.sql`
3. Verify:
   - **KPI queries** (passes, total_minutes, return_rate) return exactly **1 row**
   - **List queries** (by_period, destinations, frequent_flyers, longest) return **0 or more rows** without errors

### Troubleshooting

**If a view is missing (`exists = false`):**
1. Re-run the migration SQL in the Supabase SQL Editor
2. Check for any error messages
3. Ensure `hp_base` exists first (other views depend on it)

**If smoke tests fail with column errors:**
- Verify `hp_base` exposes: `student_name`, `period`, `destination`, `timeout`, `timein`, `duration_min`
- Check that no views reference the non-existent `timeout_ct` column

**If KPI queries return 0 rows:**
- This may indicate no data for the selected time window
- Try changing `'week'` to `'all'` in the WHERE clause to test with all data

### Lovable Wiring

For KPI cards that must always return exactly one row, use these query patterns with LEFT JOIN:

```sql
-- Passes KPI
WITH tf AS (SELECT lower(replace(COALESCE(NULLIF('{{ timeFrame }}',''), 'week'), '"','')) AS k)
SELECT COALESCE(s.passes,0) AS passes
FROM tf
LEFT JOIN public.hp_summary_windows s ON lower(s."window")=tf.k;

-- Total Minutes KPI
WITH tf AS (SELECT lower(replace(COALESCE(NULLIF('{{ timeFrame }}',''), 'week'), '"','')) AS k)
SELECT COALESCE(s.minutes_out,0)::bigint AS total_minutes
FROM tf
LEFT JOIN public.hp_summary_windows s ON lower(s."window")=tf.k;

-- Return Rate KPI
WITH tf AS (SELECT lower(replace(COALESCE(NULLIF('{{ timeFrame }}',''), 'week'), '"','')) AS k)
SELECT ROUND(COALESCE(r.pct_returned,0)*100.0,1) AS return_rate_pct,
       COALESCE(r.still_out,0) AS still_out,
       COALESCE(r.total,0)     AS total
FROM tf
LEFT JOIN public.hp_return_rate_windows r ON lower(r."window")=tf.k;
```

These patterns:
- Normalize the `timeFrame` parameter to lowercase
- Use `LEFT JOIN` to guarantee one row even if the view has no matching data
- Use `COALESCE` to provide sensible defaults (0) for missing values

## Analytics Views and Performance

### Views

- **hp_base** — Base view over `bathroom_passes` that normalizes column names
- **hp_frequent_flyers_bathroom_windows** — Windowed bathroom frequent flyers view

### Indexes

The following indexes are maintained on `bathroom_passes` to optimize analytics queries:

| Index Name | Type | Column | Purpose |
|------------|------|--------|---------|
| `idx_bathroom_passes_timeout` | B-tree | `timeout` | Time-range filtering |
| `idx_bathroom_passes_period` | B-tree | `period` | Period-based aggregations |
| `bathroom_passes_destination_trgm` | GIN (trigram) | `destination` | ILIKE acceleration for destination search |

> **Note:** The `pg_trgm` extension is required for the trigram index. It is enabled automatically by the performance migration.

## Grades Integration

The analytics dashboard includes a "Grades vs Bathroom Passes" card that correlates student grade averages with their pass frequency and duration. This helps identify students who may be struggling academically and spending excessive time out of class.

### Setting Up Grade Data

**Option A: Import CSV into the scaffold table**

The migration creates a `public.grades_normalized` table with columns:
- `student_key` (text) - lower-cased student display name or canonical key
- `term` (text, nullable) - e.g., 'Q2', 'Fall25', etc.
- `course` (text, nullable) - e.g., 'Math', 'English'
- `avg_grade` (numeric) - the student's average grade

Import your data via CSV or manual INSERT statements:
```sql
INSERT INTO public.grades_normalized (student_key, term, course, avg_grade)
VALUES
  ('john doe', 'Q2', 'Math', 85.5),
  ('jane smith', 'Q2', 'Math', 92.0);
```

**Option B: Create a view that maps your existing gradebook**

If you already have a grades table, create a view that maps to the expected columns:
```sql
CREATE OR REPLACE VIEW public.grades_normalized AS
SELECT lower(student_name) AS student_key,
       term,
       course,
       avg_score::numeric(5,2) AS avg_grade
FROM public.your_grades_table;
```

### How It Works

The analytics dashboard pulls from `hp_grade_compare_windows`, which joins:
- `hp_student_metrics_windows` - per-student pass metrics (bathroom or all scopes) by time window
- `grades_normalized` - your grade data

Filters available in the UI:
- **Scope**: "Bathroom" (only bathroom passes) or "All passes"
- **Term**: Filter by academic term (leave blank for all terms)
- **Timeframe**: Uses the same Day/Week/Month/Quarter/All selector as other analytics

### Discovery Helper

Run `scripts/sql/grades_discovery.sql` in the Supabase SQL Editor to:
1. List candidate grade tables in your schema
2. See example queries to inspect and map your data
