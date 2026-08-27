-- ============================================================================
-- ECOMEDGE HRIS Initial Clean Root Setup
-- ============================================================================

-- Initial Root Employee
INSERT INTO employees (
    id, employee_code, first_name, last_name, job_title, department,
    employment_status, employment_type, hire_date, hourly_rate, monthly_salary
) VALUES (
    1, 'EMP-001', 'Admin', 'User', 'System Owner / Executive Director', 'Management',
    'active', 'full_time', '2026-01-01', 0.00, 0.00
) ON CONFLICT (id) DO NOTHING;

-- Initial Root Admin User (Username: admin, Password: password123)
INSERT INTO users (
    id, username, password_hash, role, employee_id
) VALUES (
    1, 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'manager', 1
) ON CONFLICT (id) DO NOTHING;

-- Initial Leave Quota for Root Admin
INSERT INTO leave_balances (
    employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used
) VALUES (
    1, 2026, 15, 10, 5, 0, 0, 0
) ON CONFLICT (employee_id, year) DO NOTHING;
