DROP POLICY IF EXISTS "read exercises" ON public.exercises;
CREATE POLICY "read exercises" ON public.exercises FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gyms are viewable by everyone" ON public.gyms;
CREATE POLICY "Gyms are viewable by authenticated users" ON public.gyms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "addressee responds to friendship" ON public.friendships;
CREATE POLICY "addressee responds to friendship" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() = addressee_id) WITH CHECK (auth.uid() = addressee_id AND status IN ('accepted', 'rejected'));

REVOKE SELECT ON public.exercises FROM anon;
REVOKE SELECT ON public.gyms FROM anon;