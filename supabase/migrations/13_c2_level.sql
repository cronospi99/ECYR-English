-- =============================================================================
-- ECYR English platform — C2 (Proficiency) level
-- -----------------------------------------------------------------------------
-- Runs after 07, 09 and 11. Safe to re-run: drop-then-add.
--
-- The course gained a sixth level, C2. Three tables check the level a row may
-- carry; this widens each check to include 'C2', so a teacher can assign C2
-- homework, a student can file C2 work in "Mis trabajos" and a C2 podcast quiz
-- can be cached. Nothing else changes.
-- =============================================================================

alter table public.portfolio_items drop constraint if exists portfolio_level;
alter table public.portfolio_items
  add constraint portfolio_level check (level is null or level in ('A1','A2','B1','B2','C1','C2'));

alter table public.assignments drop constraint if exists assignments_level;
alter table public.assignments
  add constraint assignments_level check (level is null or level in ('A1','A2','B1','B2','C1','C2'));

alter table public.podcast_quizzes drop constraint if exists podcast_quizzes_level;
alter table public.podcast_quizzes
  add constraint podcast_quizzes_level check (level in ('A1','A2','B1','B2','C1','C2'));
