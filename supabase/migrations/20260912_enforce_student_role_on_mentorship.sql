-- Migration: 20260912_enforce_student_role_on_mentorship.sql
-- Description: Remediate MENTOR-12 by enforcing that the authenticated caller initiating a mentorship
-- request must have role = 'student' in public.profiles.

DROP POLICY IF EXISTS mentorships_insert_policy ON public.mentorships;

CREATE POLICY mentorships_insert_policy
ON public.mentorships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public.profiles.id = mentor_id
      AND public.profiles.role = 'mentor'
      AND public.profiles.is_verified = true
  )
);

COMMENT ON POLICY mentorships_insert_policy ON public.mentorships IS
'Permits only authenticated collegiate students to initiate pending mentorship requests to verified faculty mentors.';
