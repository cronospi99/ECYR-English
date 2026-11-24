-- =============================================================================
-- ECYR English platform — usage analytics, student by student (owner-only)
-- -----------------------------------------------------------------------------
-- Runs after 23_usage_analytics.sql. Safe to re-run. Does not touch table data.
--
-- WHAT IT DOES
--   * usage_students(p_days)                  one row per account: who, main teacher, class,
--                                             active days, minutes, distinct features, last use.
--   * usage_student_detail(p_user, p_days)    per feature: opens, minutes, last use and the
--                                             teachers/contexts the student worked with
--                                             (including OTHER teachers' boards, live games...).
--   * usage_student_daily(p_user, p_days)     minutes and events per day.
--   * usage_student_timeline(p_user, p_days, p_limit)  recent events with readable context.
--
-- Context comes from usage_events.meta, written by the app:
--   meta.teacher     uuid of the teacher who owns the class/board/room (when known)
--   meta.board       live board id        -> teacher = live_boards.teacher_id
--   meta.assignment  assignment id        -> teacher = assignments.teacher_id
--   meta.room+role   live game room code  -> teacher = the user who opened it as host
--                                            (same room, up to 8 h earlier)
-- Only the platform owner (is_platform_admin()) can run any of these functions.
-- The e-mail is only returned by usage_students, to the owner.
-- =============================================================================

-- ============================================================ 1. HELPER ====
-- Who is the "other" teacher behind an event? Internal: not callable from the API.
-- (Text comparisons on purpose: a bad meta value can never raise a cast error.)
create or replace function public._usage_ctx_teacher(p_meta jsonb, p_user uuid, p_at timestamptz)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.id from public.profiles p where p.id::text = p_meta->>'teacher'),
    (select b.teacher_id from public.live_boards b where b.id::text = p_meta->>'board'),
    (select a.teacher_id from public.assignments a where a.id::text = p_meta->>'assignment'),
    (select h.user_id
       from public.usage_events h
      where p_meta ? 'room'
        and coalesce(p_meta->>'role', '') <> 'host'
        and h.meta->>'room' = p_meta->>'room'
        and h.meta->>'role' = 'host'
        and h.user_id <> p_user
        and h.created_at <= p_at
        and h.created_at >= p_at - interval '8 hours'
      order by h.created_at desc
      limit 1)
  );
$$;

revoke all on function public._usage_ctx_teacher(jsonb, uuid, timestamptz) from public, anon, authenticated;

-- Short readable kind of context: board / room / assignment / null.
create or replace function public._usage_ctx_kind(p_meta jsonb)
returns text
language sql
immutable
as $$
  select case when p_meta ? 'board' then 'board'
              when p_meta ? 'room' then 'room'
              when p_meta ? 'assignment' then 'assignment'
              when p_meta ? 'teacher' then 'class'
              else null end;
$$;

revoke all on function public._usage_ctx_kind(jsonb) from public, anon, authenticated;

-- ======================================================== 2. STUDENT LIST ====
-- Drop first: re-running with a changed signature would otherwise fail.
drop function if exists public.usage_students(int);
create function public.usage_students(p_days int default 30)
returns table (
  user_id uuid, full_name text, email text, role text, teacher_name text, class_code text,
  active_days bigint, minutes numeric, features bigint, events bigint, last_at timestamptz
)
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
    select p.id,
           p.full_name,
           p.email,
           coalesce(p.role, 'student'),
           t.full_name,
           coalesce(p.class_code, t.class_code),
           count(distinct date_trunc('day', e.created_at)),
           round(coalesce(sum(e.seconds), 0) / 60.0, 1),
           count(distinct e.feature),
           count(e.id),
           max(e.created_at)
      from public.profiles p
      left join public.profiles t on t.id = p.teacher_id
      left join public.usage_events e
             on e.user_id = p.id
            and e.created_at >= now() - make_interval(days => v_days)
     group by p.id, p.full_name, p.email, p.role, t.full_name, p.class_code, t.class_code
     order by 8 desc, 11 desc nulls last, 2;
end;
$$;

-- ===================================================== 3. STUDENT DETAIL ====
-- contexts: [{teacher_id, teacher_name, other (true = a teacher who is not theirs),
--             kind (board|room|assignment|class), n}] for that feature.
drop function if exists public.usage_student_detail(uuid, int);
create function public.usage_student_detail(p_user uuid, p_days int default 30)
returns table (feature text, events bigint, opens bigint, minutes numeric, last_at timestamptz, contexts jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 730));
  v_own uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can read usage statistics.' using errcode = '42501';
  end if;
  select pr.teacher_id into v_own from public.profiles pr where pr.id = p_user;
  return query
    with ev as (
      select e.*,
             public._usage_ctx_teacher(e.meta, e.user_id, e.created_at) as ctx_teacher,
             public._usage_ctx_kind(e.meta) as ctx_kind
        from public.usage_events e
       where e.user_id = p_user
         and e.created_at >= now() - make_interval(days => v_days)
    ),
    ctx as (
      select x.feature as feature,
             jsonb_agg(jsonb_build_object(
               'teacher_id', x.ctx_teacher,
               'teacher_name', tp.full_name,
               'other', x.ctx_teacher is not null and x.ctx_teacher is distinct from v_own and x.ctx_teacher <> p_user,
               'kind', x.ctx_kind,
               'n', x.n) order by x.n desc) as contexts
        from (select ev.feature, ev.ctx_teacher, ev.ctx_kind, count(*) as n
                from ev
               where ev.ctx_teacher is not null or ev.ctx_kind is not null
               group by ev.feature, ev.ctx_teacher, ev.ctx_kind) x
        left join public.profiles tp on tp.id = x.ctx_teacher
       group by x.feature
    )
    select ev.feature,
           count(*),
           count(*) filter (where ev.action in ('view', 'open')),
           round(coalesce(sum(ev.seconds), 0) / 60.0, 1),
           max(ev.created_at),
           coalesce((select c.contexts from ctx c where c.feature = ev.feature), '[]'::jsonb)
      from ev
     group by ev.feature
     order by 4 desc, 2 desc;
end;
$$;

-- ======================================================== 4. DAILY SERIES ====
drop function if exists public.usage_student_daily(uuid, int);
create function public.usage_student_daily(p_user uuid, p_days int default 30)
returns table (day date, events bigint, minutes numeric)
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
           count(e.id),
           round(coalesce(sum(e.seconds), 0) / 60.0, 1)
      from generate_series(current_date - (v_days - 1), current_date, interval '1 day') d
      left join public.usage_events e
             on e.user_id = p_user
            and e.created_at >= d and e.created_at < d + interval '1 day'
     group by d
     order by d;
end;
$$;

-- ========================================================= 5. TIMELINE ====
drop function if exists public.usage_student_timeline(uuid, int, int);
create function public.usage_student_timeline(p_user uuid, p_days int default 30, p_limit int default 100)
returns table (id bigint, at timestamptz, feature text, action text, seconds int, context text, other boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 730));
  v_limit int := greatest(1, least(coalesce(p_limit, 100), 500));
  v_own uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can read usage statistics.' using errcode = '42501';
  end if;
  select pr.teacher_id into v_own from public.profiles pr where pr.id = p_user;
  return query
    select r.id, r.created_at, r.feature, r.action, r.seconds,
           concat_ws(' · ',
             case r.kind when 'board' then 'Muro: ' || coalesce(
                    (select b.title from public.live_boards b where b.id::text = r.meta->>'board'), left(r.meta->>'board', 8))
                  when 'room' then 'Sala ' || left(r.meta->>'room', 8) ||
                    case when r.meta->>'role' = 'host' then ' (anfitrión)' else '' end
                  when 'assignment' then 'Tarea'
                  when 'class' then 'Clase'
                  else null end,
             case when r.teacher is not null and r.teacher <> p_user
                  then (case when r.teacher is distinct from v_own then 'Prof. otro: ' else 'Prof.: ' end)
                       || coalesce((select tp.full_name from public.profiles tp where tp.id = r.teacher), 'sin nombre')
                  else null end),
           r.teacher is not null and r.teacher <> p_user and r.teacher is distinct from v_own
      from (
        select e.*,
               public._usage_ctx_kind(e.meta) as kind,
               public._usage_ctx_teacher(e.meta, e.user_id, e.created_at) as teacher
          from public.usage_events e
         where e.user_id = p_user
           and e.action <> 'time'
           and e.created_at >= now() - make_interval(days => v_days)
         order by e.created_at desc, e.id desc
         limit v_limit
      ) r
     order by r.created_at desc, r.id desc;
end;
$$;

-- ========================================================= 6. PERMISSIONS ====
revoke all on function public.usage_students(int)                    from public, anon;
revoke all on function public.usage_student_detail(uuid, int)        from public, anon;
revoke all on function public.usage_student_daily(uuid, int)         from public, anon;
revoke all on function public.usage_student_timeline(uuid, int, int) from public, anon;
grant execute on function public.usage_students(int)                    to authenticated;
grant execute on function public.usage_student_detail(uuid, int)        to authenticated;
grant execute on function public.usage_student_daily(uuid, int)         to authenticated;
grant execute on function public.usage_student_timeline(uuid, int, int) to authenticated;

notify pgrst, 'reload schema';
