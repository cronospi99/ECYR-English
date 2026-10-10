-- =============================================================================
-- ECYR English platform — learner progress + AI Coach usage
-- -----------------------------------------------------------------------------
-- Runs after 01–04 (the IELTS Simulator schema, shared by the whole platform).
-- Safe to re-run: create-if-not-exists / drop-then-create throughout.
--
--   learner_state   one row per user: the platform's progress document (XP,
--                   streak, completed units/topics/readings, activity…).
--                   The app is local-first and merges this on sign-in.
--   ai_usage        per-user, per-day counter for the AI Coach, so the
--                   project's Gemini quota cannot be drained by one account.
-- =============================================================================

-- ------------------------------------------------------------ learner_state --
create table if not exists public.learner_state (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.learner_state enable row level security;

drop policy if exists learner_state_rw_own      on public.learner_state;
drop policy if exists learner_state_select_class on public.learner_state;

-- A learner reads and writes only their own document.
create policy learner_state_rw_own on public.learner_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A teacher may read (never write) the documents of their own students.
create policy learner_state_select_class on public.learner_state
  for select using (public.is_my_student(user_id));

-- Guards against oversized documents (the app keeps it well under 256 KB).
alter table public.learner_state drop constraint if exists learner_state_size;
alter table public.learner_state
  add constraint learner_state_size check (pg_column_size(state) < 512 * 1024);

-- ----------------------------------------------------------------- ai_usage --
create table if not exists public.ai_usage (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  day      date not null default current_date,
  calls    integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select using (user_id = auth.uid());
-- No insert/update policy: the counter only moves through bump_ai_usage().

-- Counts one AI Coach call for the caller and refuses past the daily limit.
-- SECURITY DEFINER so it can write the counter the caller cannot touch.
create or replace function public.bump_ai_usage(p_limit integer default 40)
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

  insert into public.ai_usage (user_id, day, calls)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
  returning calls into v_calls;

  if v_calls > greatest(1, least(p_limit, 500)) then
    raise exception 'daily AI limit reached' using errcode = 'P0001';
  end if;
  return v_calls;
end;
$$;

revoke all on function public.bump_ai_usage(integer) from public;
grant execute on function public.bump_ai_usage(integer) to authenticated;
