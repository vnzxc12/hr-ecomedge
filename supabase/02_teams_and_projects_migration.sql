-- ============================================================================
-- ECOMEDGE HRIS - TEAMS, CLIENTS, PROJECTS & OPERATIONS TABLES MIGRATION
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bmlhdnexcxdjoqoebtyt/sql/new
-- ============================================================================

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    department VARCHAR(100) NOT NULL,
    team_lead_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Designations Table
CREATE TABLE IF NOT EXISTS designations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    level VARCHAR(50) DEFAULT 'Mid-Level',
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    industry VARCHAR(150),
    contact_person VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Alter Employees Table to add missing columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id INTEGER;

-- 5. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    project_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(50) DEFAULT 'medium',
    budget NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Project Work Assignments Table
CREATE TABLE IF NOT EXISTS project_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_on_project VARCHAR(100) DEFAULT 'Research Analyst',
    allocation_percent INTEGER DEFAULT 100,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_proj_emp UNIQUE(project_id, employee_id)
);

-- 7. Create Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time VARCHAR(20) DEFAULT '09:00',
    end_time VARCHAR(20) DEFAULT '18:00',
    break_mins INTEGER DEFAULT 60,
    total_hours NUMERIC(6, 2) DEFAULT 8.00,
    overtime_hours NUMERIC(6, 2) DEFAULT 0.00,
    task_description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted',
    reviewed_by INTEGER,
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create Performance Reviews Table
CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id INTEGER,
    review_period VARCHAR(50) NOT NULL,
    rating NUMERIC(3, 1) NOT NULL DEFAULT 5.0,
    productivity_score NUMERIC(3, 1) DEFAULT 5.0,
    quality_score NUMERIC(3, 1) DEFAULT 5.0,
    accuracy_score NUMERIC(3, 1) DEFAULT 5.0,
    client_satisfaction NUMERIC(3, 1) DEFAULT 5.0,
    goals TEXT,
    manager_comments TEXT,
    employee_comments TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create Asset Assignments Table
CREATE TABLE IF NOT EXISTS asset_assignments (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    expected_return_date DATE,
    returned_date DATE,
    condition_on_assign VARCHAR(50) DEFAULT 'good',
    condition_on_return VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username VARCHAR(100) NOT NULL DEFAULT 'system',
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Row Level Security (RLS) & Anon Access Policies
-- ============================================================================

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'teams', 'designations', 'clients', 'projects', 
            'project_assignments', 'timesheets', 'performance_reviews', 
            'asset_assignments', 'audit_logs'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public access for all" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Public access for all" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;
