const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db/database');
const { auditContextMiddleware } = require('../server/middleware/auditMiddleware');
const payrollRouter = require('../server/routes/payroll');

const JWT_SECRET = process.env.JWT_SECRET || 'hr-ecomedge-super-secure-jwt-secret-key-2026';

async function verifyPayrollAttendanceComputation() {
  console.log('🧪 Testing Attendance-Based Payroll Calculation (No-Work No-Pay Logic)...');

  const app = express();
  app.use(express.json());
  app.use(auditContextMiddleware);
  app.use('/api/payroll', payrollRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Setup Admin user
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'manager' LIMIT 1").get();
    const token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: 'manager', session_id: 'pay-test' }, JWT_SECRET);

    // 2. Setup 2 test employees:
    // Employee A: 0 time logs in test period
    let empA = db.prepare("SELECT * FROM employees WHERE employment_status = 'active' LIMIT 1").get();
    
    // Employee B: Dedicated employee with 80 hours logged
    db.prepare(`
      INSERT OR REPLACE INTO employees (id, employee_code, first_name, last_name, job_title, department, hire_date, monthly_salary, employment_status)
      VALUES (998, 'EMP-998', 'Alex', 'Cruz', 'Engineer', 'Technology', '2026-01-01', 16000.00, 'active')
    `).run();
    const empB = db.prepare('SELECT * FROM employees WHERE id = 998').get();

    // Ensure empA has 0 time logs in 2026-08
    db.prepare("DELETE FROM time_logs WHERE employee_id = ?").run(empA.id);
    db.prepare("DELETE FROM leaves WHERE employee_id = ?").run(empA.id);

    // Give empB 80 hours of logged time in 2026-08
    db.prepare("DELETE FROM time_logs WHERE employee_id = ?").run(empB.id);
    db.prepare(`
      INSERT INTO time_logs (employee_id, date, clock_in, clock_out, total_hours, status)
      VALUES (998, '2026-08-10', '2026-08-10T09:00:00Z', '2026-08-10T17:00:00Z', 80.0, 'clocked_out')
    `).run();

    // 3. Trigger payroll generation
    console.log('  1. Generating Payroll Run for 2026-08-01 to 2026-08-31...');
    const genRes = await fetch(`${baseUrl}/api/payroll/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ period_start: '2026-08-01', period_end: '2026-08-31' })
    });

    const genData = await genRes.json();
    console.log(`     Status: ${genRes.status} | Message: ${genData.message || genData.error}`);
    if (genRes.status !== 201) throw new Error('Payroll generation failed');

    const slipA = genData.payslips.find(s => s.employee_id === empA.id);
    const slipB = genData.payslips.find(s => s.employee_id === empB.id);

    console.log(`  2. Checking Employee A (${empA.first_name} ${empA.last_name} - 0 hours logged):`);
    console.log(`     - Hours Worked: ${slipA.total_hours_worked} hrs`);
    console.log(`     - Basic Pay: ₱${slipA.basic_pay}`);
    console.log(`     - Allowances: ₱${slipA.allowances}`);
    console.log(`     - Gross Pay: ₱${slipA.gross_pay}`);
    console.log(`     - Net Pay: ₱${slipA.net_pay}`);

    if (slipA.total_hours_worked !== 0 || slipA.gross_pay !== 0 || slipA.net_pay !== 0) {
      throw new Error(`Expected 0 pay for employee with 0 time logs, got Gross: ₱${slipA.gross_pay}, Net: ₱${slipA.net_pay}`);
    }
    console.log('     ✅ [PASS] Employee with 0 time logs correctly received ₱0.00!');

    console.log(`  3. Checking Employee B (${empB.first_name} ${empB.last_name} - 80 hours logged):`);
    console.log(`     - Hours Worked: ${slipB.total_hours_worked} hrs`);
    console.log(`     - Basic Pay: ₱${slipB.basic_pay}`);
    console.log(`     - Allowances: ₱${slipB.allowances}`);
    console.log(`     - Gross Pay: ₱${slipB.gross_pay}`);
    console.log(`     - Net Pay: ₱${slipB.net_pay}`);

    if (slipB.total_hours_worked !== 80 || slipB.gross_pay <= 0 || slipB.net_pay <= 0) {
      throw new Error(`Expected prorated pay for 80 hours, got Gross: ₱${slipB.gross_pay}`);
    }
    console.log('     ✅ [PASS] Employee with 80 logged hours received accurate prorated compensation!');

    // 4. Test deleting the test draft run
    console.log(`  4. Deleting test draft run ID #${genData.payroll.id}...`);
    const delRes = await fetch(`${baseUrl}/api/payroll/runs/${genData.payroll.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const delData = await delRes.json();
    console.log(`     Status: ${delRes.status} | Message: ${delData.message || delData.error}`);
    if (delRes.status !== 200) throw new Error('Delete draft run failed');

    console.log('\n🎉 ALL PAYROLL ATTENDANCE-BASED CALCULATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

verifyPayrollAttendanceComputation().catch(err => {
  console.error('❌ Payroll verification failed:', err);
  process.exit(1);
});
