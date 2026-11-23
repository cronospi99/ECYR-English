-- =============================================================================
-- ECYR English platform — security hardening
-- -----------------------------------------------------------------------------
-- Runs after 01–21. Safe to re-run: create-or-replace / drop-then-create /
-- if-not-exists throughout. Read supabase/APLICAR-22.md BEFORE pasting this:
-- the owner must enrol two-step verification (TOTP) in the app first.
--
-- WHAT IT DOES
--   1. One owner only: platform_admins may hold a single row (unique index).
--   2. Two-step verification for the owner: is_platform_admin() now also needs a
--      session at assurance level aal2. is_platform_owner() answers "is this the
--      owner?" WITHOUT the aal check; the app uses it to recognise the owner
--      at aal1 and ask for the code. It returns a boolean only, no data.
--        Depend on is_platform_admin() (all now need MFA): list/create/revoke
--        teacher invites, list_platform_students/teachers, admin_share/unshare,
--        admin_set_student_shared, admin_delete_user, admin_audit, and the owner
--        shortcut in switch_role (an owner at aal1 simply gets asked for a code,
--        like any teacher-to-be). None of those is needed without MFA.
--   3. list_shared_students no longer returns emails.
--   4. Emails leave the reach of teachers: authenticated may read every
--      profiles column EXCEPT email. A user's own email comes from the session.
--      Live-board author names no longer fall back to the email.
--   5. Profiles can no longer be inserted by the client (only the sign-up
--      trigger creates them), so nobody can pick their own role.
--   6. anon loses every table and function privilege except check_teacher_invite
--      (the sign-up form calls it before there is a session). authenticated keeps
--      exactly what it had: see the note in section 6.
--   7. Gemini daily limit per user (gemini_usage, bump_gemini_usage).
--   8. admin_audit: who (owner) did what; written by the admin functions.
--
-- Admin functions (list_platform_students/teachers) STILL return emails: only the
-- owner, with MFA, can call them.
-- =============================================================================

do $$
begin
  if to_regprocedure('public.is_platform_admin()') is null
     or to_regprocedure('public.list_shared_students()') is null
     or to_regprocedure('public.add_live_card(uuid, text, text, text, int, real, real, text, real, real)') is null then
    raise exception 'Ejecuta primero 01 … 21 (o usa supabase/setup.sql, que lo incluye todo).';
  end if;
end;
$$;

-- ===================================================== 1. A SINGLE OWNER ====
do $$
declare
  n integer;
begin
  select count(*) into n from public.platform_admins;
  if n > 1 then
    raise exception 'platform_admins tiene % filas y solo puede haber 1 (la cuenta dueña). Borra las sobrantes (delete from public.platform_admins where user_id = ''<uuid>'';) y vuelve a ejecutar este archivo.', n;
  end if;
end;
$$;

create unique index if not exists platform_admins_one_owner on public.platform_admins ((true));

-- ============================================================ 2. OWNER + MFA ====
-- Ignores the MFA level: for the app to know it must ask for the code. Boolean only.
create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

-- Owner AND a session verified with a second factor (JWT claim aal = 'aal2').
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt())->>'aal', '') = 'aal2';
$$;

revoke all on function public.is_platform_owner() from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_owner() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

-- ============================================================ 8. ADMIN AUDIT ====
-- (Created before the admin functions that write to it.)
create table if not exists public.admin_audit (
  id     bigint generated always as identity primary key,
  actor  uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  at     timestamptz not null default now()
);
create index if not exists admin_audit_at_idx on public.admin_audit (at desc);

alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
grant select on public.admin_audit to authenticated;

drop policy if exists admin_audit_select_owner on public.admin_audit;
create policy admin_audit_select_owner on public.admin_audit
  for select to authenticated using (public.is_platform_admin());
-- No insert/update/delete policy: rows are written only by the security definer
-- admin functions below, and nobody can edit or erase them through the API.

-- Every student with their main teacher, extra teachers and whether they are open to all.
-- (21's version, now volatile because it writes an audit row; emails only for the owner.)
create or replace function public.list_platform_students()
returns table (id uuid, email text, full_name text, teacher_id uuid, teacher_name text, created_at timestamptz,
               shared boolean, extra_teachers jsonb)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can see the students.' using errcode = '42501';
  end if;
  insert into public.admin_audit (actor, action, target) values (auth.uid(), 'list_platform_students', null);
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

create or replace function public.list_platform_teachers()
returns table (id uuid, email text, full_name text, class_code text, students bigint, created_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can see the teachers.' using errcode = '42501';
  end if;
  insert into public.admin_audit (actor, action, target) values (auth.uid(), 'list_platform_teachers', null);
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

create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can delete accounts.' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot delete your own account from here.';
  end if;
  if exists (select 1 from public.platform_admins where user_id = p_user) then
    raise exception 'That account is a platform owner. Remove it from platform_admins first.';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'That account does not exist.';
  end if;

  insert into public.admin_audit (actor, action, target) values (auth.uid(), 'admin_delete_user', p_user::text);

  -- Older projects keep a foreign key from storage.objects.owner to auth.users;
  -- release the files so they don't block the delete (they stay in their bucket).
  begin
    update storage.objects set owner = null where owner = p_user;
  exception when others then
    null;
  end;

  delete from auth.users where id = p_user;
end;
$$;

revoke all on function public.list_platform_students() from public, anon;
revoke all on function public.list_platform_teachers() from public, anon;
revoke all on function public.admin_delete_user(uuid)  from public, anon;
grant execute on function public.list_platform_students() to authenticated;
grant execute on function public.list_platform_teachers() to authenticated;
grant execute on function public.admin_delete_user(uuid)  to authenticated;

-- ============================================ 3. SHARED STUDENTS: NO EMAIL ====
drop function if exists public.list_shared_students();
create or replace function public.list_shared_students()
returns table (id uuid, full_name text, teacher_name text)
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
    select s.id, s.full_name, coalesce(nullif(t.full_name, ''), 'Docente')
      from public.profiles s
      left join public.profiles t on t.id = s.teacher_id
     where s.role = 'student' and s.shared_pool and not public.in_class_of(auth.uid(), s.id)
     order by s.full_name nulls last, s.id
     limit 300;
end;
$$;

revoke all on function public.list_shared_students() from public, anon;
grant execute on function public.list_shared_students() to authenticated;

-- ====================================== 4b. LIVE BOARDS: NO EMAIL FALLBACK ====
-- The author name of a card never falls back to the email (not even its local part).
create or replace function public.add_live_card(
  p_board uuid,
  p_text  text,
  p_color text default 'yellow',
  p_image text default null,
  p_col   int default 0,
  p_x     real default 0,
  p_y     real default 0,
  p_shape text default 'note',
  p_w     real default null,
  p_h     real default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := public.live_board_check(p_board);
  v_b    public.live_boards;
  v_me   public.profiles;
  v_id   uuid;
begin
  select * into v_b from public.live_boards where id = p_board;
  if v_role <> 'teacher' and v_b.locked then
    raise exception 'BOARD_LOCKED: the teacher locked this board.' using errcode = '42501';
  end if;
  if v_role <> 'teacher'
     and (select count(*) from public.live_board_cards where board_id = p_board and author_id = v_uid) >= 40 then
    raise exception 'CARD_LIMIT: 40 cards per person on one board.';
  end if;
  if (select count(*) from public.live_board_cards where board_id = p_board) >= 400 then
    raise exception 'CARD_LIMIT: this board is full (400 cards).';
  end if;

  select * into v_me from public.profiles where id = v_uid;

  insert into public.live_board_cards (board_id, author_id, author_name, text, color, image, col, x, y, position, shape, w, h)
  values (
    p_board,
    v_uid,
    left(coalesce(nullif(btrim(v_me.full_name), ''), 'Estudiante'), 120),
    btrim(coalesce(p_text, '')),
    coalesce(p_color, 'yellow'),
    nullif(p_image, ''),
    least(greatest(coalesce(p_col, 0), 0), greatest(jsonb_array_length(v_b.columns) - 1, 0)),
    least(greatest(coalesce(p_x, 0), 0), 1600),
    least(greatest(coalesce(p_y, 0), 0), 1000),
    coalesce((select max(position) from public.live_board_cards where board_id = p_board), 0) + 1,
    coalesce(nullif(p_shape, ''), 'note'),
    case when p_w is null then null else least(greatest(p_w, 100), 640) end,
    case when p_h is null then null else least(greatest(p_h, 60), 640) end
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_live_card(uuid, text, text, text, int, real, real, text, real, real) from public, anon;
grant execute on function public.add_live_card(uuid, text, text, text, int, real, real, text, real, real) to authenticated;

-- Cards written before this change by accounts without a name carry the email's
-- local part as author_name: replace it.
update public.live_board_cards c
   set author_name = 'Estudiante'
  from public.profiles p
 where p.id = c.author_id
   and nullif(btrim(p.full_name), '') is null
   and c.author_name is distinct from 'Estudiante';

-- ================================ 4. EMAILS OUT OF REACH OF THE CLIENT ====
-- authenticated reads every profiles column except email. Row visibility is
-- still decided by the RLS policies (own row, own teacher/students, …). The
-- column list is built from the catalog so a column added by a later migration
-- is not forgotten; today it is: id, full_name, role, teacher_id, class_code,
-- created_at, history_default, history_override, shared_pool.
-- UPDATE stays restricted to full_name (02/06). Security definer functions run
-- as the table owner and still see email (sign-up trigger, admin lists).
revoke select on public.profiles from authenticated, anon;
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name <> 'email';
  execute format('grant select (%s) on public.profiles to authenticated', cols);
end;
$$;

-- ======================================== 5. NO CLIENT INSERTS ON PROFILES ====
-- The profile is created by handle_new_user (trigger on auth.users, security
-- definer). Letting the client insert one let anybody choose their own role.
revoke insert on public.profiles from authenticated, anon;
drop policy if exists profiles_insert_own on public.profiles;

-- ============================================================ 7. GEMINI LIMIT ====
create table if not exists public.gemini_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day     date not null default current_date,
  calls   integer not null default 0,
  primary key (user_id, day)
);

alter table public.gemini_usage enable row level security;
revoke all on public.gemini_usage from anon, authenticated;
grant select on public.gemini_usage to authenticated;

drop policy if exists gemini_usage_select_own on public.gemini_usage;
create policy gemini_usage_select_own on public.gemini_usage
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update policy: the counter only moves through bump_gemini_usage().

-- Counts one generation on the class's Gemini key and refuses past the daily limit.
create or replace function public.bump_gemini_usage(p_limit integer default 60)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  insert into public.gemini_usage (user_id, day, calls)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = public.gemini_usage.calls + 1
  returning calls into v_calls;

  if v_calls > greatest(1, least(coalesce(p_limit, 60), 2000)) then
    raise exception 'daily Gemini limit reached' using errcode = 'P0001';
  end if;
  return v_calls;
end;
$$;

revoke all on function public.bump_gemini_usage(integer) from public, anon;
grant execute on function public.bump_gemini_usage(integer) to authenticated;

-- ============================================== 6. TAKE PRIVILEGES FROM anon ====
-- anon (visitors with no session) needs only check_teacher_invite(text), which
-- the sign-up form calls to validate a teacher code. Everything else is closed.
--
-- NOTE on "grant execute on all functions to authenticated": that blanket grant
-- would also open internal helpers that earlier migrations closed on purpose
-- (link_student_to_teacher, spend_teacher_invite, live_board_check, …). Instead,
-- before removing the default PUBLIC execute, every function that authenticated
-- (or service_role) can run TODAY gets an explicit grant: same access as now,
-- nothing new, and anon/PUBLIC lose theirs.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

do $$
declare
  f record;
begin
  for f in
    select p.oid, p.oid::regprocedure as sig
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prokind in ('f', 'p')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')  -- not extension-owned
  loop
    if has_function_privilege('authenticated', f.oid, 'execute') then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role')
       and has_function_privilege('service_role', f.oid, 'execute') then
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end;
$$;

grant execute on function public.check_teacher_invite(text) to anon;

-- Future objects: nothing for anon; no default PUBLIC execute on new functions
-- (new migrations already grant execute to authenticated explicitly).
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges revoke execute on functions from public;
do $$
begin
  -- Supabase also keeps default privileges for supabase_admin; may not be permitted everywhere.
  alter default privileges for role supabase_admin in schema public revoke all on tables from anon;
  alter default privileges for role supabase_admin in schema public revoke execute on functions from public, anon;
exception when others then
  null;
end;
$$;
