const express = require('express');
const router = express.Router();
const { db, syncFromSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

    const isManager = req.user.role === 'manager';
    const employeeId = req.user.employee_id;
    const today = new Date().toISOString().split('T')[0];

    if (isManager) {
      // 1. Manager & Executive Overview
      const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE employment_status = 'active'").get().count;

      // Live Attendance status today (open shifts + today's logs)
      const todayLogs = db.prepare(`
        SELECT t.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.avatar_url, tm.name as team_name
        FROM time_logs t
        JOIN employees e ON t.employee_id = e.id
        LEFT JOIN teams tm ON e.team_id = tm.id
        WHERE t.status IN ('clocked_in', 'on_break') OR t.date = ?
        ORDER BY t.clock_in DESC
      `).all(today);

      const liveClockedIn = todayLogs.filter(l => l.status === 'clocked_in').length;
      const liveOnBreak = todayLogs.filter(l => l.status === 'on_break').length;
      const liveClockedOut = todayLogs.filter(l => l.status === 'clocked_out').length;

      // On leave today
      const onLeaveToday = db.prepare(`
        SELECT COUNT(*) as count FROM leaves
        WHERE status = 'approved' AND ? BETWEEN start_date AND end_date
      `).get(today).count;

      // Active client projects
      const activeProjectsCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get().count;
      
      const activeProjects = db.prepare(`
        SELECT p.*, c.name as client_name, c.code as client_code, t.name as team_name,
               pm.first_name as pm_first_name, pm.last_name as pm_last_name,
               (SELECT COUNT(*) FROM project_assignments pa WHERE pa.project_id = p.id AND pa.status = 'active') as assigned_count
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN employees pm ON p.project_manager_id = pm.id
        WHERE p.status = 'active'
        ORDER BY p.priority DESC, p.end_date ASC
        LIMIT 6
      `).all();

      // Pending Approvals (Leaves + Timesheets)
      const pendingLeaves = db.prepare("SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'").get().count;
      const pendingTimesheets = db.prepare("SELECT COUNT(*) as count FROM timesheets WHERE status = 'submitted'").get().count;
      const pendingApprovalsCount = pendingLeaves + pendingTimesheets;

      // Latest Payroll Run
      const latestPayroll = db.prepare("SELECT * FROM payrolls ORDER BY id DESC LIMIT 1").get();

      // Team Workforce Distribution
      const teamDistribution = db.prepare(`
        SELECT t.id, t.name as team_name, t.department,
               COUNT(e.id) as employee_count,
               lead.first_name as lead_first_name, lead.last_name as lead_last_name
        FROM teams t
        LEFT JOIN employees e ON e.team_id = t.id AND e.employment_status = 'active'
        LEFT JOIN employees lead ON t.team_lead_id = lead.id
        GROUP BY t.id
        ORDER BY employee_count DESC
      `).all();

      // Recent Activity Log (leaves, timesheets, docs)
      const recentLeaves = db.prepare(`
        SELECT l.*, e.first_name, e.last_name, e.employee_code, e.avatar_url
        FROM leaves l
        JOIN employees e ON l.employee_id = e.id
        ORDER BY l.created_at DESC
        LIMIT 5
      `).all();

      const recentTimesheets = db.prepare(`
        SELECT ts.*, e.first_name, e.last_name, e.employee_code, p.name as project_name
        FROM timesheets ts
        JOIN employees e ON ts.employee_id = e.id
        LEFT JOIN projects p ON ts.project_id = p.id
        ORDER BY ts.created_at DESC
        LIMIT 5
      `).all();

      return res.json({
        role: 'manager',
        metrics: {
          totalEmployees,
          currentlyWorking: liveClockedIn,
          liveOnBreak,
          liveClockedOut,
          onLeaveToday,
          activeProjectsCount,
          pendingApprovalsCount,
          pendingLeaves,
          pendingTimesheets,
          latestPayrollAmount: latestPayroll ? latestPayroll.total_net : 0,
          latestPayrollPeriod: latestPayroll ? `${latestPayroll.period_start} – ${latestPayroll.period_end}` : 'Current Period',
          latestPayrollStatus: latestPayroll ? latestPayroll.status : 'None'
        },
        teamDistribution,
        activeProjects,
        liveAttendance: todayLogs,
        recentLeaves,
        recentTimesheets
      });
    } else {
      // 2. Employee Portal Overview
      if (!employeeId) {
        return res.json({
          role: 'employee',
          metrics: { todayHours: 0, leaveBalance: 0, assignedAssets: 0, enrolledTrainings: 0 },
          todayLog: null,
          recentLogs: []
        });
      }

      const employeeProfile = db.prepare(`
        SELECT e.*, u.username, u.avatar_url, t.name as team_name, d.title as designation_title
        FROM employees e
        LEFT JOIN users u ON u.employee_id = e.id
        LEFT JOIN teams t ON e.team_id = t.id
        LEFT JOIN designations d ON e.designation_id = d.id
        WHERE e.id = ?
      `).get(employeeId);

      const todayLog = db.prepare(`
        SELECT * FROM time_logs
        WHERE employee_id = ? AND date = ?
        ORDER BY id DESC LIMIT 1
      `).get(employeeId, today);

      const leaveBalance = db.prepare(`
        SELECT * FROM leave_balances
        WHERE employee_id = ? AND year = ?
      `).get(employeeId, new Date().getFullYear());

      const assignedProjects = db.prepare(`
        SELECT pa.*, p.name as project_name, p.project_code, p.status as project_status, p.priority,
               c.name as client_name
        FROM project_assignments pa
        JOIN projects p ON pa.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE pa.employee_id = ? AND pa.status = 'active'
      `).all(employeeId);

      const assignedAssets = db.prepare(`
        SELECT * FROM assets
        WHERE assigned_to = ? AND status = 'assigned'
      `).all(employeeId);

      const enrolledTrainings = db.prepare(`
        SELECT tr.*, tp.title, tp.duration_hours, tp.instructor, tp.status as program_status
        FROM training_records tr
        JOIN training_programs tp ON tr.training_id = tp.id
        WHERE tr.employee_id = ?
      `).all(employeeId);

      const recentLogs = db.prepare(`
        SELECT * FROM time_logs
        WHERE employee_id = ?
        ORDER BY date DESC, clock_in DESC
        LIMIT 7
      `).all(employeeId);

      const recentTimesheets = db.prepare(`
        SELECT ts.*, p.name as project_name
        FROM timesheets ts
        LEFT JOIN projects p ON ts.project_id = p.id
        WHERE ts.employee_id = ?
        ORDER BY ts.date DESC
        LIMIT 5
      `).all(employeeId);

      return res.json({
        role: 'employee',
        employee: employeeProfile || null,
        todayLog: todayLog || null,
        metrics: {
          assignedProjectsCount: assignedProjects.length,
          assignedAssetsCount: assignedAssets.length,
          enrolledTrainingsCount: enrolledTrainings.length,
          vacationRemaining: leaveBalance ? (leaveBalance.vacation_days - leaveBalance.vacation_used) : 0,
          sickRemaining: leaveBalance ? (leaveBalance.sick_days - leaveBalance.sick_used) : 0,
          emergencyRemaining: leaveBalance ? (leaveBalance.emergency_days - leaveBalance.emergency_used) : 0
        },
        leaveBalance: leaveBalance || null,
        assignedProjects,
        assignedAssets,
        enrolledTrainings,
        recentLogs,
        recentTimesheets
      });
    }
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

module.exports = router;
