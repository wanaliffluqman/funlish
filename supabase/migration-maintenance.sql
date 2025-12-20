-- =============================================
-- FUNLISH Maintenance Mode Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- Create site_settings table for maintenance mode and other settings
CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance mode setting (disabled by default)
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('maintenance_mode', 'false')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert maintenance message setting
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('maintenance_message', 'We are currently performing scheduled maintenance. Please check back soon.')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);

-- Enable RLS (Row Level Security)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings
CREATE POLICY "Anyone can read site settings" ON site_settings
    FOR SELECT USING (true);

-- Policy: Only admins can update settings (handled at application level)
CREATE POLICY "Allow updates to site settings" ON site_settings
    FOR UPDATE USING (true);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();
