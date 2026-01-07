# Roster Seed Verification - 2025-2026 S2

This document provides verification steps for the 2025-2026 S2 roster enrollment seed migration.

## Migration File
- `supabase/migrations/20260107121136_seed_roster_2025_2026_s2.sql`

## Deployment

### Step 1: Apply Migration
```bash
supabase db push
```

This will:
- Add `is_test_user` column to `public.users` if missing
- Ensure Rick Garnett exists as a test student
- Load roster JSON and match to existing users
- Seed `student_enrollments` for 2025-2026 S2

## Verification Queries

### 1. Check Enrollment Counts by Period
```sql
select period, count(*) as enrollment_count
from public.student_enrollments
where school_year='2025-2026' and semester='S2'
group by period
order by period;
```

**Expected Results:**
- Period A: ~14 enrollments (Earth and Space + Rick Garnett)
- Period B: ~16 enrollments (Ecology)
- Period D: ~26 enrollments (Earth and Space)
- Period E: ~12 enrollments (Ecology)
- Period H: ~18 enrollments (Earth and Space)

### 2. Check Enrollment Counts by Course
```sql
select course, count(*) as enrollment_count
from public.student_enrollments
where school_year='2025-2026' and semester='S2'
group by course
order by course;
```

**Expected Results:**
- ESS (Earth and Space): ~58 enrollments
- ECO (Ecology): ~28 enrollments

### 3. Verify Roster Query Returns Rows
Test that the roster query used by the app returns students for a canonical period:

```sql
-- Test period A
select e.student_id, u.first_name, u.last_name, e.course, e.period
from public.student_enrollments e
join public.users u on u.id = e.student_id
where e.school_year='2025-2026' 
  and e.semester='S2' 
  and e.period='A'
  and u.role='student'
order by u.last_name, u.first_name;
```

**Expected:** Should return ~14 rows (13 Earth and Space students + Rick Garnett)

### 4. Verify Rick Garnett Enrollment
```sql
select u.email, u.is_test_user, e.course, e.period
from public.users u
left join public.student_enrollments e on e.student_id=u.id
where u.email='26rgarnett@student.nchstx.org'
  and e.school_year='2025-2026'
  and e.semester='S2';
```

**Expected Results:**
- `email`: '26rgarnett@student.nchstx.org'
- `is_test_user`: true
- `course`: 'ESS'
- `period`: 'A'

### 5. Check for Unmatched Roster Entries
If the migration aborted with conflicts, check which roster entries couldn't be matched:

```sql
-- This query helps identify potential matching issues
-- Run only if migration reported conflicts
select 
  u.first_name,
  u.last_name,
  u.email,
  u.nickname,
  count(*) as enrollment_count
from public.users u
join public.student_enrollments e on e.student_id = u.id
where e.school_year='2025-2026' and e.semester='S2'
group by u.id, u.first_name, u.last_name, u.email, u.nickname
order by u.last_name, u.first_name;
```

## UI Verification

### Manual Checklist
1. **Student Sign-Out Form**
   - Navigate to student sign-out page
   - Select period "A"
   - Verify student picker shows students from Earth and Space class
   - Verify Rick Garnett appears in the list

2. **Teacher Dashboard**
   - Navigate to teacher dashboard
   - Check "Roster Health" section
   - Verify it shows "✓ Enrollments" (green) for period A
   - Verify it shows "✓ Enrollments" for other periods (B, D, E, H)

3. **Period Filtering**
   - Test each period (A, B, D, E, H)
   - Verify correct students appear for each period
   - Verify course filtering works if implemented

## Troubleshooting

### Migration Aborted with Conflicts
If the migration raises an exception about conflicts:
1. Review the conflict JSON in the error message
2. Check which roster entries matched 0 or multiple users
3. Verify user names in `public.users` match roster names (accounting for nicknames)
4. Manually resolve conflicts by:
   - Adding missing users to `public.users`
   - Updating nicknames/preferred names if needed
   - Re-running the migration

### Roster Query Returns Empty
If roster queries return empty after migration:
1. Verify RLS policies allow authenticated users to read `student_enrollments`
2. Check that app is using authenticated role (not anonymous)
3. Verify `school_year='2025-2026'` and `semester='S2'` in queries
4. Check that period values match exactly ('A', 'B', 'D', 'E', 'H')

### Students Not Appearing in Picker
If students don't appear in the student picker:
1. Verify enrollment exists: `select * from student_enrollments where student_id = '<uuid>'`
2. Verify user has `role='student'`
3. Check that period filter matches enrollment period exactly
4. Verify course filter (if used) matches enrollment course exactly

## Rollback Plan

If the migration needs to be rolled back:

```sql
-- Remove S2 enrollments (preserves users)
delete from public.student_enrollments
where school_year='2025-2026' and semester='S2';

-- Optionally remove test user flag (but keep the user)
update public.users
set is_test_user = false
where email='26rgarnett@student.nchstx.org';

-- Optionally remove is_test_user column (if no other uses)
-- alter table public.users drop column if exists is_test_user;
```

**Note:** This rollback preserves all user data and only removes the S2 enrollments.

