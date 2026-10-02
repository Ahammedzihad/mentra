-- Migration: 20261002_create_resume_drafts.sql
-- Description: Mentra Phase 6 Part B Step 5 - Resume Draft Table and Owner RLS
-- Creates public.resume_drafts with owner-only access policy and explicit privileges for authenticated users.

-- 1. Create table
CREATE TABLE public.resume_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Table privileges (separate from RLS)
REVOKE ALL ON public.resume_drafts FROM PUBLIC;
REVOKE ALL ON public.resume_drafts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_drafts TO authenticated;

-- 3. Enable Row-Level Security
ALTER TABLE public.resume_drafts ENABLE ROW LEVEL SECURITY;

-- 4. Owner-only RLS policy covering all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "resume_drafts_owner_only"
ON public.resume_drafts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
