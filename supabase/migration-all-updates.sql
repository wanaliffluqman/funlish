-- =============================================
-- COMPLETE MIGRATION FILE FOR PRODUCTION
-- Run this in Supabase SQL Editor
-- Created: December 20, 2025
-- =============================================

-- =============================================
-- 1. ADD ATTENDANCE DATE COLUMN
-- Allows tracking attendance by specific date
-- =============================================
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

COMMENT ON COLUMN attendance.attendance_date IS 'The date for which attendance was marked';

-- =============================================
-- 2. ADD SESSION TOKEN FOR AUTHENTICATION
-- Secure session management
-- =============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS session_token TEXT;

CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token);

COMMENT ON COLUMN users.session_token IS 'Session token for user authentication';

-- =============================================
-- 3. ADD MAINTENANCE MODE SETTINGS
-- Control app maintenance state
-- =============================================
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance mode setting (off by default)
INSERT INTO app_settings (key, value)
VALUES ('maintenance_mode', '{"enabled": false, "message": "System is under maintenance. Please try again later."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_settings IS 'Application-wide settings including maintenance mode';

-- =============================================
-- 4. ADD MARKED_BY AND REGISTERED_BY TRACKING
-- Track which user performed actions
-- =============================================

-- Add marked_by column to attendance table
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add registered_by column to participants table
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS registered_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_participants_registered_by ON participants(registered_by);

COMMENT ON COLUMN attendance.marked_by IS 'The user who marked this attendance record';
COMMENT ON COLUMN participants.registered_by IS 'The user who registered this participant';

-- =============================================
-- 5. ENABLE REALTIME FOR TABLES
-- Required for live updates in the app
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS participants;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS groups;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS committee_members;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS app_settings;

-- =============================================
-- VERIFICATION: Check if all columns exist
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'Verifying columns...';
    
    -- Check attendance columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'attendance_date') THEN
        RAISE NOTICE '✅ attendance.attendance_date exists';
    ELSE
        RAISE WARNING '❌ attendance.attendance_date missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'marked_by') THEN
        RAISE NOTICE '✅ attendance.marked_by exists';
    ELSE
        RAISE WARNING '❌ attendance.marked_by missing';
    END IF;
    
    -- Check participants columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'participants' AND column_name = 'registered_by') THEN
        RAISE NOTICE '✅ participants.registered_by exists';
    ELSE
        RAISE WARNING '❌ participants.registered_by missing';
    END IF;
    
    -- Check users columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'session_token') THEN
        RAISE NOTICE '✅ users.session_token exists';
    ELSE
        RAISE WARNING '❌ users.session_token missing';
    END IF;
    
    -- Check app_settings table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings') THEN
        RAISE NOTICE '✅ app_settings table exists';
    ELSE
        RAISE WARNING '❌ app_settings table missing';
    END IF;
END $$;
