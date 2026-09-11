-- =============================================================================
-- Mentra Admin One-Time Bootstrap Script
-- =============================================================================
-- Description:
--   Promotes an existing authenticated user (created securely via Supabase Auth)
--   to the trusted 'admin' role with is_verified = true in public.profiles.
--
-- Security Invariants:
--   1. Requires an explicitly supplied admin user UUID (v_admin_id).
--   2. Never accepts, stores, or handles plaintext passwords.
--   3. Must be executed directly by the database owner / superuser (postgres / service_role)
--      via the Supabase Dashboard SQL Editor or Supabase CLI (supabase db query --linked).
--   4. NOT a public or authenticated RPC function; cannot be called from frontend clients.
--   5. Idempotent: safe to run multiple times without duplicating or corrupting records.
--   6. Preserves existing CRIT-01, HIGH-01, HIGH-02, and MED-01 protections.
-- =============================================================================

DO $$
DECLARE
  -- ===========================================================================
  -- STEP 1: SUPPLY TARGET ADMIN USER UUID
  -- Replace the placeholder UUID below with the user ID from auth.users:
  -- ===========================================================================
  v_admin_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;

  v_auth_email text;
  v_existing_role text;
BEGIN
  -- Safety Check: Enforce explicitly supplied valid UUID
  IF v_admin_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'Bootstrap Aborted: Please supply a valid target admin UUID from auth.users.';
  END IF;

  -- Verify user exists in auth.users
  SELECT email INTO v_auth_email
  FROM auth.users
  WHERE id = v_admin_id;

  IF v_auth_email IS NULL THEN
    RAISE EXCEPTION 'Bootstrap Aborted: User with ID % does not exist in auth.users.', v_admin_id;
  END IF;

  -- Upsert profile with role = 'admin' and is_verified = true
  INSERT INTO public.profiles (id, full_name, department, role, is_verified, bio)
  VALUES (
    v_admin_id,
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_admin_id), 'Institutional Administrator'),
    COALESCE((SELECT raw_user_meta_data->>'department' FROM auth.users WHERE id = v_admin_id), 'Academic Administration'),
    'admin',
    true,
    'Designated institutional administrator for Mentra collegiate verification.'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = 'admin',
    is_verified = true
  WHERE profiles.id = v_admin_id;

  RAISE NOTICE 'Successfully bootstrapped admin account for % (%) with role=admin and is_verified=true.', v_auth_email, v_admin_id;
END;
$$;
