
DROP POLICY IF EXISTS "own profile" ON public.mf_nutrition_profile;
CREATE POLICY "own profile" ON public.mf_nutrition_profile FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own day targets" ON public.mf_day_targets;
CREATE POLICY "own day targets" ON public.mf_day_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own weight" ON public.mf_weight_entries;
CREATE POLICY "own weight" ON public.mf_weight_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own food log" ON public.mf_food_log;
CREATE POLICY "own food log" ON public.mf_food_log FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own recipes" ON public.mf_recipes;
CREATE POLICY "own recipes" ON public.mf_recipes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own recipe items" ON public.mf_recipe_items;
CREATE POLICY "own recipe items" ON public.mf_recipe_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mf_recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mf_recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

DROP POLICY IF EXISTS "own checkins" ON public.mf_checkins;
CREATE POLICY "own checkins" ON public.mf_checkins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
