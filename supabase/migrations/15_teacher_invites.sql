-- =============================================================================
-- ECYR English platform — teacher accounts by invitation
-- -----------------------------------------------------------------------------
-- Runs after 01–14. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout.
--
-- WHY THIS FILE EXISTS
-- Until now anyone could tick "Docente" on the sign-up form and get a teacher
-- account. The platform has one owner, who decides who teaches on it:
--
--   platform_admins   the owner account(s). Nobody can add themselves: rows go
--                     in by hand in the SQL editor (see the end of this file).
--   teacher_invites   one-use codes the owner creates and hands to a teacher.
--
-- A teacher signs up with a code; the sign-up trigger checks it and spends it.
-- Without a valid code the account is not created. Students sign up as
-- before. Teacher accounts that already exist are not touched.
--
-- WHO CAN DO WHAT
--   owner      creates, lists and revokes codes; sees the list of teachers
--   anyone     can ask whether one code is valid (to warn on the form)
--   everyone else nothing
-- =============================================================================

do $$
begin
  if to_regclass('public.profiles') is null or to_regprocedure('public.new_class_code()') is null then
    raise exception 'Run 01_schema.sql … 14_submission_reviews.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- ============================================================= 1. TABLES ====
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_invites (
  code       text primary key,
  created_by uuid references auth.users(id) on delete set null,
  -- Who the code is for ("Laura — sede norte"), so the owner knows whose it is.
  note       text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_by    uuid references auth.users(id) on delete set null,
  used_email text,
  used_at    timestamptz,
  revoked_at timestamptz
);

alter table public.teacher_invites drop constraint if exists teacher_invites_note_len;
alter table public.teacher_invites
  add constraint teacher_invites_note_len check (note is null or char_length(note) <= 200);

-- No direct API access at all: everything goes through the functions below.
alter table public.platform_admins enable row level security;
alter table public.teacher_invites enable row level security;
revoke all on public.platform_admins from anon, authenticated;
revoke all on public.teacher_invites from anon, authenticated;

-- ============================================================ 2. HELPERS ====
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Codes look like DOC-7KQ4-XZ9M: the class-code alphabet (no I, O, 0, 1).
create or replace function public.new_teacher_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := 'DOC-';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      if i = 4 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.teacher_invites where code = v_code);
  end loop;
  return v_code;
end;
$$;

revoke all on function public.new_teacher_invite_code() from public, anon, authenticated;

-- Normalises what a person typed: spaces out, upper case, the DOC- prefix optional.
create or replace function public.norm_teacher_invite(p_code text)
returns text
language sql
immutable
as $$
  select case
    when v is null or v = '' then null
    when v like 'DOC-%' then v
    when length(replace(v, '-', '')) = 8 then 'DOC-' || substr(replace(v, '-', ''), 1, 4) || '-' || substr(replace(v, '-', ''), 5, 4)
    else v
  end
  from (select upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) as v) s;
$$;

-- Whether a code can still be used. Callable before signing up, so the form
-- can say "código no válido" instead of a generic database error.
create or replace function public.check_teacher_invite(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_invites
     where code = public.norm_teacher_invite(p_code)
       and used_by is null and revoked_at is null
       and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.check_teacher_invite(text) from public;
grant execute on function public.check_teacher_invite(text) to anon, authenticated;

-- Spends a code for a user. Raises if it cannot be used.
create or replace function public.spend_teacher_invite(p_code text, p_user uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.teacher_invites
     set used_by = p_user, used_email = p_email, used_at = now()
   where code = public.norm_teacher_invite(p_code)
     and used_by is null and revoked_at is null
     and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'TEACHER_INVITE_INVALID: the teacher invitation code is not valid, was already used or expired.'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.spend_teacher_invite(text, uuid, text) from public, anon, authenticated;

-- ===================================================== 3. SIGN-UP / ROLE ====
-- Same trigger as 02, plus: a teacher account needs a valid invitation code
-- (sent as `invite_code` in the sign-up metadata), which it spends. Without
-- one the sign-up fails, so nobody ends up with a teacher account by ticking
-- a box.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
begin
  if v_role not in ('student','teacher') then
    v_role := 'student';
  end if;

  if v_role = 'teacher' then
    perform public.spend_teacher_invite(new.raw_user_meta_data->>'invite_code', new.id, new.email);
  end if;

  insert into public.profiles (id, email, full_name, role, class_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_role,
    case when v_role = 'teacher' then public.new_class_code() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- switch_role (02) let an empty account become a teacher; now that also takes
-- a code. Becoming a student needs none. The owner never needs one.
drop function if exists public.switch_role(text);
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

-- ======================================================= 4. OWNER TOOLS ====
create or replace function public.create_teacher_invite(p_note text default null, p_days int default 30)
returns public.teacher_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.teacher_invites;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can create teacher codes.' using errcode = '42501';
  end if;
  insert into public.teacher_invites (code, created_by, note, expires_at)
  values (
    public.new_teacher_invite_code(),
    auth.uid(),
    left(nullif(btrim(coalesce(p_note, '')), ''), 200),
    case when coalesce(p_days, 0) > 0 then now() + make_interval(days => least(p_days, 365)) else null end
  )
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.revoke_teacher_invite(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can revoke teacher codes.' using errcode = '42501';
  end if;
  update public.teacher_invites set revoked_at = now()
   where code = public.norm_teacher_invite(p_code) and used_by is null and revoked_at is null;
end;
$$;

create or replace function public.list_teacher_invites()
returns setof public.teacher_invites
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can see teacher codes.' using errcode = '42501';
  end if;
  return query select * from public.teacher_invites order by created_at desc limit 300;
end;
$$;

-- Every teacher on the platform with the size of their class.
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
           (select count(*) from public.profiles s where s.teacher_id = p.id),
           p.created_at
      from public.profiles p
     where p.role = 'teacher'
     order by p.created_at desc;
end;
$$;

revoke all on function public.create_teacher_invite(text, int) from public, anon;
revoke all on function public.revoke_teacher_invite(text)      from public, anon;
revoke all on function public.list_teacher_invites()           from public, anon;
revoke all on function public.list_platform_teachers()         from public, anon;
grant execute on function public.create_teacher_invite(text, int) to authenticated;
grant execute on function public.revoke_teacher_invite(text)      to authenticated;
grant execute on function public.list_teacher_invites()           to authenticated;
grant execute on function public.list_platform_teachers()         to authenticated;

-- ===================================================== 5. MAKE YOURSELF OWNER
-- Run once in the SQL editor with your own account's email (sign up first):
--
--   insert into public.platform_admins (user_id)
--   select id from auth.users where lower(email) = lower('TU_CORREO@ejemplo.com')
--   on conflict do nothing;
--
-- If your account is still a student and empty, it can then become a teacher
-- from the app without a code (switch_role), or directly:
--
--   update public.profiles set role = 'teacher', class_code = public.new_class_code()
--    where id = (select id from auth.users where lower(email) = lower('TU_CORREO@ejemplo.com'))
--      and role <> 'teacher';
