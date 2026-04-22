-- Simple fix: Add BMI, Height, and SPO2 columns to visits table
-- Copy and paste this entire script into Supabase SQL Editor

ALTER TABLE visits ADD COLUMN IF NOT EXISTS height VARCHAR(50);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS bmi VARCHAR(50);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS spo VARCHAR(50);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visits' 
AND column_name IN ('height', 'bmi', 'spo')
ORDER BY column_name;

