-- =============================================================================
-- ECYR English platform — teacher reviews of student work
-- -----------------------------------------------------------------------------
-- Runs after 01–13. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout.
--
-- WHY THIS FILE EXISTS
-- A writing text or speaking transcript in `submissions` is a record the
-- student wrote once; nobody edits it. The teacher's manual review lives in
-- its own table, one row per piece of work:
--
--   submission_reviews   the teacher's general comment, comments anchored to
--                        quotes of the text, a score (0–100) and, for level
--                        exams, the corrected per-skill scores and final grade.
--
-- WHO CAN DO WHAT
--   teacher    reads and writes reviews of their own students' work, only
--              through review_submission() (checks the class)
--   student    reads the reviews of their own work the teacher shared
--   anyone else nothing
-- =============================================================================

do $$
begin
  if to_regclass('public.submissions') is null or to_regprocedure('public.is_my_student(uuid)') is null then
    raise exception 'Run 01_schema.sql … 13_c2_level.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- ============================================================== 1. TABLE ====
create table if not exists public.submission_reviews (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  -- What the work was ("Parcial final · A1"), so the student's view needs no join.
  title         text,
  comment       text,
  -- [{ "quote": "exact words", "note": "teacher's comment", "at": 123 }]
  notes         jsonb not null default '[]'::jsonb,
  score         numeric,
  -- Level exams: { "listening": 100, "writing": 70, … } and the grade over 5.
  sections      jsonb,
  grade         numeric,
  -- false = a draft only the teacher sees.
  shared        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.submission_reviews drop constraint if exists submission_reviews_comment_len;
alter table public.submission_reviews drop constraint if exists submission_reviews_notes_shape;
alter table public.submission_reviews drop constraint if exists submission_reviews_score;
alter table public.submission_reviews drop constraint if exists submission_reviews_grade;
alter table public.submission_reviews
  add constraint submission_reviews_comment_len check (comment is null or char_length(comment) <= 4000);
alter table public.submission_reviews
  add constraint submission_reviews_notes_shape check (jsonb_typeof(notes) = 'array' and jsonb_array_length(notes) <= 60 and pg_column_size(notes) <= 60000);
alter table public.submission_reviews
  add constraint submission_reviews_score check (score is null or score between 0 and 100);
alter table public.submission_reviews
  add constraint submission_reviews_grade check (grade is null or grade between 0 and 5);

alter table public.submission_reviews add column if not exists title text;
alter table public.submission_reviews add column if not exists shared boolean not null default true;

create index if not exists submission_reviews_student_idx on public.submission_reviews(student_id, updated_at desc);

-- ======================================================== 2. ROW SECURITY ====
alter table public.submission_reviews enable row level security;

drop policy if exists submission_reviews_select_teacher on public.submission_reviews;
drop policy if exists submission_reviews_select_student on public.submission_reviews;

create policy submission_reviews_select_teacher on public.submission_reviews
  for select to authenticated using (public.is_my_student(student_id));
create policy submission_reviews_select_student on public.submission_reviews
  for select to authenticated using (student_id = auth.uid() and shared);

-- Read-only through the API: every write goes through review_submission().
revoke all on public.submission_reviews from anon;
revoke all on public.submission_reviews from authenticated;
grant select on public.submission_reviews to authenticated;

-- ============================================================= 3. REVIEW ====
-- Saves (or, with everything empty, deletes) the caller's review of one
-- submission. Same error for "does not exist" and "not your student".
drop function if exists public.review_submission(uuid, text, jsonb, numeric, jsonb, numeric);
drop function if exists public.review_submission(uuid, text, jsonb, numeric, jsonb, numeric, text);
create or replace function public.review_submission(
  p_submission uuid,
  p_comment    text,
  p_notes      jsonb,
  p_score      numeric,
  p_sections   jsonb,
  p_grade      numeric,
  p_title      text default null,
  p_shared     boolean default true
)
returns public.submission_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub     public.submissions;
  v_row     public.submission_reviews;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_notes   jsonb := coalesce(p_notes, '[]'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select * into v_sub from public.submissions where id = p_submission;
  if v_sub.id is null or not public.is_my_student(v_sub.student_id) then
    raise exception 'That work is not from a student in your class.' using errcode = '42501';
  end if;

  if jsonb_typeof(v_notes) <> 'array' then
    raise exception 'Comments must be a list.';
  end if;
  if p_sections is not null and jsonb_typeof(p_sections) <> 'object' then
    raise exception 'Section scores must be an object.';
  end if;

  if v_comment is null and jsonb_array_length(v_notes) = 0 and p_score is null and p_sections is null and p_grade is null then
    delete from public.submission_reviews where submission_id = p_submission;
    return null;
  end if;

  insert into public.submission_reviews as r (submission_id, student_id, teacher_id, title, comment, notes, score, sections, grade, shared)
  values (p_submission, v_sub.student_id, auth.uid(), left(nullif(btrim(coalesce(p_title, '')), ''), 200), v_comment, v_notes, p_score, p_sections, p_grade, coalesce(p_shared, true))
  on conflict (submission_id) do update
     set teacher_id = excluded.teacher_id,
         title      = coalesce(excluded.title, r.title),
         comment    = excluded.comment,
         notes      = excluded.notes,
         score      = excluded.score,
         sections   = excluded.sections,
         grade      = excluded.grade,
         shared     = excluded.shared,
         updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.review_submission(uuid, text, jsonb, numeric, jsonb, numeric, text, boolean) from public;
revoke all on function public.review_submission(uuid, text, jsonb, numeric, jsonb, numeric, text, boolean) from anon;
grant execute on function public.review_submission(uuid, text, jsonb, numeric, jsonb, numeric, text, boolean) to authenticated;
