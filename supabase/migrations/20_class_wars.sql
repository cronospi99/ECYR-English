-- =============================================================================
-- ECYR English platform — Class Wars: teachers' own question sets
-- -----------------------------------------------------------------------------
-- Runs after 01–19. Safe to re-run: create-if-not-exists / drop-then-create /
-- create-or-replace throughout, inside one transaction (if anything fails,
-- nothing changes).
--
-- WHY THIS FILE EXISTS
-- Class Wars (/classwars) is a live classroom battle game. Students earn
-- diamonds by answering multiple-choice questions. The questions come from the
-- app's own curriculum bank (bundled with the app, no database) OR from a set
-- the teacher wrote in the editor (/classwars/preguntas). Those sets live here:
--
--   class_wars_sets   one set: title (≤ 80), CEFR level, and items — a JSON
--                     array of { "q": question (≤ 220), "o": 2–4 options
--                     (each ≤ 90), "a": index of the correct option },
--                     at most 200 items and ~120 KB per set, 100 sets per
--                     teacher.
--
-- Gameplay itself does NOT touch the database: it runs in the teacher's
-- projector browser and goes through the Cloudflare relay (relay/). When a
-- match starts, the teacher's browser reads the chosen set once and sends the
-- questions to the players' phones itself. So students never need (and never
-- get) read access to this table — the correct answers stay out of reach of a
-- student poking at the API.
--
-- Card points earned in a match are saved by the cards work (migration 19,
-- awardGamePoints), not here.
--
-- WHO CAN DO WHAT
--   teacher    lists, creates, edits and deletes their OWN sets (reads go
--              straight to the table under RLS; writes only through
--              save_class_wars_set() / delete_class_wars_set(), which check
--              the role and validate every item)
--   student    nothing (cannot see any set, not even their teacher's)
--   anon       nothing
-- =============================================================================

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Run 01_schema.sql … first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;

-- ========================================================== 1. VALIDATION ===
-- true when p_items is a well-formed list of questions within the limits.
create or replace function public.class_wars_items_ok(p_items jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_it jsonb;
  v_n  int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then return false; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 200 then return false; end if;
  if octet_length(p_items::text) > 120000 then return false; end if;
  for v_it in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_it) <> 'object' then return false; end if;
    if jsonb_typeof(v_it->'q') <> 'string' or char_length(btrim(v_it->>'q')) < 1 or char_length(v_it->>'q') > 220 then return false; end if;
    if jsonb_typeof(v_it->'o') <> 'array' then return false; end if;
    v_n := jsonb_array_length(v_it->'o');
    if v_n < 2 or v_n > 4 then return false; end if;
    if exists (
      select 1 from jsonb_array_elements(v_it->'o') o
       where jsonb_typeof(o) <> 'string' or char_length(btrim(o #>> '{}')) < 1 or char_length(o #>> '{}') > 90
    ) then return false; end if;
    if jsonb_typeof(v_it->'a') <> 'number' then return false; end if;
    if (v_it->>'a')::numeric <> floor((v_it->>'a')::numeric) or (v_it->>'a')::int < 0 or (v_it->>'a')::int >= v_n then return false; end if;
  end loop;
  return true;
end;
$$;

-- Am I a teacher? (security definer, so the read policy below does not depend
-- on what the caller may read in profiles)
create or replace function public.class_wars_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher');
$$;

-- ============================================================= 2. TABLE ====
create table if not exists public.class_wars_sets (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  level       text not null default 'A2',
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.class_wars_sets drop constraint if exists class_wars_sets_title_len;
alter table public.class_wars_sets drop constraint if exists class_wars_sets_level;
alter table public.class_wars_sets drop constraint if exists class_wars_sets_items_ok;
alter table public.class_wars_sets
  add constraint class_wars_sets_title_len check (char_length(btrim(title)) between 1 and 80);
alter table public.class_wars_sets
  add constraint class_wars_sets_level check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
alter table public.class_wars_sets
  add constraint class_wars_sets_items_ok check (public.class_wars_items_ok(items));

create index if not exists class_wars_sets_teacher_idx on public.class_wars_sets(teacher_id, updated_at desc);

alter table public.class_wars_sets enable row level security;
revoke all on public.class_wars_sets from anon, authenticated;
grant select on public.class_wars_sets to authenticated;

drop policy if exists class_wars_sets_own_read on public.class_wars_sets;
create policy class_wars_sets_own_read on public.class_wars_sets
  for select to authenticated
  using (teacher_id = auth.uid() and public.class_wars_is_teacher());

-- ============================================================= 3. WRITES ===
-- Create (p_id null) or replace one of my sets. Returns its id.
create or replace function public.save_class_wars_set(
  p_id    uuid,
  p_title text,
  p_level text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_title text := left(btrim(coalesce(p_title, '')), 80);
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher') then
    raise exception 'Only teachers can save Class Wars question sets.' using errcode = '42501';
  end if;
  if char_length(v_title) < 1 then
    raise exception 'SET_TITLE: the set needs a title.';
  end if;
  if coalesce(p_level, '') not in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2') then
    raise exception 'SET_LEVEL: level must be A1, A2, B1, B2, C1 or C2.';
  end if;
  if not public.class_wars_items_ok(p_items) then
    raise exception 'SET_ITEMS: 1–200 questions, each with text (≤ 220), 2–4 options (≤ 90) and the index of the correct one.';
  end if;

  if p_id is null then
    if (select count(*) from public.class_wars_sets where teacher_id = auth.uid()) >= 100 then
      raise exception 'SET_LIMIT: you already have 100 sets; delete some first.';
    end if;
    insert into public.class_wars_sets (teacher_id, title, level, items)
    values (auth.uid(), v_title, p_level, p_items)
    returning id into v_id;
  else
    update public.class_wars_sets
       set title = v_title, level = p_level, items = p_items, updated_at = now()
     where id = p_id and teacher_id = auth.uid()
    returning id into v_id;
    if v_id is null then
      raise exception 'SET_NOT_FOUND: this set does not exist or is not yours.' using errcode = '42501';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_class_wars_set(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from public.class_wars_sets where id = p_id and teacher_id = auth.uid();
  if not found then
    raise exception 'SET_NOT_FOUND: this set does not exist or is not yours.' using errcode = '42501';
  end if;
end;
$$;

-- ============================================================= 4. GRANTS ===
revoke all on function public.class_wars_items_ok(jsonb)                    from public, anon, authenticated;
revoke all on function public.class_wars_is_teacher()                      from public, anon;
revoke all on function public.save_class_wars_set(uuid, text, text, jsonb)  from public, anon;
revoke all on function public.delete_class_wars_set(uuid)                   from public, anon;
grant execute on function public.class_wars_is_teacher()                      to authenticated;
grant execute on function public.save_class_wars_set(uuid, text, text, jsonb) to authenticated;
grant execute on function public.delete_class_wars_set(uuid)                  to authenticated;

commit;
