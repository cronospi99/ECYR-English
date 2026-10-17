-- =============================================================================
-- ECYR English platform — "Mis notas" (private notes)
-- -----------------------------------------------------------------------------
-- Runs after 01–09. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout.
--
-- WHY THIS FILE EXISTS
-- Learners (and teachers) jot things down while they study: a word, a rule,
-- a question for class. The app keeps every note in the browser first and
-- copies it here so it follows the account to another device.
--
--   student_notes   one row per note: the text (≤ 20 000 characters), the page
--                   it was written on (title + in-app path), timestamps and a
--                   tombstone (deleted_at) so a deletion reaches other devices.
--
-- Sync is last-writer-wins per note: the app sends its own updated_at, and the
-- trigger below ignores an update that is older than what is stored.
--
-- WHO CAN DO WHAT
--   the owner     reads, adds, edits and deletes their own notes
--   their teacher NOTHING — notes are private (no is_my_student() policy)
--   anyone else   nothing — no anon access at all
-- =============================================================================

-- Fails early with a clear message when the earlier files have not been run yet.
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Run 01_schema.sql … 09_assignments.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;


-- ============================================================== 1. TABLE ====
create table if not exists public.student_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body        text not null default ''
              constraint student_notes_body_len check (char_length(body) <= 20000),
  page_title  text
              constraint student_notes_title_len check (char_length(page_title) <= 200),
  page_path   text
              constraint student_notes_path_len check (char_length(page_path) <= 400),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- Columns added after the first version (no-ops on a fresh table).
alter table public.student_notes add column if not exists deleted_at timestamptz;

create index if not exists student_notes_user_idx on public.student_notes(user_id, updated_at desc);


-- ===================================================== 2. LAST WRITER WINS ==
-- The client's clock decides the order of edits from one person's devices.
-- An update older than the stored row is skipped (returning NULL keeps the
-- row as it is); a clock far in the future is pulled back to now(), so one
-- bad device cannot freeze a note forever. The owner never changes.
create or replace function public.student_notes_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.updated_at is null or new.updated_at > now() + interval '5 minutes' then
    new.updated_at := now();
  end if;
  if tg_op = 'UPDATE' then
    if new.updated_at <= old.updated_at then
      return null;
    end if;
    new.user_id    := old.user_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists student_notes_guard_trg on public.student_notes;
create trigger student_notes_guard_trg
  before insert or update on public.student_notes
  for each row execute function public.student_notes_guard();


-- ===================================================== 3. ROW SECURITY ====
alter table public.student_notes enable row level security;

drop policy if exists student_notes_select_own on public.student_notes;
drop policy if exists student_notes_insert_own on public.student_notes;
drop policy if exists student_notes_update_own on public.student_notes;
drop policy if exists student_notes_delete_own on public.student_notes;

create policy student_notes_select_own on public.student_notes
  for select to authenticated using (user_id = auth.uid());
create policy student_notes_insert_own on public.student_notes
  for insert to authenticated with check (user_id = auth.uid());
create policy student_notes_update_own on public.student_notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy student_notes_delete_own on public.student_notes
  for delete to authenticated using (user_id = auth.uid());
-- Deliberately no "select_class" policy: a teacher cannot read their students' notes.

-- Explicit grants (Supabase's default privileges would otherwise grant ALL).
revoke all on public.student_notes from anon;
revoke all on public.student_notes from authenticated;
grant select, insert, update, delete on public.student_notes to authenticated;


-- -----------------------------------------------------------------------------
-- WHAT CHANGED FOR EACH ROLE
--   student / teacher   a private notebook that syncs between their devices
--   teacher (as such)   nothing: no access to anybody else's notes
-- -----------------------------------------------------------------------------
