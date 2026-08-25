const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

// POST /api/payroll/generate (Manager runs automated payroll computation)
router.post('/generate', authenticate, requireManager, (req, res) => {
  try {
    const { period_start, period_end } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'Period start date and end date are required.' });
    }

    const employees = db.prepare(`
      SELECT * FROM employees
      WHERE employment_status = 'active'
    `).all();

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No active employees found to generate payroll.' });
    }

    // Generate unique payroll code
    const countRuns = db.prepare('SELECT COUNT(*) as count FROM payrolls').get().count;
    const payrollCode = `PAY-${new Date(period_end).toISOString().substring(0, 7)}-${String(countRuns + 1).padStart(3, '0')}`;

    let totalGrossSum = 0;
    let totalDeductionsSum = 0;
    let totalNetSum = 0;

    let createdPayrollId = null;

    db.transaction(() => {
      // 1. Create payroll parent record
      const pResult = db.prepare(`
        INSERT INTO payrolls (payroll_code, period_start, period_end, status, created_by)
        VALUES (?, ?, ?, 'draft', ?)
      `).run(payrollCode, period_start, period_end, req.user.id);

      createdPayrollId = pResult.lastInsertRowid;

      // 2. Calculate for each employee
      const insertSlip = db.prepare(`
        INSERT INTO payslips (
          payroll_id, employee_id, basic_pay, overtime_pay, allowances,
          gross_pay, tax_deduction, social_deductions, other_deductions,
          net_pay, total_hours_worked, overtime_hours, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')
      `);

      for (const emp of employees) {
        // Aggregate time logs in date range
        const timeStats = db.prepare(`
          SELECT 
            COALESCE(SUM(total_hours), 0) as total_hours,
            COALESCE(SUM(overtime_hours), 0) as total_overtime
          FROM time_logs
          WHERE employee_id = ? AND date >= ? AND date <= ?
        `).get(emp.id, period_start, period_end);

        const hoursWorked = timeStats.total_hours || (emp.monthly_salary > 0 ? 160.00 : 0.00);
        const overtimeHours = timeStats.total_overtime || 0.00;
        const regularHours = Math.max(0, hoursWorked - overtimeHours);

        let basicPay = 0;
        const effectiveHourlyRate = emp.hourly_rate > 0 ? emp.hourly_rate : (emp.monthly_salary > 0 ? (emp.monthly_salary / 160) : 25.00);

        if (emp.monthly_salary > 0) {
          basicPay = emp.monthly_salary;
        } else {
          basicPay = regularHours * effectiveHourlyRate;
        }

        const overtimePay = overtimeHours * (effectiveHourlyRate * 1.5);
        const allowances = 1500.00; // Standard Philippine transport/meal allowance (PHP ₱1,500)

        const grossPay = basicPay + overtimePay + allowances;
        const taxDeduction = grossPay * 0.08; // 8% standard withholding
        const socialDeductions = grossPay * 0.04; // 4% health/retirement fund
        const otherDeductions = 0.00;

        const totalDeductions = taxDeduction + socialDeductions + otherDeductions;
        const netPay = grossPay - totalDeductions;

        totalGrossSum += grossPay;
        totalDeductionsSum += totalDeductions;
        totalNetSum += netPay;

        insertSlip.run(
          createdPayrollId,
          emp.id,
          parseFloat(basicPay.toFixed(2)),
          parseFloat(overtimePay.toFixed(2)),
          parseFloat(allowances.toFixed(2)),
          parseFloat(grossPay.toFixed(2)),
          parseFloat(taxDeduction.toFixed(2)),
          parseFloat(socialDeductions.toFixed(2)),
          parseFloat(otherDeductions.toFixed(2)),
          parseFloat(netPay.toFixed(2)),
          parseFloat(hoursWorked.toFixed(2)),
          parseFloat(overtimeHours.toFixed(2))
        );
      }

      // Update payroll totals
      db.prepare(`
        UPDATE payrolls
        SET total_gross = ?, total_deductions = ?, total_net = ?
        WHERE id = ?
      `).run(
        parseFloat(totalGrossSum.toFixed(2)),
        parseFloat(totalDeductionsSum.toFixed(2)),
        parseFloat(totalNetSum.toFixed(2)),
        createdPayrollId
      );
    })();

    const payroll = db.prepare('SELECT * FROM payrolls WHERE id = ?').get(createdPayrollId);
    const payslips = db.prepare(`
      SELECT p.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.payroll_id = ?
    `).all(createdPayrollId);

    res.status(201).json({
      message: `Payroll run "${payrollCode}" generated successfully for ${employees.length} employees.`,
      payroll,
      payslips
    });
  } catch (err) {
    console.error('Generate payroll error:', err);
    res.status(500).json({ error: 'Failed to generate payroll.' });
  }
});

// GET /api/payroll/runs (Manager list)
router.get('/runs', authenticate, requireManager, (req, res) => {
  try {
    const runs = db.prepare(`
      SELECT p.*, u.username as created_by_username,
             (SELECT COUNT(*) FROM payslips WHERE payroll_id = p.id) as employee_count
      FROM payrolls p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.id DESC
    `).all();

    res.json({ runs });
  } catch (err) {
    console.error('List payroll runs error:', err);
    res.status(500).json({ error: 'Failed to fetch payroll runs.' });
  }
});

// GET /api/payroll/runs/:id (Manager view single run details & slips)
router.get('/runs/:id', authenticate, requireManager, (req, res) => {
  try {
    const runId = parseInt(req.params.id, 10);
    const run = db.prepare(`
      SELECT p.*, u.username as created_by_username
      FROM payrolls p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(runId);

    if (!run) {
      return res.status(404).json({ error: 'Payroll run not found.' });
    }

    const payslips = db.prepare(`
      SELECT p.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.bank_name, e.bank_account_number
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.payroll_id = ?
      ORDER BY e.first_name ASC
    `).all(runId);

    res.json({ run, payslips });
  } catch (err) {
    console.error('Get payroll run error:', err);
    res.status(500).json({ error: 'Failed to fetch payroll details.' });
  }
});

// PUT /api/payroll/runs/:id/status (Manager approve or pay)
router.put('/runs/:id/status', authenticate, requireManager, (req, res) => {
  try {
    const runId = parseInt(req.params.id, 10);
    const { status } = req.body; // 'draft', 'approved', 'paid'

    if (!['draft', 'approved', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'Status must be draft, approved, or paid.' });
    }

    const today = new Date().toISOString().split('T')[0];

    db.transaction(() => {
      db.prepare(`
        UPDATE payrolls
        SET status = ?, payment_date = CASE WHEN ? = 'paid' THEN ? ELSE payment_date END
        WHERE id = ?
      `).run(status, status, today, runId);

      if (status === 'paid') {
        db.prepare("UPDATE payslips SET payment_status = 'paid' WHERE payroll_id = ?").run(runId);
      }
    })();

    const updated = db.prepare('SELECT * FROM payrolls WHERE id = ?').get(runId);
    res.json({ message: `Payroll status updated to "${status}".`, run: updated });
  } catch (err) {
    console.error('Update payroll status error:', err);
    res.status(500).json({ error: 'Failed to update payroll status.' });
  }
});

// GET /api/payroll/my-payslips (Employee portal)
router.get('/my-payslips', authenticate, (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    if (!employeeId) {
      return res.json({ payslips: [] });
    }

    const payslips = db.prepare(`
      SELECT p.*, pr.payroll_code, pr.period_start, pr.period_end, pr.status as run_status, pr.payment_date
      FROM payslips p
      JOIN payrolls pr ON p.payroll_id = pr.id
      WHERE p.employee_id = ?
      ORDER BY pr.period_end DESC
    `).all(employeeId);

    res.json({ payslips });
  } catch (err) {
    console.error('Get my payslips error:', err);
    res.status(500).json({ error: 'Failed to retrieve payslips.' });
  }
});

// GET /api/payroll/payslip/:id (Individual detailed printable payslip)
router.get('/payslip/:id', authenticate, (req, res) => {
  try {
    const slipId = parseInt(req.params.id, 10);
    const payslip = db.prepare(`
      SELECT p.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code,
             e.hire_date, e.bank_name, e.bank_account_number,
             pr.payroll_code, pr.period_start, pr.period_end, pr.payment_date, pr.status as run_status
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      JOIN payrolls pr ON p.payroll_id = pr.id
      WHERE p.id = ?
    `).get(slipId);

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    const isManager = req.user.role === 'manager';
    const isSelf = req.user.employee_id === payslip.employee_id;

    if (!isManager && !isSelf) {
      return res.status(403).json({ error: 'Access denied to this payslip.' });
    }

    res.json({ payslip });
  } catch (err) {
    console.error('Get payslip error:', err);
    res.status(500).json({ error: 'Failed to fetch payslip details.' });
  }
});

module.exports = router;
