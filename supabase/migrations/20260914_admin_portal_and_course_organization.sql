-- Migration: 20260914_admin_portal_and_course_organization.sql
-- Description: Admin Portal foundation and student course organization (B.Tech, B.Des, BBA, BCA, MCA, MBA, Other).
-- Preserves CRIT-01, HIGH-01, HIGH-02, and Phase 2 security invariants.

-- 1. Add course, year, and batch columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS course text DEFAULT 'B.Tech',
  ADD COLUMN IF NOT EXISTS year text,
  ADD COLUMN IF NOT EXISTS batch text;

-- 2. Grant column-specific SELECT on new collegiate fields to authenticated and service_role
-- Respects 20260911_protect_profile_email_pii by NOT exposing the sensitive email column
GRANT SELECT (course, year, batch, bio) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;

-- 3. Backfill course from existing department data for existing students
UPDATE public.profiles
SET course = CASE
  WHEN department ILIKE '%B.Tech%' OR department ILIKE '%Engineering%' THEN 'B.Tech'
  WHEN department ILIKE '%B.Des%' OR department ILIKE '%Design%' THEN 'B.Des'
  WHEN department ILIKE '%BBA%' OR department ILIKE '%Business%' THEN 'BBA'
  WHEN department ILIKE '%BCA%' THEN 'BCA'
  WHEN department ILIKE '%MCA%' THEN 'MCA'
  WHEN department ILIKE '%MBA%' THEN 'MBA'
  ELSE COALESCE(NULLIF(TRIM(department), ''), 'Other')
END
WHERE (course IS NULL OR course = '') AND role = 'student';

-- 4. Update the handle_new_user() trigger function to populate course, year, and batch
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_department text;
  v_course text;
  v_year text;
  v_batch text;
BEGIN
  -- Sanitize role: ONLY 'student' or 'mentor' allowed via user self-signup
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF v_role NOT IN ('student', 'mentor') THEN
    v_role := 'student';
  END IF;

  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Community Member');
  v_department := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 'B.Tech');
  v_course := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'course'), ''), v_department);
  v_year := NULLIF(TRIM(NEW.raw_user_meta_data->>'year'), '');
  v_batch := NULLIF(TRIM(NEW.raw_user_meta_data->>'batch'), '');

  INSERT INTO public.profiles (id, full_name, email, role, department, course, year, batch, is_verified)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_role,
    v_department,
    v_course,
    v_year,
    v_batch,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    course = EXCLUDED.course,
    year = COALESCE(EXCLUDED.year, profiles.year),
    batch = COALESCE(EXCLUDED.batch, profiles.batch)
  WHERE profiles.id = NEW.id;

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.course IS
'Collegiate course of study (e.g. B.Tech, B.Des, BBA, BCA, MCA, MBA, Other).';

COMMENT ON COLUMN public.profiles.year IS
'Academic year level (e.g. 1st Year, 2nd Year, 3rd Year, 4th Year).';

COMMENT ON COLUMN public.profiles.batch IS
'Academic batch / graduating class cohort (e.g. 2023-2027).';
