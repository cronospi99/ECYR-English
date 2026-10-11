-- =============================================================================
-- ECYR English platform — "Mis trabajos" (portfolio)
-- -----------------------------------------------------------------------------
-- Runs after 01–06. Safe to re-run: create-if-not-exists / drop-then-create /
-- on-conflict-update throughout.
--
-- WHY THIS FILE EXISTS
-- Learners arrive with work they have ALREADY done — essays, homework, tests,
-- projects, certificates, recordings, photos of notebook pages. This gives each
-- account one place to keep it, and gives their teacher a way to read it and
-- leave a review.
--
--   portfolio_items   one row per piece of work: what it is, metadata, an
--                     optional pasted text and/or an optional file in Storage,
--                     plus the teacher's review.
--   portfolio/        private Storage bucket, one folder per user:
--                       portfolio/<user id>/<uuid>-<file name>
--
-- WHO CAN DO WHAT
--   the owner     reads, adds, edits (metadata only) and deletes their own
--                 items and files; can NOT write the teacher's review
--   their teacher reads the items and files of students in their class, and
--                 reviews through review_portfolio_item(); never edits or
--                 deletes the student's work
--   anyone else   nothing — no anon access at all
-- =============================================================================

-- Fails early with a clear message when 01–04 have not been run yet.
do $$
begin
  if to_regclass('public.profiles') is null or to_regprocedure('public.is_my_student(uuid)') is null then
    raise exception 'Run 01_schema.sql … 06_api_grants.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;


-- ============================================================== 1. TABLE ====
create table if not exists public.portfolio_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null default 'other'
                constraint portfolio_kind check (kind in ('writing','homework','test','project','certificate','audio','image','other')),
  title         text not null
                constraint portfolio_title_len check (char_length(btrim(title)) between 1 and 200),
  description   text
                constraint portfolio_description_len check (char_length(description) <= 2000),
  level         text
                constraint portfolio_level check (level is null or level in ('A1','A2','B1','B2','C1')),
  skill         text
                constraint portfolio_skill check (skill is null or skill in ('listening','reading','writing','speaking','grammar','vocabulary')),
  done_at       date,
  -- Self-reported mark: a percentage or an IELTS band. The scale is required
  -- whenever there is a score, so "7" can never be ambiguous.
  score         numeric,
  score_scale   text
                constraint portfolio_score_scale check (score_scale is null or score_scale in ('percent','band')),
  text_content  text
                constraint portfolio_text_len check (char_length(text_content) <= 60000),
  file_path     text,
  file_name     text
                constraint portfolio_file_name_len check (char_length(file_name) <= 255),
  file_type     text
                constraint portfolio_file_type_len check (char_length(file_type) <= 255),
  file_size     integer
                constraint portfolio_file_size check (file_size is null or file_size between 0 and 20971520),
  source        text not null default 'upload'
                constraint portfolio_source check (source in ('upload','migration','import')),
  teacher_note  text
                constraint portfolio_teacher_note_len check (char_length(teacher_note) <= 4000),
  teacher_score numeric
                constraint portfolio_teacher_score check (teacher_score is null or teacher_score between 0 and 100),
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Cross-column rules, drop-then-add so a re-run picks up any change.
-- coalesce(..., false) matters: a CHECK that evaluates to NULL passes, and
-- "score_scale = 'percent'" is NULL when there is no scale at all.
alter table public.portfolio_items drop constraint if exists portfolio_score_valid;
alter table public.portfolio_items add constraint portfolio_score_valid check (
  score is null
  or coalesce(
       (score_scale = 'percent' and score between 0 and 100)
       or (score_scale = 'band' and score between 0 and 9),
       false)
);

-- A row may only point at a file inside its owner's own folder, so nobody can
-- "attach" somebody else's object to their item.
alter table public.portfolio_items drop constraint if exists portfolio_file_in_own_folder;
alter table public.portfolio_items add constraint portfolio_file_in_own_folder check (
  file_path is null or file_path like user_id::text || '/%'
);

create index if not exists portfolio_items_user_idx on public.portfolio_items(user_id, created_at desc);

-- updated_at follows every write. A trigger assigning NEW needs no column
-- privilege, so it works under the column grants below.
create or replace function public.portfolio_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists portfolio_touch_trg on public.portfolio_items;
create trigger portfolio_touch_trg
  before update on public.portfolio_items
  for each row execute function public.portfolio_touch();


-- ======================================================== 2. ROW SECURITY ===
alter table public.portfolio_items enable row level security;

drop policy if exists portfolio_select_own   on public.portfolio_items;
drop policy if exists portfolio_insert_own   on public.portfolio_items;
drop policy if exists portfolio_update_own   on public.portfolio_items;
drop policy if exists portfolio_delete_own   on public.portfolio_items;
drop policy if exists portfolio_select_class on public.portfolio_items;

create policy portfolio_select_own on public.portfolio_items
  for select to authenticated using (user_id = auth.uid());

create policy portfolio_insert_own on public.portfolio_items
  for insert to authenticated with check (user_id = auth.uid());

create policy portfolio_update_own on public.portfolio_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy portfolio_delete_own on public.portfolio_items
  for delete to authenticated using (user_id = auth.uid());

-- A teacher reads (never writes) the work of students in their own class.
create policy portfolio_select_class on public.portfolio_items
  for select to authenticated using (public.is_my_student(user_id));


-- ========================================================= 3. COLUMN GRANTS =
-- Policies judge whole rows; which COLUMNS the owner may write is a privilege
-- question, so it is answered the way 02 answers it for profiles: revoke the
-- table-wide grant (Supabase hands one out to anon/authenticated by default on
-- new tables) and grant back an explicit column list.
--
-- Left out on purpose:
--   teacher_note, teacher_score, reviewed_by, reviewed_at — the review; only
--       review_portfolio_item() (SECURITY DEFINER, runs as owner) writes them
--   user_id (update) — an item cannot be moved to another account
--   file_* (update) — a file is attached when the item is created; replacing
--       it means deleting and re-uploading, so a row never points at an object
--       that was not uploaded with it
--   id, created_at, updated_at — set by defaults / trigger
--
-- Teacher and student are the same database role (authenticated), so a
-- column grant cannot tell them apart — which is fine, because neither writes
-- the review columns directly.
revoke all on public.portfolio_items from anon;
revoke all on public.portfolio_items from authenticated;

grant usage on schema public to authenticated;
grant select, delete on public.portfolio_items to authenticated;
grant insert (user_id, kind, title, description, level, skill, done_at, score, score_scale,
              text_content, file_path, file_name, file_type, file_size, source)
  on public.portfolio_items to authenticated;
grant update (kind, title, description, level, skill, done_at, score, score_scale, text_content)
  on public.portfolio_items to authenticated;


-- ============================================================= 4. REVIEW ====
-- The teacher's one write. Checks the item belongs to one of the caller's
-- students, validates the score against the item's own scale (band 0–9 when
-- the student used bands, otherwise 0–100), and stamps who/when.
-- Passing null for both note and score clears the review.
create or replace function public.review_portfolio_item(p_id uuid, p_note text, p_score numeric)
returns public.portfolio_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.portfolio_items;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select * into v_item from public.portfolio_items where id = p_id;
  -- Same answer for "does not exist" and "not yours to review", so the
  -- function cannot be used to probe other classes' item ids.
  if v_item.id is null or not public.is_my_student(v_item.user_id) then
    raise exception 'That work is not from a student in your class.' using errcode = '42501';
  end if;

  if v_note is not null and char_length(v_note) > 4000 then
    raise exception 'The review note is too long (4000 characters max).';
  end if;
  if p_score is not null then
    if v_item.score_scale = 'band' and (p_score < 0 or p_score > 9) then
      raise exception 'A band score must be between 0 and 9.';
    elsif p_score < 0 or p_score > 100 then
      raise exception 'The score must be between 0 and 100.';
    end if;
  end if;

  update public.portfolio_items
     set teacher_note  = v_note,
         teacher_score = p_score,
         reviewed_by   = case when v_note is null and p_score is null then null else auth.uid() end,
         reviewed_at   = case when v_note is null and p_score is null then null else now() end
   where id = p_id
  returning * into v_item;

  return v_item;
end;
$$;

revoke all on function public.review_portfolio_item(uuid, text, numeric) from public;
revoke all on function public.review_portfolio_item(uuid, text, numeric) from anon;
grant execute on function public.review_portfolio_item(uuid, text, numeric) to authenticated;


-- ============================================================ 5. STORAGE ====
-- 20 MB per file: comfortably fits a phone photo, a scanned PDF or a few
-- minutes of audio, without turning the bucket into video hosting.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', false, 20971520,
        array[
          -- documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.oasis.opendocument.text',
          'text/plain','text/markdown','text/x-markdown',
          'application/rtf','text/rtf',
          -- images (photos of notebook pages, certificates)
          'image/png','image/jpeg','image/webp','image/heic','image/heif',
          -- audio recordings
          'audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/aac',
          'audio/wav','audio/x-wav','audio/wave','audio/webm','audio/ogg','application/ogg',
          -- short video (e.g. a recorded presentation)
          'video/mp4','video/webm'
        ])
on conflict (id) do update
   set public             = false,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- The first folder of every path is the owner's id; storage.foldername()
-- splits the path, and [1] is that folder.
drop policy if exists portfolio_obj_insert_own   on storage.objects;
drop policy if exists portfolio_obj_select_own   on storage.objects;
drop policy if exists portfolio_obj_delete_own   on storage.objects;
drop policy if exists portfolio_obj_select_class on storage.objects;

create policy portfolio_obj_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy portfolio_obj_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy portfolio_obj_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No UPDATE policy: uploads never overwrite (every object name carries a fresh
-- uuid), so there is nothing legitimate for one to allow.

-- The teacher reads their students' folders. The CASE guards the uuid cast:
-- a folder name that is not a uuid is simply "not my student", never an error
-- that would break the listing for everyone else.
create policy portfolio_obj_select_class on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portfolio'
    and case
          when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then public.is_my_student(((storage.foldername(name))[1])::uuid)
          else false
        end
  );

-- -----------------------------------------------------------------------------
-- WHAT EACH ROLE CAN NOW DO
--   owner     portfolio_items: read / add / delete own rows; edit kind, title,
--             description, level, skill, done_at, score, score_scale and
--             text_content of own rows. Storage: upload, read and delete inside
--             portfolio/<own id>/.
--   teacher   reads the items and files of students in their class; writes
--             only teacher_note / teacher_score through
--             review_portfolio_item(id, note, score).
--
-- NOTE: deleting an account removes its rows (on delete cascade) but not its
-- Storage objects; remove the folder from the dashboard if needed.
-- -----------------------------------------------------------------------------
