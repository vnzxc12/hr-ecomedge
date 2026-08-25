const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authenticate, (req, res) => {
  try {
    const isManager = req.user.role === 'manager';
    const employeeId = req.user.employee_id;
    const today = new Date().toISOString().split('T')[0];

    if (isManager) {
      // 1. Manager Metrics
      const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE employment_status != 'terminated'").get().count;
      const activeEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE employment_status = 'active'").get().count;
      
      const pendingLeaves = db.prepare("SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'").get().count;
      
      // Live Attendance status today
      const todayLogs = db.prepare(`
        SELECT t.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code, u.avatar_url
        FROM time_logs t
        JOIN employees e ON t.employee_id = e.id
        LEFT JOIN users u ON u.employee_id = e.id
        WHERE t.date = ?
        ORDER BY t.clock_in DESC
      `).all(today);

      const liveClockedIn = todayLogs.filter(l => l.status === 'clocked_in').length;
      const liveOnBreak = todayLogs.filter(l => l.status === 'on_break').length;
      const liveClockedOut = todayLogs.filter(l => l.status === 'clocked_out').length;

      const totalAssets = db.prepare("SELECT COUNT(*) as count FROM assets").get().count;
      const assignedAssets = db.prepare("SELECT COUNT(*) as count FROM assets WHERE status = 'assigned'").get().count;

      const activeTrainings = db.prepare("SELECT COUNT(*) as count FROM training_programs WHERE status = 'in_progress' OR status = 'upcoming'").get().count;

      const latestPayroll = db.prepare("SELECT * FROM payrolls ORDER BY id DESC LIMIT 1").get();

      // Recent Activity Log (leaves, docs, time)
      const recentLeaves = db.prepare(`
        SELECT l.*, e.first_name, e.last_name
        FROM leaves l
        JOIN employees e ON l.employee_id = e.id
        ORDER BY l.created_at DESC
        LIMIT 4
      `).all();

      const recentDocs = db.prepare(`
        SELECT d.*, e.first_name, e.last_name
        FROM documents d
        JOIN employees e ON d.employee_id = e.id
        ORDER BY d.uploaded_at DESC
        LIMIT 4
      `).all();

      return res.json({
        role: 'manager',
        metrics: {
          totalEmployees,
          activeEmployees,
          pendingLeaves,
          liveClockedIn,
          liveOnBreak,
          liveClockedOut,
          totalAssets,
          assignedAssets,
          activeTrainings,
          latestPayrollTotal: latestPayroll ? latestPayroll.total_net : 0,
          latestPayrollStatus: latestPayroll ? latestPayroll.status : 'None'
        },
        liveAttendance: todayLogs,
        recentLeaves,
        recentDocs
      });
    } else {
      // 2. Employee Metrics
      if (!employeeId) {
        return res.json({
          role: 'employee',
          metrics: { todayHours: 0, leaveBalance: 0, assignedAssets: 0, enrolledTrainings: 0 },
          todayLog: null,
          recentLogs: []
        });
      }

      const todayLog = db.prepare(`
        SELECT * FROM time_logs
        WHERE employee_id = ? AND date = ?
        ORDER BY id DESC LIMIT 1
      `).get(employeeId, today);

      const leaveBalance = db.prepare(`
        SELECT * FROM leave_balances
        WHERE employee_id = ? AND year = ?
      `).get(employeeId, new Date().getFullYear());

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

      const recentLeaves = db.prepare(`
        SELECT * FROM leaves
        WHERE employee_id = ?
        ORDER BY created_at DESC
        LIMIT 4
      `).all(employeeId);

      const latestPayslip = db.prepare(`
        SELECT p.*, pr.period_start, pr.period_end, pr.payroll_code
        FROM payslips p
        JOIN payrolls pr ON p.payroll_id = pr.id
        WHERE p.employee_id = ?
        ORDER BY p.id DESC LIMIT 1
      `).get(employeeId);

      return res.json({
        role: 'employee',
        todayLog: todayLog || null,
        metrics: {
          assignedAssetsCount: assignedAssets.length,
          enrolledTrainingsCount: enrolledTrainings.length,
          vacationRemaining: leaveBalance ? (leaveBalance.vacation_days - leaveBalance.vacation_used) : 0,
          sickRemaining: leaveBalance ? (leaveBalance.sick_days - leaveBalance.sick_used) : 0,
          emergencyRemaining: leaveBalance ? (leaveBalance.emergency_days - leaveBalance.emergency_used) : 0
        },
        leaveBalance: leaveBalance || null,
        assignedAssets,
        enrolledTrainings,
        recentLogs,
        recentLeaves,
        latestPayslip: latestPayslip || null
      });
    }
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

module.exports = router;
