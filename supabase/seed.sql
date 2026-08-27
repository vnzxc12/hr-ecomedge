-- ============================================================================
-- ECOMEDGE HRIS Initial Clean Root Setup
-- ============================================================================

-- Initial Root Admin User (Username: admin, Password: password123)
-- Role: manager (Full administrator rights)
INSERT INTO users (
    id, username, password_hash, role, employee_id
) VALUES (
    1, 'admin', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', 'manager', NULL
) ON CONFLICT (id) DO UPDATE SET
    username = 'admin',
    password_hash = '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi',
    role = 'manager',
    employee_id = NULL;
