-- Seed House Small Group roster for 2025-2026 S2
-- Idempotent: upserts users and enrollments
-- Upserts users into public.users (role=student) before creating enrollments
-- Fails loudly if any student emails are still missing after upsert

do $$
declare
  missing_emails text[];
begin
  -- Step 1: Upsert users into public.users (role=student)
  -- Match on email (unique constraint), update name fields for existing students
  -- Using inline VALUES table as the roster dataset
  insert into public.users (email, first_name, last_name, role)
  select
    r.email,
    r.first_name,
    r.last_name,
    'student'::user_role
  from (
    values
      ('26babert@student.nchstx.org', 'B', 'Abert', 'B Abert'),
      ('26aaguirre@student.nchstx.org', 'A', 'Aguirre', 'A Aguirre'),
      ('26dalfaro@student.nchstx.org', 'D', 'Alfaro', 'D Alfaro'),
      ('26eblandford@student.nchstx.org', 'E', 'Blandford', 'E Blandford'),
      ('26mcanada@student.nchstx.org', 'M', 'Canada', 'M Canada'),
      ('26aduong@student.nchstx.org', 'A', 'Duong', 'A Duong'),
      ('26jesparza@student.nchstx.org', 'Julian', 'Esparza', 'Julian Esparza'),
      ('26tgagliano@student.nchstx.org', 'T', 'Gagliano', 'T Gagliano'),
      ('26mgarcia@student.nchstx.org', 'Mia', 'Garcia', 'Mia Garcia'),
      ('26vle@student.nchstx.org', 'Vincent', 'Le', 'Vincent Le'),
      ('26jnguyen@student.nchstx.org', 'J', 'Nguyen', 'J Nguyen'),
      ('26wpaladini@student.nchstx.org', 'W', 'Paladini', 'W Paladini'),
      ('26zpelzel@student.nchstx.org', 'Z', 'Pelzel', 'Z Pelzel'),
      ('26jrandolph@student.nchstx.org', 'J', 'Randolph', 'J Randolph'),
      ('26asimmons@student.nchstx.org', 'A', 'Simmons', 'A Simmons'),
      ('26cuche@student.nchstx.org', 'C', 'Uche', 'C Uche')
  ) as r(email, first_name, last_name, name)
  on conflict (email) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    role = 'student'::user_role
  where public.users.role = 'student'::user_role;

  -- Step 2: Re-check for missing student users by email (safety check)
  select array_agg(r.email)
    into missing_emails
  from (
    values
      ('26babert@student.nchstx.org', 'B', 'Abert', 'B Abert'),
      ('26aaguirre@student.nchstx.org', 'A', 'Aguirre', 'A Aguirre'),
      ('26dalfaro@student.nchstx.org', 'D', 'Alfaro', 'D Alfaro'),
      ('26eblandford@student.nchstx.org', 'E', 'Blandford', 'E Blandford'),
      ('26mcanada@student.nchstx.org', 'M', 'Canada', 'M Canada'),
      ('26aduong@student.nchstx.org', 'A', 'Duong', 'A Duong'),
      ('26jesparza@student.nchstx.org', 'Julian', 'Esparza', 'Julian Esparza'),
      ('26tgagliano@student.nchstx.org', 'T', 'Gagliano', 'T Gagliano'),
      ('26mgarcia@student.nchstx.org', 'Mia', 'Garcia', 'Mia Garcia'),
      ('26vle@student.nchstx.org', 'Vincent', 'Le', 'Vincent Le'),
      ('26jnguyen@student.nchstx.org', 'J', 'Nguyen', 'J Nguyen'),
      ('26wpaladini@student.nchstx.org', 'W', 'Paladini', 'W Paladini'),
      ('26zpelzel@student.nchstx.org', 'Z', 'Pelzel', 'Z Pelzel'),
      ('26jrandolph@student.nchstx.org', 'J', 'Randolph', 'J Randolph'),
      ('26asimmons@student.nchstx.org', 'A', 'Simmons', 'A Simmons'),
      ('26cuche@student.nchstx.org', 'C', 'Uche', 'C Uche')
  ) as r(email, first_name, last_name, name)
  where not exists (
    select 1
    from public.users u
    where u.email = r.email
      and u.role = 'student'::user_role
  );

  if missing_emails is not null and array_length(missing_emails, 1) > 0 then
    raise exception
      'House Small Group seed failed: Missing student users for emails: %',
      array_to_string(missing_emails, ', ');
  end if;

  -- Step 3: Insert enrollments for House Small Group
  insert into public.student_enrollments (
    student_id, school_year, semester, course, period
  )
  select
    u.id,
    '2025-2026'::text,
    'S2'::text,
    'House Small Group'::text,
    'House Small Group'::text
  from (
    values
      ('26babert@student.nchstx.org', 'B', 'Abert', 'B Abert'),
      ('26aaguirre@student.nchstx.org', 'A', 'Aguirre', 'A Aguirre'),
      ('26dalfaro@student.nchstx.org', 'D', 'Alfaro', 'D Alfaro'),
      ('26eblandford@student.nchstx.org', 'E', 'Blandford', 'E Blandford'),
      ('26mcanada@student.nchstx.org', 'M', 'Canada', 'M Canada'),
      ('26aduong@student.nchstx.org', 'A', 'Duong', 'A Duong'),
      ('26jesparza@student.nchstx.org', 'Julian', 'Esparza', 'Julian Esparza'),
      ('26tgagliano@student.nchstx.org', 'T', 'Gagliano', 'T Gagliano'),
      ('26mgarcia@student.nchstx.org', 'Mia', 'Garcia', 'Mia Garcia'),
      ('26vle@student.nchstx.org', 'Vincent', 'Le', 'Vincent Le'),
      ('26jnguyen@student.nchstx.org', 'J', 'Nguyen', 'J Nguyen'),
      ('26wpaladini@student.nchstx.org', 'W', 'Paladini', 'W Paladini'),
      ('26zpelzel@student.nchstx.org', 'Z', 'Pelzel', 'Z Pelzel'),
      ('26jrandolph@student.nchstx.org', 'J', 'Randolph', 'J Randolph'),
      ('26asimmons@student.nchstx.org', 'A', 'Simmons', 'A Simmons'),
      ('26cuche@student.nchstx.org', 'C', 'Uche', 'C Uche')
  ) as r(email, first_name, last_name, name)
  inner join public.users u
    on u.email = r.email
   and u.role = 'student'::user_role
  on conflict (student_id, school_year, semester, course)
  do update set period = excluded.period;

  raise notice 'House Small Group roster seeded: 16 students';
end $$;
