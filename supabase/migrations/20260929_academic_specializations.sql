-- Migration: 20260929_academic_specializations.sql
-- Description: Mentra Phase 5 Step 1 - Academic Program & Specialization Database Foundation.
-- Implements:
--   1. Nullable specialization and program columns on public.profiles (IF NOT EXISTS).
--   2. Pure immutable validation function public.is_valid_academic_pair(program, specialization).
--   3. Program check constraint on public.profiles (profiles_program_check).
--   4. Approved canonical backfill: populates program from course for exact canonical values ('B.Tech', 'BCA', 'BBA', 'B.Des').
--   5. Academic pair check constraint on public.profiles (profiles_academic_pair_check).
--   6. Extended public.handle_new_user() trigger function persisting program and passing through specialization.
--   7. Column-level SELECT grants on program and specialization to authenticated role.

-- 1. Ensure specialization and program columns exist on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS specialization text NULL,
  ADD COLUMN IF NOT EXISTS program text NULL;

-- 2. Create the pure, immutable academic program/specialization validation function
-- Pure evaluation of 4 canonical programs and 22 specializations.
-- Permits a null specialization when program is valid; returns true for valid non-null pairs and for both fields null.
-- Reads zero tables, views, external state, or session settings.
CREATE OR REPLACE FUNCTION public.is_valid_academic_pair(
  p_program text,
  p_specialization text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
SELECT CASE
  WHEN p_program IS NULL AND p_specialization IS NULL THEN true
  WHEN p_program = 'B.Tech' AND (
    p_specialization IS NULL OR p_specialization IN (
      'AI & Machine Learning',
      'AI & Data Science',
      'Computer Science and Engineering',
      'Cyber Security',
      'Blockchain',
      'Internet of Things (IoT)'
    )
  ) THEN true
  WHEN p_program = 'BCA' AND (
    p_specialization IS NULL OR p_specialization IN (
      'AI & Data Science',
      'AI & Machine Learning',
      'Python Full Stack',
      'MERN Stack',
      'Flutter Development',
      'Cyber Security',
      'Blockchain',
      'UI/UX Designing'
    )
  ) THEN true
  WHEN p_program = 'BBA' AND (
    p_specialization IS NULL OR p_specialization IN (
      'Digital Marketing',
      'Business Analytics',
      'Aviation & Logistics',
      'Hospital Administration',
      'Film Making'
    )
  ) THEN true
  WHEN p_program = 'B.Des' AND (
    p_specialization IS NULL OR p_specialization IN (
      'Interaction Design (UI/UX systems)',
      'Communication Design',
      'Arts & Crafts Design'
    )
  ) THEN true
  ELSE false
END;
$$;

COMMENT ON FUNCTION public.is_valid_academic_pair(text, text) IS
'Validates canonical academic program and specialization pairs according to Mentra Phase 5 roadmap.';

-- 3. Academic Program CHECK constraint
-- Restricts non-NULL program to canonical options; allows NULL for non-student or unassigned accounts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_program_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_program_check
      CHECK (program IS NULL OR program IN ('B.Tech', 'BCA', 'BBA', 'B.Des'));
  END IF;
END $$;

-- 4. Approved Canonical Backfill
-- Populates program from course for existing records where course matches exact canonical values.
-- Must execute BEFORE profiles_academic_pair_check so that existing profiles with specialization
-- (e.g. verified student record) have their canonical program populated before constraint evaluation.
-- Preserves existing non-null program; leaves noncanonical, legacy (e.g. MCA, MBA, Other), or null values untouched.
UPDATE public.profiles
SET program = course
WHERE program IS NULL
  AND course IN ('B.Tech', 'BCA', 'BBA', 'B.Des');

-- 5. Academic Pair CHECK constraint (profiles_academic_pair_check)
-- Validates canonical program/specialization pair via public.is_valid_academic_pair(program, specialization).
-- Evaluated after canonical backfill so pre-existing specializations have valid non-null program values.
-- Allows (program, NULL) for valid programs, (NULL, NULL) for unassigned accounts, and valid non-null pairs.
-- Rejects invalid non-null specializations and invalid combinations.
DO $$
BEGIN
  -- Drop legacy or misnamed constraint if previously applied on public.profiles
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_specialization_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_specialization_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_academic_pair_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_academic_pair_check
      CHECK (public.is_valid_academic_pair(program, specialization));
  END IF;
END $$;

-- 6. Update public.handle_new_user() signup trigger function
-- Persists program and passes through specialization to the profile insert.
-- Preserves existing fallbacks (full_name -> 'Community Member', department -> 'B.Tech', course -> program/department).
-- An invalid non-null specialization is rejected by profiles_academic_pair_check rather than silently converted to null.
-- On conflict, preserves existing profile fields and does not update full_name, email, department, role, or is_verified.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_dept text;
  v_program text;
  v_course text;
  v_specialization text;
  v_year text;
  v_batch text;
BEGIN
  -- Role sanitization: only 'student' or 'mentor' allowed via user self-signup; defaults to 'student'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF v_role NOT IN ('student', 'mentor') THEN
    v_role := 'student';
  END IF;

  -- Profile name and department fallbacks (matching existing live trigger behavior)
  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Community Member');
  v_dept      := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 'B.Tech');

  -- Extract academic program: prefer submitted 'program', fallback to canonical 'course' or 'department'
  v_program   := NULLIF(btrim(NEW.raw_user_meta_data->>'program'), '');
  IF v_program IS NULL AND NEW.raw_user_meta_data->>'course' IN ('B.Tech', 'BCA', 'BBA', 'B.Des') THEN
    v_program := NEW.raw_user_meta_data->>'course';
  END IF;
  IF v_program IS NULL AND v_dept IN ('B.Tech', 'BCA', 'BBA', 'B.Des') THEN
    v_program := v_dept;
  END IF;

  -- Course: prefer submitted 'course', fallback to program or department
  v_course    := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'course'), ''), v_program, v_dept);

  -- Cohort fields
  v_year      := NULLIF(btrim(NEW.raw_user_meta_data->>'year'), '');
  v_batch     := NULLIF(btrim(NEW.raw_user_meta_data->>'batch'), '');

  -- Specialization: pass through submitted value (normalized for whitespace) directly to profile insert.
  -- Invalid non-null specializations are rejected by the live profiles_academic_pair_check constraint.
  v_specialization := NULLIF(btrim(NEW.raw_user_meta_data->>'specialization'), '');

  INSERT INTO public.profiles (
    id, full_name, email, role, department, course, program, specialization, year, batch, is_verified
  ) VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_role,
    v_dept,
    v_course,
    v_program,
    v_specialization,
    v_year,
    v_batch,
    false  -- CRIT-01 invariant: self-signups are never auto-verified
  )
  ON CONFLICT (id) DO UPDATE SET
    course         = COALESCE(EXCLUDED.course, profiles.course),
    program        = COALESCE(EXCLUDED.program, profiles.program),
    specialization = CASE
      WHEN EXCLUDED.program IS NOT NULL
        AND profiles.program IS DISTINCT FROM EXCLUDED.program
        THEN EXCLUDED.specialization
      ELSE COALESCE(EXCLUDED.specialization, profiles.specialization)
    END,
    year           = COALESCE(EXCLUDED.year, profiles.year),
    batch          = COALESCE(EXCLUDED.batch, profiles.batch);

  RETURN NEW;
END;
$$;

-- 7. Grant column-level SELECT on program and specialization to authenticated role
-- Grants explicit SELECT permission on academic columns to authenticated users.
GRANT SELECT (program, specialization) ON public.profiles TO authenticated;
