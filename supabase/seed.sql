-- ============================================================================
-- ECOMEDGE Database Seed Data (Clean Production Initial Accounts)
-- ============================================================================

-- Clean existing data
DELETE FROM documents;
DELETE FROM payslips;
DELETE FROM payrolls;
DELETE FROM assets;
DELETE FROM training_records;
DELETE FROM training_programs;
DELETE FROM time_logs;
DELETE FROM leaves;
DELETE FROM leave_balances;
DELETE FROM users;
DELETE FROM employees;

-- 1. Initial Admin & Manager Employee Records
INSERT INTO employees (id, employee_code, first_name, last_name, job_title, department, employment_status, employment_type, hire_date, hourly_rate, monthly_salary, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number)
VALUES
(1, 'EMP-001', 'Admin', 'User', 'System Owner / Executive Director', 'Management', 'active', 'full_time', '2026-01-01', 0.00, 75000.00, '+63 900 000 0001', 'Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BDO', '**** 0001'),
(2, 'EMP-002', 'Operations', 'Manager', 'Operations HR Manager', 'Operations', 'active', 'full_time', '2026-01-01', 0.00, 50000.00, '+63 900 000 0002', 'Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BPI', '**** 0002')
ON CONFLICT (id) DO NOTHING;

SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));

-- 2. Initial Auth Accounts (Username & Password)
-- admin: 'admin' / 'admin123'
-- manager: 'manager' / 'password01'
INSERT INTO users (id, username, password_hash, role, employee_id)
VALUES
(1, 'admin', '$2b$10$mtPqVYYkgKvbMtpSytL4Iu7UkqYkz7af63MWf3cYFDBou56jAcs9G', 'manager', 1),
(2, 'manager', '$2b$10$vMgksyJRmiGqb1prpZDoBOB7WYumNXO6u.9G3gnKJQ2rEi5flD8US', 'manager', 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 3. Initial Leave Balances for accounts
INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
VALUES
(1, 2026, 15, 10, 5, 0, 0, 0),
(2, 2026, 15, 10, 5, 0, 0, 0)
ON CONFLICT (employee_id, year) DO NOTHING;
