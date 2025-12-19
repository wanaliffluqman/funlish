-- =============================================
-- FUNLISH Database Schema v2
-- IMPROVED: Added attendance_date for daily tracking
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS committee_members CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS TABLE (System users who login)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
        'technical_it',
        'evaluation_research_documentation',
        'health_safety_welfare',
        'executive',
        'program_activities',
        'media',
        'documentation'
    )),
    role VARCHAR(50) DEFAULT 'committee' CHECK (role IN ('admin', 'chairperson', 'protocol', 'registration_coordinator', 'committee')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. GROUPS TABLE (For participant team assignment: Team 1, 2, 3...)
-- =============================================
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. PARTICIPANTS TABLE (Event participants assigned to groups)
-- =============================================
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. COMMITTEE MEMBERS TABLE (Master list of committee members)
-- =============================================
CREATE TABLE committee_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL CHECK (department IN (
        'administrator',
        'pr_communication',
        'protocol_ceremonial',
        'fnb',
        'sponsorship_finance',
        'logistics_operations',
        'technical_it',
        'evaluation_research_documentation',
        'health_safety_welfare',
        'executive',
        'program_activities',
        'media',
        'documentation'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. ATTENDANCE TABLE (Tracks attendance per DATE - not just one record)
-- NEW: attendance_date field for daily tracking
-- =============================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    committee_member_id UUID NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'absent' CHECK (status IN ('attend', 'absent')),
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(10, 2),
    address TEXT,
    check_in_time TIMESTAMP WITH TIME ZONE,
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
-- FUNCTION: Create attendance records for all members for a specific date
-- Call this function to initialize attendance for today or any date
-- =============================================
CREATE OR REPLACE FUNCTION create_daily_attendance(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO attendance (committee_member_id, attendance_date, status)
    SELECT cm.id, target_date, 'absent'
    FROM committee_members cm
    WHERE NOT EXISTS (
        SELECT 1 FROM attendance a 
        WHERE a.committee_member_id = cm.id 
        AND a.attendance_date = target_date
    );
END;
$$ language 'plpgsql';

-- =============================================
-- FUNCTION: Get attendance for a specific date (with member details)
-- =============================================
CREATE OR REPLACE FUNCTION get_attendance_for_date(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    id UUID,
    committee_member_id UUID,
    name VARCHAR(100),
    department VARCHAR(100),
    attendance_date DATE,
    status VARCHAR(20),
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(10, 2),
    address TEXT,
    check_in_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- First ensure records exist for this date
    PERFORM create_daily_attendance(target_date);
    
    -- Return the attendance records with member info
    RETURN QUERY
    SELECT 
        a.id,
        a.committee_member_id,
        cm.name,
        cm.department,
        a.attendance_date,
        a.status,
        a.photo_url,
        a.latitude,
        a.longitude,
        a.accuracy,
        a.address,
        a.check_in_time
    FROM attendance a
    JOIN committee_members cm ON a.committee_member_id = cm.id
    WHERE a.attendance_date = target_date
    ORDER BY cm.name;
END;
$$ language 'plpgsql';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Only admins can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update users" ON users FOR UPDATE USING (true);
CREATE POLICY "Only admins can delete users" ON users FOR DELETE USING (true);

-- Policies for groups table
CREATE POLICY "Anyone can view groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Only admins can manage groups" ON groups FOR ALL USING (true);

-- Policies for participants table
CREATE POLICY "Anyone can view participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Anyone can manage participants" ON participants FOR ALL USING (true);

-- Policies for committee_members table
CREATE POLICY "Anyone can view committee members" ON committee_members FOR SELECT USING (true);
CREATE POLICY "Anyone can manage committee members" ON committee_members FOR ALL USING (true);

-- Policies for attendance table
CREATE POLICY "Anyone can view attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attendance" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update attendance" ON attendance FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete attendance" ON attendance FOR DELETE USING (true);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert default groups (Team 1 to Team 8)
INSERT INTO groups (name) VALUES
    ('Team 1'), ('Team 2'), ('Team 3'), ('Team 4'),
    ('Team 5'), ('Team 6'), ('Team 7'), ('Team 8');

-- Insert admin user (Username: administrator, Password: Welcome@123)
-- Password is hashed using bcrypt
INSERT INTO users (username, password, name, department, role, status) VALUES
    ('administrator', '$2b$10$5zeGbEc5/ZwblI60lpWg4.YltT6ScH4zTqXLqH.6PG.q98.Tsv6qq', 'System Administrator', 'administrator', 'admin', 'active');

-- =============================================
-- COMMITTEE MEMBERS DATA (40 Members)
-- =============================================
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
    ('Muhammad Syahran Saufi Bin Basir', 'technical_it'),
    ('Nur Aina Hanis Binti Mohamed Azuan', 'protocol_ceremonial'),
    ('Sa''ee Binti Muhammad Juhari', 'pr_communication'),
    ('Amir Zaki Bin Abdul Aziz', 'program_activities'),
    ('Aizieq Bin Azlan', 'sponsorship_finance'),
    ('Nur Alia Syamim Mohamad Suhaimi', 'executive'),
    ('Rohayu Binti Zainudin', 'protocol_ceremonial'),
    ('Amelisa Sufiqah Binti Zon', 'program_activities'),
    ('Amirul Adam Bin Kamarulazmi', 'logistics_operations'),
    ('Nurfarah Nabilla Binti Abdul Rafi''', 'documentation'),
    ('Aisya Khadeja Binti Sufi Adrian', 'program_activities'),
    ('Muhammad Harith Bin Shamshuddin', 'pr_communication'),
    ('Nur Aisyah Qistina Binti Mohd Ariff', 'fnb'),
    ('Nurul Syamimi Aina Binti Norhisham', 'protocol_ceremonial'),
    ('Putera Adam Danial Bin Suharman', 'health_safety_welfare'),
    ('Muhammad Farihin Bin Roslan', 'logistics_operations'),
    ('Muhammad Khairuddin Bin Jamal Abd Nasir', 'technical_it'),
    ('Nuraisyatul Mardawiyah Binti Junaidi Akbar', 'executive'),
    ('Muhammad Hafis Bin Badeli', 'executive'),
    ('Aliya Saffiya Binti Abdul Karim', 'protocol_ceremonial'),
    ('Nor Aqilah Farzana Binti Mohd Yosri', 'program_activities'),
    ('Nur Izzati Ezini Binti Rosli', 'program_activities'),
    ('Muhammad Wildan Bin Ahmad Adha', 'media'),
    ('Aliss Shahanis Binti Mohd Anini', 'fnb'),
    ('Nureen Aliyyah Binti Badrul Hisham', 'media'),
    ('Nur Kamilia Binti Fuad', 'program_activities'),
    ('Nawfal Dzu Izz Bin Dzulkarnaen', 'health_safety_welfare'),
    ('Zharfan Haiqal Bin Zulkifli', 'logistics_operations'),
    ('Nur Shuhada Binti Abdullah', 'documentation'),
    ('Nur Izzah Binti Nurzarizi', 'fnb'),
    ('Muhammad Haziq Hakimi Bin Mohd Khairul', 'sponsorship_finance');

-- Create attendance records for today
SELECT create_daily_attendance(CURRENT_DATE);
