-- Create Notices Table for Notice Board
-- Run this in Supabase SQL Editor if the notices table doesn't exist

-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_by TEXT,
    updated_by TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for easier access (or configure policies as needed)
ALTER TABLE notices DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON notices TO anon;
GRANT ALL ON notices TO authenticated;
GRANT ALL ON notices TO public;

-- Grant sequence usage
GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notices_id_seq TO public;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notices_created_date ON notices(created_date DESC);

-- Optional: Insert a default notice
-- INSERT INTO notices (content, created_by, updated_by) 
-- VALUES ('Welcome to Beergeel Clinic! This is a default notice. You can edit it from the Notice Board.', 'system', 'system');

