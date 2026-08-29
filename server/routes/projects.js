const express = require('express');
const router = express.Router();
const { db, supabase, syncFromSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/projects (List projects with client name, manager, team, and assigned employees)
router.get('/', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    const projects = db.prepare(`
      SELECT p.*, 
             c.name as client_name, c.code as client_code,
             t.name as team_name,
             pm.first_name as pm_first_name, pm.last_name as pm_last_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN employees pm ON p.project_manager_id = pm.id
      ORDER BY p.status ASC, p.created_at DESC
    `).all();

    const allAssignments = db.prepare(`
      SELECT pa.project_id, pa.employee_id, pa.role_on_project, pa.allocation_percent,
             e.first_name, e.last_name, e.avatar_url, e.employee_code, e.job_title
      FROM project_assignments pa
      JOIN employees e ON pa.employee_id = e.id
      WHERE pa.status = 'active'
      ORDER BY pa.allocation_percent DESC
    `).all();

    const assignMap = {};
    for (const a of allAssignments) {
      if (!assignMap[a.project_id]) assignMap[a.project_id] = [];
      assignMap[a.project_id].push(a);
    }

    for (const p of projects) {
      p.assigned_members = assignMap[p.id] || [];
      p.assigned_count = p.assigned_members.length;
    }

    res.json({ projects });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// GET /api/projects/:id (Get project details and assigned member list)
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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
router.post('/', authenticate, requireManager, async (req, res) => {
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

    const newPrjId = result.lastInsertRowid;

    if (supabase) {
      try {
        await supabase.from('projects').upsert({
          id: newPrjId,
          client_id: parseInt(client_id, 10),
          name: name.trim(),
          project_code: project_code.trim().toUpperCase(),
          description: description || '',
          project_manager_id: project_manager_id ? parseInt(project_manager_id, 10) : null,
          team_id: team_id ? parseInt(team_id, 10) : null,
          start_date: start_date || null,
          end_date: end_date || null,
          priority: priority || 'medium',
          budget: parseFloat(budget) || 0,
          status: 'active'
        });
      } catch (sbErr) {
        console.warn('Supabase project insert error:', sbErr.message);
      }
    }

    res.status(201).json({
      message: 'Project created successfully!',
      project_id: newPrjId
    });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: err.message || 'Failed to create project.' });
  }
});

// PUT /api/projects/:id (Update project)
router.put('/:id', authenticate, requireManager, async (req, res) => {
  try {
    const prjId = parseInt(req.params.id, 10);
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
    `).run(name, project_code, description, project_manager_id || null, team_id || null, start_date, end_date, status, priority, budget, prjId);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(prjId);

    if (supabase && updated) {
      try {
        await supabase.from('projects').update({
          name: updated.name,
          project_code: updated.project_code,
          description: updated.description,
          project_manager_id: updated.project_manager_id || null,
          team_id: updated.team_id || null,
          start_date: updated.start_date || null,
          end_date: updated.end_date || null,
          status: updated.status,
          priority: updated.priority,
          budget: updated.budget
        }).eq('id', prjId);
      } catch (sbErr) {
        console.warn('Supabase project update error:', sbErr.message);
      }
    }

    res.json({ message: 'Project updated successfully!' });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: err.message || 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  try {
    const prjId = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM project_assignments WHERE project_id = ?').run(prjId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(prjId);

    if (supabase) {
      try {
        await supabase.from('project_assignments').delete().eq('project_id', prjId);
        await supabase.from('projects').delete().eq('id', prjId);
      } catch (sbErr) {
        console.warn('Supabase project delete error:', sbErr.message);
      }
    }

    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// --- WORK ASSIGNMENTS ---

// POST /api/projects/assign (Assign employee to project)
router.post('/assign', authenticate, requireManager, async (req, res) => {
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

    if (supabase) {
      try {
        await supabase.from('project_assignments').upsert({
          project_id: parseInt(project_id, 10),
          employee_id: parseInt(employee_id, 10),
          role_on_project: role_on_project || 'Research Analyst',
          allocation_percent: parseInt(allocation_percent, 10) || 100,
          start_date: start_date || null,
          end_date: end_date || null,
          status: 'active'
        }, { onConflict: 'project_id,employee_id' });
      } catch (sbErr) {
        console.warn('Supabase assignment upsert error:', sbErr.message);
      }
    }

    res.json({ message: 'Employee assigned to project successfully!' });
  } catch (err) {
    console.error('Error assigning employee:', err);
    res.status(500).json({ error: err.message || 'Failed to assign employee.' });
  }
});

// DELETE /api/projects/assignment/:id (Remove assignment)
router.delete('/assignment/:id', authenticate, requireManager, async (req, res) => {
  try {
    const assignId = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM project_assignments WHERE id = ?').run(assignId);

    if (supabase) {
      try {
        await supabase.from('project_assignments').delete().eq('id', assignId);
      } catch (sbErr) {
        console.warn('Supabase assignment delete error:', sbErr.message);
      }
    }

    res.json({ message: 'Assignment removed successfully.' });
  } catch (err) {
    console.error('Error removing assignment:', err);
    res.status(500).json({ error: 'Failed to remove assignment.' });
  }
});

// --- TEAM WORKLOAD & UTILIZATION ---

// GET /api/projects/workload/overview
router.get('/workload/overview', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    // 1. Fetch all active teams
    const allTeams = db.prepare('SELECT id, name, department FROM teams ORDER BY name ASC').all();

    // 2. Fetch all active employees with their individual total allocations
    const employeeWorkloads = db.prepare(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.job_title, e.avatar_url, e.team_id,
             COALESCE(t.name, 'General') as team_name,
             COALESCE(SUM(pa.allocation_percent), 0) as total_allocation,
             COUNT(DISTINCT pa.project_id) as assigned_projects_count
      FROM employees e
      LEFT JOIN teams t ON e.team_id = t.id
      LEFT JOIN project_assignments pa ON pa.employee_id = e.id AND pa.status = 'active'
      WHERE e.employment_status = 'active'
      GROUP BY e.id
      ORDER BY total_allocation DESC, e.first_name ASC
    `).all();

    // 3. Count active projects per team (projects assigned to the team or staffed by members of the team)
    const teamProjectCounts = db.prepare(`
      SELECT t.id as team_id,
             COUNT(DISTINCT p.id) as active_projects
      FROM teams t
      LEFT JOIN projects p ON (
        p.team_id = t.id OR p.id IN (
          SELECT pa2.project_id 
          FROM project_assignments pa2
          JOIN employees e2 ON pa2.employee_id = e2.id
          WHERE e2.team_id = t.id AND pa2.status = 'active'
        )
      ) AND p.status = 'active'
      GROUP BY t.id
    `).all();

    const projCountMap = {};
    for (const tp of teamProjectCounts) {
      projCountMap[tp.team_id] = tp.active_projects || 0;
    }

    // 4. Calculate utilization and staff count strictly by members belonging to that team
    // Formula: SUM(utilization) / COUNT(staff)
    const teams = allTeams.map(team => {
      const teamMembers = employeeWorkloads.filter(e => e.team_id === team.id);
      const totalEmployees = teamMembers.length;
      const totalAllocSum = teamMembers.reduce((sum, m) => sum + (parseFloat(m.total_allocation) || 0), 0);
      const avgAllocation = totalEmployees > 0 ? Math.round((totalAllocSum / totalEmployees) * 10) / 10 : 0;

      return {
        id: team.id,
        name: team.name,
        department: team.department,
        total_employees: totalEmployees,
        active_projects: projCountMap[team.id] || 0,
        total_allocation_sum: totalAllocSum,
        avg_allocation: avgAllocation
      };
    });

    res.json({ teams, employeeWorkloads });
  } catch (err) {
    console.error('Error fetching workload data:', err);
    res.status(500).json({ error: 'Failed to fetch team workload.' });
  }
});

// --- CLIENTS ---

// GET /api/projects/clients/list
router.get('/clients/list', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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
router.post('/clients/create', authenticate, requireManager, async (req, res) => {
  try {
    const { name, code, industry, contact_person, email, phone } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Client name and code are required.' });
    }

    const result = db.prepare(`
      INSERT INTO clients (name, code, industry, contact_person, email, phone, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(name.trim(), code.trim().toUpperCase(), industry || 'E-Commerce', contact_person || '', email || '', phone || '');

    const newClientId = result.lastInsertRowid;

    if (supabase) {
      try {
        await supabase.from('clients').upsert({
          id: newClientId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          industry: industry || 'E-Commerce',
          contact_person: contact_person || '',
          email: email || '',
          phone: phone || '',
          status: 'active'
        });
      } catch (sbErr) {
        console.warn('Supabase client insert error:', sbErr.message);
      }
    }

    res.status(201).json({
      message: 'Client added successfully!',
      client_id: newClientId
    });
  } catch (err) {
    console.error('Error adding client:', err);
    res.status(500).json({ error: err.message || 'Failed to add client.' });
  }
});

// PUT /api/projects/clients/:id
router.put('/clients/:id', authenticate, requireManager, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    const { name, code, industry, contact_person, email, phone, status } = req.body;
    db.prepare(`
      UPDATE clients
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          industry = COALESCE(?, industry),
          contact_person = COALESCE(?, contact_person),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, code, industry, contact_person, email, phone, status, clientId);

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);

    if (supabase && updated) {
      try {
        await supabase.from('clients').update({
          name: updated.name,
          code: updated.code,
          industry: updated.industry,
          contact_person: updated.contact_person,
          email: updated.email,
          phone: updated.phone,
          status: updated.status
        }).eq('id', clientId);
      } catch (sbErr) {
        console.warn('Supabase client update error:', sbErr.message);
      }
    }

    res.json({ message: 'Client updated successfully!' });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: err.message || 'Failed to update client.' });
  }
});

// DELETE /api/projects/clients/:id
router.delete('/clients/:id', authenticate, requireManager, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM projects WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);

    if (supabase) {
      try {
        await supabase.from('projects').delete().eq('client_id', clientId);
        await supabase.from('clients').delete().eq('id', clientId);
      } catch (sbErr) {
        console.warn('Supabase client delete error:', sbErr.message);
      }
    }

    res.json({ message: 'Client deleted successfully.' });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

module.exports = router;
