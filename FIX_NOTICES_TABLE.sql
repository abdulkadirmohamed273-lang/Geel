-- Fix Notices Table - Run this to fix the created_date column error
-- This script will either create the table or add missing columns

-- Step 1: Check if table exists and add missing columns if needed
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notices') THEN
        -- Table exists, check and add missing columns
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
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'content') THEN
            ALTER TABLE notices ADD COLUMN content TEXT NOT NULL DEFAULT '';
        END IF;
    ELSE
        -- Table doesn't exist, create it
        CREATE TABLE notices (
            id BIGSERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            created_by TEXT,
            updated_by TEXT,
            created_date TIMESTAMPTZ DEFAULT NOW(),
            updated_date TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Step 2: Disable RLS
ALTER TABLE notices DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant permissions
GRANT ALL ON notices TO anon;
GRANT ALL ON notices TO authenticated;
GRANT ALL ON notices TO public;

-- Step 4: Grant sequence usage (if sequence exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'notices_id_seq') THEN
        GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO anon;
        GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO authenticated;
        GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO public;
    END IF;
END $$;

-- Step 5: Create index (only if column exists)
CREATE INDEX IF NOT EXISTS idx_notices_created_date ON notices(created_date DESC);

-- Step 6: Update existing rows to have created_date if NULL
UPDATE notices SET created_date = NOW() WHERE created_date IS NULL;
UPDATE notices SET updated_date = NOW() WHERE updated_date IS NULL;

