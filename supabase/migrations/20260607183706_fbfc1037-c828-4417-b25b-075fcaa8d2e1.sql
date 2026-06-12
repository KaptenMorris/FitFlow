-- Add image_path column to store the storage object path for signed URL generation
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS image_path text;

-- Backfill image_path from existing public URLs
UPDATE public.recipes
SET image_path = substring(image_url FROM '/recipe-images/(.+)$')
WHERE image_url IS NOT NULL AND image_path IS NULL;

-- SELECT policy on storage.objects for recipe-images bucket
-- Allows authenticated users to read images for recipes they own or that are public
DROP POLICY IF EXISTS "recipe images read own or public" ON storage.objects;
CREATE POLICY "recipe images read own or public"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.image_path = storage.objects.name
      AND (r.user_id = auth.uid() OR r.is_public = true)
  )
);