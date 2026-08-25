-- ============================================================================
-- HR-EcomEdge Database Schema (PostgreSQL / Supabase)
-- ============================================================================

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    employment_status VARCHAR(50) DEFAULT 'active', -- active, probationary, resigned, terminated
    employment_type VARCHAR(50) DEFAULT 'full_time', -- full_time, part_time, contract
    hire_date DATE NOT NULL,
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    monthly_salary NUMERIC(10, 2) DEFAULT 0.00,
    phone VARCHAR(50),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users / Auth Table (Username & Password based, No Email Required)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee', -- 'manager' (or 'owner/admin') | 'employee'
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Time Logs / Attendance
CREATE TABLE IF NOT EXISTS time_logs (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_hours NUMERIC(6, 2) DEFAULT 0.00,
    break_duration_mins INTEGER DEFAULT 0,
    overtime_hours NUMERIC(6, 2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'clocked_in', -- 'clocked_in', 'on_break', 'clocked_out'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Leave Types & Applications
CREATE TABLE IF NOT EXISTS leaves (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- 'vacation', 'sick', 'emergency', 'maternity_paternity', 'unpaid'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    vacation_days INTEGER DEFAULT 15,
    sick_days INTEGER DEFAULT 10,
    emergency_days INTEGER DEFAULT 5,
    vacation_used INTEGER DEFAULT 0,
    sick_used INTEGER DEFAULT 0,
    emergency_used INTEGER DEFAULT 0,
    UNIQUE(employee_id, year)
);

-- 6. Payroll Runs
CREATE TABLE IF NOT EXISTS payrolls (
    id SERIAL PRIMARY KEY,
    payroll_code VARCHAR(50) UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'paid'
    total_gross NUMERIC(12, 2) DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) DEFAULT 0.00,
    total_net NUMERIC(12, 2) DEFAULT 0.00,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_date DATE
);

-- 7. Employee Payslips
CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    payroll_id INTEGER NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    basic_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    overtime_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gross_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    social_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_hours_worked NUMERIC(6, 2) DEFAULT 0.00,
    overtime_hours NUMERIC(6, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Employee Documents (CV, IDs, Contracts, Certificates, etc.)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'resume_cv', 'government_id', 'contract', 'certificate', 'performance_review', 'other'
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Training Programs
CREATE TABLE IF NOT EXISTS training_programs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor VARCHAR(100),
    duration_hours INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'upcoming', -- 'upcoming', 'in_progress', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Training Records (Employee Enrollments)
CREATE TABLE IF NOT EXISTS training_records (
    id SERIAL PRIMARY KEY,
    training_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    completion_status VARCHAR(50) DEFAULT 'enrolled', -- 'enrolled', 'in_progress', 'completed', 'failed'
    score NUMERIC(5, 2),
    certificate_url TEXT,
    completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(training_id, employee_id)
);

-- 11. Assets & Equipment Tracking
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_tag VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'laptop', 'monitor', 'mobile', 'peripheral', 'keys', 'vehicle', 'other'
    model_serial VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'assigned', 'maintenance', 'retired'
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    assigned_date DATE,
    expected_return_date DATE,
    condition VARCHAR(50) DEFAULT 'good', -- 'new', 'good', 'fair', 'damaged'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_time_logs_employee_date ON time_logs(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll ON payslips(payroll_id);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);
