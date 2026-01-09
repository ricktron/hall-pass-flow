-- Seed House Small Group roster for 2025-2026 S2
-- Uses exact student emails provided to match existing users
-- Fails loudly if any emails are missing

do $$
declare
  missing_emails text[];
  student_emails text[] := ARRAY[
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
  student_data jsonb := '[
    {"email": "26babert@student.nchstx.org", "last": "Abert", "first": "Brady", "name": "Brady Abert"},
    {"email": "26aaguirre@student.nchstx.org", "last": "Aguirre", "first": "Andy", "name": "Andy Aguirre"},
    {"email": "26dalfaro@student.nchstx.org", "last": "Alfaro", "first": "Diego", "name": "Diego Alfaro"},
    {"email": "26eblandford@student.nchstx.org", "last": "Blandford", "first": "Evan", "name": "Evan Blandford"},
    {"email": "26mcanada@student.nchstx.org", "last": "Canada", "first": "Matt", "name": "Matt Canada"},
    {"email": "26aduong@student.nchstx.org", "last": "Duong", "first": "Andrew", "name": "Andrew Duong"},
    {"email": "26jesparza@student.nchstx.org", "last": "Esparza", "first": "Julian", "name": "Julian Esparza"},
    {"email": "26tgagliano@student.nchstx.org", "last": "Gagliano", "first": "Timothy", "name": "Timothy Gagliano"},
    {"email": "26mgarcia@student.nchstx.org", "last": "Garcia", "first": "Moises", "name": "Moises Garcia"},
    {"email": "26vle@student.nchstx.org", "last": "Le", "first": "Vincent", "name": "Vincent Le"},
    {"email": "26jnguyen@student.nchstx.org", "last": "Nguyen", "first": "Jathan", "name": "Jathan Nguyen"},
    {"email": "26wpaladini@student.nchstx.org", "last": "Paladini", "first": "Will", "name": "Will Paladini"},
    {"email": "26zpelzel@student.nchstx.org", "last": "Pelzel", "first": "Zach", "name": "Zach Pelzel"},
    {"email": "26jrandolph@student.nchstx.org", "last": "Randolph", "first": "Jack", "name": "Jack Randolph"},
    {"email": "26asimmons@student.nchstx.org", "last": "Simmons", "first": "Aj", "name": "Aj Simmons"},
    {"email": "26cuche@student.nchstx.org", "last": "Uche", "first": "Chigo", "name": "Chigo Uche"}
  ]'::jsonb;
begin
  -- Check for missing emails
  select array_agg(email)
  into missing_emails
  from unnest(student_emails) as email
  where not exists (
    select 1
    from public.users u
    where u.email = email
      and u.role = 'student'::user_role
  );

  -- Fail loudly if any emails are missing
  if missing_emails is not null and array_length(missing_emails, 1) > 0 then
    raise exception 'House Small Group seed failed: Missing student users for emails: %', array_to_string(missing_emails, ', ');
  end if;

  -- Insert enrollments for House Small Group
  -- Use period = 'House Small Group' (stored as-is, RPC normalizes by removing " Period" suffix)
  -- Use course = 'House Small Group' to match the group_name pattern
  insert into public.student_enrollments (student_id, school_year, semester, course, period)
  select 
    u.id,
    '2025-2026'::text,
    'S2'::text,
    'House Small Group'::text,
    'House Small Group'::text
  from unnest(student_emails) as email
  inner join public.users u on u.email = email and u.role = 'student'::user_role
  on conflict (student_id, school_year, semester, course) 
  do update set period = excluded.period;

  raise notice 'House Small Group roster seeded: % students', array_length(student_emails, 1);
end $$;

