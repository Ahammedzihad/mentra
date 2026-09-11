-- Migration: 20260911_create_ai_rate_limits.sql
-- Description: Durable per-user rate limiting table and atomic function for Personal AI (HIGH-02)

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present for idempotency
DROP POLICY IF EXISTS "Users can read own rate limit" ON public.ai_rate_limits;
CREATE POLICY "Users can read own rate limit" 
ON public.ai_rate_limits 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Atomic stored procedure for durable rate limiting
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id uuid,
  p_max_requests int DEFAULT 3,
  p_window_seconds int DEFAULT 60
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count int;
  v_allowed boolean;
  v_retry_after int;
BEGIN
  -- Prevent User A from checking or exhausting User B's quota
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot manipulate rate limit for another user.';
  END IF;

  -- Atomic upsert: reset if window elapsed, else increment count
  INSERT INTO public.ai_rate_limits (user_id, request_count, window_start)
  VALUES (p_user_id, 1, v_now)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    request_count = CASE 
      WHEN public.ai_rate_limits.window_start + (p_window_seconds || ' seconds')::interval < v_now 
      THEN 1
      ELSE public.ai_rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN public.ai_rate_limits.window_start + (p_window_seconds || ' seconds')::interval < v_now 
      THEN v_now
      ELSE public.ai_rate_limits.window_start
    END
  RETURNING request_count, window_start INTO v_count, v_window_start;

  IF v_count > p_max_requests THEN
    v_allowed := false;
    v_retry_after := GREATEST(1, EXTRACT(EPOCH FROM (v_window_start + (p_window_seconds || ' seconds')::interval - v_now))::int);
  ELSE
    v_allowed := true;
    v_retry_after := 0;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'count', v_count,
    'limit', p_max_requests,
    'retry_after', v_retry_after
  );
END;
$$;

-- Grant execution to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, int, int) TO authenticated, service_role;
GRANT ALL ON public.ai_rate_limits TO service_role, postgres;
