# PostgreSQL Row Level Security (RLS) Architecture

In Mentra, Row Level Security is the authoritative security boundary. The client application is treated as untrusted; RLS enforces access control at the database engine layer.

## Monitored Tables & Active Policies

### 1. `public.profiles`
- **Ownership**: `id = auth.uid()`
- **SELECT**: Authenticated users can view public profile fields (`id, full_name, department, course, year, batch, role, is_verified, created_at`).
- **PII Protection**: Direct SELECT on the `email` column is revoked from the `authenticated` role (`20260911_protect_profile_email_pii.sql`) to prevent collegiate email harvesting.
- **Role Lock**: `role` and `is_verified` columns cannot be updated by normal authenticated users (`20260911_lock_profile_role_and_verification.sql`); elevated privileges require database superuser/service_role or vetted RPCs (`verify_mentor`).

### 2. `public.projects`
- **SELECT**: Published academic projects are viewable by authenticated users for collegiate collaboration.
- **INSERT / UPDATE / DELETE**: Enforced strictly via `auth.uid() = user_id`. Client cannot modify projects owned by other scholars.

### 3. `public.journey`
- **SELECT / INSERT / UPDATE / DELETE**: Restricted strictly to the creator: `auth.uid() = user_id`.

### 4. `public.mentorships`
- **INSERT**: Enforced by trigger `validate_mentorship_roles_trigger` (`20260912_enforce_student_role_on_mentorship.sql`). The requester must have `role = 'student'` and the mentor must have `role = 'mentor'` and `is_verified = true`.
- **UPDATE (Status)**: Governed by `enforce_mentor_only_status_update_trigger` (`20260912_enforce_mentor_only_status_update.sql`). Only the designated mentor (`mentor_id = auth.uid()`) can accept or decline requests.

### 5. `public.ai_rate_limits`
- Governed by `check_ai_rate_limit(user_id, max_requests, window_minutes)`.
