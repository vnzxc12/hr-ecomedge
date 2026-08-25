const { db } = require('./database');
const bcrypt = require('bcryptjs');

console.log('🔄 Cleaning all demo records & resetting to clean initial accounts...');

// Clean existing data
db.transaction(() => {
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
})();

const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
const passwordHashMgr = bcrypt.hashSync('password01', 10);

const insertEmp = db.prepare(`
  INSERT INTO employees (id, employee_code, first_name, last_name, job_title, department, employment_status, employment_type, hire_date, hourly_rate, monthly_salary, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, username, password_hash, role, employee_id)
  VALUES (?, ?, ?, ?, ?)
`);

const insertBalance = db.prepare(`
  INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const currentYear = new Date().getFullYear();

db.transaction(() => {
  // 1. Initial Admin & Manager Profiles
  insertEmp.run(1, 'EMP-001', 'Admin', 'User', 'System Owner / Executive Director', 'Management', 'active', 'full_time', '2026-01-01', 0.00, 75000.00, '+63 900 000 0001', 'Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BDO', '**** 0001');
  insertEmp.run(2, 'EMP-002', 'Operations', 'Manager', 'Operations HR Manager', 'Operations', 'active', 'full_time', '2026-01-01', 0.00, 50000.00, '+63 900 000 0002', 'Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BPI', '**** 0002');

  // 2. Initial Auth Users: admin (admin123) and manager (password01)
  insertUser.run(1, 'admin', passwordHashAdmin, 'manager', 1);
  insertUser.run(2, 'manager', passwordHashMgr, 'manager', 2);

  // 3. Leave Balances (Starts at 0)
  insertBalance.run(1, currentYear, 0, 0, 0, 0, 0, 0);
  insertBalance.run(2, currentYear, 0, 0, 0, 0, 0, 0);
})();

console.log('✅ Clean database reset complete! Available accounts: "admin" / "admin123" and "manager" / "password01"');
