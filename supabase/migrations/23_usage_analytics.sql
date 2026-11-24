-- =============================================================================
-- ECYR English platform — usage analytics (owner-only panel)
-- -----------------------------------------------------------------------------
-- Runs after 01–21 (22 is reserved). Safe to re-run.
--
-- WHAT IT DOES
--   * usage_events: one row per thing the app reports (a screen view, a game
--     opened, N seconds of active time…). The browser only INSERTS rows for the
--     signed-in user. Nobody can read, change or delete them through the API.
--   * usage_summary / usage_daily / usage_by_role / usage_overview /
--     usage_history_baseline: aggregate functions that only the platform owner
--     (platform_admins, see 15_teacher_invites.sql) can run. They back /admin/stats.
--
-- PRIVACY: only feature ids and action names are stored (e.g. 'units', 'view').
-- No e-mails, no text written by students. `meta` is a tiny object of ids/numbers.
--
-- RETENTION (optional, run by hand or schedule it with pg_cron):
--   delete from public.usage_events where created_at < now() - interval '365 days';
-- =============================================================================

-- ============================================================== 1. TABLE ====
create table if not exists public.usage_events (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  feature     text not null
              constraint usage_events_feature_len check (char_length(feature) between 1 and 64),
  action      text not null
              constraint usage_events_action_len check (char_length(action) between 1 and 32),
  seconds     integer not null default 0
              constraint usage_events_seconds_range check (seconds between 0 and 3600),
  meta        jsonb not null default '{}'::jsonb
              constraint usage_events_meta_small check (jsonb_typeof(meta) = 'object' and length(meta::text) <= 512),
  created_at  timestamptz not null default now()
);

create index if not exists usage_events_created_idx on public.usage_events (created_at);
create index if not exists usage_events_feature_idx on public.usage_events (feature, created_at);

-- ================================================================= 2. RLS ====
alter table public.usage_events enable row level security;

drop policy if exists usage_events_insert_own on public.usage_events;
create policy usage_events_insert_own on public.usage_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));
-- No SELECT / UPDATE / DELETE policies on purpose: reads go through the functions below.

revoke all on public.usage_events from public, anon, authenticated;
grant insert on public.usage_events to authenticated;
grant usage on sequence public.usage_events_id_seq to authenticated;

-- ======================================================== 3. AGGREGATES ====
-- Every function checks the caller is the platform owner first.

-- Per feature: distinct users, events, opens (view/open), active minutes, last use.
create or replace function public.usage_summary(p_days int default 30)
returns table (feature text, users bigint, events bigint, opens bigint, minutes numeric, last_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can read usage statistics.' using errcode = '42501';
  end if;
  return query
    select e.feature,
           count(distinct e.user_id),
           count(*),
           count(*) filter (where e.action in ('view', 'open')),
           round(coalesce(sum(e.seconds), 0) / 60.0, 1),
           max(e.created_at)
      from public.usage_events e
     where e.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 730)))
     group by e.feature
     order by 2 desc, 3 desc;
end;
$$;

-- Daily distinct active users (all features, or one).
create or replace function public.usage_daily(p_days int default 30, p_feature text default null)
returns table (day date, users bigint, events bigint, minutes numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 730));
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can read usage statistics.' using errcode = '42501';
  end if;
  return query
    select d::date,
           count(distinct e.user_id),
           count(e.id),
           round(coalesce(sum(e.seconds), 0) / 60.0, 1)
      from generate_series(current_date - (v_days - 1), current_date, interval '1 day') d
      left join public.usage_events e
             on e.created_at >= d and e.created_at < d + interval '1 day'
            and (p_feature is null or e.feature = p_feature)
     group by d
     order by d;
end;
$$;

-- Per feature and role (student / teacher).
create or replace function public.usage_by_role(p_days int default 30)
returns table (feature text, role text, users bigint, events bigint, minutes numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can read usage statistics.' using errcode = '42501';
  end if;
  return query
    select e.feature,
           coalesce(p.role, 'student'),
           count(distinct e.user_id),
           count(*),
           round(coalesce(sum(e.seconds), 0) / 60.0, 1)
      from public.usage_events e
      left join public.profiles p on p.id = e.user_id
     where e.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 730)))
     group by e.feature, coalesce(p.role, 'student')
     order by 1, 2;
end;
$$;

-- Headline numbers: active students / teachers, total events and minutes.
create or replace function public.usage_overview(p_days int default 30)
returns table (students bigint, teachers bigint, events bigint, minutes numeric, total_students bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can read usage statistics.' using errcode = '42501';
  end if;
  return query
    select count(distinct e.user_id) filter (where coalesce(p.role, 'student') = 'student'),
           count(distinct e.user_id) filter (where p.role = 'teacher'),
           count(e.id),
           round(coalesce(sum(e.seconds), 0) / 60.0, 1),
           (select count(*) from public.profiles x where x.role = 'student')
      from public.usage_events e
      left join public.profiles p on p.id = e.user_id
     where e.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 730)));
end;
$$;

-- "Histórico (estimado)": what the older tables already say, so the panel does not
-- start empty. Feature ids match the app's (src/lib/usageFeatures.ts). Estimates:
-- learner_state keeps only the last ~150 activities and ~120 game sessions per student.
create or replace function public.usage_history_baseline()
returns table (feature text, users bigint, events bigint, last_at timestamptz, source text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can read usage statistics.' using errcode = '42501';
  end if;
  return query
  with act as (
    select ls.user_id, a->>'kind' as kind, a->>'ref' as ref, nullif(a->>'at', '')::timestamptz as at
      from public.learner_state ls
     cross join lateral jsonb_array_elements(
       case when jsonb_typeof(ls.state->'activity') = 'array' then ls.state->'activity' else '[]'::jsonb end) a
  ),
  gs as (
    select ls.user_id, g->>'slug' as slug, nullif(g->>'endedAt', '')::timestamptz as at
      from public.learner_state ls
     cross join lateral jsonb_array_elements(
       case when jsonb_typeof(ls.state->'gameSessions') = 'array' then ls.state->'gameSessions' else '[]'::jsonb end) g
  ),
  kinds(kind, feature) as (
    values ('unit', 'units'), ('topic', 'foundations'), ('reading', 'reading'), ('listening', 'listening'),
           ('speaking', 'speaking'), ('writing', 'writing'), ('flashcards', 'vocabulary'),
           ('ielts', 'ielts'), ('coach', 'coach'), ('exam', 'exams')
  )
  select k.feature, count(distinct a.user_id), count(*), max(a.at), 'learner_state.activity'
    from act a join kinds k on k.kind = a.kind group by k.feature
  union all
  select 'module:' || gs.slug, count(distinct gs.user_id), count(*), max(gs.at), 'learner_state.gameSessions'
    from gs where gs.slug is not null group by gs.slug
  union all
  select 'coach', count(distinct u.user_id), coalesce(sum(u.calls), 0), max(u.day)::timestamptz, 'ai_usage'
    from public.ai_usage u having count(*) > 0
  union all
  select 'podcasts', count(distinct u.user_id), coalesce(sum(u.calls), 0), max(u.day)::timestamptz, 'podcast_usage'
    from public.podcast_usage u having count(*) > 0
  union all
  select 'ielts', count(distinct s.student_id), count(*), max(s.created_at), 'submissions'
    from public.submissions s having count(*) > 0
  union all
  select 'portfolio', count(distinct i.user_id), count(*), max(i.created_at), 'portfolio_items'
    from public.portfolio_items i having count(*) > 0
  union all
  select 'tasks', count(distinct st.student_id), count(*), max(st.done_at), 'assignment_status'
    from public.assignment_status st where st.status in ('done', 'late') having count(*) > 0
  union all
  select 'notes', count(distinct n.user_id), count(*), max(n.created_at), 'student_notes'
    from public.student_notes n having count(*) > 0
  union all
  select 'boards', count(distinct b.teacher_id), count(*), max(b.created_at), 'live_boards'
    from public.live_boards b having count(*) > 0
  union all
  select 'games-cards', count(distinct c.user_id), coalesce(sum(c.games), 0), max(c.updated_at), 'game_card_points'
    from public.game_card_points c having count(*) > 0
  union all
  select 'classwars', count(distinct s.teacher_id), count(*), max(s.created_at), 'class_wars_sets'
    from public.class_wars_sets s having count(*) > 0
  union all
  select 'import', count(distinct m.user_id), count(*), max(m.created_at), 'migrations_log'
    from public.migrations_log m having count(*) > 0;
end;
$$;

-- ========================================================= 4. PERMISSIONS ====
revoke all on function public.usage_summary(int)               from public, anon;
revoke all on function public.usage_daily(int, text)           from public, anon;
revoke all on function public.usage_by_role(int)               from public, anon;
revoke all on function public.usage_overview(int)              from public, anon;
revoke all on function public.usage_history_baseline()         from public, anon;
grant execute on function public.usage_summary(int)            to authenticated;
grant execute on function public.usage_daily(int, text)        to authenticated;
grant execute on function public.usage_by_role(int)            to authenticated;
grant execute on function public.usage_overview(int)           to authenticated;
grant execute on function public.usage_history_baseline()      to authenticated;

notify pgrst, 'reload schema';
