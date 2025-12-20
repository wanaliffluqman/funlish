-- =============================================
-- Migration: Add marked_by and registered_by fields
-- This tracks which user performed the action
-- Run this in Supabase SQL Editor
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

-- Comments for documentation
COMMENT ON COLUMN attendance.marked_by IS 'The user who marked this attendance record';
COMMENT ON COLUMN participants.registered_by IS 'The user who registered this participant';
