-- =============================================================================
-- ECYR English — migrations log ("Importar y migrar", route /import)
-- -----------------------------------------------------------------------------
-- Runs after 01–06. Safe to re-run: create-if-not-exists / drop-then-create.
--
--   migrations_log   one row per import a learner ran: what came in (summary,
--                    used by the app to avoid importing the same thing twice
--                    and to list past imports) and the full imported data
--                    (payload: the old IELTS account dump — feedback and
--                    homework from the old teacher have nowhere else to live —
--                    the session file's bands/history, or the progress file).
--
-- Rows are append-only for the learner: insert + read their own, never update
-- or delete. Their teacher can read them (is_my_student), like progress.
--
-- Submissions: no change needed. 02 replaced submissions_rw_own with
-- submissions_insert_own (WITH CHECK student_id = auth.uid()) and 06 grants
-- INSERT on every column to authenticated, so a student may insert their own
-- rows with an explicit created_at (the migration preserves the original
-- date). Reading them back stays subject to 03's history visibility; the app
-- therefore also remembers migrated submission keys in this log.
-- =============================================================================

-- Fails early with a clear message when the earlier files have not been run yet.
do $$
begin
  if to_regclass('public.profiles') is null or to_regprocedure('public.is_my_student(uuid)') is null then
    raise exception 'Run 01_schema.sql … 06_api_grants.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

create table if not exists public.migrations_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  source      text not null check (source in ('ielts-account','ielts-session-file','ecyr-progress-file')),
  summary     jsonb not null default '{}'::jsonb,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists migrations_log_user_idx on public.migrations_log(user_id, created_at desc);

-- Size guards (the app trims the payload under 1.8 MB before sending it).
alter table public.migrations_log drop constraint if exists migrations_log_payload_size;
alter table public.migrations_log
  add constraint migrations_log_payload_size check (payload is null or pg_column_size(payload) < 2 * 1024 * 1024);
alter table public.migrations_log drop constraint if exists migrations_log_summary_size;
alter table public.migrations_log
  add constraint migrations_log_summary_size check (pg_column_size(summary) < 512 * 1024);

alter table public.migrations_log enable row level security;

drop policy if exists migrations_log_insert_own   on public.migrations_log;
drop policy if exists migrations_log_select_own   on public.migrations_log;
drop policy if exists migrations_log_select_class on public.migrations_log;

-- A learner logs only their own imports …
create policy migrations_log_insert_own on public.migrations_log
  for insert to authenticated with check (user_id = auth.uid());
-- … and reads only their own.
create policy migrations_log_select_own on public.migrations_log
  for select to authenticated using (user_id = auth.uid());
-- A teacher may read (never write) the imports of their own students.
create policy migrations_log_select_class on public.migrations_log
  for select to authenticated using (public.is_my_student(user_id));
-- No update / delete policies: the log is append-only.

-- Explicit grants (Supabase's default privileges would otherwise grant ALL).
revoke all on public.migrations_log from anon;
revoke all on public.migrations_log from authenticated;
grant select, insert on public.migrations_log to authenticated;
