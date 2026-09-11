-- Migration: 20260911_lock_profile_role_and_verification.sql
-- CRIT-01 Remediation: Prevent authenticated users from modifying 'role' and 'is_verified' on public.profiles.

CREATE OR REPLACE FUNCTION public.enforce_profile_field_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Safely extract auth.role() from request context
  BEGIN
    caller_role := auth.role();
  EXCEPTION WHEN OTHERS THEN
    caller_role := NULL;
  END;

  -- 1. ENFORCE ON INSERT
  IF TG_OP = 'INSERT' THEN
    -- If executed under authenticated user context (client signup)
    IF caller_role = 'authenticated' THEN
      -- Validate role value (only 'student' or 'mentor' allowed)
      IF NEW.role NOT IN ('student', 'mentor') THEN
        RAISE EXCEPTION 'Invalid collegiate role: %. Permitted roles are: student, mentor.', NEW.role;
      END IF;

      -- Force is_verified to false; authenticated clients can never self-verify on signup
      NEW.is_verified := false;
    END IF;

    RETURN NEW;
  END IF;

  -- 2. ENFORCE ON UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- If executed by an authenticated client session
    IF caller_role = 'authenticated' THEN
      -- A. Prohibit role modification (student -> mentor, mentor -> admin, etc.)
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Unauthorized: Collegiate role is immutable and cannot be modified by user.';
      END IF;

      -- B. Prohibit self-verification modification
      IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
        RAISE EXCEPTION 'Unauthorized: Academic verification status cannot be self-modified.';
      END IF;
    END IF;

    -- Privileged operations (service_role, direct SQL / dashboard admin where caller_role != 'authenticated')
    -- are permitted to modify role and is_verified.
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if present to ensure clean idempotent application
DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;

-- Attach BEFORE trigger to public.profiles
CREATE TRIGGER trg_protect_profile_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_field_protection();

COMMENT ON FUNCTION public.enforce_profile_field_protection() IS
'Prevents authenticated clients from modifying role and is_verified on public.profiles, while preserving administrator verification.';
