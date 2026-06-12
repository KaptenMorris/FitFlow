
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS external_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS name_sv text,
  ADD COLUMN IF NOT EXISTS body_part text,
  ADD COLUMN IF NOT EXISTS target text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS secondary_muscles text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS gif_url text,
  ADD COLUMN IF NOT EXISTS instructions_sv text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS instructions_en text[] DEFAULT '{}'::text[];

DELETE FROM public.exercises;

GRANT SELECT ON public.exercises TO anon, authenticated;
GRANT ALL ON public.exercises TO service_role;
