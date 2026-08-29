const { db, syncFromSupabase } = require('../server/db/database');

async function testClockInSync() {
  console.log('🧪 Testing Clock-in and Dashboard/Attendance Synchronization...');

  // 1. Ensure active employee exists
  let emp = db.prepare("SELECT * FROM employees WHERE employment_status = 'active' LIMIT 1").get();
  if (!emp) {
    db.prepare(`
      INSERT INTO employees (id, employee_code, first_name, last_name, job_title, department, employment_status)
      VALUES (101, 'EMP-101', 'Jane', 'Doe', 'Senior Analyst', 'Research & Analytics', 'active')
    `).run();
    emp = db.prepare('SELECT * FROM employees WHERE id = 101').get();
  }

  const today = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // 2. Clear prior time_logs for this test
  db.prepare('DELETE FROM time_logs WHERE employee_id = ?').run(emp.id);

  // 3. Simulate punch clock_in
  const insertResult = db.prepare(`
    INSERT INTO time_logs (employee_id, date, clock_in, status, notes)
    VALUES (?, ?, ?, 'clocked_in', 'Clocked in for shift')
  `).run(emp.id, today, nowIso);

  console.log(`  ✅ Clocked in employee ${emp.first_name} ${emp.last_name} (#${emp.id}) with time_log ID #${insertResult.lastInsertRowid}`);

  // 4. Test Dashboard query
  const todayLogs = db.prepare(`
    SELECT t.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.avatar_url, tm.name as team_name
    FROM time_logs t
    JOIN employees e ON t.employee_id = e.id
    LEFT JOIN teams tm ON e.team_id = tm.id
    WHERE t.status IN ('clocked_in', 'on_break') OR t.date = ?
    ORDER BY t.clock_in DESC
  `).all(today);

  const currentlyWorking = todayLogs.filter(l => l.status === 'clocked_in').length;
  console.log(`  ✅ Dashboard currentlyWorking count: ${currentlyWorking}`);
  if (currentlyWorking < 1) {
    throw new Error('Expected currentlyWorking to be >= 1');
  }

  // 5. Test Live Status query (Attendance Log)
  const liveStatus = db.prepare(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.job_title, e.department, e.avatar_url,
           t.id as log_id, t.clock_in, t.break_start, t.break_end, t.clock_out, t.total_hours, t.status as punch_status
    FROM employees e
    LEFT JOIN time_logs t ON t.id = (
      SELECT id FROM time_logs 
      WHERE employee_id = e.id AND (status IN ('clocked_in', 'on_break') OR date = ?)
      ORDER BY id DESC LIMIT 1
    )
    WHERE e.employment_status = 'active'
    ORDER BY e.first_name ASC
  `).all(today);

  const activeEmpLog = liveStatus.find(e => e.id === emp.id);
  console.log(`  ✅ Attendance Live Status for ${emp.first_name}: punch_status = "${activeEmpLog?.punch_status}"`);

  if (activeEmpLog?.punch_status !== 'clocked_in') {
    throw new Error(`Expected punch_status to be 'clocked_in', got: ${activeEmpLog?.punch_status}`);
  }

  console.log('\n🎉 ALL CLOCK-IN SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!');
}

testClockInSync().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
