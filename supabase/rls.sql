-- ============================================================================
-- HR-EcomEdge Row-Level Security (RLS) Policies (Optional for Supabase)
-- ============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- 2. Allow backend service_role full access (used by Express server)
-- Note: In Supabase, the `service_role` key automatically bypasses RLS.

-- 3. Policies for Authenticated / Public Access if querying directly from Supabase
-- Public read for training programs
CREATE POLICY "Allow public read of training programs" ON training_programs
    FOR SELECT USING (true);

-- Allow authenticated users to view active employees
CREATE POLICY "Allow authenticated read of employees" ON employees
    FOR SELECT USING (true);

-- Allow service role full management across all tables
CREATE POLICY "Service role full access on users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on employees" ON employees
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on time_logs" ON time_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on leaves" ON leaves
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on leave_balances" ON leave_balances
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on payrolls" ON payrolls
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on payslips" ON payslips
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on documents" ON documents
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on training_programs" ON training_programs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on training_records" ON training_records
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on assets" ON assets
    FOR ALL USING (auth.role() = 'service_role');
