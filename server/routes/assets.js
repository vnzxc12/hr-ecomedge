const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/assets (List assets)
router.get('/', authenticate, (req, res) => {
  try {
    const isManager = req.user.role === 'manager';
    const { category, status, search, assigned_to } = req.query;

    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_code, e.department
      FROM assets a
      LEFT JOIN employees e ON a.assigned_to = e.id
      WHERE 1=1
    `;
    const params = [];

    if (!isManager) {
      // Non-managers only see company assets assigned to them
      query += ' AND a.assigned_to = ?';
      params.push(req.user.employee_id);
    } else {
      if (assigned_to) {
        query += ' AND a.assigned_to = ?';
        params.push(assigned_to);
      }
    }

    if (category) {
      query += ' AND a.category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (a.asset_tag LIKE ? OR a.name LIKE ? OR a.model_serial LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    query += ' ORDER BY a.id DESC';
    const assets = db.prepare(query).all(...params);

    res.json({ assets });
  } catch (err) {
    console.error('List assets error:', err);
    res.status(500).json({ error: 'Failed to retrieve asset list.' });
  }
});

// GET /api/assets/my (Employee's assigned assets)
router.get('/my', authenticate, (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) return res.json({ assets: [] });

    const assets = db.prepare(`
      SELECT * FROM assets
      WHERE assigned_to = ?
      ORDER BY assigned_date DESC
    `).all(employeeId);

    res.json({ assets });
  } catch (err) {
    console.error('Get my assets error:', err);
    res.status(500).json({ error: 'Failed to retrieve assigned assets.' });
  }
});

// POST /api/assets (Manager create asset)
router.post('/', authenticate, requireManager, (req, res) => {
  try {
    const { asset_tag, name, category, model_serial, condition, notes, assigned_to, expected_return_date } = req.body;

    if (!asset_tag || !name || !category) {
      return res.status(400).json({ error: 'Asset tag, name, and category are required.' });
    }

    const existing = db.prepare('SELECT id FROM assets WHERE asset_tag = ?').get(asset_tag.trim());
    if (existing) {
      return res.status(400).json({ error: `Asset tag "${asset_tag}" already exists.` });
    }

    const status = assigned_to ? 'assigned' : 'available';
    const assignedDate = assigned_to ? new Date().toISOString().split('T')[0] : null;

    const result = db.prepare(`
      INSERT INTO assets (asset_tag, name, category, model_serial, status, assigned_to, assigned_date, expected_return_date, condition, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      asset_tag.trim(),
      name.trim(),
      category,
      model_serial || null,
      status,
      assigned_to || null,
      assignedDate,
      expected_return_date || null,
      condition || 'good',
      notes || null
    );

    const created = db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Asset added to inventory.', asset: created });
  } catch (err) {
    console.error('Create asset error:', err);
    res.status(500).json({ error: 'Failed to add asset.' });
  }
});

// PUT /api/assets/:id
router.put('/:id', authenticate, requireManager, (req, res) => {
  try {
    const assetId = parseInt(req.params.id, 10);
    const { name, category, model_serial, condition, notes, status, assigned_to, expected_return_date } = req.body;

    db.prepare(`
      UPDATE assets
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          model_serial = COALESCE(?, model_serial),
          condition = COALESCE(?, condition),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          assigned_to = COALESCE(?, assigned_to),
          expected_return_date = COALESCE(?, expected_return_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category, model_serial, condition, notes, status, assigned_to, expected_return_date, assetId);

    const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    res.json({ message: 'Asset updated.', asset: updated });
  } catch (err) {
    console.error('Update asset error:', err);
    res.status(500).json({ error: 'Failed to update asset.' });
  }
});

// POST /api/assets/:id/assign (Assign to employee)
router.post('/:id/assign', authenticate, requireManager, (req, res) => {
  try {
    const assetId = parseInt(req.params.id, 10);
    const { employee_id, expected_return_date } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'Please select an employee to assign this asset to.' });
    }

    const today = new Date().toISOString().split('T')[0];

    db.prepare(`
      UPDATE assets
      SET assigned_to = ?,
          assigned_date = ?,
          expected_return_date = ?,
          status = 'assigned',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(employee_id, today, expected_return_date || null, assetId);

    const updated = db.prepare(`
      SELECT a.*, e.first_name, e.last_name, e.employee_code
      FROM assets a
      LEFT JOIN employees e ON a.assigned_to = e.id
      WHERE a.id = ?
    `).get(assetId);

    res.json({ message: `Asset assigned to ${updated.first_name} ${updated.last_name}.`, asset: updated });
  } catch (err) {
    console.error('Assign asset error:', err);
    res.status(500).json({ error: 'Failed to assign asset.' });
  }
});

// POST /api/assets/:id/return (Return asset to inventory)
router.post('/:id/return', authenticate, requireManager, (req, res) => {
  try {
    const assetId = parseInt(req.params.id, 10);
    const { condition, notes } = req.body;

    db.prepare(`
      UPDATE assets
      SET assigned_to = NULL,
          assigned_date = NULL,
          expected_return_date = NULL,
          status = 'available',
          condition = COALESCE(?, condition),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(condition || null, notes || null, assetId);

    const updated = db.prepare('SELECT * FROM assets WHERE id = ?').get(assetId);
    res.json({ message: 'Asset successfully returned to available inventory.', asset: updated });
  } catch (err) {
    console.error('Return asset error:', err);
    res.status(500).json({ error: 'Failed to return asset.' });
  }
});

// DELETE /api/assets/:id
router.delete('/:id', authenticate, requireManager, (req, res) => {
  try {
    const assetId = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM assets WHERE id = ?').run(assetId);
    res.json({ message: 'Asset removed from inventory.' });
  } catch (err) {
    console.error('Delete asset error:', err);
    res.status(500).json({ error: 'Failed to delete asset.' });
  }
});

module.exports = router;
