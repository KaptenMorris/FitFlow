
-- Deduplicate any existing rows that would violate the unique constraint
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY session_id, exercise_id, set_number
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.workout_set_logs
  WHERE exercise_id IS NOT NULL
)
DELETE FROM public.workout_set_logs w
USING ranked r
WHERE w.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS workout_set_logs_session_ex_setnum_uidx
  ON public.workout_set_logs (session_id, exercise_id, set_number)
  WHERE exercise_id IS NOT NULL;
