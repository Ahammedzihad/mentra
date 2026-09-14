# Mentra Backend & Services Architecture

## Supabase CLI Coordination
To maintain seamless integration with the official Supabase CLI (`supabase migration list`, `supabase db push`, `supabase functions deploy`), the canonical configuration and migration directories are maintained at the project root:
- `supabase/config.toml`
- `supabase/migrations/`
- `supabase/functions/`

## Services
- `backend/services/supabaseClient.js`: Authoritative client interface module.
