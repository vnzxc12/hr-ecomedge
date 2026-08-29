const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db/database');
const { auditContextMiddleware } = require('../server/middleware/auditMiddleware');
const timelogsRouter = require('../server/routes/timelogs');
const dashboardRouter = require('../server/routes/dashboard');

const JWT_SECRET = process.env.JWT_SECRET || 'hr-ecomedge-super-secure-jwt-secret-key-2026';

async function verifyPunchActions() {
  console.log('🧪 Testing End-to-End Punch Clock API Actions...');

  const app = express();
  app.use(express.json());
  app.use(auditContextMiddleware);
  app.use('/api/timelogs', timelogsRouter);
  app.use('/api/dashboard', dashboardRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Ensure employee and user exist
    let emp = db.prepare("SELECT * FROM employees WHERE employment_status = 'active' LIMIT 1").get();
    let user = db.prepare("SELECT * FROM users WHERE employee_id = ?").get(emp.id);

    if (!user) {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, username, password_hash, role, employee_id)
        VALUES (999, 'teststaff', 'hash', 'employee', ?)
      `).run(emp.id);
      user = db.prepare("SELECT * FROM users WHERE id = 999").get();
    }

    // Clear prior logs for clean test
    db.prepare('DELETE FROM time_logs WHERE employee_id = ?').run(emp.id);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, session_id: 'test-sess' }, JWT_SECRET);

    // 2. Test Clock In
    console.log('  1. Testing POST /api/timelogs/punch -> clock_in');
    const inRes = await fetch(`${baseUrl}/api/timelogs/punch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'clock_in', notes: 'Starting morning shift' })
    });
    const inData = await inRes.json();
    console.log(`     Status: ${inRes.status} | Message: ${inData.message || inData.error}`);
    if (inRes.status !== 200) throw new Error('Clock In failed');

    // 3. Test Break Start
    console.log('  2. Testing POST /api/timelogs/punch -> break_start');
    const bStartRes = await fetch(`${baseUrl}/api/timelogs/punch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'break_start', notes: 'Coffee break' })
    });
    const bStartData = await bStartRes.json();
    console.log(`     Status: ${bStartRes.status} | Message: ${bStartData.message || bStartData.error}`);
    if (bStartRes.status !== 200) throw new Error('Break Start failed');

    // 4. Test Break End
    console.log('  3. Testing POST /api/timelogs/punch -> break_end');
    const bEndRes = await fetch(`${baseUrl}/api/timelogs/punch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'break_end', notes: 'Back to work' })
    });
    const bEndData = await bEndRes.json();
    console.log(`     Status: ${bEndRes.status} | Message: ${bEndData.message || bEndData.error}`);
    if (bEndRes.status !== 200) throw new Error('Break End failed');

    // 5. Test Clock Out
    console.log('  4. Testing POST /api/timelogs/punch -> clock_out');
    const outRes = await fetch(`${baseUrl}/api/timelogs/punch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'clock_out', notes: 'Shift completed' })
    });
    const outData = await outRes.json();
    console.log(`     Status: ${outRes.status} | Message: ${outData.message || outData.error}`);
    if (outRes.status !== 200) throw new Error('Clock Out failed');

    console.log('\n🎉 ALL PUNCH ACTIONS SUCCEEDED WITHOUT ANY ERRORS!');
  } finally {
    server.close();
  }
}

verifyPunchActions().catch(err => {
  console.error('❌ Punch verification failed:', err);
  process.exit(1);
});
