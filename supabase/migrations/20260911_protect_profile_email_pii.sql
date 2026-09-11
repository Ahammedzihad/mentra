-- Migration: 20260911_protect_profile_email_pii.sql
-- Description: Fix HIGH-01 by preventing authenticated users from reading the 'email' column of public.profiles,
-- while granting SELECT on safe public collegiate columns and preserving administrative/service-role access.

-- 1. Revoke whole-table SELECT from public web roles
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- 2. Grant column-specific SELECT on safe public collegiate columns ONLY to authenticated role
GRANT SELECT (id, full_name, department, role, is_verified, created_at) 
ON public.profiles TO authenticated;

-- 3. Maintain table-level INSERT and UPDATE for authenticated (safeguarded by trg_protect_profile_fields)
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- 4. Ensure service_role and postgres maintain full unrestricted access for administrative review
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;

COMMENT ON COLUMN public.profiles.email IS 
'Sensitive student/faculty contact email. Direct SELECT access is restricted to administrative and service_role contexts.';
