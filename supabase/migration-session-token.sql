-- =============================================
-- Migration: Add session_token for single-session login
-- Run this in Supabase SQL Editor
-- =============================================

-- Add session_token column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS session_token VARCHAR(255) DEFAULT NULL;

-- Add session_updated_at column to track when session was created
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS session_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token);

-- Comment explaining the column
COMMENT ON COLUMN users.session_token IS 'Unique token for single-session enforcement. When a new login occurs, this token is updated and previous sessions become invalid.';
COMMENT ON COLUMN users.session_updated_at IS 'Timestamp when the session token was last updated.';
