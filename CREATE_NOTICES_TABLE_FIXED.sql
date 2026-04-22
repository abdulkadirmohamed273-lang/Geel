-- Create Notices Table - FIXED VERSION
-- Run this in Supabase SQL Editor
-- This version handles the case where the table might already exist

-- Drop table if it exists (WARNING: This will delete all existing notices!)
-- Uncomment the next line ONLY if you want to start fresh
-- DROP TABLE IF EXISTS notices CASCADE;

-- Create notices table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS notices (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_by TEXT,
    updated_by TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists but columns are missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'created_date') THEN
        ALTER TABLE notices ADD COLUMN created_date TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'updated_date') THEN
        ALTER TABLE notices ADD COLUMN updated_date TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'created_by') THEN
        ALTER TABLE notices ADD COLUMN created_by TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'updated_by') THEN
        ALTER TABLE notices ADD COLUMN updated_by TEXT;
    END IF;
END $$;

-- Disable RLS for easier access (or configure policies as needed)
ALTER TABLE notices DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON notices TO anon;
GRANT ALL ON notices TO authenticated;
GRANT ALL ON notices TO public;

-- Grant sequence usage (only if sequence exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'notices_id_seq') THEN
        GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO anon;
        GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO authenticated;
        GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO public;
    END IF;
END $$;

-- Create index for faster queries (only if column exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'created_date') THEN
        CREATE INDEX IF NOT EXISTS idx_notices_created_date ON notices(created_date DESC);
    END IF;
END $$;

-- Optional: Insert a default notice (only if table is empty)
-- Uncomment the next lines if you want a default notice
/*
INSERT INTO notices (content, created_by, updated_by) 
SELECT 'Welcome to Beergeel Clinic! This is a default notice. You can edit it from the Notice Board.', 'system', 'system'
WHERE NOT EXISTS (SELECT 1 FROM notices);
*/

