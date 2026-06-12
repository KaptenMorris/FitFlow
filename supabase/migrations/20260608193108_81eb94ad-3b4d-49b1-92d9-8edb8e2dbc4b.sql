
CREATE TABLE public.gyms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  city text,
  chain text,
  equipment text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gyms TO anon, authenticated;
GRANT ALL ON public.gyms TO service_role;

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gyms are viewable by everyone"
  ON public.gyms FOR SELECT
  USING (true);

CREATE TRIGGER update_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.gyms (name, city, chain, equipment) VALUES
  ('STC Kil', 'Kil', 'STC', ARRAY['Kroppsvikt','Hantel','Skivstång','EZ-stång','Kabel','Hävmaskin','Smithmaskin','Kettlebell','Band','Gummiband','Medicinboll','Crosstrainer','Motionscykel','SkiErg','Släde']),
  ('STC Karlstad', 'Karlstad', 'STC', ARRAY['Kroppsvikt','Hantel','Skivstång','Olympisk skivstång','EZ-stång','Kabel','Hävmaskin','Smithmaskin','Kettlebell','Band','Gummiband','Medicinboll','Crosstrainer','Motionscykel','SkiErg','Trappmaskin','Släde','Armergometer']),
  ('SATS', NULL, 'SATS', ARRAY['Kroppsvikt','Hantel','Skivstång','EZ-stång','Kabel','Hävmaskin','Smithmaskin','Kettlebell','Band','Medicinboll','Crosstrainer','Motionscykel','SkiErg']),
  ('Nordic Wellness', NULL, 'Nordic Wellness', ARRAY['Kroppsvikt','Hantel','Skivstång','EZ-stång','Kabel','Hävmaskin','Smithmaskin','Kettlebell','Band','Medicinboll','Crosstrainer','Motionscykel','SkiErg','Släde']),
  ('Fitness24Seven', NULL, 'Fitness24Seven', ARRAY['Kroppsvikt','Hantel','Skivstång','EZ-stång','Kabel','Hävmaskin','Smithmaskin','Kettlebell','Band']),
  ('Puls & Träning', NULL, 'Puls & Träning', ARRAY['Kroppsvikt','Hantel','Skivstång','Kabel','Hävmaskin','Smithmaskin','Kettlebell','Band','Crosstrainer','Motionscykel']),
  ('Hemmagym', NULL, NULL, ARRAY['Kroppsvikt','Hantel','Kettlebell','Gummiband','Band']);
