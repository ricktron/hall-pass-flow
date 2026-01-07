-- Seed 2025-2026 S2 student enrollments from roster JSON
-- Preserves existing names and nicknames in users table
-- Adds test student (Rick Garnett) if missing

-- Step A: Add is_test_user column if missing
alter table public.users add column if not exists is_test_user boolean not null default false;

-- Step B: Ensure Rick Garnett exists as a student user
insert into public.users (first_name, last_name, email, role, is_test_user)
values ('Rick','Garnett','26rgarnett@student.nchstx.org','student'::user_role,true)
on conflict (email) do update
set role='student'::user_role,
    is_test_user=true;

-- Step C: Load roster JSON and match to users, then seed enrollments
do $$
declare
  conflicts jsonb;
  roster_json jsonb := '[
  {"first_name": "Alana", "last_name": "Demma", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Isabel", "last_name": "Durham", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Julian", "last_name": "Esparza", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Xavier", "last_name": "Garcia", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Payne", "last_name": "Holbert", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Danny", "last_name": "Johnson", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Preston", "last_name": "Kennedy", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Xavier", "last_name": "Malone", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Destiny", "last_name": "Munoz", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Jaden M", "last_name": "Nguyen", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Camila", "last_name": "Sanchez", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Gabe", "last_name": "Spurgeon", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Julyanna", "last_name": "Villegas", "course": "Earth and Space", "period": "A Period"},
  {"first_name": "Isabella", "last_name": "Barajas", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Brenna", "last_name": "Belauskas", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Josie", "last_name": "Burgdorf", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Sebastian", "last_name": "Calzada", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Manuel", "last_name": "Castillo", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "James", "last_name": "Dalton", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Antonio", "last_name": "Del Signore", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Tyler", "last_name": "Delatore", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Antonio", "last_name": "Garcia", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Luke", "last_name": "Heidemann", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Brandon", "last_name": "Hoang", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Jojo", "last_name": "Irvin", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Myu", "last_name": "Lataw", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "German", "last_name": "Macias", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "John David", "last_name": "Mattox", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Lauren", "last_name": "McGrail", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Cooper", "last_name": "Orand", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Ivana", "last_name": "Paltsev", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Hayden", "last_name": "Pior", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Jocelyn", "last_name": "Ramirez", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Sidney", "last_name": "Sholars-Anderson", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Sophia", "last_name": "Taylor", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Clara", "last_name": "Vu", "course": "Earth and Space", "period": "D Period"},
  {"first_name": "Thomas", "last_name": "Adami", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Valerie", "last_name": "Betancourt", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Ann Marie", "last_name": "Cademartori", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Jon", "last_name": "Fry", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Andrew", "last_name": "Gandara", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Moises", "last_name": "Garcia", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Olivia", "last_name": "Leuschner", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Brayden", "last_name": "Meche", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Michael", "last_name": "Neidecker", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Ashlynn", "last_name": "Perez", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Ricky", "last_name": "Salazar", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Lyrix", "last_name": "Sallee", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Kassandra", "last_name": "Sanchez", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Jackson", "last_name": "Schuster", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Jaden", "last_name": "Torres", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Ellorie", "last_name": "Wheeler", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Ty", "last_name": "Wise", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Hunter", "last_name": "Zenk", "course": "Earth and Space", "period": "H Period"},
  {"first_name": "Danny", "last_name": "Cantarella", "course": "Ecology", "period": "B Period"},
  {"first_name": "Elizabeth", "last_name": "Endres", "course": "Ecology", "period": "B Period"},
  {"first_name": "Josie", "last_name": "Folzenlogen", "course": "Ecology", "period": "B Period"},
  {"first_name": "Sam", "last_name": "Jackman", "course": "Ecology", "period": "B Period"},
  {"first_name": "Gavrielle", "last_name": "Kapend", "course": "Ecology", "period": "B Period"},
  {"first_name": "Owen", "last_name": "May", "course": "Ecology", "period": "B Period"},
  {"first_name": "Bella", "last_name": "Mock", "course": "Ecology", "period": "B Period"},
  {"first_name": "Mimi", "last_name": "Moore", "course": "Ecology", "period": "B Period"},
  {"first_name": "Sara", "last_name": "Najera", "course": "Ecology", "period": "B Period"},
  {"first_name": "Claire", "last_name": "Perales", "course": "Ecology", "period": "B Period"},
  {"first_name": "Phillip", "last_name": "Porras", "course": "Ecology", "period": "B Period"},
  {"first_name": "Paul", "last_name": "Reimer", "course": "Ecology", "period": "B Period"},
  {"first_name": "Amanda", "last_name": "Salcedo", "course": "Ecology", "period": "B Period"},
  {"first_name": "Avery", "last_name": "Schmidt", "course": "Ecology", "period": "B Period"},
  {"first_name": "Sofia", "last_name": "Serna", "course": "Ecology", "period": "B Period"},
  {"first_name": "Jimmy", "last_name": "Suter", "course": "Ecology", "period": "B Period"},
  {"first_name": "Tristan", "last_name": "Williams", "course": "Ecology", "period": "B Period"},
  {"first_name": "Kate", "last_name": "Button", "course": "Ecology", "period": "E Period"},
  {"first_name": "Mia Garcia", "last_name": "Garcia", "course": "Ecology", "period": "E Period"},
  {"first_name": "Meg", "last_name": "Gillen", "course": "Ecology", "period": "E Period"},
  {"first_name": "Nick", "last_name": "Koelzer", "course": "Ecology", "period": "E Period"},
  {"first_name": "Vincent", "last_name": "Le", "course": "Ecology", "period": "E Period"},
  {"first_name": "Keeley", "last_name": "Moore", "course": "Ecology", "period": "E Period"},
  {"first_name": "Faith", "last_name": "Pelzel", "course": "Ecology", "period": "E Period"},
  {"first_name": "Lauren", "last_name": "Rodriquez", "course": "Ecology", "period": "E Period"},
  {"first_name": "Stellamae", "last_name": "Stavens", "course": "Ecology", "period": "E Period"},
  {"first_name": "Nick", "last_name": "Swigart", "course": "Ecology", "period": "E Period"},
  {"first_name": "Ava", "last_name": "Talabock", "course": "Ecology", "period": "E Period"},
  {"first_name": "Jake", "last_name": "Werline", "course": "Ecology", "period": "E Period"}
]'::jsonb;
begin
  -- Create temp table for roster import
  create temp table roster_import (
    roster_first_name text,
    roster_last_name text,
    roster_course text,
    roster_period text,
    canonical_course text,
    canonical_period text,
    student_id uuid,
    match_count int
  );

  -- Insert roster data with canonical mappings
  insert into roster_import (roster_first_name, roster_last_name, roster_course, roster_period, canonical_course, canonical_period)
  select 
    r->>'first_name' as roster_first_name,
    r->>'last_name' as roster_last_name,
    r->>'course' as roster_course,
    r->>'period' as roster_period,
    case 
      when r->>'course' = 'Earth and Space' then 'ESS'
      when r->>'course' = 'Ecology' then 'ECO'
      else r->>'course'
    end as canonical_course,
    case 
      when r->>'period' = 'A Period' then 'A'
      when r->>'period' = 'B Period' then 'B'
      when r->>'period' = 'D Period' then 'D'
      when r->>'period' = 'E Period' then 'E'
      when r->>'period' = 'H Period' then 'H'
      else regexp_replace(r->>'period', ' Period$', '', 'g')
    end as canonical_period
  from jsonb_array_elements(roster_json) r;

  -- Add Rick Garnett enrollment
  insert into roster_import (roster_first_name, roster_last_name, roster_course, roster_period, canonical_course, canonical_period)
  values ('Rick', 'Garnett', 'Earth and Space', 'A Period', 'ESS', 'A');

  -- Match roster entries to users
  -- Match by: normalized last name AND (normalized first name OR normalized nickname/preferred_name/display_name/full_name/name OR first token of roster first name)
  with matched_roster as (
    select 
      ri.roster_first_name,
      ri.roster_last_name,
      ri.canonical_course,
      ri.canonical_period,
      u.id as student_id,
      count(*) over (partition by ri.roster_first_name, ri.roster_last_name) as match_count
    from roster_import ri
    cross join lateral (
      select u2.id
      from public.users u2
      where u2.role = 'student'::user_role
        and lower(regexp_replace(coalesce(ri.roster_last_name, ''), '[^a-z0-9]+', '', 'g')) = 
            lower(regexp_replace(coalesce(u2.last_name, ''), '[^a-z0-9]+', '', 'g'))
        and (
          -- Match first name exactly (normalized)
          lower(regexp_replace(coalesce(ri.roster_first_name, ''), '[^a-z0-9]+', '', 'g')) = 
          lower(regexp_replace(coalesce(u2.first_name, ''), '[^a-z0-9]+', '', 'g'))
          -- OR match first token of roster first name (handles "John David", "Jaden M")
          or lower(regexp_replace(split_part(coalesce(ri.roster_first_name, ''), ' ', 1), '[^a-z0-9]+', '', 'g')) = 
             lower(regexp_replace(coalesce(u2.first_name, ''), '[^a-z0-9]+', '', 'g'))
          -- OR match against nickname if column exists
          or (to_jsonb(u2)->>'nickname' is not null 
              and lower(regexp_replace(coalesce(ri.roster_first_name, ''), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'nickname', ''), '[^a-z0-9]+', '', 'g')))
          or (to_jsonb(u2)->>'nickname' is not null 
              and lower(regexp_replace(split_part(coalesce(ri.roster_first_name, ''), ' ', 1), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'nickname', ''), '[^a-z0-9]+', '', 'g')))
          -- OR match against preferred_name if column exists
          or (to_jsonb(u2)->>'preferred_name' is not null 
              and lower(regexp_replace(coalesce(ri.roster_first_name, ''), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'preferred_name', ''), '[^a-z0-9]+', '', 'g')))
          or (to_jsonb(u2)->>'preferred_name' is not null 
              and lower(regexp_replace(split_part(coalesce(ri.roster_first_name, ''), ' ', 1), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'preferred_name', ''), '[^a-z0-9]+', '', 'g')))
          -- OR match against display_name if column exists
          or (to_jsonb(u2)->>'display_name' is not null 
              and lower(regexp_replace(coalesce(ri.roster_first_name, ''), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'display_name', ''), '[^a-z0-9]+', '', 'g')))
          or (to_jsonb(u2)->>'display_name' is not null 
              and lower(regexp_replace(split_part(coalesce(ri.roster_first_name, ''), ' ', 1), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'display_name', ''), '[^a-z0-9]+', '', 'g')))
          -- OR match against full_name if column exists
          or (to_jsonb(u2)->>'full_name' is not null 
              and lower(regexp_replace(coalesce(ri.roster_first_name, ''), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'full_name', ''), '[^a-z0-9]+', '', 'g')))
          or (to_jsonb(u2)->>'full_name' is not null 
              and lower(regexp_replace(split_part(coalesce(ri.roster_first_name, ''), ' ', 1), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'full_name', ''), '[^a-z0-9]+', '', 'g')))
          -- OR match against name if column exists
          or (to_jsonb(u2)->>'name' is not null 
              and lower(regexp_replace(coalesce(ri.roster_first_name, ''), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'name', ''), '[^a-z0-9]+', '', 'g')))
          or (to_jsonb(u2)->>'name' is not null 
              and lower(regexp_replace(split_part(coalesce(ri.roster_first_name, ''), ' ', 1), '[^a-z0-9]+', '', 'g')) = 
                  lower(regexp_replace(coalesce(to_jsonb(u2)->>'name', ''), '[^a-z0-9]+', '', 'g')))
        )
      limit 1
    ) u
    where u.id is not null
  )
  update roster_import ri
  set student_id = mr.student_id,
      match_count = mr.match_count
  from matched_roster mr
  where ri.roster_first_name = mr.roster_first_name
    and ri.roster_last_name = mr.roster_last_name;

  -- Check for conflicts (unresolved or ambiguous matches)
  select jsonb_agg(
    jsonb_build_object(
      'roster_name', roster_first_name || ' ' || roster_last_name,
      'match_count', coalesce(match_count, 0),
      'student_id', student_id
    )
  )
  into conflicts
  from roster_import
  where match_count != 1 or student_id is null;

  -- Abort if conflicts found
  if conflicts is not null and jsonb_array_length(conflicts) > 0 then
    raise exception 'Roster seed conflicts: %', conflicts;
  end if;

  -- Insert enrollments (ON CONFLICT updates period if needed)
  insert into public.student_enrollments (student_id, school_year, semester, course, period)
  select 
    student_id,
    '2025-2026'::text,
    'S2'::text,
    canonical_course,
    canonical_period
  from roster_import
  where student_id is not null
  on conflict (student_id, school_year, semester, course) 
  do update set period = excluded.period;

  -- Clean up temp table
  drop table roster_import;
end $$;

