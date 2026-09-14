# Input Validation & PII Boundary Safeguards

## 1. PII Defense (Zero Email Exposure)
- Collegiate scholar emails are protected by database column-level grants.
- Direct queries on `profiles` select only explicit non-PII fields: `id, full_name, department, course, year, batch, role, is_verified, created_at`.
- Admin and Showcase queries strictly exclude `email` to maintain regulatory compliance.

## 2. Dynamic Origin Routing (Password Recovery)
- In `AuthContext.jsx`, authentication callbacks dynamically resolve the browser's origin:
  ```js
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://mentra-eta.vercel.app';
  ```
- Prevents hardcoded staging/local redirect confusion during production password resets.

## 3. AI Rate Limiting & Input Sanitization
- Edge Function `personal-ai` validates incoming messages (capped at 2,000 characters per message, conversation history capped at 8 turns).
- Rate limits enforced via server-side database RPC `check_ai_rate_limit`.
- Zero AI provider secrets (`GEMINI_API_KEY`) are exposed to client bundles.
