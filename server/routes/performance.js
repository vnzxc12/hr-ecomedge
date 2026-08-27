const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/performance (List performance reviews)
router.get('/', authenticate, (req, res) => {
  try {
    const { employee_id } = req.query;

    let query = `
      SELECT pr.*,
             e.employee_code, e.first_name, e.last_name, e.job_title, e.avatar_url, e.department,
             t.name as team_name,
             u.username as reviewer_username
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN users u ON pr.reviewer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'manager') {
      query += ' AND pr.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (employee_id) {
      query += ' AND pr.employee_id = ?';
      params.push(employee_id);
    }

    query += ' ORDER BY pr.review_date DESC, pr.created_at DESC';

    const reviews = db.prepare(query).all(...params);
    res.json({ reviews });
  } catch (err) {
    console.error('Error fetching performance reviews:', err);
    res.status(500).json({ error: 'Failed to fetch performance reviews.' });
  }
});

// POST /api/performance (Create review - Manager only)
router.post('/', authenticate, requireManager, (req, res) => {
  try {
    const {
      employee_id, review_period, rating, productivity_score, quality_score,
      accuracy_score, client_satisfaction, goals, manager_comments, employee_comments, review_date
    } = req.body;

    if (!employee_id || !review_period) {
      return res.status(400).json({ error: 'Employee and review period are required.' });
    }

    const result = db.prepare(`
      INSERT INTO performance_reviews (
        employee_id, reviewer_id, review_period, rating, productivity_score,
        quality_score, accuracy_score, client_satisfaction, goals,
        manager_comments, employee_comments, status, review_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `).run(
      employee_id, req.user.id, review_period, rating || 5.0,
      productivity_score || 5.0, quality_score || 5.0, accuracy_score || 5.0,
      client_satisfaction || 5.0, goals || '', manager_comments || '',
      employee_comments || '', review_date || new Date().toISOString().split('T')[0]
    );

    res.status(201).json({
      message: 'Performance review submitted successfully!',
      review_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error adding performance review:', err);
    res.status(500).json({ error: err.message || 'Failed to add performance review.' });
  }
});

// DELETE /api/performance/:id
router.delete('/:id', authenticate, requireManager, (req, res) => {
  try {
    db.prepare('DELETE FROM performance_reviews WHERE id = ?').run(req.params.id);
    res.json({ message: 'Performance review deleted.' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Failed to delete review.' });
  }
});

module.exports = router;
