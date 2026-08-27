const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/audit (List audit logs - Manager only)
router.get('/', authenticate, requireManager, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    res.json({ logs });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
