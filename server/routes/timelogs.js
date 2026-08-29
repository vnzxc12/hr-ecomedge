const express = require('express');
const router = express.Router();
const { db, syncFromSupabase, pushToSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const { recordAudit } = require('../middleware/auditMiddleware');

// Helper to calculate hours between two timestamps minus break
function computeHours(clockInStr, breakStartStr, breakEndStr, clockOutStr) {
  if (!clockInStr) return { totalHours: 0, breakMins: 0, overtimeHours: 0 };

  const inTime = new Date(clockInStr).getTime();
  const outTime = clockOutStr ? new Date(clockOutStr).getTime() : Date.now();

  let breakMs = 0;
  if (breakStartStr && breakEndStr) {
    breakMs = Math.max(0, new Date(breakEndStr).getTime() - new Date(breakStartStr).getTime());
  } else if (breakStartStr && !breakEndStr) {
    // Currently on break
    breakMs = Math.max(0, Date.now() - new Date(breakStartStr).getTime());
  }

  const rawWorkedMs = Math.max(0, outTime - inTime - breakMs);
  const totalHours = parseFloat((rawWorkedMs / (1000 * 60 * 60)).toFixed(2));
  const breakMins = Math.round(breakMs / (1000 * 60));
  const overtimeHours = totalHours > 8.0 ? parseFloat((totalHours - 8.0).toFixed(2)) : 0.00;

  return { totalHours, breakMins, overtimeHours };
}

// POST /api/timelogs/punch (Punch Clock: In, Lunch/Break Start, Lunch/Break End, Out)
router.post('/punch', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    let employeeId = req.user.employee_id;
    if (!employeeId) {
      const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(req.user.id);
      if (emp) employeeId = emp.id;
      else {
        return res.status(400).json({ error: 'No employee profile linked to this user account. Please contact your HR manager.' });
      }
    }

    const { action, notes } = req.body; // 'clock_in' | 'break_start' | 'break_end' | 'clock_out'
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // 1. Find active open shift first (status is clocked_in or on_break)
    let activeLog = db.prepare(`
      SELECT * FROM time_logs
      WHERE employee_id = ? AND status IN ('clocked_in', 'on_break')
      ORDER BY id DESC LIMIT 1
    `).get(employeeId);

    // 2. Fallback to today's most recent log if no open shift
    let existingLog = activeLog || db.prepare(`
      SELECT * FROM time_logs
      WHERE employee_id = ? AND date = ?
      ORDER BY id DESC LIMIT 1
    `).get(employeeId, today);

    if (action === 'clock_in') {
      if (activeLog) {
        return res.status(400).json({ error: `You are already ${activeLog.status === 'on_break' ? 'on break' : 'clocked in'}.` });
      }

      const result = db.prepare(`
        INSERT INTO time_logs (employee_id, date, clock_in, status, notes)
        VALUES (?, ?, ?, 'clocked_in', ?)
      `).run(employeeId, today, nowIso, notes || 'Clocked in for work shift');

      const newLog = db.prepare('SELECT * FROM time_logs WHERE id = ?').get(result.lastInsertRowid);
      
      // Real-time Cloud Push
      await pushToSupabase('time_logs', 'insert', newLog, newLog.id);

      recordAudit(req, {
        action: 'CLOCK_IN',
        resourceType: 'timelog',
        resourceId: newLog.id,
        afterState: newLog
      });

      return res.json({ message: 'Successfully Clocked In! Have a productive shift.', log: newLog });
    }

    // For break_start, break_end, clock_out: Must have an active or existing log
    const targetLog = activeLog || existingLog;
    if (!targetLog || targetLog.status === 'clocked_out') {
      return res.status(400).json({ error: 'You must Clock In first before taking a break or clocking out.' });
    }

    if (action === 'break_start') {
      if (targetLog.status === 'on_break') {
        return res.status(400).json({ error: 'You are already on break.' });
      }

      db.prepare(`
        UPDATE time_logs
        SET break_start = ?, status = 'on_break', notes = COALESCE(notes || ' | ', '') || 'Started break'
        WHERE id = ?
      `).run(nowIso, targetLog.id);

      const updated = db.prepare('SELECT * FROM time_logs WHERE id = ?').get(targetLog.id);
      await pushToSupabase('time_logs', 'update', updated, updated.id);

      recordAudit(req, {
        action: 'BREAK_START',
        resourceType: 'timelog',
        resourceId: updated.id,
        beforeState: targetLog,
        afterState: updated
      });

      return res.json({ message: 'Break / Lunch started. Enjoy your rest!', log: updated });
    }

    if (action === 'break_end') {
      if (targetLog.status !== 'on_break') {
        return res.status(400).json({ error: 'You are not currently on break.' });
      }

      const { breakMins } = computeHours(targetLog.clock_in, targetLog.break_start, nowIso, null);

      db.prepare(`
        UPDATE time_logs
        SET break_end = ?, break_duration_mins = ?, status = 'clocked_in', notes = COALESCE(notes || ' | ', '') || 'Ended break'
        WHERE id = ?
      `).run(nowIso, breakMins, targetLog.id);

      const updated = db.prepare('SELECT * FROM time_logs WHERE id = ?').get(targetLog.id);
      await pushToSupabase('time_logs', 'update', updated, updated.id);

      recordAudit(req, {
        action: 'BREAK_END',
        resourceType: 'timelog',
        resourceId: updated.id,
        beforeState: targetLog,
        afterState: updated
      });

      return res.json({ message: 'Break ended. Welcome back!', log: updated });
    }

    if (action === 'clock_out') {
      let breakEndToUse = targetLog.break_end;
      if (targetLog.status === 'on_break' && !targetLog.break_end) {
        breakEndToUse = nowIso;
      }

      const { totalHours, breakMins, overtimeHours } = computeHours(
        targetLog.clock_in,
        targetLog.break_start,
        breakEndToUse,
        nowIso
      );

      db.prepare(`
        UPDATE time_logs
        SET clock_out = ?, break_end = COALESCE(break_end, ?), break_duration_mins = ?, total_hours = ?, overtime_hours = ?, status = 'clocked_out', notes = COALESCE(notes || ' | ', '') || 'Clocked out for shift end'
        WHERE id = ?
      `).run(nowIso, breakEndToUse, breakMins, totalHours, overtimeHours, targetLog.id);

      const updated = db.prepare('SELECT * FROM time_logs WHERE id = ?').get(targetLog.id);
      await pushToSupabase('time_logs', 'update', updated, updated.id);

      recordAudit(req, {
        action: 'CLOCK_OUT',
        resourceType: 'timelog',
        resourceId: updated.id,
        beforeState: targetLog,
        afterState: updated
      });

      return res.json({ message: 'Successfully Clocked Out. Great job today!', log: updated });
    }

    return res.status(400).json({ error: 'Invalid punch action.' });
  } catch (err) {
    console.error('Punch action error:', err);
    res.status(500).json({ error: 'Failed to record punch action.' });
  }
});

// GET /api/timelogs/today (Get logged-in employee's active status)
router.get('/today', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    let employeeId = req.user.employee_id;
    if (!employeeId) {
      const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(req.user.id);
      if (emp) employeeId = emp.id;
      else return res.json({ log: null });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check for open active shift first (clocked_in or on_break)
    const openLog = db.prepare(`
      SELECT * FROM time_logs
      WHERE employee_id = ? AND status IN ('clocked_in', 'on_break')
      ORDER BY id DESC LIMIT 1
    `).get(employeeId);

    const log = openLog || db.prepare(`
      SELECT * FROM time_logs
      WHERE employee_id = ? AND date = ?
      ORDER BY id DESC LIMIT 1
    `).get(employeeId, today);

    res.json({ log: log || null });
  } catch (err) {
    console.error('Get today time log error:', err);
    res.status(500).json({ error: 'Failed to fetch today time log.' });
  }
});

// GET /api/timelogs/my (Employee's punch history)
router.get('/my', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    const employeeId = req.user.employee_id;
    if (!employeeId) return res.json({ logs: [], totalHoursSum: 0 });

    const { startDate, endDate } = req.query;

    let query = 'SELECT * FROM time_logs WHERE employee_id = ?';
    const params = [employeeId];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC, clock_in DESC LIMIT 100';
    const logs = db.prepare(query).all(...params);

    const totalHoursSum = logs.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);

    res.json({ logs, totalHoursSum: parseFloat(totalHoursSum.toFixed(2)) });
  } catch (err) {
    console.error('Get my time logs error:', err);
    res.status(500).json({ error: 'Failed to fetch time logs.' });
  }
});

// GET /api/timelogs/all (Manager view of all company logs)
router.get('/all', authenticate, requireManager, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    const { startDate, endDate, employeeId, department, status } = req.query;

    let query = `
      SELECT t.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code
      FROM time_logs t
      JOIN employees e ON t.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND t.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND t.date <= ?';
      params.push(endDate);
    }
    if (employeeId) {
      query += ' AND t.employee_id = ?';
      params.push(employeeId);
    }
    if (department) {
      query += ' AND e.department = ?';
      params.push(department);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.date DESC, t.clock_in DESC LIMIT 300';
    const logs = db.prepare(query).all(...params);

    res.json({ logs });
  } catch (err) {
    console.error('Get all time logs error:', err);
    res.status(500).json({ error: 'Failed to fetch company time logs.' });
  }
});

// GET /api/timelogs/live-status (Manager snapshot of current company attendance)
router.get('/live-status', authenticate, requireManager, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    const today = new Date().toISOString().split('T')[0];

    // Correlate each employee with their most recent active shift or today's punch
    const employees = db.prepare(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.job_title, e.department, e.avatar_url,
             t.id as log_id, t.clock_in, t.break_start, t.break_end, t.clock_out, t.total_hours, t.status as punch_status
      FROM employees e
      LEFT JOIN time_logs t ON t.id = (
        SELECT id FROM time_logs 
        WHERE employee_id = e.id AND (status IN ('clocked_in', 'on_break') OR date = ?)
        ORDER BY id DESC LIMIT 1
      )
      WHERE e.employment_status = 'active'
      ORDER BY e.first_name ASC
    `).all(today);

    res.json({ liveStatus: employees });
  } catch (err) {
    console.error('Get live status error:', err);
    res.status(500).json({ error: 'Failed to fetch live attendance status.' });
  }
});

// POST /api/timelogs/manual (Manager manual add / edit)
router.post('/manual', authenticate, requireManager, async (req, res) => {
  try {
    const { employee_id, date, clock_in, break_start, break_end, clock_out, notes } = req.body;

    if (!employee_id || !date || !clock_in) {
      return res.status(400).json({ error: 'Employee, date, and clock in time are required.' });
    }

    const { totalHours, breakMins, overtimeHours } = computeHours(clock_in, break_start, break_end, clock_out);
    const status = clock_out ? 'clocked_out' : (break_start && !break_end ? 'on_break' : 'clocked_in');

    const result = db.prepare(`
      INSERT INTO time_logs (employee_id, date, clock_in, break_start, break_end, clock_out, total_hours, break_duration_mins, overtime_hours, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employee_id, date, clock_in, break_start || null, break_end || null, clock_out || null, totalHours, breakMins, overtimeHours, status, notes || 'Manually logged by HR manager');

    const created = db.prepare('SELECT * FROM time_logs WHERE id = ?').get(result.lastInsertRowid);
    await pushToSupabase('time_logs', 'insert', created, created.id);

    res.json({ message: 'Time log recorded successfully.', log: created });
  } catch (err) {
    console.error('Manual time log error:', err);
    res.status(500).json({ error: 'Failed to create manual time log.' });
  }
});

// DELETE /api/timelogs/:id (Manager delete log)
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM time_logs WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM time_logs WHERE id = ?').run(req.params.id);
    if (existing) {
      await pushToSupabase('time_logs', 'delete', existing, existing.id);
    }
    res.json({ message: 'Time log deleted successfully.' });
  } catch (err) {
    console.error('Delete time log error:', err);
    res.status(500).json({ error: 'Failed to delete time log.' });
  }
});

module.exports = router;
