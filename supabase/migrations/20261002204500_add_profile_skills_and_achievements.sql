-- Migration: 20261002204500_add_profile_skills_and_achievements.sql
-- Description: Mentra Phase 5 Update - Add self-reported skills and achievements to public.profiles.
-- Implements:
--   1. Optional text[] columns on public.profiles with empty array defaults:
--      - skills: text[] NOT NULL DEFAULT '{}'::text[]
--      - achievements: text[] NOT NULL DEFAULT '{}'::text[]
--   2. Explicit column-level privilege isolation:
--      - REVOKE ALL on skills and achievements from PUBLIC and anon.
--      - GRANT SELECT and UPDATE on skills and achievements to authenticated role.
--      - Preserve existing owner-only RLS and administrative access (service_role, postgres).

-- 1. Add skills and achievements columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS achievements text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Privileges on skills and achievements (separate from RLS)
-- Ensure anon and PUBLIC receive no privileges on these new columns
REVOKE ALL (skills, achievements) ON public.profiles FROM PUBLIC;
REVOKE ALL (skills, achievements) ON public.profiles FROM anon;

-- Grant column-specific SELECT and UPDATE to authenticated role
GRANT SELECT (skills, achievements), UPDATE (skills, achievements) ON public.profiles TO authenticated;

-- Maintain full access for administrative service-role and postgres contexts
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;

-- 3. Document self-reported nature of fields
COMMENT ON COLUMN public.profiles.skills IS
'Self-reported technical and academic proficiencies. Optional unverified user entries.';

COMMENT ON COLUMN public.profiles.achievements IS
'Self-reported academic, hackathon, and leadership achievements. Optional unverified user entries.';
