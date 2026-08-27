const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/projects (List projects with client name, manager, team, and assigned employees)
router.get('/', authenticate, (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, 
             c.name as client_name, c.code as client_code,
             t.name as team_name,
             pm.first_name as pm_first_name, pm.last_name as pm_last_name,
             (SELECT COUNT(*) FROM project_assignments pa WHERE pa.project_id = p.id AND pa.status = 'active') as assigned_count
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN employees pm ON p.project_manager_id = pm.id
      ORDER BY p.status ASC, p.created_at DESC
    `).all();

    res.json({ projects });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// GET /api/projects/:id (Get project details and assigned member list)
router.get('/:id', authenticate, (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*, 
             c.name as client_name, c.code as client_code, c.contact_person, c.email as client_email,
             t.name as team_name,
             pm.first_name as pm_first_name, pm.last_name as pm_last_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN employees pm ON p.project_manager_id = pm.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const assignments = db.prepare(`
      SELECT pa.*, 
             e.employee_code, e.first_name, e.last_name, e.job_title, e.avatar_url, e.department
      FROM project_assignments pa
      JOIN employees e ON pa.employee_id = e.id
      WHERE pa.project_id = ?
      ORDER BY pa.allocation_percent DESC
    `).all(req.params.id);

    res.json({ project, assignments });
  } catch (err) {
    console.error('Error fetching project details:', err);
    res.status(500).json({ error: 'Failed to fetch project details.' });
  }
});

// POST /api/projects (Create project - Manager only)
router.post('/', authenticate, requireManager, (req, res) => {
  try {
    const { client_id, name, project_code, description, project_manager_id, team_id, start_date, end_date, priority, budget } = req.body;
    if (!client_id || !name || !project_code) {
      return res.status(400).json({ error: 'Client, Project Name, and Project Code are required.' });
    }

    const result = db.prepare(`
      INSERT INTO projects (client_id, name, project_code, description, project_manager_id, team_id, start_date, end_date, priority, budget, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      client_id, name.trim(), project_code.trim().toUpperCase(),
      description || '', project_manager_id || null, team_id || null,
      start_date || null, end_date || null, priority || 'medium', budget || 0
    );

    res.status(201).json({
      message: 'Project created successfully!',
      project_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: err.message || 'Failed to create project.' });
  }
});

// PUT /api/projects/:id (Update project)
router.put('/:id', authenticate, requireManager, (req, res) => {
  try {
    const { name, project_code, description, project_manager_id, team_id, start_date, end_date, status, priority, budget } = req.body;
    db.prepare(`
      UPDATE projects
      SET name = COALESCE(?, name),
          project_code = COALESCE(?, project_code),
          description = COALESCE(?, description),
          project_manager_id = ?,
          team_id = ?,
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          budget = COALESCE(?, budget)
      WHERE id = ?
    `).run(name, project_code, description, project_manager_id || null, team_id || null, start_date, end_date, status, priority, budget, req.params.id);

    res.json({ message: 'Project updated successfully!' });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: err.message || 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, requireManager, (req, res) => {
  try {
    db.prepare('DELETE FROM project_assignments WHERE project_id = ?').run(req.params.id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// --- WORK ASSIGNMENTS ---

// POST /api/projects/assign (Assign employee to project)
router.post('/assign', authenticate, requireManager, (req, res) => {
  try {
    const { project_id, employee_id, role_on_project, allocation_percent, start_date, end_date } = req.body;
    if (!project_id || !employee_id) {
      return res.status(400).json({ error: 'Project and Employee are required.' });
    }

    db.prepare(`
      INSERT INTO project_assignments (project_id, employee_id, role_on_project, allocation_percent, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
      ON CONFLICT(project_id, employee_id) DO UPDATE SET
        role_on_project = EXCLUDED.role_on_project,
        allocation_percent = EXCLUDED.allocation_percent,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = 'active'
    `).run(
      project_id, employee_id, role_on_project || 'Research Analyst',
      allocation_percent || 100, start_date || null, end_date || null
    );

    res.json({ message: 'Employee assigned to project successfully!' });
  } catch (err) {
    console.error('Error assigning employee:', err);
    res.status(500).json({ error: err.message || 'Failed to assign employee.' });
  }
});

// DELETE /api/projects/assignment/:id (Remove assignment)
router.delete('/assignment/:id', authenticate, requireManager, (req, res) => {
  try {
    db.prepare('DELETE FROM project_assignments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Assignment removed successfully.' });
  } catch (err) {
    console.error('Error removing assignment:', err);
    res.status(500).json({ error: 'Failed to remove assignment.' });
  }
});

// --- TEAM WORKLOAD & UTILIZATION ---

// GET /api/projects/workload/overview
router.get('/workload/overview', authenticate, (req, res) => {
  try {
    const teams = db.prepare(`
      SELECT t.id, t.name, t.department,
             COUNT(DISTINCT e.id) as total_employees,
             COUNT(DISTINCT pa.project_id) as active_projects,
             COALESCE(AVG(pa.allocation_percent), 0) as avg_allocation
      FROM teams t
      LEFT JOIN employees e ON e.team_id = t.id AND e.employment_status = 'active'
      LEFT JOIN project_assignments pa ON pa.employee_id = e.id AND pa.status = 'active'
      GROUP BY t.id
      ORDER BY t.name ASC
    `).all();

    const employeeWorkloads = db.prepare(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.job_title, e.avatar_url,
             t.name as team_name,
             COALESCE(SUM(pa.allocation_percent), 0) as total_allocation,
             COUNT(pa.project_id) as assigned_projects_count
      FROM employees e
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN project_assignments pa ON pa.employee_id = e.id AND pa.status = 'active'
      WHERE e.employment_status = 'active'
      GROUP BY e.id
      ORDER BY total_allocation DESC
    `).all();

    res.json({ teams, employeeWorkloads });
  } catch (err) {
    console.error('Error fetching workload data:', err);
    res.status(500).json({ error: 'Failed to fetch team workload.' });
  }
});

// --- CLIENTS ---

// GET /api/projects/clients/list
router.get('/clients/list', authenticate, (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) as project_count
      FROM clients c
      ORDER BY c.name ASC
    `).all();

    res.json({ clients });
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// POST /api/projects/clients/create
router.post('/clients/create', authenticate, requireManager, (req, res) => {
  try {
    const { name, code, industry, contact_person, email, phone } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Client name and code are required.' });
    }

    const result = db.prepare(`
      INSERT INTO clients (name, code, industry, contact_person, email, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(name.trim(), code.trim().toUpperCase(), industry || 'E-Commerce', contact_person || '', email || '', phone || '');

    res.status(201).json({
      message: 'Client added successfully!',
      client_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error adding client:', err);
    res.status(500).json({ error: err.message || 'Failed to add client.' });
  }
});

module.exports = router;
