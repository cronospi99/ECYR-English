-- =============================================================================
-- ECYR English platform — natural voice cache ("Voz natural (IA)")
-- -----------------------------------------------------------------------------
-- Runs after 01–06. Safe to re-run: create-if-not-exists / drop-then-create /
-- on-conflict-update throughout.
--
-- WHY THIS FILE EXISTS
-- The `gemini` Edge Function (op "voice") reads short texts — a word, a
-- sentence, an AI Coach reply — with one of a small cast of Gemini voices
-- (Emma, Liam, Olivia, Harry, Ruby, Jack). Each clip is recorded ONCE and
-- shared by the whole platform:
--
--   voice-cache/      public Storage bucket, one WAV per clip:
--                       voice-cache/<sha256 of version|persona|accent|text>.wav
--                     The name reveals nothing but a hash of a public text,
--                     so anyone may play a clip; only the function writes.
--   voice_usage       how many NEW clips each user generated per day. Clips
--                     already in the cache are free and are not counted.
--   bump_voice_usage  the only way the counter moves; callable by the
--                     service role (the Edge Function) and nobody else, so a
--                     learner can neither reset nor inflate their own count.
--
-- Why not reuse ai_usage / bump_ai_usage? That counter is the AI Coach's
-- daily message quota (COACH_DAILY_LIMIT). Hearing a few dozen sentences would
-- use it up, so the voice gets its own column and its own limit
-- (secret VOICE_DAILY_LIMIT on the `gemini` function, default 150).
--
-- WHO CAN DO WHAT
--   anyone        plays a clip by its public URL (no listing of the bucket)
--   the owner     reads their own voice_usage rows
--   service role  writes clips and moves the counter (from the Edge Function)
-- =============================================================================

-- Fails early with a clear message when 01–06 have not been run yet.
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Run 01_schema.sql … 06_api_grants.sql first (or use supabase/setup.sql, which includes everything).';
  end if;
end;
$$;


-- ============================================================ 1. COUNTER ====
create table if not exists public.voice_usage (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null default current_date,
  generated  integer not null default 0,
  primary key (user_id, day)
);

alter table public.voice_usage enable row level security;

drop policy if exists voice_usage_select_own on public.voice_usage;
create policy voice_usage_select_own on public.voice_usage
  for select using (user_id = auth.uid());
-- No insert/update policy: the counter only moves through bump_voice_usage().

grant select on public.voice_usage to authenticated;

-- Counts one generated clip for p_user (p_delta = 1) and refuses past the
-- daily limit, or gives one back when Google failed to record it
-- (p_delta = -1). Raising rolls the increment back, so a refused call does
-- not count.
create or replace function public.bump_voice_usage(p_user uuid, p_limit integer default 150, p_delta integer default 1)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_generated integer;
begin
  if p_user is null then
    raise exception 'no user' using errcode = '22004';
  end if;

  if p_delta < 0 then
    update public.voice_usage
       set generated = greatest(0, generated - 1)
     where user_id = p_user and day = current_date
    returning generated into v_generated;
    return coalesce(v_generated, 0);
  end if;

  insert into public.voice_usage (user_id, day, generated)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update set generated = public.voice_usage.generated + 1
  returning generated into v_generated;

  if v_generated > greatest(1, least(p_limit, 5000)) then
    raise exception 'daily voice limit reached' using errcode = 'P0001';
  end if;
  return v_generated;
end;
$$;

-- Supabase grants new functions to anon and authenticated by default; this
-- one takes any user id, so it must stay with the service role.
revoke all on function public.bump_voice_usage(uuid, integer, integer) from public;
revoke all on function public.bump_voice_usage(uuid, integer, integer) from anon;
revoke all on function public.bump_voice_usage(uuid, integer, integer) from authenticated;
grant execute on function public.bump_voice_usage(uuid, integer, integer) to service_role;


-- ============================================================ 2. STORAGE ====
-- Public: clips are played straight from the CDN by URL, cached by browsers.
-- 5 MB per file: 600 characters of speech is ~45 s, about 2 MB of WAV.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-cache', 'voice-cache', true, 5242880, array['audio/wav', 'audio/x-wav', 'audio/wave'])
on conflict (id) do update
   set public             = true,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately NO policies on storage.objects for this bucket: public reads go
-- through /object/public/… (no RLS involved), nobody can list the bucket, and
-- only the service role — which bypasses RLS — can upload, replace or delete.
drop policy if exists voice_cache_insert on storage.objects;
drop policy if exists voice_cache_update on storage.objects;
drop policy if exists voice_cache_delete on storage.objects;
