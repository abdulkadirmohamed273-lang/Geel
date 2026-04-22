-- COMPREHENSIVE FIX FOR PHARMACY STOCK TABLE
-- Run this SQL in your Supabase SQL Editor to fix all issues
-- This script will create the table if it doesn't exist, and add missing columns if needed

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS pharmacy_stock (
    id SERIAL PRIMARY KEY,
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'units',
    unit_price DECIMAL(10, 2) DEFAULT 0.00,
    expiry_date DATE,
    batch_number VARCHAR(100),
    supplier VARCHAR(255),
    reorder_level INTEGER DEFAULT 10,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    image_url TEXT,  -- Column for storing medication images
    created_by INTEGER REFERENCES users(id),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='pharmacy_stock' 
        AND column_name='image_url'
    ) THEN
        ALTER TABLE pharmacy_stock ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to pharmacy_stock';
    ELSE
        RAISE NOTICE 'image_url column already exists';
    END IF;
END $$;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_medication_name ON pharmacy_stock(medication_name);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_category ON pharmacy_stock(category);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_status ON pharmacy_stock(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_expiry_date ON pharmacy_stock(expiry_date);

-- Step 4: Create or replace the status update function
CREATE OR REPLACE FUNCTION update_pharmacy_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if expired
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
        NEW.status := 'expired';
    -- Check if out of stock
    ELSIF NEW.quantity <= 0 THEN
        NEW.status := 'out_of_stock';
    -- Otherwise active
    ELSE
        NEW.status := 'active';
    END IF;
    
    NEW.updated_date := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_pharmacy_stock_status ON pharmacy_stock;

CREATE TRIGGER trigger_update_pharmacy_stock_status
    BEFORE INSERT OR UPDATE ON pharmacy_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_pharmacy_stock_status();

-- Step 6: Enable Row Level Security (RLS) - make sure policies allow access
ALTER TABLE pharmacy_stock ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policy to allow all operations for authenticated users
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow full access to pharmacy_stock" ON pharmacy_stock;
DROP POLICY IF EXISTS "Enable read access for all users" ON pharmacy_stock;
DROP POLICY IF EXISTS "Enable insert for all users" ON pharmacy_stock;
DROP POLICY IF EXISTS "Enable update for all users" ON pharmacy_stock;
DROP POLICY IF EXISTS "Enable delete for all users" ON pharmacy_stock;

-- Create new comprehensive policy
CREATE POLICY "Allow full access to pharmacy_stock"
ON pharmacy_stock
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Step 8: Verify the table structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'pharmacy_stock';
    
    RAISE NOTICE 'pharmacy_stock table has % columns', col_count;
END $$;

-- Step 9: Show current data count
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM pharmacy_stock;
    RAISE NOTICE 'pharmacy_stock table currently has % rows', row_count;
END $$;

-- INSTRUCTIONS:
-- 1. Copy this entire SQL script
-- 2. Go to your Supabase Dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Check the output messages for any issues
-- 5. Try adding pharmacy stock items again

-- To verify the fix worked, run this query:
-- SELECT * FROM pharmacy_stock;

-- To check column details:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'pharmacy_stock'
-- ORDER BY ordinal_position;

