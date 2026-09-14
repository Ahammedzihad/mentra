# Mentra Architecture & Dependency Direction

## 1. Architectural Principles
Mentra follows a strict unidirectional dependency architecture to prevent circular coupling, isolate user role experiences, and preserve database-authoritative security.

```
Role UI (frontend/roles/student, mentor, admin)
   ↓
Features (features/projects, journey, mentorship)
   ↓
Shared Frontend Shell & Utilities (frontend/components, context, lib)
   ↓
Backend Services & Supabase Interfaces (backend/services, frontend/lib/supabase)
   ↓
Authoritative Database & Edge Functions (PostgreSQL RLS, triggers, Edge Functions)
```

## 2. Directory Structure & Responsibilities

- **`frontend/`**: Core user-facing application shell, routing, styles, and shared UI primitives.
  - `roles/`: Role-specific view components (`student/`, `mentor/`, `admin/`). Note: Folder boundaries provide UI organization only, NOT security authorization.
  - `components/`: Shell primitives (`Navbar`, `Footer`, `ConfigNotice`, `ProtectedRoute`).
  - `context/`: `AuthContext.jsx` for reactive session management and profile hydration.
  - `lib/`: `supabase.js` public client initialization.
  - `pages/`: Public landing, authentication, and error recovery pages.
  - `assets/`: Static image and SVG branding.

- **`features/`**: Domain-specific feature modules shared across roles.
  - `projects/`: Project registry display, creation modal, edition, and deletion confirmations.
  - `journey/`: Academic timeline milestone views and management dialogs.
  - `mentorship/`: Faculty mentor directory browsing and connection workflows.

- **`ai/`**: AI advisory user interfaces.
  - `student/`: Collegiate advisor interface for student portfolio reflection.
  - `mentor/`: Verified faculty mentorship co-pilot.
  - *Security Principle*: AI modules provide zero authorization. All AI interactions communicate through authenticated Supabase Edge Functions with server-side rate limiting and authentic database context hydration.

- **`backend/`**: Server-side interfaces, Edge Function definitions, and database coordination.
  - `services/`: Re-exported authoritative client instances.
  - *CLI Coordination*: The canonical `supabase/` directory remains at the project root to guarantee complete compatibility with `supabase CLI` migrations and edge function deployment.

- **`security/`**: Architecture specifications, permission matrices, and audit records. (Authoritative security remains strictly inside PostgreSQL RLS, triggers, and Supabase Auth).

## 3. Dependency Rules
- Roles may import from Features, Shared Components, and Auth Context.
- Features may import from Shared Components, Lib, and Auth Context.
- Features must NOT depend on Role internals.
- AI UIs must NOT determine user permissions.
- Database authorization is never delegated to the client.
