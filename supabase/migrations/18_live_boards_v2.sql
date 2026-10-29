-- =============================================================================
-- ECYR English platform — "Muro en vivo" v2: shapes & sizes, arrows, private walls
-- -----------------------------------------------------------------------------
-- Runs after 16_live_boards.sql (and 17). Safe to re-run: add-column-if-not-
-- exists / drop-then-create / create-or-replace throughout, inside one
-- transaction (if anything fails, nothing changes).
--
-- WHY THIS FILE EXISTS
-- The teacher asked for three things on the live walls:
--
--   1. Cards of any size and shape. live_board_cards gets
--        shape   'note' (the post-it, default) | 'round' (pill) | 'circle'
--                (ellipse) | 'bubble' (speech bubble) | 'cloud' | 'hexagon'
--                | 'diamond'
--        w, h    size on the Jam canvas in board units (null = automatic)
--
--   2. Arrows between cards, to build mind maps on the Jam canvas:
--        live_board_links   from_card → to_card, kind 'arrow' | 'line' |
--                           'double', a colour and an optional short label.
--      Links go away with either card (foreign keys). One link per pair of
--      cards. They come back inside get_live_board() WITHOUT any author data
--      (only "mine": true/false), so they cannot reveal who drew them.
--
--   3. Private walls (e.g. a one-to-one session): live_boards.members is the
--      list of students who may enter; null = the whole class (as before).
--      The rule lives in live_board_role(), which EVERY board function goes
--      through (read, cards, drawings, likes, links), plus the student branch
--      of list_live_boards(). A student who is not a member gets the same
--      "not found" as for a wall of another class.
--
-- The functions the deployed app already calls keep working with the same
-- named arguments: new parameters are added at the end with defaults (the old
-- overload is dropped first so calls are never ambiguous), and new result
-- fields are only additions.
--
-- WHO CAN DO WHAT (on top of 16)
--   teacher    chooses who can enter (whole class or some students) when
--              creating a wall and later; resizes and reshapes ANY card;
--              draws, edits, flips and deletes ANY arrow — also while locked
--   student    (member of the wall, or any student of the class when it is
--              for the whole class) resizes and reshapes their OWN cards;
--              draws arrows between ANY cards; edits, flips and deletes only
--              their OWN arrows; none of this while the wall is locked
--   anyone else nothing
-- =============================================================================

begin;

do $$
begin
  if to_regclass('public.live_board_cards') is null or to_regprocedure('public.live_board_check(uuid)') is null then
    raise exception 'Run 16_live_boards.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- ============================================================= 1. TABLES ====
alter table public.live_boards add column if not exists members uuid[];

alter table public.live_board_cards add column if not exists shape text not null default 'note';
alter table public.live_board_cards add column if not exists w real;
alter table public.live_board_cards add column if not exists h real;

alter table public.live_boards drop constraint if exists live_boards_members;
alter table public.live_boards
  add constraint live_boards_members check (members is null or cardinality(members) <= 200);

alter table public.live_board_cards drop constraint if exists live_board_cards_shape;
alter table public.live_board_cards drop constraint if exists live_board_cards_size;
alter table public.live_board_cards
  add constraint live_board_cards_shape check (shape in ('note', 'round', 'circle', 'bubble', 'cloud', 'hexagon', 'diamond'));
alter table public.live_board_cards
  add constraint live_board_cards_size check ((w is null or w between 100 and 640) and (h is null or h between 60 and 640));

create table if not exists public.live_board_links (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.live_boards(id) on delete cascade,
  from_card   uuid not null references public.live_board_cards(id) on delete cascade,
  to_card     uuid not null references public.live_board_cards(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  kind        text not null default 'arrow',
  color       text not null default 'ink',
  label       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.live_board_links drop constraint if exists live_board_links_kind;
alter table public.live_board_links drop constraint if exists live_board_links_color;
alter table public.live_board_links drop constraint if exists live_board_links_label_len;
alter table public.live_board_links drop constraint if exists live_board_links_not_self;
alter table public.live_board_links
  add constraint live_board_links_kind check (kind in ('arrow', 'line', 'double'));
alter table public.live_board_links
  add constraint live_board_links_color check (color in ('ink', 'blue', 'red', 'green', 'orange', 'purple', 'pink', 'teal'));
alter table public.live_board_links
  add constraint live_board_links_label_len check (label is null or char_length(label) <= 40);
alter table public.live_board_links
  add constraint live_board_links_not_self check (from_card <> to_card);

create index if not exists live_board_links_board_idx on public.live_board_links(board_id, created_at);
-- One link per pair of cards, whichever way it points.
create unique index if not exists live_board_links_pair_idx
  on public.live_board_links(board_id, least(from_card, to_card), greatest(from_card, to_card));

alter table public.live_board_links enable row level security;
revoke all on public.live_board_links from anon, authenticated;

-- ============================================================ 2. HELPERS ====
-- 'teacher' (the wall is mine), 'student' (I am in that teacher's class, the
-- wall is open and it is for the whole class or I am one of its members) or
-- null. Same signature as in 16: every board function picks the rule up.
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
         and (b.members is null or auth.uid() = any(b.members))
         and exists (select 1 from public.profiles p where p.id = auth.uid() and p.teacher_id = b.teacher_id)
      then 'student'
    else null
  end
  from public.live_boards b
  where b.id = p_board;
$$;

revoke all on function public.live_board_role(uuid) from public, anon, authenticated;

-- Same error for "does not exist", "not your class", "not for you" and
-- "closed" (except that a student who could enter is told it was closed).
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
         and (b.members is null or auth.uid() = any(b.members))
    ) then
      raise exception 'BOARD_CLOSED: this board was closed by the teacher.' using errcode = '42501';
    end if;
    raise exception 'BOARD_NOT_FOUND: this board does not exist or is not for your class.' using errcode = '42501';
  end if;
  return v_role;
end;
$$;

revoke all on function public.live_board_check(uuid) from public, anon, authenticated;

-- Members as stored: null stays null (whole class); otherwise only students
-- of that teacher, without repeats, at most 200.
create or replace function public.live_board_members(p_teacher uuid, p_members uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_members is null then null
    else coalesce((
      select array_agg(distinct p.id)
        from public.profiles p
       where p.id = any(p_members[1:200]) and p.teacher_id = p_teacher
    ), '{}'::uuid[])
  end;
$$;

revoke all on function public.live_board_members(uuid, uuid[]) from public, anon, authenticated;

-- ======================================================= 3. TEACHER: WALLS ===
drop function if exists public.create_live_board(text, text, text, jsonb, boolean);
create or replace function public.create_live_board(
  p_title      text,
  p_layout     text,
  p_prompt     text default null,
  p_columns    jsonb default null,
  p_show_names boolean default true,
  p_members    uuid[] default null
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

  insert into public.live_boards (teacher_id, title, layout, prompt, columns, show_names, members)
  values (
    auth.uid(),
    left(btrim(coalesce(p_title, '')), 120),
    p_layout,
    left(nullif(btrim(coalesce(p_prompt, '')), ''), 500),
    case when p_layout = 'columns' then v_columns else '[]'::jsonb end,
    coalesce(p_show_names, true),
    public.live_board_members(auth.uid(), p_members)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Changes any of: title, prompt, columns, show_names, locked, spotlight,
-- members (keys present in p_patch; spotlight null = none; members null =
-- the whole class).
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
  v_members uuid[];
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

  if p_patch ? 'members' then
    if jsonb_typeof(p_patch->'members') = 'array' then
      v_members := public.live_board_members(
        v_b.teacher_id,
        array(select e::uuid from jsonb_array_elements_text(p_patch->'members') e
               where e ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' limit 200)
      );
    elsif jsonb_typeof(p_patch->'members') = 'null' then
      v_members := null;
    else
      raise exception 'Members must be a list of students or null.';
    end if;
  end if;

  update public.live_boards
     set title      = case when p_patch ? 'title' then left(btrim(coalesce(p_patch->>'title', '')), 120) else title end,
         prompt     = case when p_patch ? 'prompt' then left(nullif(btrim(coalesce(p_patch->>'prompt', '')), ''), 500) else prompt end,
         columns    = case when p_patch ? 'columns' and layout = 'columns' then v_columns else columns end,
         show_names = case when p_patch ? 'show_names' then coalesce((p_patch->>'show_names')::boolean, show_names) else show_names end,
         locked     = case when p_patch ? 'locked' then coalesce((p_patch->>'locked')::boolean, locked) else locked end,
         spotlight  = case when p_patch ? 'spotlight' then v_spot else spotlight end,
         members    = case when p_patch ? 'members' then v_members else members end,
         updated_at = now()
   where id = p_board;
end;
$$;

-- ============================================================ 4. READING ====
-- Teacher: their own walls (open first), with the member list. Student: their
-- teacher's open walls that are for the whole class or for them; they get
-- how many members a private wall has, never who.
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
  teacher_name text,
  members      uuid[],
  member_count int
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
           t.full_name,
           case when b.teacher_id = v_me.id then b.members end,
           cardinality(b.members)
      from public.live_boards b
      join public.profiles t on t.id = b.teacher_id
     where b.teacher_id = v_me.id
        or (v_me.teacher_id is not null and b.teacher_id = v_me.teacher_id and b.closed_at is null
            and (b.members is null or v_me.id = any(b.members)))
     order by (b.closed_at is not null), b.created_at desc
     limit 200;
end;
$$;

-- One wall with its cards and links, anonymity applied. Images are NOT
-- included (they can be big): has_image + rev tell the client which ones to
-- fetch with get_live_card_images().
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
      'teacher_name', (select full_name from public.profiles where id = v_b.teacher_id),
      'members', case when v_role = 'teacher' then to_jsonb(v_b.members) end,
      'member_count', cardinality(v_b.members)
    ),
    'authors', (select count(distinct author_id) from public.live_board_cards where board_id = p_board and author_id is distinct from v_b.teacher_id),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'text', c.text,
               'color', c.color,
               'shape', c.shape,
               'w', c.w,
               'h', c.h,
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
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id,
               'from', l.from_card,
               'to', l.to_card,
               'kind', l.kind,
               'color', l.color,
               'label', l.label,
               'mine', l.author_id = v_uid
             ) order by l.created_at)
        from public.live_board_links l
       where l.board_id = p_board
    ), '[]'::jsonb)
  );
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
  p_y     real default 0,
  p_shape text default 'note',
  p_w     real default null,
  p_h     real default null
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

  insert into public.live_board_cards (board_id, author_id, author_name, text, color, image, col, x, y, position, shape, w, h)
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
    coalesce((select max(position) from public.live_board_cards where board_id = p_board), 0) + 1,
    coalesce(nullif(p_shape, ''), 'note'),
    case when p_w is null then null else least(greatest(p_w, 100), 640) end,
    case when p_h is null then null else least(greatest(p_h, 60), 640) end
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Changes any of: text, color, image (null/'' removes it), col, x, y,
-- position, shape, w, h (null = automatic size). Students: only their own
-- cards, not while locked, and only the teacher reorders a story.
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
         shape      = case when p_patch ? 'shape' then coalesce(nullif(p_patch->>'shape', ''), shape) else shape end,
         w          = case when p_patch ? 'w'
                           then case when jsonb_typeof(p_patch->'w') = 'number' then least(greatest((p_patch->>'w')::real, 100), 640) end
                           else w end,
         h          = case when p_patch ? 'h'
                           then case when jsonb_typeof(p_patch->'h') = 'number' then least(greatest((p_patch->>'h')::real, 60), 640) end
                           else h end,
         updated_at = now()
   where id = p_card;
end;
$$;

-- ============================================================== 6. LINKS ====
-- Draws an arrow (or line) between two cards of one wall. Returns its id.
create or replace function public.add_live_link(
  p_board uuid,
  p_from  uuid,
  p_to    uuid,
  p_kind  text default 'arrow',
  p_color text default 'ink',
  p_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text := public.live_board_check(p_board);
  v_id   uuid;
begin
  if v_role <> 'teacher' and (select locked from public.live_boards where id = p_board) then
    raise exception 'BOARD_LOCKED: the teacher locked this board.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from = p_to then
    raise exception 'LINK_CARDS: pick two different cards.';
  end if;
  if (select count(*) from public.live_board_cards where board_id = p_board and id in (p_from, p_to)) <> 2 then
    raise exception 'LINK_CARDS: both cards must be on this board.';
  end if;
  if exists (
    select 1 from public.live_board_links
     where board_id = p_board and least(from_card, to_card) = least(p_from, p_to) and greatest(from_card, to_card) = greatest(p_from, p_to)
  ) then
    raise exception 'LINK_EXISTS: these cards are already connected.';
  end if;
  if (select count(*) from public.live_board_links where board_id = p_board) >= 300 then
    raise exception 'LINK_LIMIT: this board is full (300 arrows).';
  end if;
  if v_role <> 'teacher'
     and (select count(*) from public.live_board_links where board_id = p_board and author_id = v_uid) >= 60 then
    raise exception 'LINK_LIMIT: 60 arrows per person on one board.';
  end if;

  insert into public.live_board_links (board_id, from_card, to_card, author_id, kind, color, label)
  values (
    p_board, p_from, p_to, v_uid,
    coalesce(nullif(p_kind, ''), 'arrow'),
    coalesce(nullif(p_color, ''), 'ink'),
    left(nullif(btrim(coalesce(p_label, '')), ''), 40)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Changes any of: kind, color, label ('' / null removes it), flip (true swaps
-- the direction). Students: only their own arrows, not while locked.
create or replace function public.update_live_link(p_link uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_l    public.live_board_links;
  v_role text;
  v_flip boolean;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Changes must be an object.';
  end if;
  select * into v_l from public.live_board_links where id = p_link;
  if v_l.id is null then
    raise exception 'LINK_NOT_FOUND: that arrow does not exist any more.' using errcode = '42501';
  end if;
  v_role := public.live_board_check(v_l.board_id);
  if v_role <> 'teacher' then
    if v_l.author_id is distinct from auth.uid() then
      raise exception 'You can only change your own arrows.' using errcode = '42501';
    end if;
    if (select locked from public.live_boards where id = v_l.board_id) then
      raise exception 'BOARD_LOCKED: the teacher locked this board.' using errcode = '42501';
    end if;
  end if;
  v_flip := coalesce((p_patch->>'flip')::boolean, false);

  update public.live_board_links
     set from_card  = case when v_flip then to_card else from_card end,
         to_card    = case when v_flip then from_card else to_card end,
         kind       = case when p_patch ? 'kind' then coalesce(nullif(p_patch->>'kind', ''), kind) else kind end,
         color      = case when p_patch ? 'color' then coalesce(nullif(p_patch->>'color', ''), color) else color end,
         label      = case when p_patch ? 'label' then left(nullif(btrim(coalesce(p_patch->>'label', '')), ''), 40) else label end,
         updated_at = now()
   where id = p_link;
end;
$$;

create or replace function public.delete_live_link(p_link uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_l    public.live_board_links;
  v_role text;
begin
  select * into v_l from public.live_board_links where id = p_link;
  if v_l.id is null then
    return;
  end if;
  v_role := public.live_board_check(v_l.board_id);
  if v_role <> 'teacher' then
    if v_l.author_id is distinct from auth.uid() then
      raise exception 'You can only delete your own arrows.' using errcode = '42501';
    end if;
    if (select locked from public.live_boards where id = v_l.board_id) then
      raise exception 'BOARD_LOCKED: the teacher locked this board.' using errcode = '42501';
    end if;
  end if;
  delete from public.live_board_links where id = p_link;
end;
$$;

-- ============================================================== 7. GRANTS ===
revoke all on function public.create_live_board(text, text, text, jsonb, boolean, uuid[])          from public, anon;
revoke all on function public.update_live_board(uuid, jsonb)                                        from public, anon;
revoke all on function public.list_live_boards()                                                    from public, anon;
revoke all on function public.get_live_board(uuid)                                                  from public, anon;
revoke all on function public.add_live_card(uuid, text, text, text, int, real, real, text, real, real) from public, anon;
revoke all on function public.update_live_card(uuid, jsonb)                                         from public, anon;
revoke all on function public.add_live_link(uuid, uuid, uuid, text, text, text)                     from public, anon;
revoke all on function public.update_live_link(uuid, jsonb)                                         from public, anon;
revoke all on function public.delete_live_link(uuid)                                                from public, anon;
grant execute on function public.create_live_board(text, text, text, jsonb, boolean, uuid[])          to authenticated;
grant execute on function public.update_live_board(uuid, jsonb)                                        to authenticated;
grant execute on function public.list_live_boards()                                                    to authenticated;
grant execute on function public.get_live_board(uuid)                                                  to authenticated;
grant execute on function public.add_live_card(uuid, text, text, text, int, real, real, text, real, real) to authenticated;
grant execute on function public.update_live_card(uuid, jsonb)                                         to authenticated;
grant execute on function public.add_live_link(uuid, uuid, uuid, text, text, text)                     to authenticated;
grant execute on function public.update_live_link(uuid, jsonb)                                         to authenticated;
grant execute on function public.delete_live_link(uuid)                                                to authenticated;

commit;

-- Tell the API about the new and changed functions right away.
notify pgrst, 'reload schema';
