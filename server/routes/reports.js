const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// GET /api/reports/summary (Comprehensive enterprise report metrics)
router.get('/summary', authenticate, requireManager, (req, res) => {
  try {
    // 1. Workforce Headcount & Departments
    const totalEmployees = db.prepare(`SELECT COUNT(*) as count FROM employees WHERE employment_status = 'active'`).get().count;
    const departmentBreakdown = db.prepare(`
      SELECT department, COUNT(*) as count
      FROM employees
      WHERE employment_status = 'active'
      GROUP BY department
      ORDER BY count DESC
    `).all();

    const teamBreakdown = db.prepare(`
      SELECT t.name as team_name, COUNT(e.id) as count
      FROM teams t
      LEFT JOIN employees e ON e.team_id = t.id AND e.employment_status = 'active'
      GROUP BY t.id
      ORDER BY count DESC
    `).all();

    // 2. Attendance & Overtime
    const attendanceStats = db.prepare(`
      SELECT 
        COUNT(*) as total_logs,
        COALESCE(SUM(total_hours), 0) as total_hours_worked,
        COALESCE(SUM(overtime_hours), 0) as total_overtime_hours,
        COALESCE(AVG(total_hours), 0) as avg_daily_hours
      FROM time_logs
    `).get();

    // 3. Payroll Totals
    const payrollStats = db.prepare(`
      SELECT 
        COALESCE(SUM(total_gross), 0) as total_gross_paid,
        COALESCE(SUM(total_net), 0) as total_net_paid,
        COALESCE(SUM(total_deductions), 0) as total_deductions,
        COUNT(*) as total_runs
      FROM payrolls
      WHERE status = 'paid'
    `).get();

    // 4. Operations & Projects
    const projectStats = db.prepare(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
        COALESCE(SUM(budget), 0) as total_budget
      FROM projects
    `).get();

    res.json({
      workforce: {
        total_employees: totalEmployees,
        departments: departmentBreakdown,
        teams: teamBreakdown
      },
      attendance: attendanceStats,
      payroll: payrollStats,
      operations: projectStats
    });
  } catch (err) {
    console.error('Error generating reports:', err);
    res.status(500).json({ error: 'Failed to generate report summaries.' });
  }
});

module.exports = router;
