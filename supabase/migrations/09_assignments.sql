-- =============================================================================
-- ECYR English platform — "Tareas" (assignments)
-- -----------------------------------------------------------------------------
-- Runs after 01–08. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout.
--
-- WHY THIS FILE EXISTS
-- Teachers assign work — a unit, a grammar module, a skill drill, a game, an
-- IELTS module, a reading, or anything else with instructions — to their whole
-- class or to chosen students. Students see the list, do the work, and the
-- platform ticks it off by itself when the activity log shows it was done
-- (every award() in the app carries a `ref` such as 'unit:A1-3'), or the
-- student hands in a file / text from "Mis trabajos" (portfolio_items).
--
-- NOT the IELTS simulator's `homework` table (01/02): that one belongs to the
-- simulator engine and keeps its own shape.
--
--   assignments          one row per task the teacher created
--   assignment_targets   the chosen students, when audience = 'students'
--   assignment_status    one row per (assignment, student) once the student
--                        starts / finishes it or the teacher reviews it.
--                        No row = pending.
--
-- WHO CAN DO WHAT
--   teacher      full CRUD on their own assignments and their targets; reads
--                the status rows of their own assignments (current students
--                only); writes feedback / score / "excused" ONLY through
--                review_assignment().
--   student      reads the assignments of THEIR teacher addressed to the whole
--                class or to them; inserts / updates their own status row:
--                status pending|done|late, done_at, via, score,
--                portfolio_item_id (must be their own item), student_note.
--                Never teacher_feedback / reviewed_*.
--   anyone else  nothing — no anon access at all
-- =============================================================================

-- Fails early with a clear message when the earlier files have not been run yet.
do $$
begin
  if to_regclass('public.profiles') is null
     or to_regprocedure('public.is_my_student(uuid)') is null
     or to_regprocedure('public.is_teacher()') is null
     or to_regclass('public.portfolio_items') is null then
    raise exception 'Run 01_schema.sql … 08_migrations_log.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;


-- ============================================================= 1. TABLES ====
create table if not exists public.assignments (
  id                  uuid primary key default gen_random_uuid(),
  teacher_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title               text not null
                      constraint assignments_title_len check (char_length(btrim(title)) between 1 and 160),
  instructions        text
                      constraint assignments_instructions_len check (char_length(instructions) <= 4000),
  kind                text not null default 'custom'
                      constraint assignments_kind check (kind in ('unit','grammar','practice','game','ielts','reading','writing','speaking','listening','custom')),
  -- What to do and how completion is detected:
  --   { "to": "/learn/a1/3?tab=practice",   in-app link for the "Empezar" button
  --     "refs": ["unit:A1-3"],               activity refs that complete it
  --     "refPrefix": ["grammar:modals"],     … or ref prefixes
  --     "minScore": 70,                      optional: activity score needed
  --     "label": "Unit 3 · Práctica" }       optional: human summary
  target              jsonb not null default '{}'::jsonb,
  level               text
                      constraint assignments_level check (level is null or level in ('A1','A2','B1','B2','C1')),
  due_at              timestamptz,
  requires_submission boolean not null default false,
  audience            text not null default 'class'
                      constraint assignments_audience check (audience in ('class','students')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- target validation, drop-then-add so a re-run picks up any change.
-- `to` is rendered as a router link, so it must be an in-app path: starts with
-- one '/', never '//' or '/\' (both are treated as protocol-relative URLs by
-- browsers, i.e. an open redirect), no whitespace or control characters.
-- coalesce(..., false) matters: a CHECK that evaluates to NULL passes.
alter table public.assignments drop constraint if exists assignments_target_valid;
alter table public.assignments add constraint assignments_target_valid check (
  jsonb_typeof(target) = 'object'
  and pg_column_size(target) < 8192
  and (
    not (target ? 'to')
    or jsonb_typeof(target->'to') = 'null'
    or coalesce(
         jsonb_typeof(target->'to') = 'string'
         and char_length(target->>'to') between 1 and 400
         and left(target->>'to', 1) = '/'
         and substr(target->>'to', 2, 1) not in ('/', '\')
         and (target->>'to') !~ '[[:space:][:cntrl:]]',
         false)
  )
  and (not (target ? 'refs') or jsonb_typeof(target->'refs') = 'array')
  and (not (target ? 'refPrefix') or jsonb_typeof(target->'refPrefix') = 'array')
  and (not (target ? 'minScore') or jsonb_typeof(target->'minScore') in ('number','null'))
);

create index if not exists assignments_teacher_idx on public.assignments(teacher_id, created_at desc);

create table if not exists public.assignment_targets (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (assignment_id, student_id)
);

create index if not exists assignment_targets_student_idx on public.assignment_targets(student_id);

create table if not exists public.assignment_status (
  assignment_id     uuid not null references public.assignments(id) on delete cascade,
  student_id        uuid not null references public.profiles(id) on delete cascade,
  status            text not null default 'pending'
                    constraint assignment_status_status check (status in ('pending','done','late','excused')),
  done_at           timestamptz,
  via               text
                    constraint assignment_status_via check (via is null or via in ('auto','manual','submission')),
  score             numeric
                    constraint assignment_status_score check (score is null or score between 0 and 100),
  portfolio_item_id uuid references public.portfolio_items(id) on delete set null,
  student_note      text
                    constraint assignment_status_note_len check (char_length(student_note) <= 1000),
  teacher_feedback  text
                    constraint assignment_status_feedback_len check (char_length(teacher_feedback) <= 2000),
  reviewed_by       uuid references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

create index if not exists assignment_status_student_idx on public.assignment_status(student_id);


-- =========================================================== 2. HELPERS =====
-- SECURITY DEFINER helpers keep the policies free of cross-table recursion
-- (assignments ↔ assignment_targets would otherwise reference each other) and
-- let a student test visibility without reading other people's rows.

-- The caller's teacher (null for teachers and for students without a class).
create or replace function public.my_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select teacher_id from public.profiles where id = auth.uid();
$$;

-- Is this assignment one of the caller's own (as its teacher)?
create or replace function public.owns_assignment(p_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.assignments where id = p_assignment and teacher_id = auth.uid());
$$;

-- Is this assignment addressed to the caller (as a student)? Their teacher's,
-- and either for the whole class or targeted to them.
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
      join public.profiles me on me.id = auth.uid()
     where a.id = p_assignment
       and me.teacher_id is not null
       and a.teacher_id = me.teacher_id
       and (a.audience = 'class'
            or exists (select 1 from public.assignment_targets t
                        where t.assignment_id = a.id and t.student_id = auth.uid()))
  );
$$;

revoke all on function public.my_teacher_id() from public, anon;
revoke all on function public.owns_assignment(uuid) from public, anon;
revoke all on function public.can_see_assignment(uuid) from public, anon;
grant execute on function public.my_teacher_id() to authenticated;
grant execute on function public.owns_assignment(uuid) to authenticated;
grant execute on function public.can_see_assignment(uuid) to authenticated;


-- ========================================================== 3. TRIGGERS =====
create or replace function public.assignments_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists assignments_touch_trg on public.assignments;
create trigger assignments_touch_trg
  before update on public.assignments
  for each row execute function public.assignments_touch();

-- The guard on status rows. Column grants already keep teacher_feedback /
-- reviewed_* out of reach of direct writes; this trigger adds the rules a
-- column grant cannot express. It runs as the INVOKER on purpose: when
-- current_user is the API role (authenticated) the write comes straight from
-- the app — i.e. from the student, since RLS only lets students write their
-- own row — and the rules apply. review_assignment() is SECURITY DEFINER, so
-- inside it current_user is the function owner and only updated_at is set.
--
-- Student rules:
--   • status 'excused' is the teacher's call: a student can neither set it nor
--     change a row the teacher excused;
--   • 'done' / 'late' is decided here from done_at vs the assignment's due_at
--     (the client may send either);
--   • done_at is clamped to [assignment created_at, now()] and filled with
--     now() when missing; 'pending' clears done_at / via;
--   • portfolio_item_id must be one of the student's own items (checked under
--     the student's RLS, which only shows their own items);
--   • via 'submission' needs an item, and an assignment that requires a
--     submission cannot be finished without one;
--   • once the teacher has reviewed the row, the score is the teacher's: a
--     student update keeps it as it is.
create or replace function public.assignment_status_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_a public.assignments;
begin
  new.updated_at := now();
  if current_user not in ('authenticated', 'anon') then
    return new;  -- review_assignment() / service role / dashboard
  end if;

  if tg_op = 'UPDATE' and (new.assignment_id <> old.assignment_id or new.student_id <> old.student_id) then
    raise exception 'A task status cannot be moved.' using errcode = '42501';
  end if;

  select * into v_a from public.assignments where id = new.assignment_id;
  if v_a.id is null then
    raise exception 'That task is not assigned to you.' using errcode = '42501';
  end if;

  if new.status = 'excused' and (tg_op = 'INSERT' or old.status <> 'excused') then
    raise exception 'Only the teacher can excuse a task.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status = 'excused' and new.status <> 'excused' then
    raise exception 'Your teacher excused this task.' using errcode = '42501';
  end if;

  if new.portfolio_item_id is not null
     and (tg_op = 'INSERT' or new.portfolio_item_id is distinct from old.portfolio_item_id)
     and not exists (select 1 from public.portfolio_items p
                      where p.id = new.portfolio_item_id and p.user_id = new.student_id) then
    raise exception 'The attached work must be one of your own items.' using errcode = '42501';
  end if;

  if new.status = 'pending' then
    new.done_at := null;
    new.via := null;
  elsif new.status in ('done', 'late') then
    if new.via = 'submission' and new.portfolio_item_id is null then
      raise exception 'A submission needs an attached work.';
    end if;
    if v_a.requires_submission and new.portfolio_item_id is null then
      raise exception 'This task must be handed in with a work from your portfolio.';
    end if;
    new.done_at := least(greatest(coalesce(new.done_at, now()), v_a.created_at), now());
    new.status := case when v_a.due_at is not null and new.done_at > v_a.due_at then 'late' else 'done' end;
    new.via := coalesce(new.via, 'manual');
  end if;

  if tg_op = 'UPDATE' and old.reviewed_at is not null then
    new.score := old.score;
  end if;

  return new;
end;
$$;

drop trigger if exists assignment_status_guard_trg on public.assignment_status;
create trigger assignment_status_guard_trg
  before insert or update on public.assignment_status
  for each row execute function public.assignment_status_guard();


-- ====================================================== 4. ROW SECURITY =====
alter table public.assignments        enable row level security;
alter table public.assignment_targets enable row level security;
alter table public.assignment_status  enable row level security;

drop policy if exists assignments_select       on public.assignments;
drop policy if exists assignments_insert_own   on public.assignments;
drop policy if exists assignments_update_own   on public.assignments;
drop policy if exists assignments_delete_own   on public.assignments;

-- The teacher sees their own; a student sees their teacher's class-wide ones
-- and the ones targeted to them (the targets sub-query runs under the
-- student's RLS on assignment_targets: only their own rows).
create policy assignments_select on public.assignments
  for select to authenticated using (
    teacher_id = auth.uid()
    or (
      teacher_id = public.my_teacher_id()
      and (audience = 'class'
           or exists (select 1 from public.assignment_targets t
                       where t.assignment_id = assignments.id and t.student_id = auth.uid()))
    )
  );

create policy assignments_insert_own on public.assignments
  for insert to authenticated with check (teacher_id = auth.uid() and public.is_teacher());

create policy assignments_update_own on public.assignments
  for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy assignments_delete_own on public.assignments
  for delete to authenticated using (teacher_id = auth.uid());

drop policy if exists assignment_targets_teacher_select on public.assignment_targets;
drop policy if exists assignment_targets_teacher_insert on public.assignment_targets;
drop policy if exists assignment_targets_teacher_delete on public.assignment_targets;
drop policy if exists assignment_targets_select_own     on public.assignment_targets;

create policy assignment_targets_teacher_select on public.assignment_targets
  for select to authenticated using (public.owns_assignment(assignment_id));

-- Only the teacher's own students can be targeted.
create policy assignment_targets_teacher_insert on public.assignment_targets
  for insert to authenticated with check (public.owns_assignment(assignment_id) and public.is_my_student(student_id));

create policy assignment_targets_teacher_delete on public.assignment_targets
  for delete to authenticated using (public.owns_assignment(assignment_id));

create policy assignment_targets_select_own on public.assignment_targets
  for select to authenticated using (student_id = auth.uid());

drop policy if exists assignment_status_select_own     on public.assignment_status;
drop policy if exists assignment_status_select_teacher on public.assignment_status;
drop policy if exists assignment_status_insert_own     on public.assignment_status;
drop policy if exists assignment_status_update_own     on public.assignment_status;

create policy assignment_status_select_own on public.assignment_status
  for select to authenticated using (student_id = auth.uid());

-- The teacher reads the status of their own assignments, for students who are
-- still in their class (like every other class read in this schema).
create policy assignment_status_select_teacher on public.assignment_status
  for select to authenticated using (public.owns_assignment(assignment_id) and public.is_my_student(student_id));

create policy assignment_status_insert_own on public.assignment_status
  for insert to authenticated with check (student_id = auth.uid() and public.can_see_assignment(assignment_id));

create policy assignment_status_update_own on public.assignment_status
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and public.can_see_assignment(assignment_id));

-- No DELETE policy on assignment_status: "undo" is an update back to
-- 'pending', so the teacher's feedback on the row is never lost.


-- ======================================================= 5. COLUMN GRANTS ===
-- Revoke the blanket grant Supabase hands out on new tables, then grant back
-- exactly what each table needs. Teacher and student are the same database
-- role (authenticated), so the grants describe the union of what either may
-- write directly; RLS decides whose rows, and the status guard the rest.
--
-- Left out on purpose:
--   assignments: id, created_at, updated_at (defaults / trigger);
--                teacher_id on UPDATE (a task cannot change owner)
--   assignment_targets: UPDATE (the row is its primary key — delete + insert)
--   assignment_status: teacher_feedback, reviewed_by, reviewed_at — only
--                review_assignment() writes them; DELETE altogether.
--                assignment_id / student_id ARE granted for UPDATE only because
--                a PostgREST upsert (on_conflict) re-assigns every column it
--                was sent; the guard trigger refuses any actual change.
revoke all on public.assignments        from anon, authenticated;
revoke all on public.assignment_targets from anon, authenticated;
revoke all on public.assignment_status  from anon, authenticated;

grant usage on schema public to authenticated;

grant select, delete on public.assignments to authenticated;
grant insert (teacher_id, title, instructions, kind, target, level, due_at, requires_submission, audience)
  on public.assignments to authenticated;
grant update (title, instructions, kind, target, level, due_at, requires_submission, audience)
  on public.assignments to authenticated;

grant select, insert, delete on public.assignment_targets to authenticated;

grant select on public.assignment_status to authenticated;
grant insert (assignment_id, student_id, status, done_at, via, score, portfolio_item_id, student_note)
  on public.assignment_status to authenticated;
grant update (assignment_id, student_id, status, done_at, via, score, portfolio_item_id, student_note)
  on public.assignment_status to authenticated;


-- ============================================================= 6. REVIEW ====
-- The teacher's one write on a status row: feedback, score and/or "excused".
--   p_feedback  text (trimmed; empty → cleared)
--   p_score     0–100 or null (null clears it)
--   p_excused   true → 'excused'; false → back to 'pending' if it was excused
--               (keeps done/late otherwise); null → status unchanged
-- Creates the row when the student has not touched the task yet. Checks that
-- the assignment is the caller's, the student is in their class, and the task
-- is addressed to that student.
create or replace function public.review_assignment(
  p_assignment uuid,
  p_student    uuid,
  p_feedback   text,
  p_score      numeric,
  p_excused    boolean default null
)
returns public.assignment_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a        public.assignments;
  v_row      public.assignment_status;
  v_feedback text := nullif(btrim(coalesce(p_feedback, '')), '');
  v_reviewed boolean;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select * into v_a from public.assignments where id = p_assignment;
  -- Same answer for "does not exist" and "not yours", so ids cannot be probed.
  if v_a.id is null or v_a.teacher_id <> auth.uid() or not public.is_my_student(p_student) then
    raise exception 'That task or student is not in your class.' using errcode = '42501';
  end if;
  if v_a.audience = 'students'
     and not exists (select 1 from public.assignment_targets where assignment_id = p_assignment and student_id = p_student) then
    raise exception 'That task is not assigned to this student.' using errcode = '42501';
  end if;

  if v_feedback is not null and char_length(v_feedback) > 2000 then
    raise exception 'The feedback is too long (2000 characters max).';
  end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then
    raise exception 'The score must be between 0 and 100.';
  end if;

  v_reviewed := v_feedback is not null or p_score is not null or coalesce(p_excused, false);

  insert into public.assignment_status as s (assignment_id, student_id, status, teacher_feedback, score, reviewed_by, reviewed_at)
  values (p_assignment, p_student,
          case when p_excused then 'excused' else 'pending' end,
          v_feedback, p_score,
          case when v_reviewed then auth.uid() end,
          case when v_reviewed then now() end)
  on conflict (assignment_id, student_id) do update
     set teacher_feedback = excluded.teacher_feedback,
         score            = excluded.score,
         status           = case
                              when p_excused is true then 'excused'
                              when p_excused is false and s.status = 'excused' then 'pending'
                              else s.status
                            end,
         reviewed_by      = excluded.reviewed_by,
         reviewed_at      = excluded.reviewed_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.review_assignment(uuid, uuid, text, numeric, boolean) from public;
revoke all on function public.review_assignment(uuid, uuid, text, numeric, boolean) from anon;
grant execute on function public.review_assignment(uuid, uuid, text, numeric, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- WHAT EACH ROLE CAN NOW DO
--   teacher   assignments: create (as themselves), read, edit, delete their own;
--             assignment_targets: add / remove their own students on their own
--             assignments; assignment_status: read rows of their own
--             assignments for current students; feedback / score / excuse via
--             review_assignment(assignment, student, feedback, score, excused).
--   student   reads their teacher's class-wide assignments and those targeted
--             to them (plus their own target rows); inserts / updates their
--             own status row (pending | done | late, done_at, via, score,
--             portfolio_item_id of their own work, student_note).
-- -----------------------------------------------------------------------------
