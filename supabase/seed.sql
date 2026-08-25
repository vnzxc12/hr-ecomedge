-- ============================================================================
-- ECOMEDGE Clean Production Database Setup & Seed
-- (Safe, idempotent, works with or without RLS)
-- ============================================================================

-- 1. Disable RLS temporarily or grant full table permissions to anon & authenticated
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls DISABLE ROW LEVEL SECURITY;
ALTER TABLE payslips DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;

-- 2. Clear any old data
TRUNCATE TABLE documents CASCADE;
TRUNCATE TABLE payslips CASCADE;
TRUNCATE TABLE payrolls CASCADE;
TRUNCATE TABLE assets CASCADE;
TRUNCATE TABLE training_records CASCADE;
TRUNCATE TABLE training_programs CASCADE;
TRUNCATE TABLE time_logs CASCADE;
TRUNCATE TABLE leaves CASCADE;
TRUNCATE TABLE leave_balances CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE employees CASCADE;

-- 3. Initial Admin & Manager Employee Records
INSERT INTO employees (
    id, employee_code, first_name, last_name, job_title, department,
    employment_status, employment_type, hire_date, hourly_rate, monthly_salary,
    phone, address, emergency_contact_name, emergency_contact_phone,
    bank_name, bank_account_number
) VALUES
(1, 'EMP-001', 'Admin', 'User', 'System Owner / Executive Director', 'Management', 'active', 'full_time', '2026-01-01', 0.00, 75000.00, '+63 900 000 0001', 'Metro Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BDO', '**** 0001'),
(2, 'EMP-002', 'Operations', 'Manager', 'Operations HR Manager', 'Operations', 'active', 'full_time', '2026-01-01', 0.00, 50000.00, '+63 900 000 0002', 'Metro Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BPI', '**** 0002')
ON CONFLICT (id) DO UPDATE SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    monthly_salary = EXCLUDED.monthly_salary;

-- 4. Initial Auth Accounts (admin & manager)
-- admin: 'admin' / 'admin123'
-- manager: 'manager' / 'password01'
INSERT INTO users (id, username, password_hash, role, employee_id)
VALUES
(1, 'admin', '$2b$10$mtPqVYYkgKvbMtpSytL4Iu7UkqYkz7af63MWf3cYFDBou56jAcs9G', 'manager', 1),
(2, 'manager', '$2b$10$vMgksyJRmiGqb1prpZDoBOB7WYumNXO6u.9G3gnKJQ2rEi5flD8US', 'manager', 2)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- 5. Initial Leave Balances
INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
VALUES
(1, 2026, 15, 10, 5, 0, 0, 0),
(2, 2026, 15, 10, 5, 0, 0, 0)
ON CONFLICT (employee_id, year) DO NOTHING;

-- 6. Safely reset sequences if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'employees_id_seq') THEN
        PERFORM setval('employees_id_seq', COALESCE((SELECT MAX(id) FROM employees), 1));
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'users_id_seq') THEN
        PERFORM setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
    END IF;
END $$;
