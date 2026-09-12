-- Migration: 20260912_enforce_mentor_only_status_update.sql
-- Description: Enforce explicit, hard rejection when a student or non-mentor attempts to update mentorship status.

-- 1. Update immutability trigger to verify caller identity on UPDATE
CREATE OR REPLACE FUNCTION public.enforce_mentorship_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A. Ensure only the authorized faculty mentor can perform updates
  IF auth.role() = 'authenticated' AND auth.uid() <> OLD.mentor_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the designated faculty mentor may update mentorship status.';
  END IF;

  -- B. Ensure relational IDs and creation timestamps remain immutable
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

-- 2. Update RLS policy to capture student attempts and throw explicit violations
DROP POLICY IF EXISTS mentorships_update_policy ON public.mentorships;

CREATE POLICY mentorships_update_policy
ON public.mentorships
FOR UPDATE
TO authenticated
USING (
  auth.uid() = mentor_id OR auth.uid() = student_id
)
WITH CHECK (
  auth.uid() = mentor_id
  AND status IN ('accepted', 'declined')
);

COMMENT ON POLICY mentorships_update_policy ON public.mentorships IS
'Permits only the designated faculty mentor to transition status to accepted or declined, while explicitly failing student update attempts.';
