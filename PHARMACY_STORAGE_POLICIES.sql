-- Storage RLS Policies for pharmacy-images bucket
-- Run this SQL in your Supabase SQL Editor
-- This allows public uploads and reads for the pharmacy-images bucket

-- First, drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access for pharmacy-images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access for pharmacy-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to pharmacy-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update pharmacy-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete pharmacy-images" ON storage.objects;

-- Policy 1: Allow public to SELECT (view) images
CREATE POLICY "Public Access for pharmacy-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pharmacy-images');

-- Policy 2: Allow public to INSERT (upload) images
CREATE POLICY "Public upload access for pharmacy-images"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'pharmacy-images');

-- Policy 3: Allow public to UPDATE images
CREATE POLICY "Public update access for pharmacy-images"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'pharmacy-images')
WITH CHECK (bucket_id = 'pharmacy-images');

-- Policy 4: Allow public to DELETE images
CREATE POLICY "Public delete access for pharmacy-images"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'pharmacy-images');

