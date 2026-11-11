-- =============================================================================
-- ECYR English platform — students shared between teachers
-- -----------------------------------------------------------------------------
-- Runs after 01–20. Safe to re-run: create-if-not-exists / create-or-replace.
--
-- WHY THIS FILE EXISTS
-- A student belonged to exactly one teacher (profiles.teacher_id). Now a student
-- can be in several teachers' classes, so each of them can assign them work and
-- follow their progress, and the student does the tasks of all of them.
--
--   profiles.teacher_id   the MAIN teacher (unchanged: class-code join, AI gating…)
--   teacher_students      the EXTRA teachers of a student (this file)
--   profiles.shared_pool  the owner marked this student as "open to every teacher"
--
-- WHO CAN DO WHAT
--   owner (platform_admins)  links any student to any teacher, removes links,
--                            and opens/closes a student to every teacher
--   any teacher              adds to their own class the students the owner opened
--                            (no request needed: a teacher account already needs
--                            an invitation code), and removes themselves from a class
--   student                  sees their teachers' tasks; leaving a class leaves all
--   nobody else              can create links: no direct writes on the table
--
-- Every class read in the schema goes through is_my_student(), which now also
-- looks at the extra links, so tasks, progress, submissions, portfolio, reviews,
-- notes shared with the teacher and walls follow without further changes.
-- =============================================================================

do $$
begin
  if to_regprocedure('public.is_platform_admin()') is null or to_regclass('public.live_boards') is null then
    raise exception 'Run 01_schema.sql … 20_class_wars.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- ============================================================= 1. TABLES ====
alter table public.profiles add column if not exists shared_pool boolean not null default false;

create table if not exists public.teacher_students (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (teacher_id, student_id),
  check (teacher_id <> student_id)
);

create index if not exists teacher_students_student_idx on public.teacher_students(student_id);

alter table public.teacher_students enable row level security;
revoke all on public.teacher_students from anon, authenticated;
grant select on public.teacher_students to authenticated;

drop policy if exists teacher_students_select_teacher on public.teacher_students;
create policy teacher_students_select_teacher on public.teacher_students
  for select to authenticated using (teacher_id = auth.uid());

-- ============================================================ 2. HELPERS ====
-- Is p_student in p_teacher's class: as their main teacher or through an extra link?
create or replace function public.in_class_of(p_teacher uuid, p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Only the two people involved may ask (the policies always do), so it is not an oracle.
  select p_teacher is not null and p_student is not null and auth.uid() in (p_teacher, p_student) and (
    exists (select 1 from public.profiles where id = p_student and teacher_id = p_teacher)
    or exists (select 1 from public.teacher_students where teacher_id = p_teacher and student_id = p_student)
  );
$$;

revoke all on function public.in_class_of(uuid, uuid) from public, anon;
grant execute on function public.in_class_of(uuid, uuid) to authenticated;

-- The check every class policy uses (01_schema.sql): now main OR extra teacher.
create or replace function public.is_my_student(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.in_class_of(auth.uid(), sid);
$$;

-- A teacher also reads the profile rows of the students they share.
drop policy if exists profiles_select_students on public.profiles;
create policy profiles_select_students on public.profiles
  for select using (
    teacher_id = auth.uid()
    or exists (select 1 from public.teacher_students ts where ts.student_id = profiles.id and ts.teacher_id = auth.uid())
  );

-- ======================================================== 3. ASSIGNMENTS ====
-- A student sees the tasks of every teacher whose class they are in.
create or replace function public.can_see_assignment(p_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.assignments a
     where a.id = p_assignment
       and public.in_class_of(a.teacher_id, auth.uid())
       and (a.audience = 'class'
            or exists (select 1 from public.assignment_targets t
                        where t.assignment_id = a.id and t.student_id = auth.uid()))
  );
$$;

drop policy if exists assignments_select on public.assignments;
create policy assignments_select on public.assignments
  for select to authenticated using (
    teacher_id = auth.uid()
    or (
      public.in_class_of(teacher_id, auth.uid())
      and (audience = 'class'
           or exists (select 1 from public.assignment_targets t
                       where t.assignment_id = assignments.id and t.student_id = auth.uid()))
    )
  );

-- ========================================== 4. HISTORY SWITCH AND WALLS ====
create or replace function public.history_visible_to(p_student uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_teacher  uuid;
  v_override boolean;
  v_default  boolean;
begin
  if p_student is null then
    return false;
  end if;

  select teacher_id, history_override
    into v_teacher, v_override
    from public.profiles
   where id = p_student;

  if not found then
    return false;
  end if;

  -- Only the student themselves, or the teacher whose class they are in, has
  -- any business asking. Anyone else is told "no" rather than the truth.
  if p_student <> auth.uid() and not public.in_class_of(auth.uid(), p_student) then
    return false;
  end if;

  if v_override is not null then
    return v_override;
  end if;

  if v_teacher is null then
    return true;                        -- self-study: their own work is theirs
  end if;

  select history_default into v_default from public.profiles where id = v_teacher;
  return coalesce(v_default, true);
end;
$$;

grant execute on function public.history_visible_to(uuid) to authenticated;

create or replace function public.set_student_history(p_student uuid, p_value boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') then
    raise exception 'Only a teacher can change this setting.';
  end if;
  if not public.in_class_of(auth.uid(), p_student) then
    raise exception 'That student is not in your class.';
  end if;

  update public.profiles set history_override = p_value where id = p_student;
  return public.history_visible_to(p_student);
end;
$$;

grant execute on function public.set_student_history(uuid, boolean) to authenticated;

create or replace function public.live_board_role(p_board uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when b.teacher_id = auth.uid() then 'teacher'
    when b.closed_at is null
         and (b.members is null or auth.uid() = any(b.members))
         and public.in_class_of(b.teacher_id, auth.uid())
      then 'student'
    else null
  end
  from public.live_boards b
  where b.id = p_board;
$$;

revoke all on function public.live_board_role(uuid) from public, anon, authenticated;

create or replace function public.live_board_check(p_board uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  v_role := public.live_board_role(p_board);
  if v_role is null then
    if exists (
      select 1 from public.live_boards b
       where b.id = p_board and public.in_class_of(b.teacher_id, auth.uid()) and b.closed_at is not null
         and (b.members is null or auth.uid() = any(b.members))
    ) then
      raise exception 'BOARD_CLOSED: this board was closed by the teacher.' using errcode = '42501';
    end if;
    raise exception 'BOARD_NOT_FOUND: this board does not exist or is not for your class.' using errcode = '42501';
  end if;
  return v_role;
end;
$$;

revoke all on function public.live_board_check(uuid) from public, anon, authenticated;

create or replace function public.live_board_members(p_teacher uuid, p_members uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_members is null then null
    else coalesce((
      select array_agg(distinct p.id)
        from public.profiles p
       where p.id = any(p_members[1:200]) and public.in_class_of(p_teacher, p.id)
    ), '{}'::uuid[])
  end;
$$;

revoke all on function public.live_board_members(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.list_live_boards()
returns table (
  id           uuid,
  title        text,
  layout       text,
  prompt       text,
  show_names   boolean,
  locked       boolean,
  closed_at    timestamptz,
  created_at   timestamptz,
  cards        bigint,
  teacher_name text,
  members      uuid[],
  member_count int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select * into v_me from public.profiles where profiles.id = auth.uid();
  return query
    select b.id, b.title, b.layout, b.prompt, b.show_names, b.locked, b.closed_at, b.created_at,
           (select count(*) from public.live_board_cards c where c.board_id = b.id),
           t.full_name,
           case when b.teacher_id = v_me.id then b.members end,
           cardinality(b.members)
      from public.live_boards b
      join public.profiles t on t.id = b.teacher_id
     where b.teacher_id = v_me.id
        or (public.in_class_of(b.teacher_id, v_me.id) and b.closed_at is null
            and (b.members is null or v_me.id = any(b.members)))
     order by (b.closed_at is not null), b.created_at desc
     limit 200;
end;
$$;

-- ================================================ 5. JOINING AND LEAVING ====
create or replace function public.join_class(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher uuid;
  v_name    text;
  v_role    text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'Your profile has not been created yet. Reload the page and try again.';
  end if;
  -- Previously a teacher could call this: the update matched nothing but the
  -- function still returned a name, so the app reported a class had been
  -- joined when none had.
  if v_role <> 'student' then
    raise exception 'Only a student account can join a class.';
  end if;

  select id, full_name into v_teacher, v_name
  from public.profiles
  where class_code = upper(trim(p_code)) and role = 'teacher';

  if v_teacher is null then
    raise exception 'That class code does not match any teacher.';
  end if;

  update public.profiles set teacher_id = v_teacher where id = auth.uid();
  -- If they were already attached to this teacher as an extra link, it is now their main one.
  delete from public.teacher_students where student_id = auth.uid() and teacher_id = v_teacher;

  return coalesce(nullif(v_name,''), 'your teacher');
end;
$$;

-- A student who leaves, leaves every class they were in.
create or replace function public.leave_class()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'student') then
    return;
  end if;
  delete from public.teacher_students where student_id = auth.uid();
  update public.profiles set teacher_id = null where id = auth.uid();
end;
$$;

-- A teacher takes a student out of THEIR class only. If it was the student's main
-- teacher and another teacher still has them, that teacher becomes the main one.
create or replace function public.remove_student(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') then
    raise exception 'Only a teacher can remove a student.';
  end if;
  if not public.in_class_of(auth.uid(), p_student) then
    raise exception 'That student is not in your class.';
  end if;

  delete from public.teacher_students where teacher_id = auth.uid() and student_id = p_student;

  if exists (select 1 from public.profiles where id = p_student and teacher_id = auth.uid()) then
    select teacher_id into v_next from public.teacher_students where student_id = p_student order by created_at limit 1;
    update public.profiles set teacher_id = v_next where id = p_student;
    if v_next is not null then
      delete from public.teacher_students where teacher_id = v_next and student_id = p_student;
    end if;
  end if;
end;
$$;

create or replace function public.switch_role(p_role text, p_code text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.profiles;
begin
  if p_role not in ('student','teacher') then
    raise exception 'Role must be student or teacher.';
  end if;

  select * into v_me from public.profiles where id = auth.uid();
  if v_me.id is null then
    raise exception 'Your profile has not been created yet. Reload the page and try again.';
  end if;
  if v_me.role = p_role then
    return p_role;
  end if;

  if v_me.teacher_id is not null
     or exists (select 1 from public.profiles    where teacher_id = v_me.id)
     or exists (select 1 from public.teacher_students where teacher_id = v_me.id or student_id = v_me.id)
     or exists (select 1 from public.submissions where student_id = v_me.id)
     or exists (select 1 from public.homework    where student_id = v_me.id or teacher_id = v_me.id)
     or exists (select 1 from public.feedback    where student_id = v_me.id or teacher_id = v_me.id)
  then
    raise exception 'This account is already in use as a %. Create a separate account for the other role.', v_me.role;
  end if;

  if p_role = 'teacher' and not public.is_platform_admin() then
    perform public.spend_teacher_invite(p_code, v_me.id, v_me.email);
  end if;

  update public.profiles
     set role = p_role,
         class_code = case when p_role = 'teacher'
                           then coalesce(v_me.class_code, public.new_class_code())
                           else null end
   where id = auth.uid();

  return p_role;
end;
$$;

revoke all on function public.switch_role(text, text) from public, anon;
grant execute on function public.switch_role(text, text) to authenticated;

-- ========================================================= 6. OWNER TOOLS ====
-- Adds a link. If the student had no class, this teacher becomes their main one.
create or replace function public.link_student_to_teacher(p_student uuid, p_teacher uuid, p_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then
    raise exception 'That account is not a student.';
  end if;
  if not exists (select 1 from public.profiles where id = p_teacher and role = 'teacher') then
    raise exception 'That account is not a teacher.';
  end if;
  if exists (select 1 from public.profiles where id = p_student and teacher_id is null) then
    update public.profiles set teacher_id = p_teacher where id = p_student;
  elsif not exists (select 1 from public.teacher_students where teacher_id = p_teacher and student_id = p_student)
        and not exists (select 1 from public.profiles where id = p_student and teacher_id = p_teacher) then
    insert into public.teacher_students (teacher_id, student_id, added_by) values (p_teacher, p_student, p_by)
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.link_student_to_teacher(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.admin_share_student(p_student uuid, p_teacher uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can share students.' using errcode = '42501';
  end if;
  perform public.link_student_to_teacher(p_student, p_teacher, auth.uid());
end;
$$;

create or replace function public.admin_unshare_student(p_student uuid, p_teacher uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can share students.' using errcode = '42501';
  end if;
  delete from public.teacher_students where teacher_id = p_teacher and student_id = p_student;
  if exists (select 1 from public.profiles where id = p_student and teacher_id = p_teacher) then
    select teacher_id into v_next from public.teacher_students where student_id = p_student order by created_at limit 1;
    update public.profiles set teacher_id = v_next where id = p_student;
    if v_next is not null then
      delete from public.teacher_students where teacher_id = v_next and student_id = p_student;
    end if;
  end if;
end;
$$;

-- Opens (or closes) a student to every teacher: any teacher can then add them.
create or replace function public.admin_set_student_shared(p_student uuid, p_shared boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can share students.' using errcode = '42501';
  end if;
  update public.profiles set shared_pool = coalesce(p_shared, false) where id = p_student and role = 'student';
end;
$$;

-- Every student with their main teacher, extra teachers and whether they are open to all.
drop function if exists public.list_platform_students();
create or replace function public.list_platform_students()
returns table (id uuid, email text, full_name text, teacher_id uuid, teacher_name text, created_at timestamptz,
               shared boolean, extra_teachers jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can see the students.' using errcode = '42501';
  end if;
  return query
    select s.id, s.email, s.full_name, s.teacher_id, coalesce(nullif(t.full_name, ''), t.email), s.created_at,
           s.shared_pool,
           coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', coalesce(nullif(x.full_name, ''), x.email)) order by ts.created_at)
                       from public.teacher_students ts join public.profiles x on x.id = ts.teacher_id
                      where ts.student_id = s.id), '[]'::jsonb)
      from public.profiles s
      left join public.profiles t on t.id = s.teacher_id
     where s.role = 'student'
     order by s.created_at desc;
end;
$$;

-- Teachers with the size of their class (main + shared).
create or replace function public.list_platform_teachers()
returns table (id uuid, email text, full_name text, class_code text, students bigint, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can see the teachers.' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.full_name, p.class_code,
           (select count(*) from public.profiles s where s.role = 'student'
               and (s.teacher_id = p.id or exists (select 1 from public.teacher_students ts where ts.student_id = s.id and ts.teacher_id = p.id))),
           p.created_at
      from public.profiles p
     where p.role = 'teacher'
     order by p.created_at desc;
end;
$$;

-- ===================================================== 7. TEACHER TOOLS ====
-- Students the owner opened to every teacher and that are not in my class yet.
create or replace function public.list_shared_students()
returns table (id uuid, email text, full_name text, teacher_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'teacher') then
    raise exception 'Only a teacher can see the shared students.' using errcode = '42501';
  end if;
  return query
    select s.id, s.email, s.full_name, coalesce(nullif(t.full_name, ''), t.email)
      from public.profiles s
      left join public.profiles t on t.id = s.teacher_id
     where s.role = 'student' and s.shared_pool and not public.in_class_of(auth.uid(), s.id)
     order by s.full_name nulls last, s.email
     limit 300;
end;
$$;

-- A teacher adds an opened student to their class. No request: being a teacher
-- here already took an invitation code. Only students the owner opened qualify.
create or replace function public.claim_shared_student(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') then
    raise exception 'Only a teacher can add students to a class.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student' and shared_pool) then
    raise exception 'That student is not open to every teacher.' using errcode = '42501';
  end if;
  perform public.link_student_to_teacher(p_student, auth.uid(), auth.uid());
end;
$$;

-- The teachers of the signed-in student (for "your teachers" on their side).
create or replace function public.my_teachers()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, coalesce(nullif(t.full_name, ''), 'Docente')
    from public.profiles t
   where t.id = (select teacher_id from public.profiles where id = auth.uid())
      or t.id in (select teacher_id from public.teacher_students where student_id = auth.uid())
   order by 2;
$$;

revoke all on function public.admin_share_student(uuid, uuid)      from public, anon;
revoke all on function public.admin_unshare_student(uuid, uuid)    from public, anon;
revoke all on function public.admin_set_student_shared(uuid, boolean) from public, anon;
revoke all on function public.list_platform_students()              from public, anon;
revoke all on function public.list_platform_teachers()              from public, anon;
revoke all on function public.list_shared_students()                from public, anon;
revoke all on function public.claim_shared_student(uuid)            from public, anon;
revoke all on function public.my_teachers()                         from public, anon;
grant execute on function public.admin_share_student(uuid, uuid)      to authenticated;
grant execute on function public.admin_unshare_student(uuid, uuid)    to authenticated;
grant execute on function public.admin_set_student_shared(uuid, boolean) to authenticated;
grant execute on function public.list_platform_students()              to authenticated;
grant execute on function public.list_platform_teachers()              to authenticated;
grant execute on function public.list_shared_students()                to authenticated;
grant execute on function public.claim_shared_student(uuid)            to authenticated;
grant execute on function public.my_teachers()                         to authenticated;
grant execute on function public.leave_class()   to authenticated;
grant execute on function public.remove_student(uuid) to authenticated;
grant execute on function public.join_class(text) to authenticated;
