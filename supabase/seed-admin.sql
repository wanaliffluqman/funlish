-- =============================================
-- SEED ADMIN USER
-- Run this in Supabase SQL Editor to create the admin account
-- =============================================

-- Delete existing admin with username 'administrator' if exists (to avoid duplicates)
DELETE FROM users WHERE username = 'administrator';

-- Insert admin user
-- Username: administrator
-- Password: Welcome@123 (hashed with bcrypt)
INSERT INTO users (username, password, name, department, role, status) VALUES
    ('administrator', '$2b$10$5zeGbEc5/ZwblI60lpWg4.YltT6ScH4zTqXLqH.6PG.q98.Tsv6qq', 'System Administrator', 'administrator', 'admin', 'active');

-- Verify the admin was created
SELECT id, username, name, department, role, status, created_at 
FROM users 
WHERE username = 'administrator';
