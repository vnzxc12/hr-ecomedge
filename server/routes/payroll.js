const express = require('express');
const router = express.Router();
const { db, syncFromSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const { recordAudit } = require('../middleware/auditMiddleware');

// POST /api/payroll/generate (Manager runs automated payroll computation)
router.post('/generate', authenticate, requireManager, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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

      // 2. Calculate for each employee based on actual attendance / time logs / paid leaves
      const insertSlip = db.prepare(`
        INSERT INTO payslips (
          payroll_id, employee_id, basic_pay, overtime_pay, allowances,
          gross_pay, tax_deduction, social_deductions, other_deductions,
          net_pay, total_hours_worked, overtime_hours, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')
      `);

      for (const emp of employees) {
        // A. Aggregate punch clock time logs in period
        const timeStats = db.prepare(`
          SELECT 
            COALESCE(SUM(total_hours), 0) as total_hours,
            COALESCE(SUM(overtime_hours), 0) as total_overtime
          FROM time_logs
          WHERE employee_id = ? AND date >= ? AND date <= ?
        `).get(emp.id, period_start, period_end);

        // B. Aggregate approved project timesheets in period
        const tsStats = db.prepare(`
          SELECT 
            COALESCE(SUM(total_hours), 0) as ts_hours,
            COALESCE(SUM(overtime_hours), 0) as ts_overtime
          FROM timesheets
          WHERE employee_id = ? AND date >= ? AND date <= ? AND status = 'approved'
        `).get(emp.id, period_start, period_end);

        // C. Aggregate approved paid leave days in period
        const leaveStats = db.prepare(`
          SELECT COALESCE(SUM(days_count), 0) as paid_leave_days
          FROM leaves
          WHERE employee_id = ? AND status = 'approved'
            AND start_date <= ? AND end_date >= ?
        `).get(emp.id, period_end, period_start);

        const punchHours = parseFloat(Number(timeStats.total_hours || 0).toFixed(2));
        const tsHours = parseFloat(Number(tsStats.ts_hours || 0).toFixed(2));
        const paidLeaveDays = Number(leaveStats.paid_leave_days || 0);
        const paidLeaveHours = paidLeaveDays * 8.0;

        // Total credited hours
        const rawWorkedHours = Math.max(punchHours, tsHours);
        const overtimeHours = parseFloat(Math.max(timeStats.total_overtime || 0, tsStats.ts_overtime || 0).toFixed(2));
        const regularWorkedHours = Math.max(0, rawWorkedHours - overtimeHours);
        const totalCreditedRegularHours = regularWorkedHours + paidLeaveHours;
        const totalHoursWorked = parseFloat((totalCreditedRegularHours + overtimeHours).toFixed(2));

        let basicPay = 0.00;
        let overtimePay = 0.00;
        let allowances = 0.00;
        let grossPay = 0.00;
        let taxDeduction = 0.00;
        let socialDeductions = 0.00;
        const otherDeductions = 0.00;
        let netPay = 0.00;

        // Standard monthly working benchmark is 160.0 hours
        const standardHoursBenchmark = 160.0;
        const standardMonthlyAllowance = 1500.00;

        // STRICT ATTENDANCE & NO-WORK NO-PAY RULE:
        // If an employee logged 0 hours and has 0 approved paid leaves, total compensation is ₱0.00
        if (totalHoursWorked > 0) {
          if (emp.hourly_rate > 0) {
            const rate = emp.hourly_rate;
            basicPay = totalCreditedRegularHours * rate;
            overtimePay = overtimeHours * (rate * 1.5);
            allowances = Math.min(1.0, totalHoursWorked / standardHoursBenchmark) * standardMonthlyAllowance;
          } else if (emp.monthly_salary > 0) {
            const effectiveHourlyRate = emp.monthly_salary / standardHoursBenchmark;
            const attendanceRatio = Math.min(1.0, totalCreditedRegularHours / standardHoursBenchmark);
            basicPay = attendanceRatio * emp.monthly_salary;
            overtimePay = overtimeHours * (effectiveHourlyRate * 1.5);
            allowances = Math.min(1.0, totalHoursWorked / standardHoursBenchmark) * standardMonthlyAllowance;
          } else {
            const fallbackRate = 25.00;
            basicPay = totalCreditedRegularHours * fallbackRate;
            overtimePay = overtimeHours * (fallbackRate * 1.5);
            allowances = Math.min(1.0, totalHoursWorked / standardHoursBenchmark) * standardMonthlyAllowance;
          }

          grossPay = basicPay + overtimePay + allowances;
          taxDeduction = grossPay * 0.08; // 8% standard withholding
          socialDeductions = grossPay * 0.04; // 4% health/social fund
          const totalDeductions = taxDeduction + socialDeductions + otherDeductions;
          netPay = Math.max(0, grossPay - totalDeductions);
        }

        totalGrossSum += grossPay;
        totalDeductionsSum += (taxDeduction + socialDeductions + otherDeductions);
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
          parseFloat(totalHoursWorked.toFixed(2)),
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

    // Record audit snapshot for payroll generation
    recordAudit({
      req,
      action: 'PAYROLL_GENERATE',
      resourceType: 'payroll',
      resourceId: createdPayrollId,
      beforeState: null,
      afterState: {
        payroll,
        employee_count: employees.length,
        total_gross: totalGrossSum,
        total_net: totalNetSum
      }
    });

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
router.get('/runs', authenticate, requireManager, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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

// DELETE /api/payroll/runs/:id (Manager delete draft run)
router.delete('/runs/:id', authenticate, requireManager, (req, res) => {
  try {
    const runId = parseInt(req.params.id, 10);
    const run = db.prepare('SELECT * FROM payrolls WHERE id = ?').get(runId);
    if (!run) {
      return res.status(404).json({ error: 'Payroll run not found.' });
    }

    if (run.status === 'paid') {
      return res.status(400).json({ error: 'Cannot delete a payroll run that has already been paid and disbursed.' });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM payslips WHERE payroll_id = ?').run(runId);
      db.prepare('DELETE FROM payrolls WHERE id = ?').run(runId);
    })();

    res.json({ message: `Payroll run ${run.payroll_code} has been deleted.` });
  } catch (err) {
    console.error('Delete payroll run error:', err);
    res.status(500).json({ error: 'Failed to delete payroll run.' });
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
    const beforePayroll = db.prepare('SELECT * FROM payrolls WHERE id = ?').get(runId);

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

    recordAudit({
      req,
      action: 'PAYROLL_STATUS_CHANGE',
      resourceType: 'payroll',
      resourceId: runId,
      beforeState: beforePayroll,
      afterState: updated
    });

    res.json({ message: `Payroll status updated to "${status}".`, run: updated });
  } catch (err) {
    console.error('Update payroll status error:', err);
    res.status(500).json({ error: 'Failed to update payroll status.' });
  }
});

// GET /api/payroll/my-payslips (Employee portal)
router.get('/my-payslips', authenticate, async (req, res) => {
  try {
    if (isSupabaseConfigured()) {
      await syncFromSupabase().catch(() => {});
    }

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
