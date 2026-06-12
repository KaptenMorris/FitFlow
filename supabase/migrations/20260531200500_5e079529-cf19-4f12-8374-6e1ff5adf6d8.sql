
-- 1. Restrict profile visibility to self + accepted friends
DROP POLICY IF EXISTS "view profiles for friends" ON public.profiles;
DROP POLICY IF EXISTS "own profile select" ON public.profiles;

CREATE POLICY "profiles select self or accepted friend"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = profiles.id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.id)
      )
  )
);

-- 2. Fix broken shared-recipes policy (self-join bug)
DROP POLICY IF EXISTS "view shared recipes" ON public.recipes;
CREATE POLICY "view shared recipes"
ON public.recipes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.recipe_shares s
    WHERE s.recipe_id = recipes.id
      AND s.to_user_id = auth.uid()
  )
);

-- 3. workout_set_logs: restrict policies to authenticated role only
DROP POLICY IF EXISTS "own set logs delete" ON public.workout_set_logs;
DROP POLICY IF EXISTS "own set logs insert" ON public.workout_set_logs;
DROP POLICY IF EXISTS "own set logs select" ON public.workout_set_logs;
DROP POLICY IF EXISTS "own set logs update" ON public.workout_set_logs;

CREATE POLICY "own set logs select"
ON public.workout_set_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "own set logs insert"
ON public.workout_set_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own set logs update"
ON public.workout_set_logs FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own set logs delete"
ON public.workout_set_logs FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 4. Tighten friendships UPDATE: only addressee may flip status, requester may not self-accept
DROP POLICY IF EXISTS "update friendship as participant" ON public.friendships;
CREATE POLICY "addressee responds to friendship"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);
