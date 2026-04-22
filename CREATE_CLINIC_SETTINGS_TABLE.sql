-- Create Clinic Settings Table for storing app configurations
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS clinic_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clinic_settings_key ON clinic_settings(setting_key);

-- Insert default daily ticket limit
INSERT INTO clinic_settings (setting_key, setting_value, description, created_by)
VALUES ('daily_ticket_limit', '50', 'Maximum number of tickets that can be generated per day', 1)
ON CONFLICT (setting_key) DO NOTHING;

-- Grant permissions
ALTER TABLE clinic_settings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON clinic_settings TO anon;
GRANT ALL ON clinic_settings TO authenticated;
GRANT ALL ON clinic_settings TO service_role;
GRANT ALL ON clinic_settings TO public;
GRANT USAGE, SELECT ON SEQUENCE clinic_settings_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE clinic_settings_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE clinic_settings_id_seq TO public;

