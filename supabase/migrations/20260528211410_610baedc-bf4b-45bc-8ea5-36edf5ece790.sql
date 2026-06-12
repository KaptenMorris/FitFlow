
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS exercises_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS improved_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.workout_set_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercise_id UUID,
  exercise_name TEXT,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight_kg NUMERIC,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_set_logs TO authenticated;
GRANT ALL ON public.workout_set_logs TO service_role;

ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own set logs select" ON public.workout_set_logs;
DROP POLICY IF EXISTS "own set logs insert" ON public.workout_set_logs;
DROP POLICY IF EXISTS "own set logs update" ON public.workout_set_logs;
DROP POLICY IF EXISTS "own set logs delete" ON public.workout_set_logs;

CREATE POLICY "own set logs select" ON public.workout_set_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own set logs insert" ON public.workout_set_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own set logs update" ON public.workout_set_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own set logs delete" ON public.workout_set_logs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_set_logs_session ON public.workout_set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_set_logs_user_exercise ON public.workout_set_logs(user_id, exercise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_completed ON public.workout_sessions(user_id, completed_at DESC);
