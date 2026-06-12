
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.coach_profile (
  user_id uuid PRIMARY KEY,
  experience_level text,
  training_goals text[] DEFAULT '{}',
  injuries jsonb DEFAULT '[]'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  age integer,
  gender text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_profile TO authenticated;
GRANT ALL ON public.coach_profile TO service_role;

ALTER TABLE public.coach_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own coach profile select" ON public.coach_profile
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own coach profile insert" ON public.coach_profile
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own coach profile update" ON public.coach_profile
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_coach_profile_updated_at
BEFORE UPDATE ON public.coach_profile
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coach_messages_user_created_idx ON public.coach_messages(user_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own coach messages select" ON public.coach_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own coach messages insert" ON public.coach_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own coach messages delete" ON public.coach_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
