-- =============================================================================
-- ECYR English platform — the owner removes accounts
-- -----------------------------------------------------------------------------
-- Runs after 01–16. Safe to re-run: create-or-replace throughout.
--
-- WHY THIS FILE EXISTS
-- The platform owner (platform_admins, migration 15) manages who teaches; they
-- also need to remove a teacher or a student account for good: someone who
-- left the school, a duplicate account, a test account.
--
-- Removing an account deletes its auth.users row. Everything the account owns
-- goes with it through the foreign keys (profile, progress, work, notes,
-- boards…). A deleted teacher's students are NOT deleted: they stay, without
-- a class (profiles.teacher_id is "on delete set null"), and can join another.
--
-- WHO CAN DO WHAT
--   owner      lists every student; deletes any account except their own and
--              other owners'
--   everyone else nothing
-- =============================================================================

do $$
begin
  if to_regprocedure('public.is_platform_admin()') is null then
    raise exception 'Run 15_teacher_invites.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- Every student on the platform, with their teacher.
create or replace function public.list_platform_students()
returns table (id uuid, email text, full_name text, teacher_id uuid, teacher_name text, created_at timestamptz)
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
    select s.id, s.email, s.full_name, s.teacher_id, coalesce(nullif(t.full_name, ''), t.email), s.created_at
      from public.profiles s
      left join public.profiles t on t.id = s.teacher_id
     where s.role = 'student'
     order by s.created_at desc;
end;
$$;

-- Deletes one account (teacher or student) and everything it owns.
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
revoke all on function public.admin_delete_user(uuid)  from public, anon;
grant execute on function public.list_platform_students() to authenticated;
grant execute on function public.admin_delete_user(uuid)  to authenticated;
