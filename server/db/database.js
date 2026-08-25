const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Ensure DB directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Supabase client
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('⚡ Supabase Client initialized successfully!');
  } catch (err) {
    console.warn('⚠️ Supabase initialization skipped:', err.message);
  }
}

// SQLite Database Connection (Local Fallback)
const dbPath = path.join(dbDir, 'hr_ecomedge.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

function initSchema() {
  sqlite.exec(`
    -- 1. Employees Table
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      department TEXT NOT NULL,
      employment_status TEXT DEFAULT 'active',
      employment_type TEXT DEFAULT 'full_time',
      hire_date TEXT NOT NULL,
      hourly_rate REAL DEFAULT 0.00,
      monthly_salary REAL DEFAULT 0.00,
      phone TEXT,
      address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      bank_name TEXT,
      bank_account_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Users Table (Strictly Username & Password, No Email)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      employee_id INTEGER,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- 3. Time Logs / Attendance
    CREATE TABLE IF NOT EXISTS time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      clock_in DATETIME NOT NULL,
      break_start DATETIME,
      break_end DATETIME,
      clock_out DATETIME,
      total_hours REAL DEFAULT 0.00,
      break_duration_mins INTEGER DEFAULT 0,
      overtime_hours REAL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'clocked_in',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- 4. Leaves Table
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count INTEGER NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      review_notes TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 5. Leave Balances Table
    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      vacation_days INTEGER DEFAULT 15,
      sick_days INTEGER DEFAULT 10,
      emergency_days INTEGER DEFAULT 5,
      vacation_used INTEGER DEFAULT 0,
      sick_used INTEGER DEFAULT 0,
      emergency_used INTEGER DEFAULT 0,
      UNIQUE(employee_id, year),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- 6. Payroll Runs
    CREATE TABLE IF NOT EXISTS payrolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_code TEXT UNIQUE NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      total_gross REAL DEFAULT 0.00,
      total_deductions REAL DEFAULT 0.00,
      total_net REAL DEFAULT 0.00,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_date TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 7. Payslips
    CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      basic_pay REAL NOT NULL DEFAULT 0.00,
      overtime_pay REAL NOT NULL DEFAULT 0.00,
      allowances REAL NOT NULL DEFAULT 0.00,
      gross_pay REAL NOT NULL DEFAULT 0.00,
      tax_deduction REAL NOT NULL DEFAULT 0.00,
      social_deductions REAL NOT NULL DEFAULT 0.00,
      other_deductions REAL NOT NULL DEFAULT 0.00,
      net_pay REAL NOT NULL DEFAULT 0.00,
      total_hours_worked REAL DEFAULT 0.00,
      overtime_hours REAL DEFAULT 0.00,
      payment_status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- 8. Documents Table
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 9. Training Programs
    CREATE TABLE IF NOT EXISTS training_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      instructor TEXT,
      duration_hours INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Training Records
    CREATE TABLE IF NOT EXISTS training_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      training_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      completion_status TEXT DEFAULT 'enrolled',
      score REAL,
      certificate_url TEXT,
      completion_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(training_id, employee_id),
      FOREIGN KEY (training_id) REFERENCES training_programs(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- 11. Assets Table
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      model_serial TEXT,
      status TEXT DEFAULT 'available',
      assigned_to INTEGER,
      assigned_date TEXT,
      expected_return_date TEXT,
      condition TEXT DEFAULT 'good',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
    );
  `);
}

// Seed clean initial accounts: admin and manager
function seedIfEmpty() {
  const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  console.log('🌱 Seeding clean initial accounts into database...');

  const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
  const passwordHashMgr = bcrypt.hashSync('password01', 10);

  const insertEmp = sqlite.prepare(`
    INSERT INTO employees (id, employee_code, first_name, last_name, job_title, department, employment_status, employment_type, hire_date, hourly_rate, monthly_salary, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, username, password_hash, role, employee_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertBalance = sqlite.prepare(`
    INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const currentYear = new Date().getFullYear();

  sqlite.transaction(() => {
    // 1. Initial Admin & Manager Profiles
    insertEmp.run(1, 'EMP-001', 'Admin', 'User', 'System Owner / Executive Director', 'Management', 'active', 'full_time', '2026-01-01', 0.00, 75000.00, '+63 900 000 0001', 'Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BDO', '**** 0001');
    insertEmp.run(2, 'EMP-002', 'Operations', 'Manager', 'Operations HR Manager', 'Operations', 'active', 'full_time', '2026-01-01', 0.00, 50000.00, '+63 900 000 0002', 'Manila, Philippines', 'Emergency Contact', '+63 900 000 0000', 'BPI', '**** 0002');

    // 2. Initial Auth Users: admin (admin123) and manager (password01)
    insertUser.run(1, 'admin', passwordHashAdmin, 'manager', 1);
    insertUser.run(2, 'manager', passwordHashMgr, 'manager', 2);

    // 3. Leave Balances
    insertBalance.run(1, currentYear, 15, 10, 5, 0, 0, 0);
    insertBalance.run(2, currentYear, 15, 10, 5, 0, 0, 0);
  })();

  console.log('✅ Initial accounts (admin / admin123 and manager / password01) initialized!');
}

// Initialize on load
initSchema();
seedIfEmpty();

module.exports = {
  db: sqlite,
  supabase,
  isSupabaseConfigured: () => Boolean(supabase)
};
