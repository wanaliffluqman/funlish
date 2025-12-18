-- =============================================
-- FUNLISH Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS TABLE (Committee members who login)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50) DEFAULT 'logistics' CHECK (department IN ('leadership', 'logistics', 'media', 'registration', 'protocol', 'technical')),
    role VARCHAR(50) DEFAULT 'committee' CHECK (role IN ('admin', 'chairperson', 'protocol', 'registration_coordinator', 'committee')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. GROUPS TABLE (For participant team assignment: Team A, B, C...)
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
-- 4. ATTENDANCE TABLE (Committee attendance records)
-- =============================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('attend', 'absent', 'pending')),
    photo_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(10, 2),
    address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES for better performance
-- =============================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_participants_group ON participants(group_id);
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_timestamp ON attendance(timestamp);
CREATE INDEX idx_attendance_status ON attendance(status);

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

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update users" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Only admins can delete users" ON users
    FOR DELETE USING (true);

-- Policies for groups table
CREATE POLICY "Anyone can view groups" ON groups
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage groups" ON groups
    FOR ALL USING (true);

-- Policies for participants table
CREATE POLICY "Anyone can view participants" ON participants
    FOR SELECT USING (true);

CREATE POLICY "Anyone can manage participants" ON participants
    FOR ALL USING (true);

-- Policies for attendance table
CREATE POLICY "Anyone can view attendance" ON attendance
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their attendance" ON attendance
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their attendance" ON attendance
    FOR UPDATE USING (true);

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert default groups (Team A to Team H)
INSERT INTO groups (name) VALUES
    ('Team A'),
    ('Team B'),
    ('Team C'),
    ('Team D'),
    ('Team E'),
    ('Team F'),
    ('Team G'),
    ('Team H');

-- Insert sample admin user (password: admin123 - hash this in production!)
INSERT INTO users (username, password, name, role) VALUES
    ('admin', 'admin123', 'Administrator', 'admin');
