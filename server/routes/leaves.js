const express = require('express');
const router = express.Router();
const { db, syncFromSupabase, pushToSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/leaves/my (Current employee leave overview)
router.get('/my', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.json({ leaves: [], balance: null });
    }

    const currentYear = new Date().getFullYear();
    const balance = db.prepare('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?').get(employeeId, currentYear);

    const leaves = db.prepare(`
      SELECT l.*, u.username as reviewer_username
      FROM leaves l
      LEFT JOIN users u ON l.reviewed_by = u.id
      WHERE l.employee_id = ?
      ORDER BY l.created_at DESC
    `).all(employeeId);

    res.json({ leaves, balance });
  } catch (err) {
    console.error('Get my leaves error:', err);
    res.status(500).json({ error: 'Failed to retrieve leave records.' });
  }
});

// GET /api/leaves/all (Manager view all requests)
router.get('/all', authenticate, requireManager, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }
    const { status, leave_type, employee_id } = req.query;

    let query = `
      SELECT l.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code,
             u.username as reviewer_username
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN users u ON l.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (leave_type) {
      query += ' AND l.leave_type = ?';
      params.push(leave_type);
    }
    if (employee_id) {
      query += ' AND l.employee_id = ?';
      params.push(employee_id);
    }

    query += " ORDER BY CASE WHEN l.status = 'pending' THEN 1 ELSE 2 END, l.created_at DESC";
    const leaves = db.prepare(query).all(...params);

    res.json({ leaves });
  } catch (err) {
    console.error('Get all leaves error:', err);
    res.status(500).json({ error: 'Failed to retrieve leave applications.' });
  }
});

// POST /api/leaves/apply (Employee submit leave application)
router.post('/apply', authenticate, async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee profile linked.' });
    }

    const { leave_type, start_date, end_date, reason } = req.body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'Leave type, start date, end date, and reason are required.' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date.' });
    }

    // Calculate business/calendar days
    const diffTime = Math.abs(end - start);
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check balance
    const currentYear = new Date().getFullYear();
    const balance = db.prepare('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?').get(employeeId, currentYear);

    if (balance) {
      if (leave_type === 'vacation') {
        const remaining = balance.vacation_days - balance.vacation_used;
        if (daysCount > remaining) {
          return res.status(400).json({ error: `Insufficient Vacation leave balance. Requested ${daysCount} days, but you only have ${remaining} days left.` });
        }
      } else if (leave_type === 'sick') {
        const remaining = balance.sick_days - balance.sick_used;
        if (daysCount > remaining) {
          return res.status(400).json({ error: `Insufficient Sick leave balance. Requested ${daysCount} days, but you only have ${remaining} days left.` });
        }
      } else if (leave_type === 'emergency') {
        const remaining = balance.emergency_days - balance.emergency_used;
        if (daysCount > remaining) {
          return res.status(400).json({ error: `Insufficient Emergency leave balance. Requested ${daysCount} days, but you only have ${remaining} days left.` });
        }
      }
    }

    const result = db.prepare(`
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(employeeId, leave_type, start_date, end_date, daysCount, reason.trim());

    const created = db.prepare('SELECT * FROM leaves WHERE id = ?').get(result.lastInsertRowid);
    await pushToSupabase('leaves', 'insert', created, created.id);

    res.status(201).json({
      message: 'Leave application submitted successfully. Awaiting manager approval.',
      leave: created
    });
  } catch (err) {
    console.error('Apply leave error:', err);
    res.status(500).json({ error: 'Failed to submit leave application.' });
  }
});

// PUT /api/leaves/:id/review (Manager Approve / Reject)
router.put('/:id/review', authenticate, requireManager, async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id, 10);
    const { status, review_notes } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected.' });
    }

    const leave = db.prepare('SELECT * FROM leaves WHERE id = ?').get(leaveId);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    const currentYear = new Date().getFullYear();

    db.transaction(() => {
      // If approving for first time, deduct from balance
      if (status === 'approved' && leave.status !== 'approved') {
        if (leave.leave_type === 'vacation') {
          db.prepare('UPDATE leave_balances SET vacation_used = vacation_used + ? WHERE employee_id = ? AND year = ?')
            .run(leave.days_count, leave.employee_id, currentYear);
        } else if (leave.leave_type === 'sick') {
          db.prepare('UPDATE leave_balances SET sick_used = sick_used + ? WHERE employee_id = ? AND year = ?')
            .run(leave.days_count, leave.employee_id, currentYear);
        } else if (leave.leave_type === 'emergency') {
          db.prepare('UPDATE leave_balances SET emergency_used = emergency_used + ? WHERE employee_id = ? AND year = ?')
            .run(leave.days_count, leave.employee_id, currentYear);
        }
      } else if (status === 'rejected' && leave.status === 'approved') {
        // Refund if previously approved
        if (leave.leave_type === 'vacation') {
          db.prepare('UPDATE leave_balances SET vacation_used = MAX(0, vacation_used - ?) WHERE employee_id = ? AND year = ?')
            .run(leave.days_count, leave.employee_id, currentYear);
        } else if (leave.leave_type === 'sick') {
          db.prepare('UPDATE leave_balances SET sick_used = MAX(0, sick_used - ?) WHERE employee_id = ? AND year = ?')
            .run(leave.days_count, leave.employee_id, currentYear);
        } else if (leave.leave_type === 'emergency') {
          db.prepare('UPDATE leave_balances SET emergency_used = MAX(0, emergency_used - ?) WHERE employee_id = ? AND year = ?')
            .run(leave.days_count, leave.employee_id, currentYear);
        }
      }

      db.prepare(`
        UPDATE leaves
        SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, req.user.id, review_notes || null, leaveId);
    })();

    const updated = db.prepare('SELECT * FROM leaves WHERE id = ?').get(leaveId);
    await pushToSupabase('leaves', 'update', updated, updated.id);

    res.json({ message: `Leave application marked as ${status}.`, leave: updated });
  } catch (err) {
    console.error('Review leave error:', err);
    res.status(500).json({ error: 'Failed to review leave application.' });
  }
});

// PUT /api/leaves/balances/:employeeId (Manager update quota)
router.put('/balances/:employeeId', authenticate, requireManager, (req, res) => {
  try {
    const empId = parseInt(req.params.employeeId, 10);
    const { vacation_days, sick_days, emergency_days } = req.body;
    const currentYear = new Date().getFullYear();

    db.prepare(`
      INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, year) DO UPDATE SET
        vacation_days = COALESCE(excluded.vacation_days, vacation_days),
        sick_days = COALESCE(excluded.sick_days, sick_days),
        emergency_days = COALESCE(excluded.emergency_days, emergency_days)
    `).run(empId, currentYear, vacation_days, sick_days, emergency_days);

    const balance = db.prepare('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?').get(empId, currentYear);
    res.json({ message: 'Leave balance quota updated.', balance });
  } catch (err) {
    console.error('Update balance error:', err);
    res.status(500).json({ error: 'Failed to update balance quota.' });
  }
});

module.exports = router;
