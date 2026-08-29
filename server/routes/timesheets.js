const express = require('express');
const router = express.Router();
const { db, syncFromSupabase, pushToSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/timesheets (List timesheets with project & employee details)
router.get('/', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    const { employee_id, project_id, status, start_date, end_date } = req.query;

    let query = `
      SELECT ts.*,
             e.employee_code, e.first_name, e.last_name, e.avatar_url, e.job_title,
             p.name as project_name, p.project_code,
             c.name as client_name,
             u.username as reviewer_username
      FROM timesheets ts
      JOIN employees e ON ts.employee_id = e.id
      LEFT JOIN projects p ON ts.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON ts.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // If regular employee, only show their own timesheets
    if (req.user.role !== 'manager') {
      query += ' AND ts.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (employee_id) {
      query += ' AND ts.employee_id = ?';
      params.push(employee_id);
    }

    if (project_id) {
      query += ' AND ts.project_id = ?';
      params.push(project_id);
    }

    if (status) {
      query += ' AND ts.status = ?';
      params.push(status);
    }

    if (start_date && end_date) {
      query += ' AND ts.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY ts.date DESC, ts.created_at DESC';

    const timesheets = db.prepare(query).all(...params);
    res.json({ timesheets });
  } catch (err) {
    console.error('Error fetching timesheets:', err);
    res.status(500).json({ error: 'Failed to fetch timesheets.' });
  }
});

// POST /api/timesheets (Log new timesheet entry)
router.post('/', authenticate, async (req, res) => {
  try {
    const { employee_id, project_id, date, start_time, end_time, break_mins, total_hours, overtime_hours, task_description } = req.body;

    const empId = req.user.role === 'manager' && employee_id ? employee_id : req.user.employee_id;
    if (!empId) {
      return res.status(400).json({ error: 'Valid employee ID is required.' });
    }

    if (!date || !task_description) {
      return res.status(400).json({ error: 'Date and task description are required.' });
    }

    const calculatedHours = total_hours ? parseFloat(total_hours) : 8.0;

    const result = db.prepare(`
      INSERT INTO timesheets (employee_id, project_id, date, start_time, end_time, break_mins, total_hours, overtime_hours, task_description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
    `).run(
      empId, project_id || null, date, start_time || '09:00', end_time || '18:00',
      break_mins || 60, calculatedHours, overtime_hours || 0, task_description.trim()
    );

    const created = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(result.lastInsertRowid);
    await pushToSupabase('timesheets', 'insert', created, created.id);

    res.status(201).json({
      message: 'Timesheet submitted successfully!',
      timesheet_id: created.id
    });
  } catch (err) {
    console.error('Error logging timesheet:', err);
    res.status(500).json({ error: err.message || 'Failed to submit timesheet.' });
  }
});

// PUT /api/timesheets/:id/review (Approve or Reject - Manager only)
router.put('/:id/review', authenticate, requireManager, async (req, res) => {
  try {
    const { status, review_notes } = req.body;
    if (!status || !['approved', 'rejected', 'submitted'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved/rejected) is required.' });
    }

    db.prepare(`
      UPDATE timesheets
      SET status = ?,
          review_notes = ?,
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, review_notes || '', req.user.id, req.params.id);

    const updated = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(req.params.id);
    if (updated) {
      await pushToSupabase('timesheets', 'update', updated, updated.id);
    }

    res.json({ message: `Timesheet marked as ${status}.` });
  } catch (err) {
    console.error('Error reviewing timesheet:', err);
    res.status(500).json({ error: 'Failed to update timesheet status.' });
  }
});

// DELETE /api/timesheets/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const ts = db.prepare('SELECT * FROM timesheets WHERE id = ?').get(req.params.id);
    if (!ts) {
      return res.status(404).json({ error: 'Timesheet entry not found.' });
    }

    if (req.user.role !== 'manager' && ts.employee_id !== req.user.employee_id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    db.prepare('DELETE FROM timesheets WHERE id = ?').run(req.params.id);
    await pushToSupabase('timesheets', 'delete', ts, ts.id);

    res.json({ message: 'Timesheet entry deleted successfully.' });
  } catch (err) {
    console.error('Error deleting timesheet:', err);
    res.status(500).json({ error: 'Failed to delete timesheet.' });
  }
});

module.exports = router;
