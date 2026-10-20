-- Migration: 20261019_create_project_likes.sql
-- Description: Mentra Phase 7 Step 11 - Project Likes and Accurate Project Counts
-- Establishes the public.project_likes table with recursion-safe row-level security
-- and a unique constraint on (project_id, user_id).

-- ============================================================================
-- 1. CREATE PUBLIC.PROJECT_LIKES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT project_likes_project_user_unique UNIQUE (project_id, user_id)
);

-- ============================================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================================

-- Index on project_id for fast aggregate counts and joins
CREATE INDEX IF NOT EXISTS idx_project_likes_project_id
  ON public.project_likes (project_id);

-- Index on user_id for batched lookups of a user's liked projects
CREATE INDEX IF NOT EXISTS idx_project_likes_user_id
  ON public.project_likes (user_id);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS project_likes_select_policy ON public.project_likes;
DROP POLICY IF EXISTS project_likes_anon_select_policy ON public.project_likes;
DROP POLICY IF EXISTS project_likes_insert_policy ON public.project_likes;
DROP POLICY IF EXISTS project_likes_delete_policy ON public.project_likes;

-- 1. SELECT Policy for Authenticated Users:
-- Authenticated users can view likes only for projects they are already allowed to see
-- (creator-owned, college/public visibility, or shared via project_shares).
CREATE POLICY project_likes_select_policy
ON public.project_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_likes.project_id
      AND (
        p.user_id = auth.uid()
        OR p.visibility IN ('college', 'public')
        OR (
          p.visibility = 'selected'
          AND EXISTS (
            SELECT 1 FROM public.project_shares ps
            WHERE ps.project_id = p.id
              AND ps.shared_with = auth.uid()
          )
        )
      )
  )
);

-- 2. SELECT Policy for Anonymous Users:
-- Anonymous viewers can only see likes on projects with 'public' visibility.
CREATE POLICY project_likes_anon_select_policy
ON public.project_likes
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_likes.project_id
      AND p.visibility = 'public'
  )
);

-- 3. INSERT Policy for Authenticated Users:
-- - User ID must match auth.uid()
-- - Target project must be currently visible to the user under project visibility rules
CREATE POLICY project_likes_insert_policy
ON public.project_likes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_likes.project_id
      AND (
        p.user_id = auth.uid()
        OR p.visibility IN ('college', 'public')
        OR (
          p.visibility = 'selected'
          AND EXISTS (
            SELECT 1 FROM public.project_shares ps
            WHERE ps.project_id = p.id
              AND ps.shared_with = auth.uid()
          )
        )
      )
  )
);

-- 4. DELETE Policy for Authenticated Users:
-- Users can delete only their own like.
CREATE POLICY project_likes_delete_policy
ON public.project_likes
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

-- ============================================================================
-- 5. PERMISSIONS & GRANTS
-- ============================================================================

-- Explicitly revoke write permissions from anon
REVOKE ALL ON public.project_likes FROM anon;
GRANT SELECT ON public.project_likes TO anon;

-- Grant required permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.project_likes TO authenticated;

-- Grant full access to administrative service role and postgres
GRANT ALL ON public.project_likes TO service_role;
GRANT ALL ON public.project_likes TO postgres;
