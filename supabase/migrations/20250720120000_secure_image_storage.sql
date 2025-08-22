-- Step 1: Create a private storage bucket for generated images.
-- This bucket will store the actual image files securely.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('generated_images', 'generated_images', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Step 2: Rename the 'image_url' column to 'image_path'.
-- This clarifies that we are storing a path within Supabase Storage, not a public URL.
ALTER TABLE public.generated_images
RENAME COLUMN image_url TO image_path;

-- Step 3: RLS Policy to allow users to VIEW their own images.
-- Users can only access files in the bucket if the folder name matches their user ID.
CREATE POLICY "Allow authenticated user to view their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated_images' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- Step 4: RLS Policy to allow users to UPLOAD images.
-- Users can only upload files into a folder named with their own user ID.
CREATE POLICY "Allow authenticated user to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated_images' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- Step 5: RLS Policy to allow users to DELETE their own images.
-- Users can only delete files from their own folder.
CREATE POLICY "Allow authenticated user to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generated_images' AND auth.uid() = (storage.foldername(name))[1]::uuid);
