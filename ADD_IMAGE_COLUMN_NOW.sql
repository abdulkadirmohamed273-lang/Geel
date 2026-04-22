-- ========================================
-- INSTANT FIX: Add missing image_url column
-- Copy and run this in Supabase SQL Editor RIGHT NOW
-- ========================================

-- Add the missing image_url column
ALTER TABLE pharmacy_stock 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pharmacy_stock' 
AND column_name = 'image_url';

-- You should see: 
-- column_name: image_url
-- data_type: text

-- ========================================
-- DONE! Go back to your app and try adding items now.
-- The error will be gone! ✅
-- ========================================

