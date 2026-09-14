# Mentra AI Advisory Architecture

## Architecture Flow
```
Browser Client (ai/student/AiAdvisorPage or ai/mentor/MentorAiPage)
       ↓  (Bearer JWT in Authorization Header)
Supabase Edge Function (supabase/functions/personal-ai/index.ts)
       ↓  (Server-side session verification via supabaseClient.auth.getUser())
Server-side Database Context Query (Authoritative Projects / Mentees)
       ↓  (GEMINI_API_KEY from Deno.env secret)
Google Gemini 3.6 Flash API
```

## Security Constraints
1. **Zero Client Secrets**: `GEMINI_API_KEY` is strictly a Supabase Edge Function secret. It is NEVER present in frontend environment variables or client bundles.
2. **Context Authenticity**: The Edge Function independently queries PostgreSQL using the verified JWT `user_id` to assemble student/mentor context. The client cannot spoof another scholar's projects.
3. **No AI Authorization**: AI output is treated as untrusted text for UI display and never dictates access control, roles, or database permissions.
