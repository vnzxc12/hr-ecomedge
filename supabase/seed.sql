-- ============================================================================
-- HR-EcomEdge Database Seed Data (PostgreSQL / Supabase)
-- ============================================================================

-- 1. Seed Employees
INSERT INTO employees (id, employee_code, first_name, last_name, job_title, department, employment_status, employment_type, hire_date, hourly_rate, monthly_salary, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number)
VALUES
(1, 'EMP-001', 'Alex', 'Vance', 'HR & Operations Director', 'Human Resources', 'active', 'full_time', '2023-01-15', 35.00, 6000.00, '+1 (555) 019-2834', '742 Evergreen Terrace, Springfield', 'Elena Vance', '+1 (555) 019-2835', 'Chase Bank', '**** 4892'),
(2, 'EMP-002', 'John', 'Doe', 'Senior Full-Stack Engineer', 'Engineering', 'active', 'full_time', '2023-03-01', 45.00, 7800.00, '+1 (555) 349-1102', '124 Conch Street, Pacific City', 'Jane Doe', '+1 (555) 349-9944', 'Bank of America', '**** 1120'),
(3, 'EMP-003', 'Sarah', 'Smith', 'UI/UX Product Designer', 'Design & Product', 'active', 'full_time', '2023-06-15', 38.00, 6500.00, '+1 (555) 882-9901', '405 Lexington Ave, Metro City', 'David Smith', '+1 (555) 882-9902', 'Wells Fargo', '**** 3391'),
(4, 'EMP-004', 'Michael', 'Lee', 'Marketing & E-Commerce Lead', 'Marketing', 'active', 'full_time', '2023-09-01', 32.00, 5500.00, '+1 (555) 441-2098', '89 Ocean Drive, Bay Area', 'Grace Lee', '+1 (555) 441-2099', 'Citibank', '**** 7762'),
(5, 'EMP-005', 'Emily', 'Davis', 'Customer Operations Specialist', 'Operations', 'active', 'full_time', '2024-02-10', 25.00, 4300.00, '+1 (555) 672-4411', '12 Elm Street, Riverdale', 'Robert Davis', '+1 (555) 672-4412', 'Capital One', '**** 5510')
ON CONFLICT (id) DO NOTHING;

SELECT setval('employees_id_seq', (SELECT MAX(id) FROM employees));

-- 2. Seed Users (Authentication with username & password)
-- Password for admin is 'admin123'
-- Password for all employees is 'password123'
INSERT INTO users (id, username, password_hash, role, employee_id)
VALUES
(1, 'admin', '$2b$10$T/qXw2TLwFVq9g4GOnwGteaIZ4wOJg5s7f0162T6ZV6bNY76dsa8K', 'manager', 1),
(2, 'john.doe', '$2b$10$cUO66vA6q6u17V84Ixtjau0D2DWEL7sFZpHSlqffS/H8UYXK3QpYy', 'employee', 2),
(3, 'sarah.smith', '$2b$10$cUO66vA6q6u17V84Ixtjau0D2DWEL7sFZpHSlqffS/H8UYXK3QpYy', 'employee', 3),
(4, 'michael.lee', '$2b$10$cUO66vA6q6u17V84Ixtjau0D2DWEL7sFZpHSlqffS/H8UYXK3QpYy', 'employee', 4),
(5, 'emily.davis', '$2b$10$cUO66vA6q6u17V84Ixtjau0D2DWEL7sFZpHSlqffS/H8UYXK3QpYy', 'employee', 5)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 3. Seed Leave Balances
INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
VALUES
(1, 2026, 20, 12, 5, 2, 1, 0),
(2, 2026, 15, 10, 5, 3, 0, 0),
(3, 2026, 15, 10, 5, 1, 2, 1),
(4, 2026, 15, 10, 5, 0, 1, 0),
(5, 2026, 15, 10, 5, 0, 0, 0)
ON CONFLICT (employee_id, year) DO NOTHING;

-- 4. Seed Time Logs (Recent punch logs)
INSERT INTO time_logs (employee_id, date, clock_in, break_start, break_end, clock_out, total_hours, break_duration_mins, overtime_hours, status, notes)
VALUES
(2, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '7 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL, 6.00, 60, 0.00, 'clocked_in', 'Working on API enhancements'),
(3, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes', NULL, 5.50, 30, 0.00, 'clocked_in', 'Design sprint review'),
(4, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, NULL, 4.00, 0, 0.00, 'on_break', 'Lunch break at cafeteria'),
(5, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 7.83, 60, 0.00, 'clocked_out', 'Finished ticket triage')
ON CONFLICT DO NOTHING;

-- 5. Seed Leaves
INSERT INTO leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, reviewed_by, review_notes)
VALUES
(2, 'vacation', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '13 days', 3, 'Annual family holiday trip', 'approved', 1, 'Approved! Enjoy your time off.'),
(3, 'sick', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '14 days', 2, 'Flu and fever rest', 'approved', 1, 'Medical certificate acknowledged'),
(4, 'vacation', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE + INTERVAL '22 days', 2, 'Attending wedding out of town', 'pending', NULL, NULL);

-- 6. Seed Training Programs
INSERT INTO training_programs (id, title, description, instructor, duration_hours, start_date, end_date, status)
VALUES
(1, 'E-Commerce Security & Data Privacy (GDPR/SOC2)', 'Essential compliance and security practices for customer data handling.', 'Dr. Alan Vance', 12, '2026-08-01', '2026-08-30', 'in_progress'),
(2, 'Advanced Modern React & Performance Engineering', 'Deep dive into rendering optimization, state machines, and micro-frontends.', 'Senior Architect Mark', 16, '2026-07-01', '2026-07-25', 'completed'),
(3, 'Customer Success & Conflict Resolution Masterclass', 'Techniques for high-stakes customer negotiations and empathy-first support.', 'Sarah Lin', 8, '2026-09-05', '2026-09-10', 'upcoming')
ON CONFLICT (id) DO NOTHING;

SELECT setval('training_programs_id_seq', (SELECT MAX(id) FROM training_programs));

-- 7. Seed Training Records
INSERT INTO training_records (training_id, employee_id, completion_status, score, certificate_url, completion_date)
VALUES
(1, 2, 'in_progress', 88.50, NULL, NULL),
(1, 4, 'in_progress', 75.00, NULL, NULL),
(2, 2, 'completed', 96.00, '/certificates/react-adv-emp002.pdf', '2026-07-25'),
(3, 5, 'enrolled', NULL, NULL, NULL)
ON CONFLICT (training_id, employee_id) DO NOTHING;

-- 8. Seed Assets
INSERT INTO assets (id, asset_tag, name, category, model_serial, status, assigned_to, assigned_date, expected_return_date, condition, notes)
VALUES
(1, 'AST-MBP-01', 'MacBook Pro 16" M3 Max', 'laptop', 'C02G4190MD6R', 'assigned', 2, '2023-03-01', '2027-03-01', 'new', 'Development workstation'),
(2, 'AST-MBP-02', 'MacBook Pro 14" M3 Pro', 'laptop', 'C02F3910KL1X', 'assigned', 3, '2023-06-15', '2027-06-15', 'good', 'Design & UI machine'),
(3, 'AST-MON-01', 'Dell UltraSharp 27" 4K USB-C Monitor', 'monitor', 'CN-0K793H-74443', 'assigned', 2, '2023-03-05', '2027-03-05', 'good', 'Dual monitor setup'),
(4, 'AST-MON-02', 'LG UltraFine 32" Ergo 4K Monitor', 'monitor', '32UN880-B-99124', 'assigned', 3, '2023-06-20', '2027-06-20', 'good', 'Color calibrated for design'),
(5, 'AST-KEY-01', 'Logitech MX Master 3S & Mechanical Mini', 'peripheral', 'MX-SET-9910', 'assigned', 4, '2023-09-01', '2027-09-01', 'good', 'Marketing setup'),
(6, 'AST-LAP-03', 'Dell XPS 15 9530 i9 32GB', 'laptop', 'DL-XPS-499120', 'available', NULL, NULL, NULL, 'new', 'Ready for new hire allocation')
ON CONFLICT (id) DO NOTHING;

SELECT setval('assets_id_seq', (SELECT MAX(id) FROM assets));

-- 9. Seed Payroll and Payslips
INSERT INTO payrolls (id, payroll_code, period_start, period_end, status, total_gross, total_deductions, total_net, created_by, payment_date)
VALUES
(1, 'PAY-2026-07', '2026-07-01', '2026-07-31', 'paid', 30100.00, 3612.00, 26488.00, 1, '2026-07-31')
ON CONFLICT (id) DO NOTHING;

SELECT setval('payrolls_id_seq', (SELECT MAX(id) FROM payrolls));

INSERT INTO payslips (payroll_id, employee_id, basic_pay, overtime_pay, allowances, gross_pay, tax_deduction, social_deductions, other_deductions, net_pay, total_hours_worked, overtime_hours, payment_status)
VALUES
(1, 1, 6000.00, 0.00, 500.00, 6500.00, 520.00, 260.00, 0.00, 5720.00, 160.00, 0.00, 'paid'),
(1, 2, 7800.00, 450.00, 500.00, 8750.00, 700.00, 350.00, 0.00, 7700.00, 168.00, 8.00, 'paid'),
(1, 3, 6500.00, 0.00, 400.00, 6900.00, 552.00, 276.00, 0.00, 6072.00, 160.00, 0.00, 'paid'),
(1, 4, 5500.00, 200.00, 400.00, 6100.00, 488.00, 244.00, 0.00, 5368.00, 164.00, 4.00, 'paid'),
(1, 5, 4300.00, 0.00, 300.00, 4600.00, 368.00, 184.00, 0.00, 4048.00, 160.00, 0.00, 'paid')
ON CONFLICT DO NOTHING;
