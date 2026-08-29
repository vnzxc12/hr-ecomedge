const express = require('express');
const router = express.Router();
const { db, supabase, syncFromSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/teams (List all teams with member count and lead name)
router.get('/', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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
router.post('/', authenticate, requireManager, async (req, res) => {
  try {
    const { name, description, department, team_lead_id } = req.body;
    if (!name || !department) {
      return res.status(400).json({ error: 'Team name and department are required.' });
    }

    const result = db.prepare(`
      INSERT INTO teams (name, description, department, team_lead_id, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(name.trim(), description || '', department.trim(), team_lead_id || null);

    const newTeamId = result.lastInsertRowid;

    if (supabase) {
      try {
        await supabase.from('teams').upsert({
          id: newTeamId,
          name: name.trim(),
          description: description || '',
          department: department.trim(),
          team_lead_id: team_lead_id || null,
          status: 'active'
        });
      } catch (sbErr) {
        console.warn('Supabase team insert error:', sbErr.message);
      }
    }

    res.status(201).json({
      message: 'Team created successfully!',
      team_id: newTeamId
    });
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(500).json({ error: err.message || 'Failed to create team.' });
  }
});

// PUT /api/teams/:id (Update team - Manager only)
router.put('/:id', authenticate, requireManager, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const { name, description, department, team_lead_id, status } = req.body;
    db.prepare(`
      UPDATE teams
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          department = COALESCE(?, department),
          team_lead_id = ?,
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(name, description, department, team_lead_id || null, status, teamId);

    const updated = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);

    if (supabase && updated) {
      try {
        await supabase.from('teams').update({
          name: updated.name,
          description: updated.description,
          department: updated.department,
          team_lead_id: updated.team_lead_id || null,
          status: updated.status
        }).eq('id', teamId);
      } catch (sbErr) {
        console.warn('Supabase team update error:', sbErr.message);
      }
    }

    res.json({ message: 'Team updated successfully!' });
  } catch (err) {
    console.error('Error updating team:', err);
    res.status(500).json({ error: err.message || 'Failed to update team.' });
  }
});

// DELETE /api/teams/:id
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    db.prepare('UPDATE employees SET team_id = NULL WHERE team_id = ?').run(teamId);
    db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

    if (supabase) {
      try {
        await supabase.from('employees').update({ team_id: null }).eq('team_id', teamId);
        await supabase.from('teams').delete().eq('id', teamId);
      } catch (sbErr) {
        console.warn('Supabase team delete error:', sbErr.message);
      }
    }

    res.json({ message: 'Team deleted successfully.' });
  } catch (err) {
    console.error('Error deleting team:', err);
    res.status(500).json({ error: 'Failed to delete team.' });
  }
});

// POST /api/teams/:id/assign-member (Assign employee to team)
router.post('/:id/assign-member', authenticate, requireManager, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const { employee_id, employee_ids } = req.body;
    const idsToAssign = Array.isArray(employee_ids) ? employee_ids : (employee_id ? [employee_id] : []);

    if (idsToAssign.length === 0) {
      return res.status(400).json({ error: 'Please specify employee(s) to assign.' });
    }

    const assignStmt = db.prepare('UPDATE employees SET team_id = ? WHERE id = ?');
    for (const empId of idsToAssign) {
      assignStmt.run(teamId, empId);
    }

    if (supabase) {
      try {
        for (const empId of idsToAssign) {
          await supabase.from('employees').update({ team_id: teamId }).eq('id', empId);
        }
      } catch (sbErr) {
        console.warn('Supabase team assign member error:', sbErr.message);
      }
    }

    res.json({ message: `Assigned ${idsToAssign.length} staff member(s) to the team successfully!` });
  } catch (err) {
    console.error('Error assigning member to team:', err);
    res.status(500).json({ error: err.message || 'Failed to assign member to team.' });
  }
});

// POST /api/teams/:id/remove-member (Remove employee from team)
router.post('/:id/remove-member', authenticate, requireManager, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }

    db.prepare('UPDATE employees SET team_id = NULL WHERE id = ? AND team_id = ?').run(employee_id, teamId);

    if (supabase) {
      try {
        await supabase.from('employees').update({ team_id: null }).eq('id', employee_id);
      } catch (sbErr) {
        console.warn('Supabase team remove member error:', sbErr.message);
      }
    }

    res.json({ message: 'Member removed from team successfully.' });
  } catch (err) {
    console.error('Error removing member from team:', err);
    res.status(500).json({ error: err.message || 'Failed to remove member from team.' });
  }
});

// --- DESIGNATIONS ---

// GET /api/teams/designations/list
router.get('/designations/list', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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
router.post('/designations/create', authenticate, requireManager, async (req, res) => {
  try {
    const { title, department, level, description } = req.body;
    if (!title || !department) {
      return res.status(400).json({ error: 'Title and department are required.' });
    }

    const result = db.prepare(`
      INSERT INTO designations (title, department, level, description, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(title.trim(), department.trim(), level || 'Mid-Level', description || '');

    const newId = result.lastInsertRowid;

    if (supabase) {
      try {
        await supabase.from('designations').upsert({
          id: newId,
          title: title.trim(),
          department: department.trim(),
          level: level || 'Mid-Level',
          description: description || '',
          status: 'active'
        });
      } catch (sbErr) {
        console.warn('Supabase designation insert error:', sbErr.message);
      }
    }

    res.status(201).json({
      message: 'Designation added successfully!',
      designation_id: newId
    });
  } catch (err) {
    console.error('Error adding designation:', err);
    res.status(500).json({ error: err.message || 'Failed to add designation.' });
  }
});

// PUT /api/teams/designations/:id
router.put('/designations/:id', authenticate, requireManager, async (req, res) => {
  try {
    const desigId = parseInt(req.params.id, 10);
    const { title, department, level, description, status } = req.body;
    db.prepare(`
      UPDATE designations
      SET title = COALESCE(?, title),
          department = COALESCE(?, department),
          level = COALESCE(?, level),
          description = COALESCE(?, description),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(title, department, level, description, status, desigId);

    const updated = db.prepare('SELECT * FROM designations WHERE id = ?').get(desigId);

    if (supabase && updated) {
      try {
        await supabase.from('designations').update({
          title: updated.title,
          department: updated.department,
          level: updated.level,
          description: updated.description,
          status: updated.status
        }).eq('id', desigId);
      } catch (sbErr) {
        console.warn('Supabase designation update error:', sbErr.message);
      }
    }

    res.json({ message: 'Designation updated successfully!' });
  } catch (err) {
    console.error('Error updating designation:', err);
    res.status(500).json({ error: err.message || 'Failed to update designation.' });
  }
});

// DELETE /api/teams/designations/:id
router.delete('/designations/:id', authenticate, requireManager, async (req, res) => {
  try {
    const desigId = parseInt(req.params.id, 10);
    db.prepare('UPDATE employees SET designation_id = NULL WHERE designation_id = ?').run(desigId);
    db.prepare('DELETE FROM designations WHERE id = ?').run(desigId);

    if (supabase) {
      try {
        await supabase.from('employees').update({ designation_id: null }).eq('designation_id', desigId);
        await supabase.from('designations').delete().eq('id', desigId);
      } catch (sbErr) {
        console.warn('Supabase designation delete error:', sbErr.message);
      }
    }

    res.json({ message: 'Designation removed successfully.' });
  } catch (err) {
    console.error('Error deleting designation:', err);
    res.status(500).json({ error: 'Failed to delete designation.' });
  }
});

module.exports = router;
