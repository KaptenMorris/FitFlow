CREATE TABLE public.diet_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goals TEXT[] NOT NULL DEFAULT '{}',
  gender TEXT,
  birth_year INTEGER,
  height_cm INTEGER,
  current_weight_kg NUMERIC,
  target_weight_kg NUMERIC,
  target_date DATE,
  activity_level TEXT,
  cheat_days TEXT[] NOT NULL DEFAULT '{}',
  include_protein_powder BOOLEAN NOT NULL DEFAULT false,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_plans TO authenticated;
GRANT ALL ON public.diet_plans TO service_role;

ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own diet plans" ON public.diet_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own diet plans" ON public.diet_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own diet plans" ON public.diet_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own diet plans" ON public.diet_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_diet_plans_updated_at
BEFORE UPDATE ON public.diet_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();