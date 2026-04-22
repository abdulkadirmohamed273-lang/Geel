-- Add BMI, SPO2, and Height columns to visits table
-- Run this SQL in your Supabase SQL Editor

-- Add height column
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS height VARCHAR(50);

-- Add BMI column
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS bmi VARCHAR(50);

-- Add SPO2 column
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS spo VARCHAR(50);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visits' 
AND column_name IN ('height', 'bmi', 'spo');

