const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
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
      bank_account_number,
      username,
      password,
      role
    } = req.body;

    if (!first_name || !last_name || !job_title || !department || !hire_date) {
      return res.status(400).json({ error: 'First name, last name, job title, department, and hire date are required.' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required to create the login account.' });
    }

    // Check if username already taken
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());
    if (existingUser) {
      return res.status(400).json({ error: `Username "${username.trim()}" is already taken.` });
    }

    // Generate next employee code
    const lastEmp = db.prepare('SELECT id FROM employees ORDER BY id DESC LIMIT 1').get();
    const nextNum = lastEmp ? (lastEmp.id + 1) : 1;
    const employeeCode = `EMP-${String(nextNum).padStart(3, '0')}`;

    const passwordHash = bcrypt.hashSync(password, 10);
    const userRole = role === 'manager' ? 'manager' : 'employee';

    let createdEmpId = null;

    db.transaction(() => {
      // 1. Insert employee record
      const empResult = db.prepare(`
        INSERT INTO employees (
          employee_code, first_name, last_name, job_title, department,
          employment_status, employment_type, hire_date, hourly_rate,
          monthly_salary, phone, address, emergency_contact_name,
          emergency_contact_phone, bank_name, bank_account_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        bank_account_number || null
      );

      createdEmpId = empResult.lastInsertRowid;

      // 2. Insert User login record
      db.prepare(`
        INSERT INTO users (username, password_hash, role, employee_id)
        VALUES (?, ?, ?, ?)
      `).run(username.trim().toLowerCase(), passwordHash, userRole, createdEmpId);

      // 3. Initialize leave balance
      const currentYear = new Date().getFullYear();
      db.prepare(`
        INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
        VALUES (?, ?, 15, 10, 5, 0, 0, 0)
      `).run(createdEmpId, currentYear);
    })();

    const created = db.prepare('SELECT * FROM employees WHERE id = ?').get(createdEmpId);

    res.status(201).json({
      message: `Employee ${first_name} ${last_name} created successfully with login username "@${username.trim().toLowerCase()}".`,
      employee: created
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
    res.json({ message: 'Employee status updated to Terminated/Deactivated.' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Failed to deactivate employee.' });
  }
});

module.exports = router;
