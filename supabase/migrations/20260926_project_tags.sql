-- Migration: 20260926_project_tags.sql
-- Description: Mentra Phase 4 Step 1 - Project Tags Database Foundation

ALTER TABLE projects
ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE projects
ADD CONSTRAINT tags_max_count
CHECK (
  array_length(tags, 1) IS NULL
  OR array_length(tags, 1) <= 6
);

CREATE INDEX projects_tags_idx
ON projects USING GIN (tags);
