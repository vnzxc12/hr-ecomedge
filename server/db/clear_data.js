const { db, supabase } = require('./database');
const bcrypt = require('bcryptjs');

async function clearAllData() {
  console.log('🧹 Clearing all dummy data from local database and Supabase...');

  // 1. Clear Local SQLite Tables
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

    // Insert only 1 Root Administrator Employee & User
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);

    const insertEmp = db.prepare(`
      INSERT INTO employees (
        id, employee_code, first_name, last_name, job_title, department,
        employment_status, employment_type, hire_date, hourly_rate, monthly_salary
      ) VALUES (1, 'EMP-001', 'Admin', 'User', 'System Owner / Executive Director', 'Management', 'active', 'full_time', '2026-01-01', 0, 0)
    `);
    insertEmp.run();

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, employee_id)
      VALUES (1, 'admin', ?, 'manager', 1)
    `);
    insertUser.run(adminPasswordHash);

    const currentYear = new Date().getFullYear();
    db.prepare(`
      INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
      VALUES (1, ?, 15, 10, 5, 0, 0, 0)
    `).run(currentYear);
  })();

  console.log('✅ Local SQLite cleared and initialized with clean Admin account.');

  // 2. Clear Supabase Remote Tables
  if (supabase) {
    console.log('📡 Clearing Supabase remote database tables...');
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
        if (error) {
          console.warn(`Supabase clear warning on ${tbl}:`, error.message);
        }
      } catch (err) {
        console.warn(`Could not clear Supabase table ${tbl}:`, err.message);
      }
    }

    // Insert clean Root Admin in Supabase
    try {
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      await supabase.from('employees').insert({
        id: 1,
        employee_code: 'EMP-001',
        first_name: 'Admin',
        last_name: 'User',
        job_title: 'System Owner / Executive Director',
        department: 'Management',
        employment_status: 'active',
        employment_type: 'full_time',
        hire_date: '2026-01-01',
        hourly_rate: 0,
        monthly_salary: 0
      });

      await supabase.from('users').insert({
        id: 1,
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'manager',
        employee_id: 1
      });

      const currentYear = new Date().getFullYear();
      await supabase.from('leave_balances').insert({
        employee_id: 1,
        year: currentYear,
        vacation_days: 15,
        sick_days: 10,
        emergency_days: 5,
        vacation_used: 0,
        sick_used: 0,
        emergency_used: 0
      });

      console.log('✅ Supabase initialized with clean Admin account.');
    } catch (e) {
      console.error('Error inserting initial admin to Supabase:', e);
    }
  }

  console.log('✨ System is now 100% clean and ready for production!');
  process.exit(0);
}

clearAllData();
