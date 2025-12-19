-- =============================================
-- MIGRATION: Add attendance_date for daily tracking
-- Run this in Supabase SQL Editor
-- This will NOT delete your existing data
-- =============================================

-- Step 1: Add the attendance_date column if it doesn't exist
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;

-- Step 2: Update existing records to have today's date (or keep their created_at date)
UPDATE attendance 
SET attendance_date = DATE(created_at)
WHERE attendance_date IS NULL;

-- Step 3: Make attendance_date NOT NULL
ALTER TABLE attendance 
ALTER COLUMN attendance_date SET NOT NULL;

-- Step 4: Drop the OLD unique constraint (one record per member)
ALTER TABLE attendance 
DROP CONSTRAINT IF EXISTS attendance_committee_member_id_key;

-- Step 5: Add the NEW unique constraint (one record per member PER DATE)
-- This allows multiple records for same member on different dates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'attendance_member_date_unique'
    ) THEN
        ALTER TABLE attendance 
        ADD CONSTRAINT attendance_member_date_unique UNIQUE(committee_member_id, attendance_date);
    END IF;
END $$;

-- Step 6: Add index for faster date queries
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- Step 7: Remove the auto-create trigger (attendance is created on demand now)
DROP TRIGGER IF EXISTS auto_create_attendance ON committee_members;

-- =============================================
-- DONE! Your attendance table now supports:
-- - One attendance record per committee member PER DATE
-- - You can view attendance history for any date
-- - Records won't be overwritten when changing dates
-- - Attendance table stays empty until you mark someone
-- =============================================

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance' 
ORDER BY ordinal_position;
