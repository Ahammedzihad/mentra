-- Migration: 20260912_create_mentorships.sql
-- Description: Mentra Phase 2 Mentorship Connection Layer
-- Creates public.mentorships table with RLS and trust verification constraints

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.mentorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT mentorships_unique_student_mentor UNIQUE (student_id, mentor_id),
  CONSTRAINT mentorships_student_not_mentor CHECK (student_id <> mentor_id)
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_mentorships_student_id ON public.mentorships(student_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_id ON public.mentorships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_status ON public.mentorships(status);

-- 3. Enable RLS immediately
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;

-- 4. Drop any pre-existing policies to allow idempotent re-runs
DROP POLICY IF EXISTS mentorships_select_policy ON public.mentorships;
DROP POLICY IF EXISTS mentorships_insert_policy ON public.mentorships;
DROP POLICY IF EXISTS mentorships_update_policy ON public.mentorships;

-- 5. SELECT Policy:
-- User can see mentorship rows only when auth.uid() = student_id OR auth.uid() = mentor_id
CREATE POLICY mentorships_select_policy
ON public.mentorships
FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id OR auth.uid() = mentor_id
);

-- 6. INSERT Policy:
-- Student can create request only when auth.uid() = student_id,
-- status is initially 'pending',
-- and the requested mentor is verified (is_verified = true and role = 'mentor').
CREATE POLICY mentorships_insert_policy
ON public.mentorships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = mentor_id
      AND public.profiles.role = 'mentor'
      AND public.profiles.is_verified = true
  )
);

-- 7. UPDATE Policy:
-- Only mentor can update request (auth.uid() = mentor_id)
-- Student can NEVER accept/decline their own request.
CREATE POLICY mentorships_update_policy
ON public.mentorships
FOR UPDATE
TO authenticated
USING (
  auth.uid() = mentor_id
)
WITH CHECK (
  auth.uid() = mentor_id
  AND status IN ('accepted', 'declined')
);

-- 8. Immutability trigger: Ensure IDs and created_at cannot be tampered with on UPDATE
CREATE OR REPLACE FUNCTION public.enforce_mentorship_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id <> OLD.student_id THEN
    RAISE EXCEPTION 'Cannot modify student_id of a mentorship';
  END IF;
  IF NEW.mentor_id <> OLD.mentor_id THEN
    RAISE EXCEPTION 'Cannot modify mentor_id of a mentorship';
  END IF;
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Cannot modify id of a mentorship';
  END IF;
  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at of a mentorship';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentorships_immutability ON public.mentorships;
CREATE TRIGGER trg_mentorships_immutability
BEFORE UPDATE ON public.mentorships
FOR EACH ROW
EXECUTE FUNCTION public.enforce_mentorship_immutability();

-- 9. Table privileges
REVOKE ALL ON public.mentorships FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.mentorships TO authenticated;
GRANT ALL ON public.mentorships TO service_role;
GRANT ALL ON public.mentorships TO postgres;
