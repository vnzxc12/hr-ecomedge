const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/teams (List all teams with member count and lead name)
router.get('/', authenticate, (req, res) => {
  try {
    const teams = db.prepare(`
      SELECT t.*, 
             e.first_name as lead_first_name, e.last_name as lead_last_name, e.avatar_url as lead_avatar_url,
             (SELECT COUNT(*) FROM employees emp WHERE emp.team_id = t.id AND emp.employment_status = 'active') as member_count
      FROM teams t
      LEFT JOIN employees e ON t.team_lead_id = e.id
      ORDER BY t.name ASC
    `).all();

    res.json({ teams });
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// GET /api/teams/:id (Get team details with member roster)
router.get('/:id', authenticate, (req, res) => {
  try {
    const team = db.prepare(`
      SELECT t.*, 
             e.first_name as lead_first_name, e.last_name as lead_last_name
      FROM teams t
      LEFT JOIN employees e ON t.team_lead_id = e.id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    const members = db.prepare(`
      SELECT id, employee_code, first_name, last_name, job_title, department, avatar_url, employment_status
      FROM employees
      WHERE team_id = ?
      ORDER BY first_name ASC
    `).all(req.params.id);

    res.json({ team, members });
  } catch (err) {
    console.error('Error fetching team details:', err);
    res.status(500).json({ error: 'Failed to fetch team details.' });
  }
});

// POST /api/teams (Create team - Manager only)
router.post('/', authenticate, requireManager, (req, res) => {
  try {
    const { name, description, department, team_lead_id } = req.body;
    if (!name || !department) {
      return res.status(400).json({ error: 'Team name and department are required.' });
    }

    const result = db.prepare(`
      INSERT INTO teams (name, description, department, team_lead_id, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(name.trim(), description || '', department.trim(), team_lead_id || null);

    res.status(201).json({
      message: 'Team created successfully!',
      team_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: err.message || 'Failed to create team.' });
  }
});

// PUT /api/teams/:id (Update team - Manager only)
router.put('/:id', authenticate, requireManager, (req, res) => {
  try {
    const { name, description, department, team_lead_id, status } = req.body;
    db.prepare(`
      UPDATE teams
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          department = COALESCE(?, department),
          team_lead_id = ?,
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, description, department, team_lead_id || null, status, req.params.id);

    res.json({ message: 'Team updated successfully!' });
  } catch (err) {
    console.error('Error updating team:', err);
    res.status(500).json({ error: err.message || 'Failed to update team.' });
  }
});

// DELETE /api/teams/:id
router.delete('/:id', authenticate, requireManager, (req, res) => {
  try {
    db.prepare('UPDATE employees SET team_id = NULL WHERE team_id = ?').run(req.params.id);
    db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    res.json({ message: 'Team deleted successfully.' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ error: 'Failed to delete team.' });
  }
});

// --- DESIGNATIONS ---

// GET /api/teams/designations/list
router.get('/designations/list', authenticate, (req, res) => {
  try {
    const designations = db.prepare(`
      SELECT d.*, (SELECT COUNT(*) FROM employees e WHERE e.designation_id = d.id AND e.employment_status = 'active') as employee_count
      FROM designations d
      ORDER BY d.department ASC, d.title ASC
    `).all();

    res.json({ designations });
  } catch (err) {
    console.error('Error fetching designations:', err);
    res.status(500).json({ error: 'Failed to fetch designations.' });
  }
});

// POST /api/teams/designations/create
router.post('/designations/create', authenticate, requireManager, (req, res) => {
  try {
    const { title, department, level, description } = req.body;
    if (!title || !department) {
      return res.status(400).json({ error: 'Title and department are required.' });
    }

    const result = db.prepare(`
      INSERT INTO designations (title, department, level, description, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(title.trim(), department.trim(), level || 'Mid-Level', description || '');

    res.status(201).json({
      message: 'Designation added successfully!',
      designation_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error adding designation:', err);
    res.status(500).json({ error: err.message || 'Failed to add designation.' });
  }
});

// PUT /api/teams/designations/:id
router.put('/designations/:id', authenticate, requireManager, (req, res) => {
  try {
    const { title, department, level, description, status } = req.body;
    db.prepare(`
      UPDATE designations
      SET title = COALESCE(?, title),
          department = COALESCE(?, department),
          level = COALESCE(?, level),
          description = COALESCE(?, description),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(title, department, level, description, status, req.params.id);

    res.json({ message: 'Designation updated successfully!' });
  } catch (err) {
    console.error('Error updating designation:', err);
    res.status(500).json({ error: err.message || 'Failed to update designation.' });
  }
});

// DELETE /api/teams/designations/:id
router.delete('/designations/:id', authenticate, requireManager, (req, res) => {
  try {
    db.prepare('UPDATE employees SET designation_id = NULL WHERE designation_id = ?').run(req.params.id);
    db.prepare('DELETE FROM designations WHERE id = ?').run(req.params.id);
    res.json({ message: 'Designation removed successfully.' });
  } catch (err) {
    console.error('Error deleting designation:', err);
    res.status(500).json({ error: 'Failed to delete designation.' });
  }
});

module.exports = router;
