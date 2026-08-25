const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/training/programs
router.get('/programs', authenticate, (req, res) => {
  try {
    const programs = db.prepare(`
      SELECT tp.*,
             (SELECT COUNT(*) FROM training_records WHERE training_id = tp.id) as enrolled_count,
             (SELECT COUNT(*) FROM training_records WHERE training_id = tp.id AND completion_status = 'completed') as completed_count
      FROM training_programs tp
      ORDER BY tp.id DESC
    `).all();

    res.json({ programs });
  } catch (err) {
    console.error('List training programs error:', err);
    res.status(500).json({ error: 'Failed to retrieve training programs.' });
  }
});

// POST /api/training/programs (Manager create)
router.post('/programs', authenticate, requireManager, (req, res) => {
  try {
    const { title, description, instructor, duration_hours, start_date, end_date, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Program title is required.' });
    }

    const result = db.prepare(`
      INSERT INTO training_programs (title, description, instructor, duration_hours, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description || null,
      instructor || null,
      parseInt(duration_hours, 10) || 0,
      start_date || null,
      end_date || null,
      status || 'upcoming'
    );

    const created = db.prepare('SELECT * FROM training_programs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Training program created.', program: created });
  } catch (err) {
    console.error('Create program error:', err);
    res.status(500).json({ error: 'Failed to create training program.' });
  }
});

// PUT /api/training/programs/:id
router.put('/programs/:id', authenticate, requireManager, (req, res) => {
  try {
    const progId = parseInt(req.params.id, 10);
    const { title, description, instructor, duration_hours, start_date, end_date, status } = req.body;

    db.prepare(`
      UPDATE training_programs
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          instructor = COALESCE(?, instructor),
          duration_hours = COALESCE(?, duration_hours),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(title, description, instructor, duration_hours, start_date, end_date, status, progId);

    const updated = db.prepare('SELECT * FROM training_programs WHERE id = ?').get(progId);
    res.json({ message: 'Program updated.', program: updated });
  } catch (err) {
    console.error('Update program error:', err);
    res.status(500).json({ error: 'Failed to update program.' });
  }
});

// DELETE /api/training/programs/:id
router.delete('/programs/:id', authenticate, requireManager, (req, res) => {
  try {
    const progId = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM training_programs WHERE id = ?').run(progId);
    res.json({ message: 'Training program deleted.' });
  } catch (err) {
    console.error('Delete program error:', err);
    res.status(500).json({ error: 'Failed to delete program.' });
  }
});

// GET /api/training/records (Enrolled training records)
router.get('/records', authenticate, (req, res) => {
  try {
    const isManager = req.user.role === 'manager';
    const employeeId = req.user.employee_id;
    const { training_id } = req.query;

    let query = `
      SELECT tr.*, tp.title as program_title, tp.duration_hours, tp.instructor, tp.status as program_status,
             e.first_name, e.last_name, e.employee_code, e.department
      FROM training_records tr
      JOIN training_programs tp ON tr.training_id = tp.id
      JOIN employees e ON tr.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (!isManager) {
      query += ' AND tr.employee_id = ?';
      params.push(employeeId);
    } else if (req.query.employee_id) {
      query += ' AND tr.employee_id = ?';
      params.push(req.query.employee_id);
    }

    if (training_id) {
      query += ' AND tr.training_id = ?';
      params.push(training_id);
    }

    query += ' ORDER BY tr.created_at DESC';
    const records = db.prepare(query).all(...params);

    res.json({ records });
  } catch (err) {
    console.error('Get training records error:', err);
    res.status(500).json({ error: 'Failed to retrieve training records.' });
  }
});

// POST /api/training/enroll (Enroll employee)
router.post('/enroll', authenticate, (req, res) => {
  try {
    const { training_id, employee_id } = req.body;
    const isManager = req.user.role === 'manager';

    const targetEmpId = isManager && employee_id ? parseInt(employee_id, 10) : req.user.employee_id;
    if (!targetEmpId || !training_id) {
      return res.status(400).json({ error: 'Training program and employee are required.' });
    }

    const existing = db.prepare('SELECT id FROM training_records WHERE training_id = ? AND employee_id = ?').get(training_id, targetEmpId);
    if (existing) {
      return res.status(400).json({ error: 'Employee is already enrolled in this training program.' });
    }

    const result = db.prepare(`
      INSERT INTO training_records (training_id, employee_id, completion_status)
      VALUES (?, ?, 'enrolled')
    `).run(training_id, targetEmpId);

    const created = db.prepare('SELECT * FROM training_records WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Enrolled successfully.', record: created });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Failed to enroll in training.' });
  }
});

// PUT /api/training/records/:id (Update progress / completion / score)
router.put('/records/:id', authenticate, (req, res) => {
  try {
    const recordId = parseInt(req.params.id, 10);
    const { completion_status, score, certificate_url, completion_date } = req.body;

    const record = db.prepare('SELECT * FROM training_records WHERE id = ?').get(recordId);
    if (!record) return res.status(404).json({ error: 'Training record not found.' });

    const isManager = req.user.role === 'manager';
    const isOwner = req.user.employee_id === record.employee_id;

    if (!isManager && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const resolvedCompDate = completion_status === 'completed' ? (completion_date || today) : null;

    db.prepare(`
      UPDATE training_records
      SET completion_status = COALESCE(?, completion_status),
          score = COALESCE(?, score),
          certificate_url = COALESCE(?, certificate_url),
          completion_date = COALESCE(?, completion_date)
      WHERE id = ?
    `).run(completion_status, score, certificate_url, resolvedCompDate, recordId);

    const updated = db.prepare('SELECT * FROM training_records WHERE id = ?').get(recordId);
    res.json({ message: 'Training record updated.', record: updated });
  } catch (err) {
    console.error('Update training record error:', err);
    res.status(500).json({ error: 'Failed to update training record.' });
  }
});

module.exports = router;
