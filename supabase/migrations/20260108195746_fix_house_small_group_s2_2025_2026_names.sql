-- Fix House Small Group roster names for 2025-2026 S2
-- Updates public.users names to match source CSV exactly
-- Ensures enrollments match exactly the 16 students in the roster
-- Source: group_2025-2026_S2_house-small-group.csv

do $$
declare
  roster jsonb := '[
    {"email":"26jesparza@student.nchstx.org","first":"Julian","last":"Esparza"},
    {"email":"26jnguyen1@student.nchstx.org","first":"Jathan","last":"Nguyen"},
    {"email":"26vle@student.nchstx.org","first":"Vincent","last":"Le"},
    {"email":"26mgarcia1@student.nchstx.org","first":"Moises","last":"Garcia"},
    {"email":"26wpaladini@student.nchstx.org","first":"Will","last":"Paladini"},
    {"email":"27cuche@student.nchstx.org","first":"Chigo","last":"Uche"},
    {"email":"27babert@student.nchstx.org","first":"Brady","last":"Abert"},
    {"email":"28aduong@student.nchstx.org","first":"Andrew","last":"Duong"},
    {"email":"28mcanada@student.nchstx.org","first":"Matt","last":"Canada"},
    {"email":"28zpelzel@student.nchstx.org","first":"Zach","last":"Pelzel"},
    {"email":"28aaguirre@student.nchstx.org","first":"Andy","last":"Aguirre"},
    {"email":"29jrandolph@student.nchstx.org","first":"Jack","last":"Randolph"},
    {"email":"29eblandford@student.nchstx.org","first":"Evan","last":"Blandford"},
    {"email":"29dalfaro@student.nchstx.org","first":"Diego","last":"Alfaro"},
    {"email":"29asimmons@student.nchstx.org","first":"Aj","last":"Simmons"},
    {"email":"29tgagliano@student.nchstx.org","first":"Timothy","last":"Gagliano"}
  ]'::jsonb;
  missing text[];
begin
  -- Validate that each roster email exists in public.users with role = 'student'::user_role
  select array_agg(r.email) into missing
  from jsonb_to_recordset(roster) as r(email text, first text, last text)
  where not exists (
    select 1 from public.users u
    where u.email = r.email
      and u.role = 'student'::user_role
  );

  if missing is not null and array_length(missing, 1) > 0 then
    raise exception 'House Small Group fix failed: Missing student users for emails: %', array_to_string(missing, ', ');
  end if;

  -- Update public.users for those 16 emails: set first_name = roster.first, last_name = roster.last
  update public.users u
     set first_name = r.first,
         last_name  = r.last
    from jsonb_to_recordset(roster) as r(email text, first text, last text)
   where u.email = r.email
     and u.role = 'student'::user_role;

  -- Delete any student_enrollments rows for House Small Group where the student's email is NOT in the roster list
  delete from public.student_enrollments se
  using public.users u
  where se.student_id = u.id
    and se.school_year = '2025-2026'
    and se.semester = 'S2'
    and se.course = 'House Small Group'
    and u.role = 'student'::user_role
    and u.email not in (
      select r.email from jsonb_to_recordset(roster) as r(email text, first text, last text)
    );

  -- Upsert enrollments for the 16 roster students
  insert into public.student_enrollments (student_id, school_year, semester, course, period)
  select u.id, '2025-2026', 'S2', 'House Small Group', 'House Small Group'
  from jsonb_to_recordset(roster) as r(email text, first text, last text)
  join public.users u
    on u.email = r.email
   and u.role = 'student'::user_role
  on conflict (student_id, school_year, semester, course)
  do update set period = excluded.period;

  raise notice 'House Small Group roster fixed: % students',
    (select count(*) from jsonb_to_recordset(roster) as r(email text, first text, last text));
end $$;

