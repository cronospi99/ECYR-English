-- =============================================================================
-- ECYR English platform — character cards for the live games (Impostor, Class Wars)
-- -----------------------------------------------------------------------------
-- Runs after 01–18. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout, inside one transaction (if anything fails,
-- nothing changes).
--
-- WHY THIS FILE EXISTS
-- The live games use 25 characters (the teaching team, drawn in code). Every
-- player — teacher or student — can play ALL of them. Each character card
-- ranks up with the points its player earns while playing it:
--
--     bronze (0) → silver (20) → gold (60) → diamond (150)
--
-- (thresholds live in the app, src/features/cards/api.ts RANK_AT; the database
-- only stores points). Gameplay itself never touches Supabase: it runs through
-- the Cloudflare relay. Supabase is called ONCE per match, by the teacher's
-- projector browser, when the match ends:
--
--   game_card_points   one row per (player, card): total points and matches.
--   game_matches       one row per finished match (game + match id + teacher)
--                      so the log knows who paid it.
--   game_awards        one row per (match, player): what that player got.
--                      Its primary key is what guarantees that the same match
--                      never pays the same player twice — a retried or
--                      replayed call only adds the players still missing.
--
-- Nobody writes these tables directly. award_game_points() is the only way
-- in (SECURITY DEFINER), and it checks everything:
--   * the caller is signed in and is a teacher;
--   * p_game is 'impostor' or 'classwars'; the match id is short and plain;
--   * a match id already used by ANOTHER teacher is refused;
--   * each award goes to the teacher themself or to one of their students
--     (public.is_my_student); anyone else is skipped, not paid;
--   * the card id is one of the 25 characters (game_card_ids());
--   * points are whole numbers, clamped to 0 … the per-award cap of the game
--     (impostor 30, classwars 50); at most 80 awards per call (the relay's
--     room limit) and at most 60 matches per teacher per hour.
--
-- WHO CAN DO WHAT
--   student    reads their own card points and their own awards
--   teacher    reads the card points and awards of their students and their
--              own; pays points at the end of a match they hosted, to their
--              own students and to themself (through award_game_points)
--   anyone else nothing (guests play without saving)
-- =============================================================================

begin;

do $$
begin
  if to_regclass('public.profiles') is null or to_regprocedure('public.is_my_student(uuid)') is null then
    raise exception 'Run 01_schema.sql … 18_live_boards_v2.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- ============================================================= 1. TABLES ====
create table if not exists public.game_card_points (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  card_id     text not null,
  points      integer not null default 0,
  games       integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table if not exists public.game_matches (
  game        text not null,
  match_id    text not null,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (game, match_id)
);

create table if not exists public.game_awards (
  game        text not null,
  match_id    text not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  card_id     text not null,
  points      integer not null,
  created_at  timestamptz not null default now(),
  primary key (game, match_id, user_id),
  foreign key (game, match_id) references public.game_matches(game, match_id) on delete cascade
);

alter table public.game_card_points drop constraint if exists game_card_points_card;
alter table public.game_card_points drop constraint if exists game_card_points_range;
alter table public.game_card_points
  add constraint game_card_points_card check (card_id ~ '^[a-z]{2,24}$');
alter table public.game_card_points
  add constraint game_card_points_range check (points between 0 and 10000000 and games >= 0);

alter table public.game_matches drop constraint if exists game_matches_game;
alter table public.game_matches drop constraint if exists game_matches_id;
alter table public.game_matches
  add constraint game_matches_game check (game in ('impostor', 'classwars'));
alter table public.game_matches
  add constraint game_matches_id check (match_id ~ '^[A-Za-z0-9_.:-]{4,80}$');

alter table public.game_awards drop constraint if exists game_awards_card;
alter table public.game_awards drop constraint if exists game_awards_points;
alter table public.game_awards
  add constraint game_awards_card check (card_id ~ '^[a-z]{2,24}$');
alter table public.game_awards
  add constraint game_awards_points check (points between 0 and 1000);

create index if not exists game_matches_teacher_idx on public.game_matches(teacher_id, created_at desc);
create index if not exists game_awards_user_idx     on public.game_awards(user_id, created_at desc);

alter table public.game_card_points enable row level security;
alter table public.game_matches     enable row level security;
alter table public.game_awards      enable row level security;

-- Reads only; every write goes through award_game_points().
revoke all on public.game_card_points from anon, authenticated;
revoke all on public.game_matches     from anon, authenticated;
revoke all on public.game_awards      from anon, authenticated;
grant select on public.game_card_points to authenticated;
grant select on public.game_matches     to authenticated;
grant select on public.game_awards      to authenticated;

drop policy if exists game_card_points_select on public.game_card_points;
drop policy if exists game_matches_select     on public.game_matches;
drop policy if exists game_awards_select      on public.game_awards;

-- Mine, or my students' (teacher).
create policy game_card_points_select on public.game_card_points
  for select to authenticated using (user_id = auth.uid() or public.is_my_student(user_id));
create policy game_awards_select on public.game_awards
  for select to authenticated using (user_id = auth.uid() or public.is_my_student(user_id));
-- A teacher sees the matches they paid.
create policy game_matches_select on public.game_matches
  for select to authenticated using (teacher_id = auth.uid());

-- ============================================================ 2. HELPERS ====
-- The 25 characters (src/features/cards/teachers.ts). Add new ids here too.
create or replace function public.game_card_ids()
returns text[]
language sql
immutable
as $$
  select array[
    'camila', 'sofia', 'gabriel', 'sander', 'nataly', 'anyela', 'julian', 'freddy',
    'andres', 'angie', 'lina', 'valentina', 'esteban', 'sebastian', 'javier', 'anny',
    'estephania', 'dager', 'liliana', 'norvey', 'mafe', 'jhonathan', 'jalbleidy',
    'juanpablo', 'vanessa'
  ]::text[];
$$;

-- ================================================================ 3. RPC ====
-- p_awards: [{"user_id": uuid, "card_id": text, "points": int}, …]
-- Returns {"match": …, "saved": [{user_id, card_id, points, total}],
--          "skipped": [{user_id, reason}]} where reason is
--   'invalid'       bad user id / card id / points
--   'not_in_class'  not the caller and not one of the caller's students
--   'already_paid'  this player already got points for this match
--   'repeated'      the same player twice in one call (first one counts)
create or replace function public.award_game_points(p_game text, p_match text, p_awards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me       uuid := auth.uid();
  v_cap      integer;
  v_owner    uuid;
  v_item     jsonb;
  v_uid      uuid;
  v_card     text;
  v_pts      integer;
  v_total    integer;
  v_seen     uuid[] := '{}';
  v_saved    jsonb := '[]'::jsonb;
  v_skipped  jsonb := '[]'::jsonb;
  v_rows     integer;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = v_me and role = 'teacher') then
    raise exception 'only teachers can award game points' using errcode = '42501';
  end if;
  v_cap := case p_game when 'impostor' then 30 when 'classwars' then 50 else null end;
  if v_cap is null then
    raise exception 'unknown game' using errcode = '22023';
  end if;
  if p_match is null or p_match !~ '^[A-Za-z0-9_.:-]{4,80}$' then
    raise exception 'bad match id' using errcode = '22023';
  end if;
  if p_awards is null or jsonb_typeof(p_awards) <> 'array' then
    raise exception 'awards must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_awards) > 80 then
    raise exception 'too many awards (max 80)' using errcode = '22023';
  end if;

  -- One row per match. Someone else's match id is refused; my own can be
  -- called again (a retry only pays the players still missing).
  select teacher_id into v_owner from public.game_matches where game = p_game and match_id = p_match;
  if v_owner is null then
    if (select count(*) from public.game_matches
         where teacher_id = v_me and created_at > now() - interval '1 hour') >= 60 then
      raise exception 'too many matches in the last hour' using errcode = '54000';
    end if;
    insert into public.game_matches (game, match_id, teacher_id)
    values (p_game, p_match, v_me)
    on conflict (game, match_id) do nothing;
    select teacher_id into v_owner from public.game_matches where game = p_game and match_id = p_match;
  end if;
  if v_owner is distinct from v_me then
    raise exception 'this match belongs to another teacher' using errcode = '42501';
  end if;

  for v_item in select value from jsonb_array_elements(p_awards) loop
    v_uid := null; v_card := null; v_pts := null;
    begin
      v_uid  := (v_item->>'user_id')::uuid;
      v_card := v_item->>'card_id';
      v_pts  := round((v_item->>'points')::numeric)::integer;
    exception when others then
      v_uid := null;
    end;
    if v_uid is null or v_card is null or v_pts is null or not (v_card = any(public.game_card_ids())) then
      v_skipped := v_skipped || jsonb_build_object('user_id', v_item->>'user_id', 'reason', 'invalid');
      continue;
    end if;
    if v_uid = any(v_seen) then
      v_skipped := v_skipped || jsonb_build_object('user_id', v_uid, 'reason', 'repeated');
      continue;
    end if;
    v_seen := v_seen || v_uid;
    if v_uid <> v_me and not public.is_my_student(v_uid) then
      v_skipped := v_skipped || jsonb_build_object('user_id', v_uid, 'reason', 'not_in_class');
      continue;
    end if;
    v_pts := greatest(0, least(v_cap, v_pts));

    insert into public.game_awards (game, match_id, user_id, card_id, points)
    values (p_game, p_match, v_uid, v_card, v_pts)
    on conflict (game, match_id, user_id) do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      v_skipped := v_skipped || jsonb_build_object('user_id', v_uid, 'reason', 'already_paid');
      continue;
    end if;

    insert into public.game_card_points as g (user_id, card_id, points, games, updated_at)
    values (v_uid, v_card, v_pts, 1, now())
    on conflict (user_id, card_id) do update
      set points = least(10000000, g.points + excluded.points),
          games = g.games + 1,
          updated_at = now()
    returning g.points into v_total;

    v_saved := v_saved || jsonb_build_object('user_id', v_uid, 'card_id', v_card, 'points', v_pts, 'total', v_total);
  end loop;

  return jsonb_build_object('match', p_match, 'saved', v_saved, 'skipped', v_skipped);
end;
$$;

-- ============================================================== 4. GRANTS ===
revoke all on function public.game_card_ids()                         from public, anon;
revoke all on function public.award_game_points(text, text, jsonb)    from public, anon;
grant execute on function public.game_card_ids()                      to authenticated;
grant execute on function public.award_game_points(text, text, jsonb) to authenticated;

commit;

-- Tell the API about the new tables and function right away.
notify pgrst, 'reload schema';
