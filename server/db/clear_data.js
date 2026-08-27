const { db, supabase } = require('./database');
const bcrypt = require('bcryptjs');

async function clearAll() {
  console.log('🧹 Purging all employees and keeping ONLY pure admin account...');

  // 1. Delete in Supabase FIRST
  if (supabase) {
    console.log('📡 Deleting from Supabase...');
    const tables = [
      'notifications',
      'audit_logs',
      'performance_reviews',
      'timesheets',
      'project_assignments',
      'projects',
      'clients',
      'designations',
      'teams',
      'documents',
      'payslips',
      'payrolls',
      'assets',
      'training_records',
      'training_programs',
      'time_logs',
      'leaves',
      'leave_balances',
      'users',
      'employees'
    ];

    for (const tbl of tables) {
      try {
        const { error } = await supabase.from(tbl).delete().neq('id', 0);
        if (error) console.warn(`Supabase delete on ${tbl}:`, error.message);
      } catch (e) {
        console.warn(`Supabase error on ${tbl}:`, e.message);
      }
    }

    // Insert ONLY admin user in Supabase (No employee record)
    const adminPasswordHash = bcrypt.hashSync('password123', 10);
    const { error: insErr } = await supabase.from('users').insert({
      id: 1,
      username: 'admin',
      password_hash: adminPasswordHash,
      role: 'manager',
      employee_id: null
    });
    if (insErr) console.warn('Supabase insert admin error:', insErr.message);
    else console.log('✅ Supabase admin user created (admin / password123).');
  }

  // 2. Clear local SQLite
  db.exec('PRAGMA foreign_keys = OFF;');
  db.transaction(() => {
    db.prepare('DELETE FROM notifications').run();
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM performance_reviews').run();
    db.prepare('DELETE FROM timesheets').run();
    db.prepare('DELETE FROM project_assignments').run();
    db.prepare('DELETE FROM projects').run();
    db.prepare('DELETE FROM clients').run();
    db.prepare('DELETE FROM designations').run();
    db.prepare('DELETE FROM teams').run();
    db.prepare('DELETE FROM documents').run();
    db.prepare('DELETE FROM payslips').run();
    db.prepare('DELETE FROM payrolls').run();
    db.prepare('DELETE FROM assets').run();
    db.prepare('DELETE FROM training_records').run();
    db.prepare('DELETE FROM training_programs').run();
    db.prepare('DELETE FROM time_logs').run();
    db.prepare('DELETE FROM leaves').run();
    db.prepare('DELETE FROM leave_balances').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM employees').run();

    const adminPasswordHash = bcrypt.hashSync('password123', 10);
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, employee_id)
      VALUES (1, 'admin', ?, 'manager', NULL)
    `).run(adminPasswordHash);
  })();
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('✅ Local SQLite cleared: 0 employees, 1 admin user.');
  console.log('Employees in SQLite:', db.prepare('SELECT COUNT(*) as c FROM employees').get().c);
  console.log('Users in SQLite:', db.prepare('SELECT id, username, role, employee_id FROM users').all());
  process.exit(0);
}

clearAll();
