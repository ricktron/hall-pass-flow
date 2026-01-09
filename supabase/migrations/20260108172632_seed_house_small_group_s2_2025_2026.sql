-- Seed House Small Group roster for 2025-2026 S2
-- Idempotent: upserts enrollments keyed by (student_id, school_year, semester, course)
-- Fails loudly if any student emails are missing from public.users (role=student)

do $$
declare
  missing_emails text[];
  student_emails text[] := array[
    '26babert@student.nchstx.org',
    '26aaguirre@student.nchstx.org',
    '26dalfaro@student.nchstx.org',
    '26eblandford@student.nchstx.org',
    '26mcanada@student.nchstx.org',
    '26aduong@student.nchstx.org',
    '26jesparza@student.nchstx.org',
    '26tgagliano@student.nchstx.org',
    '26mgarcia@student.nchstx.org',
    '26vle@student.nchstx.org',
    '26jnguyen@student.nchstx.org',
    '26wpaladini@student.nchstx.org',
    '26zpelzel@student.nchstx.org',
    '26jrandolph@student.nchstx.org',
    '26asimmons@student.nchstx.org',
    '26cuche@student.nchstx.org'
  ];
begin
  -- Check for missing student users by email
  select array_agg(se.student_email)
    into missing_emails
  from unnest(student_emails) as se(student_email)
  where not exists (
    select 1
    from public.users u
    where u.email = se.student_email
      and u.role = 'student'::user_role
  );

  if missing_emails is not null and array_length(missing_emails, 1) > 0 then
    raise exception
      'House Small Group seed failed: Missing student users for emails: %',
      array_to_string(missing_emails, ', ');
  end if;

  -- Insert enrollments for House Small Group
  insert into public.student_enrollments (
    student_id, school_year, semester, course, period
  )
  select
    u.id,
    '2025-2026'::text,
    'S2'::text,
    'House Small Group'::text,
    'House Small Group'::text
  from unnest(student_emails) as se(student_email)
  inner join public.users u
    on u.email = se.student_email
   and u.role = 'student'::user_role
  on conflict (student_id, school_year, semester, course)
  do update set period = excluded.period;

  raise notice 'House Small Group roster seeded: % students', array_length(student_emails, 1);
end $$;
