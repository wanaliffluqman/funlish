-- =============================================
-- FUNLISH Database Schema v3
-- SIMPLIFIED: Simple integer IDs + No pre-filled attendance
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS committee_members CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- 1. USERS TABLE (System users who login)
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) DEFAULT 'logistics_operations' CHECK (department IN (
        'administrator',
        'pr_communication',
        'protocol_ceremonial',
        'fnb',
        'sponsorship_finance',
        'logistics_operations',
        'technical_it_support',
        'evaluation_research_documentation',
        'health_safety_welfare',
        'executive',
        'program_activities'
    )),
    role VARCHAR(50) DEFAULT 'committee' CHECK (role IN ('admin', 'chairperson', 'protocol', 'registration_coordinator', 'committee')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. GROUPS TABLE (For participant team assignment)
-- =============================================
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. PARTICIPANTS TABLE (Event participants)
-- =============================================
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. COMMITTEE MEMBERS TABLE (Master list of committee members)
-- =============================================
CREATE TABLE committee_members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL CHECK (department IN (
        'pr_communication',
        'protocol_ceremonial',
        'fnb',
        'sponsorship_finance',
        'logistics_operations',
        'technical_it_support',
        'evaluation_research_documentation',
        'health_safety_welfare',
        'executive',
        'program_activities'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. ATTENDANCE TABLE (Only stores when user marks attendance)
-- EMPTY by default - records created only when attendance is marked
-- =============================================
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    committee_member_id INTEGER NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'absent' CHECK (status IN ('attend', 'absent')),
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(10, 2),
    address TEXT,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- One attendance record per committee member PER DATE
    UNIQUE(committee_member_id, attendance_date)
);

-- =============================================
-- INDEXES for better performance
-- =============================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_participants_group ON participants(group_id);
CREATE INDEX idx_committee_members_department ON committee_members(department);
CREATE INDEX idx_attendance_committee_member ON attendance(committee_member_id);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);

-- =============================================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- NO auto-create trigger for attendance!
-- Attendance records are only created when marked
-- =============================================

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, name, department, role, status)
VALUES ('admin', '$2a$10$rQEY8TYwvCq3H9f3z8YXGO4VZq8L7dOzNqKJ3Q5e8Og0VuW7WZPvO', 'Administrator', 'administrator', 'admin', 'active');

-- Insert sample committee members for testing
INSERT INTO committee_members (name, department) VALUES
('Ehara Tomoka', 'protocol_ceremonial'),
('Wan Nur Aisyah Binti Wan Ahmad Sirajuddin', 'fnb'),
('Muhammad Hafiz Iezzudin Bin Zamri', 'pr_communication'),
('Ameerul Areef Bin Azlee', 'logistics_operations'),
('Mohammad Ridhwan Bin Mohammad Rosdi', 'executive'),
('Aleef Firdaus Bin Alias', 'logistics_operations'),
('Norazlira Binti Md Jamel', 'pr_communication'),
('Nur Afiqah Binti Amran', 'executive'),
('Muhammad Haikal Zakri Bin Mohd Zamri', 'program_activities'),
('Muhammad Syahran Saufi Bin Basir', 'technical_it_support'),
('Nur Aina Hanis Binti Mohamed Azuan', 'protocol_ceremonial'),
('Sa''ee Binti Muhammad Juhari', 'pr_communication'),
('Amir Zaki Bin Abdul Aziz', 'program_activities'),
('Aizieq Bin Azlan', 'sponsorship_finance'),
('Nur Alia Syamim Mohamad Suhaimi', 'executive'),
('Rohayu Binti Zainudin', 'protocol_ceremonial'),
('Amelisa Sufiqah Binti Zon', 'program_activities'),
('Amirul Adam Bin Kamarulazmi', 'logistics_operations'),
('Nurfarah Nabilla Binti Abdul Rafi''', 'evaluation_research_documentation'),
('Aisya Khadeja Binti Sufi Adrian', 'program_activities'),
('Muhammad Harith Bin Shamshuddin', 'pr_communication'),
('Nur Aisyah Qistina Binti Mohd Ariff', 'fnb'),
('Nurul Syamimi Aina Binti Norhisham', 'protocol_ceremonial'),
('Putera Adam Danial Bin Suharman', 'health_safety_welfare'),
('Muhammad Farihin Bin Roslan', 'logistics_operations'),
('Muhammad Khairuddin Bin Jamal Abd Nasir', 'technical_it_support'),
('Nuraisyatul Mardawiyah Binti Junaidi Akbar', 'executive'),
('Muhammad Hafis Bin Badeli', 'executive'),
('Aliya Saffiya Binti Abdul Karim', 'protocol_ceremonial'),
('Nor Aqilah Farzana Binti Mohd Yosri', 'program_activities'),
('Nur Izzati Ezini Binti Rosli', 'program_activities'),
('Muhammad Wildan Bin Ahmad Adha', 'pr_communication'),
('Aliss Shahanis Binti Mohd Anini', 'fnb'),
('Nureen Aliyyah Binti Badrul Hisham', 'pr_communication'),
('Nur Kamilia Binti Fuad', 'program_activities'),
('Nawfal Dzu Izz Bin Dzulkarnaen', 'health_safety_welfare'),
('Zharfan Haiqal Bin Zulkifli', 'logistics_operations'),
('Nur Shuhada Binti Abdullah', 'evaluation_research_documentation'),
('Nur Izzah Binti Nurzarizi', 'fnb'),
('Muhammad Haziq Hakimi Bin Mohd Khairul', 'sponsorship_finance');



-- Insert default groups
INSERT INTO groups (name) VALUES
('Team 1'),
('Team 2'),
('Team 3'),
('Team 4'),
('Team 5'),
('Team 6'),
('Team 7'),
('Team 8');

-- =============================================
-- DONE! Database ready with:
-- - Simple integer IDs (1, 2, 3...)
-- - Empty attendance table (no pre-filled records)
-- - Records created only when attendance is marked
-- =============================================
