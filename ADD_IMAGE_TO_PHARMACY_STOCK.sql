-- Add image_url column to pharmacy_stock table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE pharmacy_stock 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for pharmacy images (run this separately in Supabase Storage)
-- Go to Storage > Create Bucket
-- Bucket name: pharmacy-images
-- Public bucket: Yes (checked)
-- File size limit: 5MB (or as needed)

