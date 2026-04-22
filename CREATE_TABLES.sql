-- Supabase Database Schema for Beergeel Clinic System
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/wbcnyzzvynqgoaexehor/sql

-- Users table (staff: reception, doctor, pharmacy, lab)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'reception', 'doctor', 'pharmacy', 'lab'
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    sex VARCHAR(20),
    mobile VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    registered_by INTEGER REFERENCES users(id),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    bp VARCHAR(50),
    temp VARCHAR(50),
    pulse VARCHAR(50),
    weight VARCHAR(50),
    complaint TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Consultations table
CREATE TABLE IF NOT EXISTS consultations (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES users(id),
    diagnosis TEXT,
    notes TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Lab requests table
CREATE TABLE IF NOT EXISTS lab_requests (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    test_name VARCHAR(255),
    notes TEXT,
    results TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed'
    completed_date TIMESTAMPTZ,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    medication TEXT,
    dosage TEXT,
    instructions TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'dispensed'
    dispensed_by INTEGER REFERENCES users(id),
    dispensed_date TIMESTAMPTZ,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_type VARCHAR(50),
    notes TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    category VARCHAR(255),
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Notices table
CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    updated_by VARCHAR(255),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    appointment_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER,
    to_user_id INTEGER,
    message TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Queue table
CREATE TABLE IF NOT EXISTS queue (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
    department VARCHAR(50) NOT NULL, -- 'doctor', 'pharmacy', 'lab'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed'
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default users
INSERT INTO users (username, password, role, name, mobile) VALUES
    ('4026635', '1234', 'reception', 'Reception Staff', '4026635'),
    ('4696972', '1234', 'doctor', 'Dr. Ahmed', '4696972'),
    ('4730530', '1234', 'pharmacy', 'Pharmacy Staff', '4730530'),
    ('8144099', '1234', 'lab', 'Lab Technician', '8144099')
ON CONFLICT (username) DO NOTHING;

-- Insert default notice
INSERT INTO notices (content, updated_by) VALUES
    ('Welcome to Beergeel Obstetrics and Gynecology Clinic. Clinic hours: 5:00 PM - 10:00 PM. Emergency services available 24/7.', 'System')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_date ON visits(created_date);
CREATE INDEX IF NOT EXISTS idx_queue_visit_id ON queue(visit_id);
CREATE INDEX IF NOT EXISTS idx_queue_department ON queue(department);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

