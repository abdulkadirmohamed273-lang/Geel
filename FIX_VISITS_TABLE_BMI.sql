-- Fix Visits Table - Add missing BMI, Height, and SPO2 columns
-- Run this in Supabase SQL Editor to fix the error

-- Add height column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'visits' 
        AND column_name = 'height'
    ) THEN
        ALTER TABLE visits ADD COLUMN height VARCHAR(50);
    END IF;
END $$;

-- Add BMI column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'visits' 
        AND column_name = 'bmi'
    ) THEN
        ALTER TABLE visits ADD COLUMN bmi VARCHAR(50);
    END IF;
END $$;

-- Add SPO2 column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'visits' 
        AND column_name = 'spo'
    ) THEN
        ALTER TABLE visits ADD COLUMN spo VARCHAR(50);
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visits' 
AND column_name IN ('height', 'bmi', 'spo')
ORDER BY column_name;
