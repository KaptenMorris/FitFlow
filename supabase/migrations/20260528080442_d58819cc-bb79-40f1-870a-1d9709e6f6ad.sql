
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  height_cm NUMERIC,
  current_weight_kg NUMERIC,
  goal_weight_kg NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- EXERCISES (public read)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  sub_muscle TEXT,
  equipment TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO authenticated, anon;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read exercises" ON public.exercises FOR SELECT TO authenticated, anon USING (true);

-- SCHEMAS (training plans)
CREATE TABLE public.training_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  sessions_per_week INT DEFAULT 3,
  difficulty TEXT DEFAULT 'Medel',
  progress_percent INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_done_today BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_schemas TO authenticated;
GRANT ALL ON public.training_schemas TO service_role;
ALTER TABLE public.training_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schemas all" ON public.training_schemas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEIGHT LOGS
CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight all" ON public.weight_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WORKOUT SESSIONS
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  schema_id UUID REFERENCES public.training_schemas ON DELETE SET NULL,
  name TEXT NOT NULL,
  duration_min INT,
  calories INT,
  volume_kg NUMERIC,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions all" ON public.workout_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RECIPES
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type TEXT,
  protein_source TEXT,
  kcal INT,
  protein_g INT,
  fat_g INT,
  carbs_g INT,
  image_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recipes all" ON public.recipes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed exercises
INSERT INTO public.exercises (name, muscle_group, sub_muscle, equipment) VALUES
('3/4 Sit-up','Mage','Abs','Kroppsvikt'),
('45° side bend','Mage','Abs','Kroppsvikt'),
('Air bike','Mage','Abs','Kroppsvikt'),
('All fours squad Stretch','Ben','Quads','Kroppsvikt'),
('Alternerande heel touchers','Mage','Abs','Kroppsvikt'),
('Alternerande lateral Neddragning','Rygg','Lats','Kabel'),
('Ankle circles','Vader','Calves','Kroppsvikt'),
('Archer Pull-up','Rygg','Lats','Kroppsvikt'),
('Archer Armhävning','Bröst','Pectorals','Kroppsvikt'),
('Arm slingers hanging bent Knä legs','Mage','Abs','Kroppsvikt'),
('Arm slingers hanging straight legs','Mage','Abs','Kroppsvikt'),
('Arms apart circular toe touch (male)','Ben','Glutes','Kroppsvikt'),
('Arms Overhead Full Sit-up (male)','Mage','Abs','Kroppsvikt'),
('Barbell bench press','Bröst','Pectorals','Skivstång'),
('Barbell deadlift','Rygg','Lower back','Skivstång'),
('Barbell full squat','Ben','Quads','Skivstång'),
('Barbell lying triceps extension','Armar','Triceps','Skivstång'),
('Barbell bent over row','Rygg','Lats','Skivstång'),
('Barbell curl','Armar','Biceps','Skivstång'),
('Barbell shoulder press','Axlar','Deltoids','Skivstång'),
('Dumbbell bench press','Bröst','Pectorals','Hantel'),
('Dumbbell fly','Bröst','Pectorals','Hantel'),
('Dumbbell curl','Armar','Biceps','Hantel'),
('Dumbbell shoulder press','Axlar','Deltoids','Hantel'),
('Dumbbell lateral raise','Axlar','Deltoids','Hantel'),
('Dumbbell row','Rygg','Lats','Hantel'),
('Dumbbell lunge','Ben','Quads','Hantel'),
('Dumbbell romanian deadlift','Ben','Hamstrings','Hantel'),
('Cable row','Rygg','Lats','Kabel'),
('Cable triceps pushdown','Armar','Triceps','Kabel'),
('Cable lateral raise','Axlar','Deltoids','Kabel'),
('Cable face pull','Axlar','Rear delts','Kabel'),
('Leg press','Ben','Quads','Maskin'),
('Leg curl','Ben','Hamstrings','Maskin'),
('Leg extension','Ben','Quads','Maskin'),
('Chest press machine','Bröst','Pectorals','Maskin'),
('Lat pulldown','Rygg','Lats','Maskin'),
('Pec deck','Bröst','Pectorals','Maskin'),
('Smith machine squat','Ben','Quads','Maskin'),
('Kettlebell swing','Ben','Glutes','Kettlebell'),
('Kettlebell goblet squat','Ben','Quads','Kettlebell'),
('Kettlebell turkish get-up','Mage','Core','Kettlebell'),
('Pull-up','Rygg','Lats','Kroppsvikt'),
('Push-up','Bröst','Pectorals','Kroppsvikt'),
('Plank','Mage','Abs','Kroppsvikt'),
('Mountain climbers','Mage','Core','Kroppsvikt'),
('Burpees','Bröst','Full body','Kroppsvikt'),
('Dips','Bröst','Triceps','Kroppsvikt'),
('Russian twist','Mage','Obliques','Kroppsvikt'),
('Hanging leg raise','Mage','Abs','Kroppsvikt');
