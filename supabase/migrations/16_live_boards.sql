-- =============================================================================
-- ECYR English platform — "Muro en vivo" (live collaborative boards)
-- -----------------------------------------------------------------------------
-- Runs after 01–15. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout.
--
-- WHY THIS FILE EXISTS
-- A teacher opens a live wall for the class (a Jamboard-style brainstorm, a
-- Padlet-style shelf of columns, or a story the class writes part by part)
-- and the students of THAT teacher post short cards on it from their phones:
--
--   live_boards        one wall: title, layout ('jam' | 'columns' | 'story'),
--                      optional prompt / opening line, column names, and the
--                      teacher's switches (show names, locked, spotlight).
--   live_board_cards   one card: text (≤ 280), a pastel colour, an optional
--                      drawing (image data URL ≤ ~400 KB), where it sits
--                      (column, x/y on the canvas, order in the story) and
--                      who liked it.
--
-- ANONYMITY IS ENFORCED HERE, NOT IN THE APP. Nobody can read the tables
-- directly; the wall is read only through get_live_board(), which leaves out
-- the author's name unless the names are shown, the caller wrote the card or
-- the caller is the teacher. A student's browser therefore never receives
-- classmates' names or ids while the teacher keeps them hidden. Likes come
-- back as a count plus "did I like it", never as a list of people.
--
-- Live updates use a Realtime *broadcast* channel per wall ("board:<id>") that
-- only carries "something changed" (no data), so the channel cannot leak
-- anything; every client then calls get_live_board() again. Clients also
-- poll every few seconds as a fallback.
--
-- WHO CAN DO WHAT
--   teacher    creates walls; edits, locks, closes, reopens and deletes their
--              own walls; shows/hides names; spotlights a card; adds, edits,
--              moves, reorders and deletes ANY card on their walls; always
--              sees who wrote each card
--   student    (profiles.teacher_id = the wall's teacher) sees that teacher's
--              open walls; adds cards; edits, moves and deletes their OWN
--              cards while the wall is not locked; likes cards (also while
--              locked — "now vote!"); sees names only when the teacher
--              shows them
--   anyone else nothing (same "not found" error as a wall that does not exist)
-- =============================================================================

do $$
begin
  if to_regclass('public.profiles') is null or to_regprocedure('public.is_my_student(uuid)') is null then
    raise exception 'Run 01_schema.sql … 15_teacher_invites.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- ============================================================= 1. TABLES ====
create table if not exists public.live_boards (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  layout      text not null default 'jam',
  -- The question, or the story's opening line.
  prompt      text,
  -- Column names for the 'columns' layout: ["Ideas", "Preguntas", "Vocabulario"].
  columns     jsonb not null default '[]'::jsonb,
  show_names  boolean not null default true,
  locked      boolean not null default false,
  -- A card shown full screen to everyone (the projector moment).
  spotlight   uuid,
  closed_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.live_board_cards (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.live_boards(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  -- The author's name when the card was written (so a renamed or deleted
  -- account does not change the wall).
  author_name text,
  text        text not null default '',
  color       text not null default 'yellow',
  image       text,
  col         int not null default 0,
  x           real not null default 0,
  y           real not null default 0,
  position    double precision not null default 0,
  likers      uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.live_boards drop constraint if exists live_boards_title_len;
alter table public.live_boards drop constraint if exists live_boards_layout;
alter table public.live_boards drop constraint if exists live_boards_prompt_len;
alter table public.live_boards drop constraint if exists live_boards_columns_shape;
alter table public.live_boards
  add constraint live_boards_title_len check (char_length(btrim(title)) between 1 and 120);
alter table public.live_boards
  add constraint live_boards_layout check (layout in ('jam', 'columns', 'story'));
alter table public.live_boards
  add constraint live_boards_prompt_len check (prompt is null or char_length(prompt) <= 500);
alter table public.live_boards
  add constraint live_boards_columns_shape check (jsonb_typeof(columns) = 'array' and jsonb_array_length(columns) <= 8 and pg_column_size(columns) <= 2000);

alter table public.live_board_cards drop constraint if exists live_board_cards_text_len;
alter table public.live_board_cards drop constraint if exists live_board_cards_color;
alter table public.live_board_cards drop constraint if exists live_board_cards_image;
alter table public.live_board_cards drop constraint if exists live_board_cards_has_content;
alter table public.live_board_cards drop constraint if exists live_board_cards_place;
alter table public.live_board_cards drop constraint if exists live_board_cards_author_len;
alter table public.live_board_cards
  add constraint live_board_cards_text_len check (char_length(text) <= 280);
alter table public.live_board_cards
  add constraint live_board_cards_color check (color in ('yellow', 'orange', 'pink', 'purple', 'blue', 'teal', 'green', 'gray'));
alter table public.live_board_cards
  add constraint live_board_cards_image check (
    image is null or (char_length(image) <= 400000 and image ~ '^data:image/(png|jpeg|webp);base64,')
  );
alter table public.live_board_cards
  add constraint live_board_cards_has_content check (char_length(btrim(text)) > 0 or image is not null);
alter table public.live_board_cards
  add constraint live_board_cards_place check (col between 0 and 7 and x between 0 and 1600 and y between 0 and 1000);
alter table public.live_board_cards
  add constraint live_board_cards_author_len check (author_name is null or char_length(author_name) <= 120);

create index if not exists live_boards_teacher_idx on public.live_boards(teacher_id, created_at desc);
create index if not exists live_board_cards_board_idx on public.live_board_cards(board_id, position);

-- No direct API access at all: everything goes through the functions below
-- (that is what keeps hidden names hidden).
alter table public.live_boards enable row level security;
alter table public.live_board_cards enable row level security;
revoke all on public.live_boards from anon, authenticated;
revoke all on public.live_board_cards from anon, authenticated;

-- ============================================================ 2. HELPERS ====
-- 'teacher' (the wall is mine), 'student' (I am in that teacher's class and
-- the wall is open) or null. Internal: only the functions below call it.
create or replace function public.live_board_role(p_board uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when b.teacher_id = auth.uid() then 'teacher'
    when b.closed_at is null
         and exists (select 1 from public.profiles p where p.id = auth.uid() and p.teacher_id = b.teacher_id)
      then 'student'
    else null
  end
  from public.live_boards b
  where b.id = p_board;
$$;

revoke all on function public.live_board_role(uuid) from public, anon, authenticated;

-- Same error for "does not exist", "not your class" and "closed" (except that
-- a student of the class is told the wall was closed, which they knew exists).
create or replace function public.live_board_check(p_board uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  v_role := public.live_board_role(p_board);
  if v_role is null then
    if exists (
      select 1 from public.live_boards b join public.profiles p on p.teacher_id = b.teacher_id
       where b.id = p_board and p.id = auth.uid() and b.closed_at is not null
    ) then
      raise exception 'BOARD_CLOSED: this board was closed by the teacher.' using errcode = '42501';
    end if;
    raise exception 'BOARD_NOT_FOUND: this board does not exist or is not for your class.' using errcode = '42501';
  end if;
  return v_role;
end;
$$;

revoke all on function public.live_board_check(uuid) from public, anon, authenticated;

-- Valid column names: 0–8 non-empty strings of ≤ 40 characters.
create or replace function public.live_board_columns(p_columns jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_out jsonb := '[]'::jsonb;
  v_item jsonb;
  v_name text;
begin
  if p_columns is null or jsonb_typeof(p_columns) <> 'array' then
    return '[]'::jsonb;
  end if;
  for v_item in select * from jsonb_array_elements(p_columns) loop
    v_name := left(btrim(case when jsonb_typeof(v_item) = 'string' then v_item #>> '{}' else '' end), 40);
    if v_name <> '' then
      v_out := v_out || to_jsonb(v_name);
    end if;
    exit when jsonb_array_length(v_out) >= 8;
  end loop;
  return v_out;
end;
$$;

revoke all on function public.live_board_columns(jsonb) from public, anon, authenticated;

-- ======================================================= 3. TEACHER: WALLS ===
drop function if exists public.create_live_board(text, text, text, jsonb, boolean);
create or replace function public.create_live_board(
  p_title      text,
  p_layout     text,
  p_prompt     text default null,
  p_columns    jsonb default null,
  p_show_names boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_columns jsonb := public.live_board_columns(p_columns);
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') then
    raise exception 'Only teachers can create boards.' using errcode = '42501';
  end if;
  if p_layout not in ('jam', 'columns', 'story') then
    raise exception 'Layout must be jam, columns or story.';
  end if;
  if (select count(*) from public.live_boards where teacher_id = auth.uid() and closed_at is null) >= 50 then
    raise exception 'BOARD_LIMIT: close some open boards first (50 open at most).';
  end if;
  if p_layout = 'columns' and jsonb_array_length(v_columns) = 0 then
    v_columns := '["Ideas"]'::jsonb;
  end if;

  insert into public.live_boards (teacher_id, title, layout, prompt, columns, show_names)
  values (
    auth.uid(),
    left(btrim(coalesce(p_title, '')), 120),
    p_layout,
    left(nullif(btrim(coalesce(p_prompt, '')), ''), 500),
    case when p_layout = 'columns' then v_columns else '[]'::jsonb end,
    coalesce(p_show_names, true)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Changes any of: title, prompt, columns, show_names, locked, spotlight
-- (keys present in p_patch; spotlight null = none).
create or replace function public.update_live_board(p_board uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.live_boards;
  v_columns jsonb;
  v_spot uuid;
begin
  if public.live_board_check(p_board) <> 'teacher' then
    raise exception 'Only the teacher can change the board.' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Changes must be an object.';
  end if;
  select * into v_b from public.live_boards where id = p_board;

  if p_patch ? 'columns' then
    v_columns := public.live_board_columns(p_patch->'columns');
    if v_b.layout = 'columns' and jsonb_array_length(v_columns) = 0 then
      raise exception 'A columns board needs at least one column.';
    end if;
    -- Cards in a column that no longer exists go to the last one.
    update public.live_board_cards
       set col = greatest(jsonb_array_length(v_columns) - 1, 0)
     where board_id = p_board and col > greatest(jsonb_array_length(v_columns) - 1, 0);
  end if;

  if p_patch ? 'spotlight' then
    v_spot := nullif(p_patch->>'spotlight', '')::uuid;
    if v_spot is not null and not exists (select 1 from public.live_board_cards where id = v_spot and board_id = p_board) then
      raise exception 'That card is not on this board.';
    end if;
  end if;

  update public.live_boards
     set title      = case when p_patch ? 'title' then left(btrim(coalesce(p_patch->>'title', '')), 120) else title end,
         prompt     = case when p_patch ? 'prompt' then left(nullif(btrim(coalesce(p_patch->>'prompt', '')), ''), 500) else prompt end,
         columns    = case when p_patch ? 'columns' and layout = 'columns' then v_columns else columns end,
         show_names = case when p_patch ? 'show_names' then coalesce((p_patch->>'show_names')::boolean, show_names) else show_names end,
         locked     = case when p_patch ? 'locked' then coalesce((p_patch->>'locked')::boolean, locked) else locked end,
         spotlight  = case when p_patch ? 'spotlight' then v_spot else spotlight end,
         updated_at = now()
   where id = p_board;
end;
$$;

-- Closes (students can no longer open it) or reopens a wall.
create or replace function public.close_live_board(p_board uuid, p_closed boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.live_board_check(p_board) <> 'teacher' then
    raise exception 'Only the teacher can close the board.' using errcode = '42501';
  end if;
  update public.live_boards
     set closed_at  = case when coalesce(p_closed, true) then coalesce(closed_at, now()) else null end,
         spotlight  = null,
         updated_at = now()
   where id = p_board;
end;
$$;

create or replace function public.delete_live_board(p_board uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.live_board_check(p_board) <> 'teacher' then
    raise exception 'Only the teacher can delete the board.' using errcode = '42501';
  end if;
  delete from public.live_boards where id = p_board;
end;
$$;

-- ============================================================ 4. READING ====
-- Teacher: their own walls (open first). Student: their teacher's open walls.
drop function if exists public.list_live_boards();
create or replace function public.list_live_boards()
returns table (
  id           uuid,
  title        text,
  layout       text,
  prompt       text,
  show_names   boolean,
  locked       boolean,
  closed_at    timestamptz,
  created_at   timestamptz,
  cards        bigint,
  teacher_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select * into v_me from public.profiles where profiles.id = auth.uid();
  return query
    select b.id, b.title, b.layout, b.prompt, b.show_names, b.locked, b.closed_at, b.created_at,
           (select count(*) from public.live_board_cards c where c.board_id = b.id),
           t.full_name
      from public.live_boards b
      join public.profiles t on t.id = b.teacher_id
     where b.teacher_id = v_me.id
        or (v_me.teacher_id is not null and b.teacher_id = v_me.teacher_id and b.closed_at is null)
     order by (b.closed_at is not null), b.created_at desc
     limit 200;
end;
$$;

-- One wall with its cards, anonymity applied. Images are NOT included (they
-- can be big): has_image + rev tell the client which ones to fetch with
-- get_live_card_images().
create or replace function public.get_live_board(p_board uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_role  text := public.live_board_check(p_board);
  v_b     public.live_boards;
  v_names boolean;
begin
  select * into v_b from public.live_boards where id = p_board;
  v_names := v_role = 'teacher' or v_b.show_names;

  return jsonb_build_object(
    'role', v_role,
    'board', jsonb_build_object(
      'id', v_b.id,
      'title', v_b.title,
      'layout', v_b.layout,
      'prompt', v_b.prompt,
      'columns', v_b.columns,
      'show_names', v_b.show_names,
      'locked', v_b.locked,
      'spotlight', v_b.spotlight,
      'closed_at', v_b.closed_at,
      'created_at', v_b.created_at,
      'teacher_name', (select full_name from public.profiles where id = v_b.teacher_id)
    ),
    'authors', (select count(distinct author_id) from public.live_board_cards where board_id = p_board and author_id is distinct from v_b.teacher_id),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'text', c.text,
               'color', c.color,
               'has_image', c.image is not null,
               'col', c.col,
               'x', c.x,
               'y', c.y,
               'position', c.position,
               'likes', coalesce(array_length(c.likers, 1), 0),
               'liked', v_uid = any(c.likers),
               'mine', c.author_id = v_uid,
               'by_teacher', c.author_id = v_b.teacher_id,
               'author_id', case when v_role = 'teacher' then c.author_id end,
               'author_name', case when v_names or c.author_id = v_uid or c.author_id = v_b.teacher_id then c.author_name end,
               'created_at', c.created_at,
               'rev', c.updated_at
             ) order by c.position, c.created_at)
        from public.live_board_cards c
       where c.board_id = p_board
    ), '[]'::jsonb)
  );
end;
$$;

-- The drawings of some cards of one wall (no author data at all).
create or replace function public.get_live_card_images(p_board uuid, p_cards uuid[])
returns table (id uuid, image text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.live_board_check(p_board);
  return query
    select c.id, c.image
      from public.live_board_cards c
     where c.board_id = p_board and c.id = any(p_cards[1:60]) and c.image is not null;
end;
$$;

-- ============================================================== 5. CARDS ====
drop function if exists public.add_live_card(uuid, text, text, text, int, real, real);
create or replace function public.add_live_card(
  p_board uuid,
  p_text  text,
  p_color text default 'yellow',
  p_image text default null,
  p_col   int default 0,
  p_x     real default 0,
  p_y     real default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := public.live_board_check(p_board);
  v_b    public.live_boards;
  v_me   public.profiles;
  v_id   uuid;
begin
  select * into v_b from public.live_boards where id = p_board;
  if v_role <> 'teacher' and v_b.locked then
    raise exception 'BOARD_LOCKED: the teacher locked this board.' using errcode = '42501';
  end if;
  if v_role <> 'teacher'
     and (select count(*) from public.live_board_cards where board_id = p_board and author_id = v_uid) >= 40 then
    raise exception 'CARD_LIMIT: 40 cards per person on one board.';
  end if;
  if (select count(*) from public.live_board_cards where board_id = p_board) >= 400 then
    raise exception 'CARD_LIMIT: this board is full (400 cards).';
  end if;

  select * into v_me from public.profiles where id = v_uid;

  insert into public.live_board_cards (board_id, author_id, author_name, text, color, image, col, x, y, position)
  values (
    p_board,
    v_uid,
    left(coalesce(nullif(btrim(v_me.full_name), ''), split_part(coalesce(v_me.email, ''), '@', 1), 'Estudiante'), 120),
    btrim(coalesce(p_text, '')),
    coalesce(p_color, 'yellow'),
    nullif(p_image, ''),
    least(greatest(coalesce(p_col, 0), 0), greatest(jsonb_array_length(v_b.columns) - 1, 0)),
    least(greatest(coalesce(p_x, 0), 0), 1600),
    least(greatest(coalesce(p_y, 0), 0), 1000),
    coalesce((select max(position) from public.live_board_cards where board_id = p_board), 0) + 1
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Changes any of: text, color, image (null/'' removes it), col, x, y,
-- position. Students: only their own cards, not while locked, and only the
-- teacher reorders a story.
create or replace function public.update_live_card(p_card uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_c    public.live_board_cards;
  v_b    public.live_boards;
  v_role text;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Changes must be an object.';
  end if;
  select * into v_c from public.live_board_cards where id = p_card;
  if v_c.id is null then
    raise exception 'CARD_NOT_FOUND: that card does not exist any more.' using errcode = '42501';
  end if;
  v_role := public.live_board_check(v_c.board_id);
  select * into v_b from public.live_boards where id = v_c.board_id;

  if v_role <> 'teacher' then
    if v_c.author_id is distinct from v_uid then
      raise exception 'You can only change your own cards.' using errcode = '42501';
    end if;
    if v_b.locked then
      raise exception 'BOARD_LOCKED: the teacher locked this board.' using errcode = '42501';
    end if;
    if p_patch ? 'position' and v_b.layout = 'story' then
      raise exception 'Only the teacher can reorder the story.' using errcode = '42501';
    end if;
  end if;

  update public.live_board_cards
     set text       = case when p_patch ? 'text' then btrim(coalesce(p_patch->>'text', '')) else text end,
         color      = case when p_patch ? 'color' then coalesce(p_patch->>'color', color) else color end,
         image      = case when p_patch ? 'image' then nullif(p_patch->>'image', '') else image end,
         col        = case when p_patch ? 'col'
                           then least(greatest(coalesce((p_patch->>'col')::int, col), 0), greatest(jsonb_array_length(v_b.columns) - 1, 0))
                           else col end,
         x          = case when p_patch ? 'x' then least(greatest(coalesce((p_patch->>'x')::real, x), 0), 1600) else x end,
         y          = case when p_patch ? 'y' then least(greatest(coalesce((p_patch->>'y')::real, y), 0), 1000) else y end,
         position   = case when p_patch ? 'position' then coalesce((p_patch->>'position')::double precision, position) else position end,
         updated_at = now()
   where id = p_card;
end;
$$;

create or replace function public.delete_live_card(p_card uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c    public.live_board_cards;
  v_role text;
begin
  select * into v_c from public.live_board_cards where id = p_card;
  if v_c.id is null then
    return;
  end if;
  v_role := public.live_board_check(v_c.board_id);
  if v_role <> 'teacher' then
    if v_c.author_id is distinct from auth.uid() then
      raise exception 'You can only delete your own cards.' using errcode = '42501';
    end if;
    if (select locked from public.live_boards where id = v_c.board_id) then
      raise exception 'BOARD_LOCKED: the teacher locked this board.' using errcode = '42501';
    end if;
  end if;
  update public.live_boards set spotlight = null where id = v_c.board_id and spotlight = p_card;
  delete from public.live_board_cards where id = p_card;
end;
$$;

-- Toggles the caller's like. Returns { likes, liked }.
create or replace function public.like_live_card(p_card uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c   public.live_board_cards;
begin
  select * into v_c from public.live_board_cards where id = p_card;
  if v_c.id is null then
    raise exception 'CARD_NOT_FOUND: that card does not exist any more.' using errcode = '42501';
  end if;
  perform public.live_board_check(v_c.board_id);

  update public.live_board_cards
     set likers = case when v_uid = any(likers) then array_remove(likers, v_uid) else array_append(likers, v_uid) end
   where id = p_card
  returning * into v_c;

  return jsonb_build_object('likes', coalesce(array_length(v_c.likers, 1), 0), 'liked', v_uid = any(v_c.likers));
end;
$$;

-- ============================================================== 6. GRANTS ===
revoke all on function public.create_live_board(text, text, text, jsonb, boolean)   from public, anon;
revoke all on function public.update_live_board(uuid, jsonb)                         from public, anon;
revoke all on function public.close_live_board(uuid, boolean)                        from public, anon;
revoke all on function public.delete_live_board(uuid)                                from public, anon;
revoke all on function public.list_live_boards()                                     from public, anon;
revoke all on function public.get_live_board(uuid)                                   from public, anon;
revoke all on function public.get_live_card_images(uuid, uuid[])                     from public, anon;
revoke all on function public.add_live_card(uuid, text, text, text, int, real, real) from public, anon;
revoke all on function public.update_live_card(uuid, jsonb)                          from public, anon;
revoke all on function public.delete_live_card(uuid)                                 from public, anon;
revoke all on function public.like_live_card(uuid)                                   from public, anon;
grant execute on function public.create_live_board(text, text, text, jsonb, boolean)   to authenticated;
grant execute on function public.update_live_board(uuid, jsonb)                         to authenticated;
grant execute on function public.close_live_board(uuid, boolean)                        to authenticated;
grant execute on function public.delete_live_board(uuid)                                to authenticated;
grant execute on function public.list_live_boards()                                     to authenticated;
grant execute on function public.get_live_board(uuid)                                   to authenticated;
grant execute on function public.get_live_card_images(uuid, uuid[])                     to authenticated;
grant execute on function public.add_live_card(uuid, text, text, text, int, real, real) to authenticated;
grant execute on function public.update_live_card(uuid, jsonb)                          to authenticated;
grant execute on function public.delete_live_card(uuid)                                 to authenticated;
grant execute on function public.like_live_card(uuid)                                   to authenticated;
