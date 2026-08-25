const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, pushToSupabase } = require('../db/database');
const { authenticate, requireManager, requireSelfOrManager } = require('../middleware/auth');

// GET /api/employees (List with search and filters)
router.get('/', authenticate, (req, res) => {
  try {
    const isManager = req.user.role === 'manager';
    const { search, department, status } = req.query;

    let query = `
      SELECT e.*, u.id as user_id, u.username, u.role, u.avatar_url
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    // If employee, they can only view list of colleagues (names/departments/job titles) or themselves
    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.job_title LIKE ? OR e.department LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (department) {
      query += ' AND e.department = ?';
      params.push(department);
    }

    if (status) {
      query += ' AND e.employment_status = ?';
      params.push(status);
    }

    query += ' ORDER BY e.id ASC';
    const employees = db.prepare(query).all(...params);

    // Hide confidential financial info from non-managers
    const sanitized = employees.map(emp => {
      if (!isManager && emp.id !== req.user.employee_id) {
        return {
          id: emp.id,
          employee_code: emp.employee_code,
          first_name: emp.first_name,
          last_name: emp.last_name,
          job_title: emp.job_title,
          department: emp.department,
          employment_status: emp.employment_status,
          avatar_url: emp.avatar_url
        };
      }
      return emp;
    });

    res.json({ employees: sanitized });
  } catch (err) {
    console.error('List employees error:', err);
    res.status(500).json({ error: 'Failed to retrieve employees list.' });
  }
});

// GET /api/employees/:id (Detailed single employee view)
router.get('/:id', authenticate, (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);
    const isManager = req.user.role === 'manager';
    const isSelf = req.user.employee_id === empId;

    if (!isManager && !isSelf) {
      return res.status(403).json({ error: 'Access denied. You can only view your own full profile.' });
    }

    const employee = db.prepare(`
      SELECT e.*, u.id as user_id, u.username, u.role, u.avatar_url
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE e.id = ?
    `).get(empId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const currentYear = new Date().getFullYear();
    const leaveBalance = db.prepare('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?').get(empId, currentYear);
    const recentLogs = db.prepare('SELECT * FROM time_logs WHERE employee_id = ? ORDER BY date DESC, clock_in DESC LIMIT 10').all(empId);
    const recentLeaves = db.prepare('SELECT * FROM leaves WHERE employee_id = ? ORDER BY created_at DESC LIMIT 10').all(empId);
    const documents = db.prepare('SELECT * FROM documents WHERE employee_id = ? ORDER BY uploaded_at DESC').all(empId);
    const assets = db.prepare('SELECT * FROM assets WHERE assigned_to = ?').all(empId);
    const trainings = db.prepare(`
      SELECT tr.*, tp.title, tp.instructor, tp.duration_hours
      FROM training_records tr
      JOIN training_programs tp ON tr.training_id = tp.id
      WHERE tr.employee_id = ?
    `).all(empId);

    res.json({
      employee,
      leaveBalance,
      recentLogs,
      recentLeaves,
      documents,
      assets,
      trainings
    });
  } catch (err) {
    console.error('Get employee detail error:', err);
    res.status(500).json({ error: 'Failed to fetch employee details.' });
  }
});

// POST /api/employees (Manager create employee + credentials)
router.post('/', authenticate, requireManager, (req, res) => {
  try {
    let {
      first_name,
      last_name,
      job_title,
      department,
      employment_status,
      employment_type,
      hire_date,
      hourly_rate,
      monthly_salary,
      phone,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      bank_name,
      bank_account_number,
      username,
      password,
      role,
      avatar_url
    } = req.body;

    if (!first_name || !last_name || !job_title || !department || !hire_date) {
      return res.status(400).json({ error: 'First name, last name, job title, department, and hire date are required.' });
    }

    // 1. Auto-generate Username if not provided
    let finalUsername = username ? username.trim().toLowerCase().replace(/\s+/g, '.') : '';
    if (!finalUsername) {
      const cleanFirst = first_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLast = last_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      let baseUsername = `${cleanFirst}.${cleanLast}` || 'user';
      finalUsername = baseUsername;
      let counter = 1;
      while (db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(finalUsername)) {
        counter++;
        finalUsername = `${baseUsername}${counter}`;
      }
    } else {
      // Check if manually provided username already taken
      const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(finalUsername);
      if (existingUser) {
        return res.status(400).json({ error: `Username "${finalUsername}" is already taken.` });
      }
    }

    // 2. Auto-generate Password if not provided
    const finalPassword = password ? password.trim() : 'password123';
    const passwordHash = bcrypt.hashSync(finalPassword, 10);
    const userRole = role === 'manager' ? 'manager' : 'employee';

    // 3. Generate next employee code
    const lastEmp = db.prepare('SELECT id FROM employees ORDER BY id DESC LIMIT 1').get();
    const nextNum = lastEmp ? (lastEmp.id + 1) : 1;
    const employeeCode = `EMP-${String(nextNum).padStart(3, '0')}`;

    let createdEmpId = null;

    db.transaction(() => {
      // Insert employee record
      const empResult = db.prepare(`
        INSERT INTO employees (
          employee_code, first_name, last_name, job_title, department,
          employment_status, employment_type, hire_date, hourly_rate,
          monthly_salary, phone, address, emergency_contact_name,
          emergency_contact_phone, bank_name, bank_account_number, avatar_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        employeeCode,
        first_name.trim(),
        last_name.trim(),
        job_title.trim(),
        department.trim(),
        employment_status || 'active',
        employment_type || 'full_time',
        hire_date,
        parseFloat(hourly_rate) || 0,
        parseFloat(monthly_salary) || 0,
        phone || null,
        address || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        bank_name || null,
        bank_account_number || null,
        avatar_url || null
      );

      createdEmpId = empResult.lastInsertRowid;

      // Insert User login record with employee access
      db.prepare(`
        INSERT INTO users (username, password_hash, role, employee_id, avatar_url)
        VALUES (?, ?, ?, ?, ?)
      `).run(finalUsername, passwordHash, userRole, createdEmpId, avatar_url || null);

      // Initialize leave balance with 0 days (manager can allocate later)
      const currentYear = new Date().getFullYear();
      db.prepare(`
        INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
        VALUES (?, ?, 0, 0, 0, 0, 0, 0)
      `).run(createdEmpId, currentYear);
    })();

    const created = db.prepare(`
      SELECT e.*, u.id as user_id, u.username, u.role
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE e.id = ?
    `).get(createdEmpId);

    // Push to Supabase async
    pushToSupabase('employees', 'insert', {
      id: createdEmpId,
      employee_code: employeeCode,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      job_title: job_title.trim(),
      department: department.trim(),
      employment_status: employment_status || 'active',
      employment_type: employment_type || 'full_time',
      hire_date,
      hourly_rate: parseFloat(hourly_rate) || 0,
      monthly_salary: parseFloat(monthly_salary) || 0,
      phone: phone || null,
      address: address || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      bank_name: bank_name || null,
      bank_account_number: bank_account_number || null,
      avatar_url: avatar_url || null
    }).catch(() => {});

    pushToSupabase('users', 'insert', {
      username: finalUsername,
      password_hash: passwordHash,
      role: userRole,
      employee_id: createdEmpId,
      avatar_url: avatar_url || null
    }).catch(() => {});

    res.status(201).json({
      message: `Employee ${first_name} ${last_name} created successfully!`,
      employee: created,
      credentials: {
        username: finalUsername,
        password: finalPassword,
        role: userRole
      }
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Failed to create employee.' });
  }
});

// PUT /api/employees/:id (Update employee)
router.put('/:id', authenticate, (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);
    const isManager = req.user.role === 'manager';
    const isSelf = req.user.employee_id === empId;

    if (!isManager && !isSelf) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const current = db.prepare('SELECT * FROM employees WHERE id = ?').get(empId);
    if (!current) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const {
      first_name,
      last_name,
      job_title,
      department,
      employment_status,
      employment_type,
      hire_date,
      hourly_rate,
      monthly_salary,
      phone,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      bank_name,
      bank_account_number
    } = req.body;

    if (isManager) {
      // Manager can edit all fields
      db.prepare(`
        UPDATE employees SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          job_title = COALESCE(?, job_title),
          department = COALESCE(?, department),
          employment_status = COALESCE(?, employment_status),
          employment_type = COALESCE(?, employment_type),
          hire_date = COALESCE(?, hire_date),
          hourly_rate = COALESCE(?, hourly_rate),
          monthly_salary = COALESCE(?, monthly_salary),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          bank_name = COALESCE(?, bank_name),
          bank_account_number = COALESCE(?, bank_account_number),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        first_name,
        last_name,
        job_title,
        department,
        employment_status,
        employment_type,
        hire_date,
        hourly_rate !== undefined ? parseFloat(hourly_rate) : null,
        monthly_salary !== undefined ? parseFloat(monthly_salary) : null,
        phone,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        bank_name,
        bank_account_number,
        empId
      );
    } else {
      // Employee can only update contact and bank info
      db.prepare(`
        UPDATE employees SET
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          bank_name = COALESCE(?, bank_name),
          bank_account_number = COALESCE(?, bank_account_number),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        phone,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        bank_name,
        bank_account_number,
        empId
      );
    }

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(empId);

    // Push update to Supabase
    pushToSupabase('employees', 'update', updated, empId).catch(() => {});

    res.json({ message: 'Profile updated successfully.', employee: updated });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Failed to update employee.' });
  }
});

// DELETE /api/employees/:id (Manager archive / deactivate)
router.delete('/:id', authenticate, requireManager, (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);
    db.prepare("UPDATE employees SET employment_status = 'terminated', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(empId);

    // Push update to Supabase
    pushToSupabase('employees', 'update', { employment_status: 'terminated' }, empId).catch(() => {});

    res.json({ message: 'Employee status updated to Terminated/Deactivated.' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Failed to deactivate employee.' });
  }
});

const upload = require('../middleware/upload');

// POST /api/employees/:id/avatar (Upload photo for employee)
router.post('/:id/avatar', authenticate, requireManager, upload.single('avatar'), (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file to upload.' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    db.transaction(() => {
      db.prepare('UPDATE employees SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(avatarUrl, empId);
      db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?')
        .run(avatarUrl, empId);
    })();

    res.json({
      message: 'Employee profile photo updated successfully!',
      avatar_url: avatarUrl
    });
  } catch (err) {
    console.error('Employee avatar upload error:', err);
    res.status(500).json({ error: 'Failed to upload employee photo.' });
  }
});

module.exports = router;
