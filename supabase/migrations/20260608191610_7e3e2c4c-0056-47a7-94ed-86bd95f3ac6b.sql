
CREATE OR REPLACE FUNCTION public.search_public_profiles(_q text)
RETURNS TABLE (id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.display_name ILIKE '%' || _q || '%'
    AND p.id <> auth.uid()
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_public_profiles(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text) TO authenticated;
