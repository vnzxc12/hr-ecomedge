const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, pushToSupabase } = require('../db/database');
const { authenticate, requireManager, requireSelfOrManager } = require('../middleware/auth');

// GET /api/employees (List with search and filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { syncFromSupabase } = require('../db/database');
    await syncFromSupabase();

    const isManager = req.user.role === 'manager';
    const { search, department, status, team_id, designation_id } = req.query;

    let query = `
      SELECT e.*, 
             u.id as user_id, u.username, u.role, u.avatar_url,
             t.name as team_name,
             d.title as designation_title,
             m.first_name as manager_first_name, m.last_name as manager_last_name
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN designations d ON e.designation_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.job_title LIKE ? OR e.department LIKE ? OR t.name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    if (department) {
      query += ' AND e.department = ?';
      params.push(department);
    }

    if (status) {
      query += ' AND e.employment_status = ?';
      params.push(status);
    }

    if (team_id) {
      query += ' AND e.team_id = ?';
      params.push(team_id);
    }

    if (designation_id) {
      query += ' AND e.designation_id = ?';
      params.push(designation_id);
    }

    query += ' ORDER BY e.id ASC';
    const employees = db.prepare(query).all(...params);

    // Hide confidential financial info from non-managers viewing colleagues
    const sanitized = employees.map(emp => {
      if (!isManager && emp.id !== req.user.employee_id) {
        return {
          id: emp.id,
          employee_code: emp.employee_code,
          first_name: emp.first_name,
          last_name: emp.last_name,
          job_title: emp.job_title,
          department: emp.department,
          team_name: emp.team_name,
          designation_title: emp.designation_title,
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

// GET /api/employees/:id (Detailed 9-Tab single employee view)
router.get('/:id', authenticate, (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);
    const isManager = req.user.role === 'manager';
    const isSelf = req.user.employee_id === empId;

    const employee = db.prepare(`
      SELECT e.*, 
             u.id as user_id, u.username, u.role, u.avatar_url,
             t.name as team_name,
             d.title as designation_title,
             m.first_name as manager_first_name, m.last_name as manager_last_name
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN designations d ON e.designation_id = d.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = ?
    `).get(empId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const currentYear = new Date().getFullYear();
    const isOwnerOrManager = isManager || isSelf;

    const leaveBalance = isOwnerOrManager
      ? db.prepare('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?').get(empId, currentYear)
      : null;
    const recentLogs = isOwnerOrManager
      ? db.prepare('SELECT * FROM time_logs WHERE employee_id = ? ORDER BY date DESC, clock_in DESC LIMIT 15').all(empId)
      : [];
    const recentLeaves = isOwnerOrManager
      ? db.prepare('SELECT * FROM leaves WHERE employee_id = ? ORDER BY created_at DESC').all(empId)
      : [];
    const documents = isOwnerOrManager
      ? db.prepare('SELECT * FROM documents WHERE employee_id = ? ORDER BY uploaded_at DESC').all(empId)
      : [];
    const assets = isOwnerOrManager
      ? db.prepare('SELECT * FROM assets WHERE assigned_to = ?').all(empId)
      : [];
    const trainings = db.prepare(`
      SELECT tr.*, tp.title, tp.instructor, tp.duration_hours, tp.status as program_status
      FROM training_records tr
      JOIN training_programs tp ON tr.training_id = tp.id
      WHERE tr.employee_id = ?
    `).all(empId);

    const projects = db.prepare(`
      SELECT pa.*, p.name as project_name, p.project_code, p.status as project_status, p.priority,
             c.name as client_name
      FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE pa.employee_id = ?
      ORDER BY pa.status ASC, p.name ASC
    `).all(empId);

    const timesheets = isOwnerOrManager
      ? db.prepare(`
          SELECT ts.*, p.name as project_name
          FROM timesheets ts
          LEFT JOIN projects p ON ts.project_id = p.id
          WHERE ts.employee_id = ?
          ORDER BY ts.date DESC
          LIMIT 15
        `).all(empId)
      : [];

    const performanceReviews = isOwnerOrManager
      ? db.prepare(`
          SELECT pr.*, u.username as reviewer_username
          FROM performance_reviews pr
          LEFT JOIN users u ON pr.reviewer_id = u.id
          WHERE pr.employee_id = ?
          ORDER BY pr.review_date DESC
        `).all(empId)
      : [];

    const payslips = isOwnerOrManager
      ? db.prepare(`
          SELECT p.*, pr.period_start, pr.period_end, pr.payroll_code, pr.payment_date
          FROM payslips p
          JOIN payrolls pr ON p.payroll_id = pr.id
          WHERE p.employee_id = ?
          ORDER BY pr.id DESC
          LIMIT 12
        `).all(empId)
      : [];

    const sanitizedEmployee = isOwnerOrManager ? employee : {
      id: employee.id,
      employee_code: employee.employee_code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      job_title: employee.job_title,
      department: employee.department,
      team_name: employee.team_name,
      designation_title: employee.designation_title,
      avatar_url: employee.avatar_url,
      phone: employee.phone,
      employment_status: employee.employment_status,
      employment_type: employee.employment_type
    };

    res.json({
      employee: sanitizedEmployee,
      leaveBalance,
      recentLogs,
      recentLeaves,
      documents,
      assets,
      trainings,
      projects,
      timesheets,
      performanceReviews,
      payslips
    });
  } catch (err) {
    console.error('Get employee detail error:', err);
    res.status(500).json({ error: 'Failed to fetch employee details.' });
  }
});

// POST /api/employees (Manager create employee + credentials)
router.post('/', authenticate, requireManager, async (req, res) => {
  try {
    let {
      first_name,
      last_name,
      job_title,
      department,
      team_id,
      designation_id,
      manager_id,
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
    const userRole = (role === 'manager' || role === 'admin') ? 'manager' : 'employee';

    // 3. Generate next employee code
    const lastEmp = db.prepare('SELECT id FROM employees ORDER BY id DESC LIMIT 1').get();
    const nextNum = lastEmp ? (lastEmp.id + 1) : 1;
    const employeeCode = `EMP-${String(nextNum).padStart(3, '0')}`;

    let createdEmpId = null;

    // 4. If Supabase is connected, insert directly into Supabase
    const { supabase, syncFromSupabase } = require('../db/database');
    if (supabase) {
      const empPayload = {
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
        bank_account_number: bank_account_number || null
      };

      const { data: sbEmp, error: sbEmpErr } = await supabase.from('employees').insert(empPayload).select().single();

      if (sbEmpErr) {
        console.error('❌ Supabase employee creation error:', sbEmpErr);
      } else if (sbEmp) {
        createdEmpId = sbEmp.id;

        // Insert User in Supabase with chosen role
        const { error: sbUserErr } = await supabase.from('users').insert({
          username: finalUsername,
          password_hash: passwordHash,
          role: userRole,
          employee_id: createdEmpId,
          avatar_url: avatar_url || null
        });
        if (sbUserErr) console.error('❌ Supabase user creation error:', sbUserErr);

        // Insert Leave Balance in Supabase
        await supabase.from('leave_balances').insert({
          employee_id: createdEmpId,
          year: new Date().getFullYear(),
          vacation_days: 15,
          sick_days: 10,
          emergency_days: 5,
          vacation_used: 0,
          sick_used: 0,
          emergency_used: 0
        });

        // Insert directly into SQLite as well
        db.transaction(() => {
          db.prepare(`
            INSERT OR REPLACE INTO employees (
              id, employee_code, first_name, last_name, job_title, department,
              team_id, designation_id, manager_id,
              employment_status, employment_type, hire_date, hourly_rate,
              monthly_salary, phone, address, emergency_contact_name,
              emergency_contact_phone, bank_name, bank_account_number, avatar_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            createdEmpId,
            employeeCode,
            first_name.trim(),
            last_name.trim(),
            job_title.trim(),
            department.trim(),
            team_id ? parseInt(team_id, 10) : null,
            designation_id ? parseInt(designation_id, 10) : null,
            manager_id ? parseInt(manager_id, 10) : null,
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

          db.prepare(`
            INSERT OR REPLACE INTO users (username, password_hash, role, employee_id, avatar_url)
            VALUES (?, ?, ?, ?, ?)
          `).run(finalUsername, passwordHash, userRole, createdEmpId, avatar_url || null);

          const currentYear = new Date().getFullYear();
          db.prepare(`
            INSERT OR REPLACE INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
            VALUES (?, ?, 15, 10, 5, 0, 0, 0)
          `).run(createdEmpId, currentYear);
        })();
      }
    }

    // 5. If local fallback or not created via Supabase, write to SQLite
    if (!createdEmpId) {
      db.transaction(() => {
        const empResult = db.prepare(`
          INSERT INTO employees (
            employee_code, first_name, last_name, job_title, department,
            team_id, designation_id, manager_id,
            employment_status, employment_type, hire_date, hourly_rate,
            monthly_salary, phone, address, emergency_contact_name,
            emergency_contact_phone, bank_name, bank_account_number, avatar_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          employeeCode,
          first_name.trim(),
          last_name.trim(),
          job_title.trim(),
          department.trim(),
          team_id ? parseInt(team_id, 10) : null,
          designation_id ? parseInt(designation_id, 10) : null,
          manager_id ? parseInt(manager_id, 10) : null,
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

        db.prepare(`
          INSERT INTO users (username, password_hash, role, employee_id, avatar_url)
          VALUES (?, ?, ?, ?, ?)
        `).run(finalUsername, passwordHash, userRole, createdEmpId, avatar_url || null);

        const currentYear = new Date().getFullYear();
        db.prepare(`
          INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
          VALUES (?, ?, 15, 10, 5, 0, 0, 0)
        `).run(createdEmpId, currentYear);
      })();
    }

    const created = db.prepare(`
      SELECT e.*, u.id as user_id, u.username, u.role
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE e.id = ?
    `).get(createdEmpId);

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

// PUT /api/employees/:id (Update employee - Manager or Self)
router.put('/:id', authenticate, async (req, res) => {
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
      team_id,
      designation_id,
      manager_id,
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
      role,
      password,
      avatar_url
    } = req.body;

    if (isManager) {
      // Manager can edit all fields
      db.prepare(`
        UPDATE employees SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          job_title = COALESCE(?, job_title),
          department = COALESCE(?, department),
          team_id = ?,
          designation_id = ?,
          manager_id = ?,
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
          avatar_url = COALESCE(?, avatar_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        first_name,
        last_name,
        job_title,
        department,
        team_id !== undefined ? (team_id ? parseInt(team_id, 10) : null) : current.team_id,
        designation_id !== undefined ? (designation_id ? parseInt(designation_id, 10) : null) : current.designation_id,
        manager_id !== undefined ? (manager_id ? parseInt(manager_id, 10) : null) : current.manager_id,
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
        avatar_url,
        empId
      );

      // If manager updated system user role
      if (role && (role === 'manager' || role === 'employee')) {
        db.prepare('UPDATE users SET role = ? WHERE employee_id = ?').run(role, empId);
        const { supabase } = require('../db/database');
        if (supabase) {
          await supabase.from('users').update({ role }).eq('employee_id', empId);
        }
      }

      // If manager reset password
      if (password && password.trim()) {
        const hash = bcrypt.hashSync(password.trim(), 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE employee_id = ?').run(hash, empId);
        const { supabase } = require('../db/database');
        if (supabase) {
          await supabase.from('users').update({ password_hash: hash }).eq('employee_id', empId);
        }
      }

      // If manager updated avatar
      if (avatar_url) {
        db.prepare('UPDATE users SET avatar_url = ? WHERE employee_id = ?').run(avatar_url, empId);
        const { supabase } = require('../db/database');
        if (supabase) {
          await supabase.from('users').update({ avatar_url }).eq('employee_id', empId);
        }
      }
    } else {
      // Employee can only update contact, address, and bank info
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
const fs = require('fs');
const { supabase } = require('../db/database');

// POST /api/employees/:id/avatar (Upload photo for employee)
router.post('/:id/avatar', authenticate, requireManager, (req, res, next) => {
  if (req.is('application/json') || req.body?.avatar_url) {
    return next();
  }
  upload.single('avatar')(req, res, next);
}, async (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);
    let avatarUrl = req.body?.avatar_url;

    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const mimeType = req.file.mimetype || 'image/jpeg';
      avatarUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    if (!avatarUrl) {
      return res.status(400).json({ error: 'Please select an image file to upload.' });
    }

    db.prepare('UPDATE employees SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(avatarUrl, empId);
    db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?')
      .run(avatarUrl, empId);

    if (supabase) {
      await supabase.from('users').update({ avatar_url: avatarUrl }).eq('employee_id', empId);
    }

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
