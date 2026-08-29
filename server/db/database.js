const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Determine DB directory (Use /tmp on Vercel/Serverless)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
const dbDir = isServerless ? '/tmp' : path.join(__dirname, 'data');
if (!isServerless && !fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {}
}

// Uploads directory
const uploadsDir = isServerless ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {}
}

// Supabase client
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL || 'https://bmlhdnexcxdjoqoebtyt.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_IF_CV_WXZAwGh90QgAZNkg_Z28bzo0N';

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('⚡ Supabase Client initialized successfully with remote persistence!');
  } catch (err) {
    console.warn('⚠️ Supabase initialization skipped:', err.message);
  }
}

// SQLite Database Connection (Local / Serverless /tmp Fallback)
const dbPath = isServerless ? path.join('/tmp', 'hr_ecomedge.db') : path.join(dbDir, 'hr_ecomedge.db');
const sqlite = new Database(dbPath);
try {
  sqlite.pragma('journal_mode = WAL');
} catch (e) {}
try {
  sqlite.pragma('foreign_keys = ON');
} catch (e) {}

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
      avatar_url TEXT,
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
      vacation_days INTEGER DEFAULT 0,
      sick_days INTEGER DEFAULT 0,
      emergency_days INTEGER DEFAULT 0,
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

    -- 12. Teams Table
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      department TEXT NOT NULL,
      team_lead_id INTEGER,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_lead_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- 13. Designations Table
    CREATE TABLE IF NOT EXISTS designations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      level TEXT DEFAULT 'Mid-Level',
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 14. Clients Table
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      industry TEXT DEFAULT 'E-Commerce Research & Analytics',
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 15. Projects Table
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      project_code TEXT UNIQUE NOT NULL,
      description TEXT,
      project_manager_id INTEGER,
      team_id INTEGER,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      priority TEXT DEFAULT 'high',
      budget REAL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (project_manager_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    -- 16. Project Assignments Table
    CREATE TABLE IF NOT EXISTS project_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      role_on_project TEXT DEFAULT 'Research Analyst',
      allocation_percent INTEGER DEFAULT 100,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, employee_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    -- 17. Timesheets Table
    CREATE TABLE IF NOT EXISTS timesheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      project_id INTEGER,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      break_mins INTEGER DEFAULT 0,
      total_hours REAL DEFAULT 0.00,
      overtime_hours REAL DEFAULT 0.00,
      task_description TEXT NOT NULL,
      status TEXT DEFAULT 'submitted',
      reviewed_by INTEGER,
      review_notes TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 18. Performance Reviews Table
    CREATE TABLE IF NOT EXISTS performance_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      reviewer_id INTEGER,
      review_period TEXT NOT NULL,
      rating REAL DEFAULT 5.0,
      productivity_score REAL DEFAULT 5.0,
      quality_score REAL DEFAULT 5.0,
      accuracy_score REAL DEFAULT 5.0,
      client_satisfaction REAL DEFAULT 5.0,
      goals TEXT,
      manager_comments TEXT,
      employee_comments TEXT,
      status TEXT DEFAULT 'completed',
      review_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 19. Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      link_tab TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 20. Legacy Audit Logs Table (backward compatibility)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 21. System Audit Trail (Enterprise State Changes: CRUD, Payroll, RBAC)
    CREATE TABLE IF NOT EXISTS system_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      device_fingerprint TEXT,
      before_state TEXT,
      after_state TEXT,
      diff TEXT,
      status TEXT DEFAULT 'SUCCESS',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 22. Login & Authentication Audit Log
    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      failure_reason TEXT,
      ip_address TEXT NOT NULL,
      user_agent TEXT,
      device_fingerprint TEXT,
      session_id TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 23. Active User Sessions Table
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      device_fingerprint TEXT,
      ip_address TEXT,
      user_agent TEXT,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- High-Performance Indexes for Audit & Session Queries
    CREATE INDEX IF NOT EXISTS idx_sys_audit_cursor ON system_audit_logs (created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_resource ON system_audit_logs (resource_type, resource_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_user ON system_audit_logs (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sys_audit_action ON system_audit_logs (action, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_auth_audit_cursor ON auth_audit_logs (created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_logs (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_username ON auth_audit_logs (username, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_ip ON auth_audit_logs (ip_address, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit_logs (event_type, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id, is_revoked, expires_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions (expires_at);
  `);

  // Safe schema migrations
  const migrations = [
    'ALTER TABLE employees ADD COLUMN avatar_url TEXT',
    'ALTER TABLE employees ADD COLUMN team_id INTEGER REFERENCES teams(id)',
    'ALTER TABLE employees ADD COLUMN designation_id INTEGER REFERENCES designations(id)',
    'ALTER TABLE employees ADD COLUMN manager_id INTEGER REFERENCES employees(id)',
    'ALTER TABLE users ADD COLUMN avatar_url TEXT',
    'ALTER TABLE documents ADD COLUMN expiration_date TEXT',
    'ALTER TABLE documents ADD COLUMN status TEXT DEFAULT "valid"',
    'ALTER TABLE documents ADD COLUMN notes TEXT'
  ];

  for (const query of migrations) {
    try {
      sqlite.exec(query);
    } catch (e) {
      // column already exists
    }
  }
}

// Seed clean initial admin account and audit baseline if database is empty
function seedIfEmpty() {
  const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const passwordHashAdmin = bcrypt.hashSync('password123', 10);
    const insertUser = sqlite.prepare(`
      INSERT INTO users (id, username, password_hash, role, employee_id)
      VALUES (1, 'admin', ?, 'manager', NULL)
    `);
    sqlite.transaction(() => {
      insertUser.run(passwordHashAdmin);
    })();
  }

  // Ensure initial baseline audit logs exist
  const sysAuditCount = sqlite.prepare('SELECT COUNT(*) as count FROM system_audit_logs').get().count;
  if (sysAuditCount === 0) {
    const nowIso = new Date().toISOString();
    sqlite.prepare(`
      INSERT INTO system_audit_logs (
        user_id, username, action, resource_type, resource_id,
        ip_address, user_agent, before_state, after_state, diff, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'admin',
      'SYSTEM_INIT',
      'system',
      '1',
      '127.0.0.1',
      'Enterprise System Bootstrapper',
      null,
      JSON.stringify({ status: 'online', mode: 'Enterprise HRIS' }),
      JSON.stringify({ mode: { old: null, new: 'Enterprise HRIS' } }),
      'SUCCESS',
      nowIso
    );

    sqlite.prepare(`
      INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, created_at)
      VALUES (1, 'admin', 'SYSTEM_INIT', 'system', '1', 'EcomEdge HRIS Enterprise System Initialized', ?)
    `).run(nowIso);
  }

  const authAuditCount = sqlite.prepare('SELECT COUNT(*) as count FROM auth_audit_logs').get().count;
  if (authAuditCount === 0) {
    const nowIso = new Date().toISOString();
    sqlite.prepare(`
      INSERT INTO auth_audit_logs (
        user_id, username, event_type, status, failure_reason, ip_address, user_agent, device_fingerprint, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'admin',
      'LOGIN_SUCCESS',
      'SUCCESS',
      null,
      '127.0.0.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'a1b2c3d4e5f6789012345678abcdef12',
      nowIso
    );
  }
}

// Real-time synchronization from Supabase
let lastSyncTime = 0;
async function syncFromSupabase(force = false) {
  if (!supabase) return;
  const now = Date.now();
  if (!force && now - lastSyncTime < 2000) {
    return; // throttle to once every 2s
  }
  lastSyncTime = now;

  try {
    const [
      { data: employees, error: empErr },
      { data: users, error: userErr },
      { data: leaves },
      { data: balances },
      { data: timeLogs },
      { data: remoteAudits }
    ] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase.from('users').select('*'),
      supabase.from('leaves').select('*'),
      supabase.from('leave_balances').select('*'),
      supabase.from('time_logs').select('*'),
      supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(200)
    ]);

    if (empErr || userErr) {
      return;
    }

    sqlite.transaction(() => {
      if (Array.isArray(employees) && employees.length > 0) {
        const insertEmp = sqlite.prepare(`
          INSERT OR REPLACE INTO employees (id, employee_code, first_name, last_name, job_title, department, employment_status, employment_type, hire_date, hourly_rate, monthly_salary, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number, avatar_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const e of employees) {
          insertEmp.run(
            e.id,
            e.employee_code || `EMP-${String(e.id).padStart(3, '0')}`,
            e.first_name,
            e.last_name,
            e.job_title,
            e.department,
            e.employment_status || 'active',
            e.employment_type || 'full_time',
            e.hire_date || '2026-01-01',
            parseFloat(e.hourly_rate) || 0,
            parseFloat(e.monthly_salary) || 0,
            e.phone || null,
            e.address || null,
            e.emergency_contact_name || null,
            e.emergency_contact_phone || null,
            e.bank_name || null,
            e.bank_account_number || null,
            e.avatar_url || null
          );
        }
      }

      if (Array.isArray(users) && users.length > 0) {
        const insertUser = sqlite.prepare(`
          INSERT OR REPLACE INTO users (id, username, password_hash, role, employee_id, avatar_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const u of users) {
          insertUser.run(u.id, u.username, u.password_hash, u.role || 'employee', u.employee_id || null, u.avatar_url || null);
        }
      }

      if (Array.isArray(balances) && balances.length > 0) {
        const insertBal = sqlite.prepare(`
          INSERT OR REPLACE INTO leave_balances (id, employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const b of balances) {
          insertBal.run(b.id, b.employee_id, b.year, b.vacation_days || 0, b.sick_days || 0, b.emergency_days || 0, b.vacation_used || 0, b.sick_used || 0, b.emergency_used || 0);
        }
      }

      if (Array.isArray(leaves) && leaves.length > 0) {
        const insertLeave = sqlite.prepare(`
          INSERT OR REPLACE INTO leaves (id, employee_id, leave_type, start_date, end_date, days_count, reason, status, reviewed_by, review_notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const l of leaves) {
          insertLeave.run(l.id, l.employee_id, l.leave_type, l.start_date, l.end_date, l.days_count, l.reason, l.status, l.reviewed_by || null, l.review_notes || null);
        }
      }

      if (Array.isArray(timeLogs) && timeLogs.length > 0) {
        const insertLog = sqlite.prepare(`
          INSERT OR REPLACE INTO time_logs (id, employee_id, date, clock_in, break_start, break_end, clock_out, total_hours, break_duration_mins, overtime_hours, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of timeLogs) {
          insertLog.run(t.id, t.employee_id, t.date, t.clock_in, t.break_start || null, t.break_end || null, t.clock_out || null, t.total_hours || 0, t.break_duration_mins || 0, t.overtime_hours || 0, t.status || 'clocked_in', t.notes || null);
        }
      }

      // Sync remote audit logs down to SQLite
      if (Array.isArray(remoteAudits) && remoteAudits.length > 0) {
        const insertAudit = sqlite.prepare(`
          INSERT OR REPLACE INTO audit_logs (id, user_id, username, action, entity_type, entity_id, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const a of remoteAudits) {
          insertAudit.run(
            a.id,
            a.user_id || null,
            a.username || 'system',
            a.action || 'ACTION',
            a.entity_type || 'system',
            String(a.entity_id || '0'),
            a.details || a.action,
            a.created_at || new Date().toISOString()
          );
        }
      }
    })();
  } catch (err) {
    console.warn('Sync from Supabase warning:', err.message);
  }
}

// Push mutations to Supabase
async function pushToSupabase(table, action, data, id) {
  if (!supabase) return;
  try {
    let cleanData = { ...data };
    if (table === 'employees') {
      delete cleanData.avatar_url;
      delete cleanData.team_id;
      delete cleanData.designation_id;
      delete cleanData.manager_id;
      delete cleanData.team_name;
      delete cleanData.designation_title;
      delete cleanData.manager_first_name;
      delete cleanData.manager_last_name;
      delete cleanData.user_id;
      delete cleanData.username;
      delete cleanData.role;
    }
    if (action === 'insert') {
      await supabase.from(table).insert(cleanData);
    } else if (action === 'update') {
      await supabase.from(table).update(cleanData).eq('id', id);
    } else if (action === 'delete') {
      await supabase.from(table).delete().eq('id', id);
    }
  } catch (err) {
    console.warn(`Push to Supabase (${table}) warning:`, err.message);
  }
}

// Initialize on load
initSchema();
seedIfEmpty();
syncFromSupabase(true);

module.exports = {
  db: sqlite,
  supabase,
  syncFromSupabase,
  pushToSupabase,
  isSupabaseConfigured: () => Boolean(supabase)
};
