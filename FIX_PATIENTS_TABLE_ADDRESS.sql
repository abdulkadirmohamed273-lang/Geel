-- Fix Patients Table - Add missing address column
-- Run this in Supabase SQL Editor to fix the error

-- Add address column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE patients ADD COLUMN address TEXT;
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patients' 
AND column_name = 'address';

-- You should see:
-- column_name: address
-- data_type: text

