
-- Enums
DO $$ BEGIN
  CREATE TYPE public.mf_goal AS ENUM ('cut','maintain','bulk');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mf_program_mode AS ENUM ('coached','collaborative','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mf_diet_style AS ENUM ('balanced','low_carb','keto','high_carb');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mf_meal AS ENUM ('breakfast','lunch','dinner','snack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Nutrition profile
CREATE TABLE public.mf_nutrition_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal public.mf_goal NOT NULL DEFAULT 'maintain',
  goal_rate_pct_per_week NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  program_mode public.mf_program_mode NOT NULL DEFAULT 'coached',
  diet_style public.mf_diet_style NOT NULL DEFAULT 'balanced',
  kcal_target INTEGER NOT NULL DEFAULT 2200,
  protein_g INTEGER NOT NULL DEFAULT 150,
  carbs_g INTEGER NOT NULL DEFAULT 250,
  fat_g INTEGER NOT NULL DEFAULT 70,
  expenditure_estimate INTEGER,
  starting_weight_kg NUMERIC(5,2),
  goal_weight_kg NUMERIC(5,2),
  last_checkin_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_nutrition_profile TO authenticated;
GRANT ALL ON public.mf_nutrition_profile TO service_role;
ALTER TABLE public.mf_nutrition_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.mf_nutrition_profile FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 2. Day targets (custom days)
CREATE TABLE public.mf_day_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  kcal_target INTEGER NOT NULL,
  protein_g INTEGER NOT NULL,
  carbs_g INTEGER NOT NULL,
  fat_g INTEGER NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_day_targets TO authenticated;
GRANT ALL ON public.mf_day_targets TO service_role;
ALTER TABLE public.mf_day_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own day targets" ON public.mf_day_targets FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 3. Weight entries
CREATE TABLE public.mf_weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  trend_kg NUMERIC(6,3),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_weight_entries TO authenticated;
GRANT ALL ON public.mf_weight_entries TO service_role;
ALTER TABLE public.mf_weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight" ON public.mf_weight_entries FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 4. Foods database
CREATE TABLE public.mf_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  serving_label TEXT NOT NULL DEFAULT '100 g',
  serving_grams NUMERIC(7,2) NOT NULL DEFAULT 100,
  kcal NUMERIC(7,2) NOT NULL,
  protein_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g NUMERIC(6,2) DEFAULT 0,
  sugar_g NUMERIC(6,2) DEFAULT 0,
  sat_fat_g NUMERIC(6,2) DEFAULT 0,
  sodium_mg NUMERIC(7,2) DEFAULT 0,
  calcium_mg NUMERIC(7,2) DEFAULT 0,
  iron_mg NUMERIC(6,2) DEFAULT 0,
  vit_c_mg NUMERIC(6,2) DEFAULT 0,
  vit_d_ug NUMERIC(6,2) DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_foods TO authenticated;
GRANT ALL ON public.mf_foods TO service_role;
ALTER TABLE public.mf_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read foods" ON public.mf_foods FOR SELECT TO authenticated USING (is_verified = true OR created_by = auth.uid());
CREATE POLICY "insert own foods" ON public.mf_foods FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND is_verified = false);
CREATE POLICY "update own foods" ON public.mf_foods FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid() AND is_verified = false);
CREATE POLICY "delete own foods" ON public.mf_foods FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 5. Food log
CREATE TABLE public.mf_food_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  meal public.mf_meal NOT NULL DEFAULT 'snack',
  food_id UUID REFERENCES public.mf_foods(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  servings NUMERIC(6,2) NOT NULL DEFAULT 1,
  kcal NUMERIC(7,2) NOT NULL,
  protein_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g NUMERIC(6,2) DEFAULT 0,
  sugar_g NUMERIC(6,2) DEFAULT 0,
  is_quick_add BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mf_food_log_user_date_idx ON public.mf_food_log(user_id, log_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_food_log TO authenticated;
GRANT ALL ON public.mf_food_log TO service_role;
ALTER TABLE public.mf_food_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food log" ON public.mf_food_log FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- 6. Recipes
CREATE TABLE public.mf_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  servings NUMERIC(5,2) NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_recipes TO authenticated;
GRANT ALL ON public.mf_recipes TO service_role;
ALTER TABLE public.mf_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipes" ON public.mf_recipes FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.mf_recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.mf_recipes(id) ON DELETE CASCADE,
  food_id UUID REFERENCES public.mf_foods(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  servings NUMERIC(6,2) NOT NULL DEFAULT 1,
  kcal NUMERIC(7,2) NOT NULL,
  protein_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_recipe_items TO authenticated;
GRANT ALL ON public.mf_recipe_items TO service_role;
ALTER TABLE public.mf_recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipe items" ON public.mf_recipe_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.mf_recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mf_recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- 7. Check-ins
CREATE TABLE public.mf_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  estimated_tdee INTEGER NOT NULL,
  previous_kcal_target INTEGER NOT NULL,
  new_kcal_target INTEGER NOT NULL,
  trend_change_kg NUMERIC(5,3),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mf_checkins TO authenticated;
GRANT ALL ON public.mf_checkins TO service_role;
ALTER TABLE public.mf_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.mf_checkins FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- updated_at triggers
CREATE TRIGGER mf_profile_updated BEFORE UPDATE ON public.mf_nutrition_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mf_recipes_updated BEFORE UPDATE ON public.mf_recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
