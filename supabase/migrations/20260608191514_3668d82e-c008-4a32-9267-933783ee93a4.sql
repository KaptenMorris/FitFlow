
-- 1) Restrict health_logs policy to authenticated role
DROP POLICY IF EXISTS "Users manage own health logs" ON public.health_logs;
CREATE POLICY "Users manage own health logs"
ON public.health_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Restrict subscriptions policies to proper roles
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3) Remove friend access from profiles policy; keep only self-access.
DROP POLICY IF EXISTS "profiles select self or accepted friend" ON public.profiles;
CREATE POLICY "profiles select self"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Provide a SECURITY DEFINER function so friends can still look up
-- only safe public columns (id, display_name, avatar_url) for accepted friends.
CREATE OR REPLACE FUNCTION public.get_friend_profiles(_ids uuid[])
RETURNS TABLE (id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = p.id) OR
          (f.addressee_id = auth.uid() AND f.requester_id = p.id)
        )
    );
$$;

REVOKE ALL ON FUNCTION public.get_friend_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles(uuid[]) TO authenticated;
