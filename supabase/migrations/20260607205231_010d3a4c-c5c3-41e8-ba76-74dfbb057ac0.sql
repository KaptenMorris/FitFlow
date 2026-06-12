
-- Allow self to set trial_started_at on first save (NULL -> value); still block changes afterwards for non-admins.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role (backend / admin server fns) is allowed
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- admins are allowed
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    RAISE EXCEPTION 'Not allowed to change subscription_tier'
      USING ERRCODE = '42501';
  END IF;

  -- Allow first-time set: NULL -> timestamp (during onboarding). Disallow any later change.
  IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at THEN
    IF OLD.trial_started_at IS NOT NULL THEN
      RAISE EXCEPTION 'Not allowed to change trial_started_at'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make marius83christensen@gmail.com an admin (idempotent).
INSERT INTO public.user_roles (user_id, role)
VALUES ('9235deb0-019e-400c-a0fb-82d13bfff622', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
