# Mentra Role Authorization Matrix

Authoritative authorization is enforced in two complementary tiers:
1. **Application Routing Tier (`ProtectedRoute.jsx`)**: Fail-closed frontend route guards that verify authenticated identity and database-confirmed profile roles before rendering role-specific views.
2. **Database Engine Tier (PostgreSQL RLS & Triggers)**: Hard constraints that reject unauthorized mutations even if client-side state is tampered with.

## Permission Matrix

| Operation / Resource | Student | Mentor (Unverified) | Mentor (Verified) | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **View Landing / Public Showcase** | Yes | Yes | Yes | Yes |
| **Access Student Dashboard (`/student`)** | Yes | No | No | No |
| **Browse Mentors (`/mentors`)** | Yes | No | No | No |
| **Create / Manage Own Projects** | Yes | Yes | Yes | Yes |
| **Manage Own Journey Milestones** | Yes | Yes | Yes | Yes |
| **Request Mentorship from Faculty** | Yes | No | No | No |
| **Access Mentor Dashboard (`/mentor`)** | No | Yes (Pending banner) | Yes | No |
| **Accept / Decline Mentorship** | No | No | Yes | No |
| **Access Mentor AI Co-Pilot (`/mentor/ai`)** | No | No | Yes | No |
| **Access Admin Workspace (`/admin/*`)** | No | No | No | Yes |
| **Verify Faculty Credentials (`verify_mentor`)** | No | No | No | Yes |
