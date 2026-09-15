-- Migration: 20260915_project_visibility_foundation.sql
-- Description: Mentra Phase 3 Step 1 - Project Visibility Database Foundation
-- Establishes creator-controlled project visibility ('private', 'selected', 'college', 'public')
-- and creates the public.project_shares junction table with recursion-safe row-level security.

-- ============================================================================
-- 1. ADD VISIBILITY COLUMN TO PUBLIC.PROJECTS
-- ============================================================================

-- Add visibility column with default 'college'
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'college';

-- Enforce allowed values at database level with a CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_visibility_check'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_visibility_check
      CHECK (visibility IN ('private', 'selected', 'college', 'public'));
  END IF;
END $$;

-- Guarantee all existing rows are set to 'college'
UPDATE public.projects
SET visibility = 'college'
WHERE visibility IS NULL;

-- ============================================================================
-- 2. CREATE PUBLIC.PROJECT_SHARES JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) NOT NULL,
  shared_with uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, shared_with)
);

-- ============================================================================
-- 3. HELPER FUNCTION TO PREVENT RLS RECURSION
-- ============================================================================

-- Breaks circular policy expansion between public.projects and public.project_shares
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_project_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO service_role;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR PROJECT_SHARES
-- ============================================================================

-- Enable RLS on project_shares
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotent execution
DROP POLICY IF EXISTS project_shares_owner_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_owner_manage_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_select_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_recipient_select_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_insert_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_delete_policy ON public.project_shares;

-- 1. Recipient SELECT Policy:
-- - Shared recipient can view only their own share record
CREATE POLICY project_shares_recipient_select_policy
ON public.project_shares
FOR SELECT
TO authenticated
USING (
  auth.uid() = shared_with
);

-- 2. Owner FOR ALL Management Policy:
-- - Project creator has full management authority (SELECT, INSERT, UPDATE, DELETE)
-- - USING ensures only the project owner can access/mutate/delete project shares
-- - WITH CHECK ensures only the project owner can create/update shares, and prevents self-sharing
CREATE POLICY project_shares_owner_manage_policy
ON public.project_shares
FOR ALL
TO authenticated
USING (
  public.is_project_owner(project_id, auth.uid())
)
WITH CHECK (
  auth.uid() <> shared_with
  AND public.is_project_owner(project_id, auth.uid())
);

-- Grants on project_shares (updated for FOR ALL owner management: SELECT, INSERT, UPDATE, DELETE)
REVOKE ALL ON public.project_shares FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_shares TO authenticated;
GRANT ALL ON public.project_shares TO service_role;
GRANT ALL ON public.project_shares TO postgres;

-- ============================================================================
-- 5. UPDATE PUBLIC.PROJECTS SELECT RLS POLICY FOR VISIBILITY
-- ============================================================================

-- Ensure RLS is enabled on public.projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies to ensure single authoritative visibility policy.
-- Specifically targets the live policy "Anyone authenticated can view projects"
-- along with any existing alias names.
DROP POLICY IF EXISTS "Anyone authenticated can view projects" ON public.projects;
DROP POLICY IF EXISTS projects_select_policy ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;

-- Authoritative SELECT Policy:
-- - Creator can ALWAYS view their own projects (regardless of visibility)
-- - 'college' and 'public' visibility are viewable by all authenticated collegiate members
-- - 'selected' visibility is viewable ONLY by creator and explicitly shared users via project_shares
-- - 'private' visibility is viewable ONLY by creator
CREATE POLICY projects_select_policy
ON public.projects
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR visibility IN ('college', 'public')
  OR (
    visibility = 'selected'
    AND EXISTS (
      SELECT 1 FROM public.project_shares
      WHERE public.project_shares.project_id = public.projects.id
        AND public.project_shares.shared_with = auth.uid()
    )
  )
);

-- Note: Existing INSERT ("Users can create their own projects"), UPDATE ("Users can update their own projects"),
-- and DELETE ("Users can delete their own projects") ownership controls on public.projects are strictly preserved.
-- Existing table privileges on public.projects remain untouched.

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.projects.visibility IS
'Creator-controlled project visibility: private (creator only), selected (creator + project_shares), college (authenticated collegiate users), public (stored, anonymous access deferred).';

COMMENT ON TABLE public.project_shares IS
'Explicit user grants for projects with visibility = selected.';

COMMENT ON FUNCTION public.is_project_owner IS
'Evaluates project ownership in security definer context to prevent RLS recursion.';
