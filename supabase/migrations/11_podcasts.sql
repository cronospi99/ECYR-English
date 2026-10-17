-- =============================================================================
-- ECYR English platform — AI quizzes for real podcast episodes
-- -----------------------------------------------------------------------------
-- Runs after 01–05. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout.
--
-- WHY THIS FILE EXISTS
-- Práctica → Listening → Podcasts plays episodes of real shows straight from
-- their publishers (found through Apple's public catalog). The `podcast` Edge
-- Function listens to an episode with Gemini and writes a quiz for one CEFR
-- level. A quiz is made ONCE per (episode, level) and then shared with every
-- user, so a quiz a teacher generated is ready for the whole class and the
-- Gemini quota is not spent twice on the same audio.
--
--   podcast_quizzes   one row per (episode_key, level). episode_key is
--                     'itunes:<collectionId>:<trackId>'. quiz is
--                     {summary_es, vocab:[[en,es]], questions:[LibQuestion],
--                      covered_minutes, partial}.
--   podcast_usage     per-user, per-day count of quiz generations, so one
--                     account cannot drain the project's Gemini quota
--                     (secret PODCAST_DAILY_LIMIT, default 10).
--
-- WHO CAN DO WHAT
--   any signed-in user   reads every quiz; reads their own usage rows
--   service role         (the Edge Function only) inserts quizzes and counts
--                        usage through bump_podcast_usage()
--   anyone else          nothing — no anon access at all
-- =============================================================================

-- Fails early with a clear message when the earlier files have not been run yet.
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Run 01_schema.sql … 05_ecyr_platform.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;


-- ============================================================= 1. TABLES ====
create table if not exists public.podcast_quizzes (
  id             uuid primary key default gen_random_uuid(),
  episode_key    text not null,
  level          text not null,
  show_name      text not null default '',
  episode_title  text not null default '',
  episode_url    text not null default '',
  quiz           jsonb not null,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- Constraints drop-then-add, so a re-run picks up any change.
alter table public.podcast_quizzes drop constraint if exists podcast_quizzes_episode_level;
alter table public.podcast_quizzes drop constraint if exists podcast_quizzes_key_format;
alter table public.podcast_quizzes drop constraint if exists podcast_quizzes_level;
alter table public.podcast_quizzes drop constraint if exists podcast_quizzes_text_len;
alter table public.podcast_quizzes drop constraint if exists podcast_quizzes_shape;
alter table public.podcast_quizzes drop constraint if exists podcast_quizzes_size;

alter table public.podcast_quizzes
  add constraint podcast_quizzes_episode_level unique (episode_key, level);
alter table public.podcast_quizzes
  add constraint podcast_quizzes_key_format check (episode_key ~ '^itunes:[0-9]{1,15}:[0-9]{1,20}$');
alter table public.podcast_quizzes
  add constraint podcast_quizzes_level check (level in ('A1','A2','B1','B2','C1'));
alter table public.podcast_quizzes
  add constraint podcast_quizzes_text_len check (
    char_length(show_name) <= 300 and char_length(episode_title) <= 500 and char_length(episode_url) <= 2000);
alter table public.podcast_quizzes
  add constraint podcast_quizzes_shape check (
    jsonb_typeof(quiz) = 'object' and jsonb_typeof(quiz -> 'questions') = 'array');
alter table public.podcast_quizzes
  add constraint podcast_quizzes_size check (pg_column_size(quiz) < 64 * 1024);

create index if not exists podcast_quizzes_created_by on public.podcast_quizzes (created_by, created_at desc);

create table if not exists public.podcast_usage (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  day      date not null default current_date,
  calls    integer not null default 0,
  primary key (user_id, day)
);


-- ================================================================ 2. RLS ====
alter table public.podcast_quizzes enable row level security;
alter table public.podcast_usage   enable row level security;

drop policy if exists podcast_quizzes_select_all on public.podcast_quizzes;
drop policy if exists podcast_usage_select_own   on public.podcast_usage;

-- Quizzes are shared learning material: every signed-in user may read them.
create policy podcast_quizzes_select_all on public.podcast_quizzes
  for select to authenticated using (true);
-- No insert/update/delete policy: only the service role (which bypasses RLS)
-- writes, from the `podcast` Edge Function after validating Gemini's JSON.

create policy podcast_usage_select_own on public.podcast_usage
  for select to authenticated using (user_id = auth.uid());


-- ============================================================= 3. GRANTS ====
-- Revoke the blanket grant Supabase hands out on new tables, then grant back
-- exactly what is needed.
revoke all on public.podcast_quizzes from anon, authenticated;
revoke all on public.podcast_usage   from anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant select on public.podcast_quizzes to authenticated;
grant select on public.podcast_usage   to authenticated;
grant select, insert, update, delete on public.podcast_quizzes to service_role;
grant select, insert, update, delete on public.podcast_usage   to service_role;


-- ========================================================== 4. USAGE CAP ====
-- Counts one quiz generation for p_user and refuses past the daily limit.
-- Called by the Edge Function with the service role (it knows who the caller
-- is from their session); not callable by users directly.
create or replace function public.bump_podcast_usage(p_user uuid, p_limit integer default 10)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls integer;
begin
  if p_user is null then
    raise exception 'no user' using errcode = '22004';
  end if;

  insert into public.podcast_usage (user_id, day, calls)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update set calls = public.podcast_usage.calls + 1
  returning calls into v_calls;

  if v_calls > greatest(1, least(p_limit, 100)) then
    raise exception 'daily podcast limit reached' using errcode = 'P0001';
  end if;
  return v_calls;
end;
$$;

revoke all on function public.bump_podcast_usage(uuid, integer) from public;
revoke all on function public.bump_podcast_usage(uuid, integer) from anon, authenticated;
grant execute on function public.bump_podcast_usage(uuid, integer) to service_role;

-- -----------------------------------------------------------------------------
-- WHAT EACH ROLE CAN NOW DO
--   authenticated   select podcast_quizzes (all rows); select own podcast_usage
--   service_role    everything on both tables; bump_podcast_usage(user, limit)
-- -----------------------------------------------------------------------------
