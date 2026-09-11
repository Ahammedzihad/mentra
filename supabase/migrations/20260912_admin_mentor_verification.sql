-- Migration: 20260912_admin_mentor_verification.sql
-- Description: Implement database-enforced Admin Manual Mentor Verification.
-- Preserves CRIT-01, HIGH-01, HIGH-02, and MED-01 security invariants.

-- 1. Allow 'admin' in profiles_role_check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'mentor', 'admin'));

-- 2. Update trigger function to allow verification ONLY via authorized admin workflow
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
      -- Validate role value (clients may ONLY sign up as 'student' or 'mentor')
      -- 'admin' role can NEVER be self-selected on signup
      IF NEW.role NOT IN ('student', 'mentor') THEN
        RAISE EXCEPTION 'Invalid collegiate role: %. Permitted signup roles are: student, mentor.', NEW.role;
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
      -- Check if update is happening within authorized verify_mentor() admin execution
      IF current_setting('app.admin_verification', true) = 'true' THEN
        -- Narrowly scoped: role can NEVER be altered during verification
        IF NEW.role IS DISTINCT FROM OLD.role THEN
          RAISE EXCEPTION 'Unauthorized: Role modification is strictly forbidden during mentor verification.';
        END IF;
      ELSE
        -- Normal client update: users CANNOT modify role
        IF NEW.role IS DISTINCT FROM OLD.role THEN
          RAISE EXCEPTION 'Unauthorized: Collegiate role is immutable and cannot be modified by user.';
        END IF;

        -- Normal client update: users CANNOT self-verify or verify others
        IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
          RAISE EXCEPTION 'Unauthorized: Academic verification status cannot be self-modified.';
        END IF;
      END IF;
    END IF;

    -- Privileged operations (service_role, direct SQL / dashboard admin where caller_role != 'authenticated')
    -- are permitted to modify role and is_verified.
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and re-attach BEFORE trigger to public.profiles to ensure fresh binding
DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_field_protection();

-- 3. Create verify_mentor() SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.verify_mentor(target_mentor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
  v_target_name text;
  v_already_verified boolean;
BEGIN
  -- A. Ensure caller is authenticated
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  -- B. Verify caller has 'admin' role in public.profiles
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden: Only designated collegiate administrators can verify mentors.';
  END IF;

  -- C. Ensure administrator cannot self-verify
  IF target_mentor_id = v_caller_id THEN
    RAISE EXCEPTION 'Forbidden: Administrator cannot self-verify.';
  END IF;

  -- D. Check target user exists and has role = 'mentor'
  SELECT role, full_name, is_verified INTO v_target_role, v_target_name, v_already_verified
  FROM public.profiles
  WHERE id = target_mentor_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target mentor profile not found.';
  END IF;

  IF v_target_role <> 'mentor' THEN
    RAISE EXCEPTION 'Target user is not a faculty mentor (role: %).', v_target_role;
  END IF;

  -- E. Set transactional session parameter permitting verification
  PERFORM set_config('app.admin_verification', 'true', true);

  -- F. Narrowly scoped update: ONLY set is_verified = true
  UPDATE public.profiles
  SET is_verified = true
  WHERE id = target_mentor_id;

  RETURN jsonb_build_object(
    'success', true,
    'mentor_id', target_mentor_id,
    'full_name', v_target_name,
    'is_verified', true
  );
END;
$$;

-- 4. Set appropriate privileges
REVOKE ALL ON FUNCTION public.verify_mentor(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_mentor(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_mentor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_mentor(uuid) TO service_role;

COMMENT ON FUNCTION public.verify_mentor(uuid) IS
'Enforces database-level administrative verification of faculty mentors. Restricts execution to users with role = admin in public.profiles.';
