-- =============================================
-- SUPABASE STORAGE SETUP FOR ATTENDANCE PHOTOS
-- Run this in Supabase SQL Editor AFTER running schema-v2.sql
-- =============================================

-- Create a storage bucket for attendance photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attendance-photos',
    'attendance-photos',
    true,  -- Public bucket so photos can be viewed
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read/download photos (public viewing)
CREATE POLICY "Anyone can view attendance photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'attendance-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Anyone can upload attendance photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attendance-photos');

-- Allow authenticated users to update/replace their photos
CREATE POLICY "Anyone can update attendance photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'attendance-photos');

-- Allow authenticated users to delete photos
CREATE POLICY "Anyone can delete attendance photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'attendance-photos');
