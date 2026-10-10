-- =============================================================================
-- Explicit Data API grants
-- -----------------------------------------------------------------------------
-- Older Supabase projects grant every new table in `public` to the API roles
-- automatically. Newer projects may not ("expose new tables" off), and then a
-- signed-in user gets "permission denied for table …" even with correct RLS.
-- These grants make the schema work either way. Row-level security still
-- decides WHICH rows each user can touch; a grant only lets the query reach it.
--
-- profiles is deliberately NOT granted UPDATE here: 02/03 allow updating only
-- full_name (column grant), so role / teacher_id / class_code stay locked.
-- Safe to re-run.
-- =============================================================================

grant usage on schema public to authenticated;

grant select, insert                  on public.profiles      to authenticated;
grant select, insert, update, delete  on public.progress      to authenticated;
grant select, insert, update, delete  on public.submissions   to authenticated;
grant select, insert, update, delete  on public.feedback      to authenticated;
grant select, insert, update, delete  on public.homework      to authenticated;
grant select, insert, update, delete  on public.learner_state to authenticated;
grant select                          on public.ai_usage      to authenticated;

-- Re-assert the column rule for profiles in case an earlier blanket grant exists.
revoke update on public.profiles from authenticated, anon;
grant  update (full_name) on public.profiles to authenticated;
