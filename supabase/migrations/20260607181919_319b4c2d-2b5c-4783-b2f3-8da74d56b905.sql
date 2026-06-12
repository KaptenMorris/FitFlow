-- Restrict nutrition_plans policies to authenticated role only
DROP POLICY IF EXISTS "Users delete own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users insert own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users update own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users view own nutrition plans" ON public.nutrition_plans;

CREATE POLICY "Users view own nutrition plans" ON public.nutrition_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own nutrition plans" ON public.nutrition_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own nutrition plans" ON public.nutrition_plans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own nutrition plans" ON public.nutrition_plans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- authenticated still needs EXECUTE because RLS policies call has_role as the calling role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;