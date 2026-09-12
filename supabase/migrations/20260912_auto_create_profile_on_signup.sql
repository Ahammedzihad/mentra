-- Migration: 20260912_auto_create_profile_on_signup.sql
-- Description: Automatically create a public.profiles row upon user signup in auth.users,
-- and backfill missing profiles for existing authenticated users (including mentor 892e7ee1-7bdc-4a35-af27-001880706ef1).

-- 1. Create or replace the automatic profile creation trigger function
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
BEGIN
  -- Sanitize role: ONLY 'student' or 'mentor' allowed via user self-signup
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  IF v_role NOT IN ('student', 'mentor') THEN
    v_role := 'student';
  END IF;

  v_full_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Community Member');
  v_department := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 'B.Tech');

  INSERT INTO public.profiles (id, full_name, email, role, department, is_verified)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_role,
    v_department,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Bind trigger to auth.users AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill missing profiles for existing authenticated users
-- Safely inserts rows using auth user metadata while preserving role and pending state (is_verified = false)
INSERT INTO public.profiles (id, full_name, email, role, department, is_verified)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), 'Community Member'),
  u.email,
  CASE
    WHEN u.raw_user_meta_data->>'role' = 'mentor' THEN 'mentor'
    ELSE 'student'
  END,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'department'), ''), 'B.Tech'),
  false
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);
