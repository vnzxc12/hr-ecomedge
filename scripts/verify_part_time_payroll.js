const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db/database');
const { auditContextMiddleware } = require('../server/middleware/auditMiddleware');
const payrollRouter = require('../server/routes/payroll');
const employeesRouter = require('../server/routes/employees');

const JWT_SECRET = process.env.JWT_SECRET || 'hr-ecomedge-super-secure-jwt-secret-key-2026';

async function verifyPartTimePayroll() {
  console.log('🧪 Testing Part-Time Hourly Rate Payroll Calculation...');

  const app = express();
  app.use(express.json());
  app.use(auditContextMiddleware);
  app.use('/api/payroll', payrollRouter);
  app.use('/api/employees', employeesRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'manager' LIMIT 1").get();
    const sessionId = 'pt-test-session-' + Date.now();
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    db.prepare(`
      INSERT OR REPLACE INTO user_sessions (id, user_id, device_fingerprint, ip_address, user_agent, is_revoked, created_at, last_active_at, expires_at)
      VALUES (?, ?, 'dummy_fingerprint', '127.0.0.1', 'Node-Test', 0, ?, ?, ?)
    `).run(sessionId, adminUser.id, nowIso, nowIso, expiresIso);

    const token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: 'manager', session_id: sessionId }, JWT_SECRET);

    // 1. Create or set up a Part-Time employee with ₱150/hr
    console.log('  1. Creating Part-Time Employee with ₱150.00/hr...');
    db.prepare(`
      INSERT OR REPLACE INTO employees (
        id, employee_code, first_name, last_name, job_title, department,
        employment_status, employment_type, hire_date, hourly_rate, monthly_salary
      ) VALUES (999, 'EMP-999', 'PartTime', 'Researcher', 'Junior Analyst', 'Research & Analytics', 'active', 'part_time', '2026-01-01', 150.00, 0.00)
    `).run();

    const emp = db.prepare('SELECT * FROM employees WHERE id = 999').get();
    console.log(`     Employee: ${emp.first_name} ${emp.last_name} | Type: ${emp.employment_type} | Rate: ₱${emp.hourly_rate}/hr`);

    // 2. Log 50 hours of time logs in August 2026
    db.prepare("DELETE FROM time_logs WHERE employee_id = 999").run();
    db.prepare(`
      INSERT INTO time_logs (employee_id, date, clock_in, clock_out, total_hours, status)
      VALUES (999, '2026-08-15', '2026-08-15T09:00:00Z', '2026-08-15T17:00:00Z', 50.0, 'clocked_out')
    `).run();

    // 3. Generate Payroll Run
    console.log('  2. Generating Payroll Run for 2026-08-01 to 2026-08-31...');
    const genRes = await fetch(`${baseUrl}/api/payroll/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ period_start: '2026-08-01', period_end: '2026-08-31' })
    });

    const genData = await genRes.json();
    console.log(`     Status: ${genRes.status} | Message: ${genData.message || genData.error}`);
    if (genRes.status !== 201) throw new Error('Payroll generation failed');

    const ptSlip = genData.payslips.find(s => s.employee_id === 999);
    if (!ptSlip) throw new Error('Part-time payslip not generated');

    console.log('  3. Checking Part-Time Compensation Breakdown:');
    console.log(`     - Logged Hours: ${ptSlip.total_hours_worked} hrs`);
    console.log(`     - Basic Pay: ₱${ptSlip.basic_pay} (Expected: 50 × 150 = ₱7,500.00)`);
    console.log(`     - Allowances: ₱${ptSlip.allowances}`);
    console.log(`     - Gross Pay: ₱${ptSlip.gross_pay}`);
    console.log(`     - Deductions: -₱${ptSlip.tax_deduction + ptSlip.social_deductions + ptSlip.other_deductions}`);
    console.log(`     - Net Take-Home Pay: ₱${ptSlip.net_pay}`);

    if (ptSlip.basic_pay !== 7500 || ptSlip.total_hours_worked !== 50) {
      throw new Error(`Expected Basic Pay of ₱7,500.00 for 50 hrs @ ₱150/hr, got ₱${ptSlip.basic_pay}`);
    }

    console.log('     ✅ [PASS] Part-time hourly calculation is 100% accurate!');

    // 4. Clean up
    await fetch(`${baseUrl}/api/payroll/runs/${genData.payroll.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    db.prepare('DELETE FROM employees WHERE id = 999').run();
    db.prepare('DELETE FROM time_logs WHERE employee_id = 999').run();

    console.log('\n🎉 ALL PART-TIME PAYROLL HOURLY COMPUTATION TESTS PASSED!');
  } finally {
    server.close();
  }
}

verifyPartTimePayroll().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
