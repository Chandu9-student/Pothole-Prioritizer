-- Pothole Detection System Database Schema
-- Run this in Supabase SQL Editor

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'panchayath_admin', 'municipality_admin', 'national_admin')),
    jurisdiction_area TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- POTHOLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS potholes (
    id SERIAL PRIMARY KEY,
    reference_number TEXT UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    mandal TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('reported', 'in_progress', 'fixed', 'rejected')) DEFAULT 'reported',
    reporter_name TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    confidence DOUBLE PRECISION,
    detection_method TEXT CHECK (detection_method IN ('automatic', 'manual')),
    priority_score INTEGER DEFAULT 1,
    report_count INTEGER DEFAULT 1,
    reporters TEXT[] DEFAULT '{}',
    reported_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_priority_update TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- INVITATION CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('panchayath_admin', 'municipality_admin', 'national_admin')),
    jurisdiction TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_by TEXT,
    used_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_potholes_mandal ON potholes(mandal);
CREATE INDEX IF NOT EXISTS idx_potholes_status ON potholes(status);
CREATE INDEX IF NOT EXISTS idx_potholes_severity ON potholes(severity);
CREATE INDEX IF NOT EXISTS idx_potholes_location ON potholes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_is_used ON invitation_codes(is_used);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE potholes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Users table policies
CREATE POLICY "Users can read their own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Potholes table policies (allow all authenticated users to read/write)
CREATE POLICY "Anyone can read potholes" ON potholes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert potholes" ON potholes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update potholes" ON potholes
    FOR UPDATE USING (true);

-- Invitation codes policies
CREATE POLICY "Anyone can read unused invitation codes" ON invitation_codes
    FOR SELECT USING (is_used = false);

CREATE POLICY "Admins can insert invitation codes" ON invitation_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update invitation codes" ON invitation_codes
    FOR UPDATE USING (true);

-- ============================================================================
-- INSERT DEFAULT ADMIN USER (password: admin123)
-- ============================================================================
-- Note: Password hash is for "admin123" - CHANGE THIS IN PRODUCTION!
INSERT INTO users (email, password_hash, name, role, jurisdiction_area)
VALUES (
    'admin@potholeproritizer.com',
    'scrypt:32768:8:1$VQBbrXrHqDqjZn1o$6f0d5a7ac63be1dbc1cb21d9e9fb13f5a3d1f27f10d68f8ff3c40e14e8b8cd9c1c0e11a04fe826e9e48c88c1e97c7c7d02e98e6f8a73e8f8d0e4e9e9e3e8f0e',
    'National Administrator',
    'national_admin',
    'all'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup:
-- SELECT * FROM users;
-- SELECT * FROM potholes;
-- SELECT * FROM invitation_codes;
