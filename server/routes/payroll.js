const express = require('express');
const router = express.Router();
const { db, syncFromSupabase, isSupabaseConfigured } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const { recordAudit } = require('../middleware/auditMiddleware');

// GET /api/payroll/config (Manager get tax & deduction settings)
router.get('/config', authenticate, requireManager, (req, res) => {
  try {
    let config = db.prepare('SELECT * FROM payroll_configs WHERE id = 1').get();
    if (!config) {
      db.prepare(`
        INSERT OR IGNORE INTO payroll_configs (id, tax_rate, social_security_rate, default_allowance, standard_monthly_hours, overtime_multiplier)
        VALUES (1, 8.0, 4.0, 1500.00, 160.0, 1.5)
      `).run();
      config = db.prepare('SELECT * FROM payroll_configs WHERE id = 1').get();
    }
    res.json({ config });
  } catch (err) {
    console.error('Get payroll config error:', err);
    res.status(500).json({ error: 'Failed to retrieve payroll configuration.' });
  }
});

// PUT /api/payroll/config (Manager update tax & deduction settings)
router.put('/config', authenticate, requireManager, (req, res) => {
  try {
    const { tax_rate, social_security_rate, default_allowance, standard_monthly_hours, overtime_multiplier } = req.body;

    const beforeConfig = db.prepare('SELECT * FROM payroll_configs WHERE id = 1').get();

    db.prepare(`
      UPDATE payroll_configs
      SET tax_rate = ?,
          social_security_rate = ?,
          default_allowance = ?,
          standard_monthly_hours = ?,
          overtime_multiplier = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      tax_rate !== undefined ? parseFloat(tax_rate) : beforeConfig.tax_rate,
      social_security_rate !== undefined ? parseFloat(social_security_rate) : beforeConfig.social_security_rate,
      default_allowance !== undefined ? parseFloat(default_allowance) : beforeConfig.default_allowance,
      standard_monthly_hours !== undefined ? parseFloat(standard_monthly_hours) : beforeConfig.standard_monthly_hours,
      overtime_multiplier !== undefined ? parseFloat(overtime_multiplier) : beforeConfig.overtime_multiplier
    );

    const updatedConfig = db.prepare('SELECT * FROM payroll_configs WHERE id = 1').get();

    recordAudit({
      req,
      action: 'PAYROLL_CONFIG_UPDATE',
      resourceType: 'payroll_config',
      resourceId: 1,
      beforeState: beforeConfig,
      afterState: updatedConfig
    });

    res.json({ message: 'Payroll tax and deduction settings updated successfully.', config: updatedConfig });
  } catch (err) {
    console.error('Update payroll config error:', err);
    res.status(500).json({ error: 'Failed to update payroll configuration.' });
  }
});

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

    // Read dynamic tax & deduction configuration
    let config = db.prepare('SELECT * FROM payroll_configs WHERE id = 1').get();
    if (!config) {
      config = { tax_rate: 8.0, social_security_rate: 4.0, default_allowance: 1500.00, standard_monthly_hours: 160.0, overtime_multiplier: 1.5 };
    }

    const taxRatePct = (config.tax_rate || 8.0) / 100.0;
    const socialRatePct = (config.social_security_rate || 4.0) / 100.0;
    const standardMonthlyAllowance = config.default_allowance !== undefined ? config.default_allowance : 1500.00;
    const standardHoursBenchmark = config.standard_monthly_hours || 160.0;
    const otMultiplier = config.overtime_multiplier || 1.5;

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

        // STRICT ATTENDANCE & NO-WORK NO-PAY RULE:
        if (totalHoursWorked > 0) {
          const isPartTime = emp.employment_type === 'part_time' || (emp.hourly_rate > 0 && (!emp.monthly_salary || emp.monthly_salary <= 0));

          if (isPartTime || (emp.hourly_rate > 0 && emp.employment_type !== 'full_time')) {
            // Part-Time / Hourly Compensation: Exact worked hours * hourly_rate
            const rate = emp.hourly_rate > 0 ? emp.hourly_rate : (emp.monthly_salary > 0 ? emp.monthly_salary / standardHoursBenchmark : 50.00);
            basicPay = totalCreditedRegularHours * rate;
            overtimePay = overtimeHours * (rate * otMultiplier);
            allowances = Math.min(1.0, totalHoursWorked / standardHoursBenchmark) * standardMonthlyAllowance;
          } else if (emp.monthly_salary > 0) {
            // Full-Time Salaried: Prorated attendance ratio against 160.0 hours monthly benchmark
            const effectiveHourlyRate = emp.monthly_salary / standardHoursBenchmark;
            const attendanceRatio = Math.min(1.0, totalCreditedRegularHours / standardHoursBenchmark);
            basicPay = attendanceRatio * emp.monthly_salary;
            overtimePay = overtimeHours * (effectiveHourlyRate * otMultiplier);
            allowances = Math.min(1.0, totalHoursWorked / standardHoursBenchmark) * standardMonthlyAllowance;
          } else if (emp.hourly_rate > 0) {
            const rate = emp.hourly_rate;
            basicPay = totalCreditedRegularHours * rate;
            overtimePay = overtimeHours * (rate * otMultiplier);
            allowances = Math.min(1.0, totalHoursWorked / standardHoursBenchmark) * standardMonthlyAllowance;
          } else {
            const fallbackRate = 50.00;
            basicPay = totalCreditedRegularHours * fallbackRate;
            overtimePay = overtimeHours * (fallbackRate * otMultiplier);
            allowances = Math.min(1.0, totalHoursWorked / standardHoursBenchmark) * standardMonthlyAllowance;
          }

          grossPay = basicPay + overtimePay + allowances;
          taxDeduction = grossPay * taxRatePct;
          socialDeductions = grossPay * socialRatePct;
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

// PUT /api/payroll/payslips/:id (Manager edit individual payslip deductions, taxes, and pay lines)
router.put('/payslips/:id', authenticate, requireManager, (req, res) => {
  try {
    const slipId = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM payslips WHERE id = ?').get(slipId);
    if (!existing) {
      return res.status(404).json({ error: 'Payslip not found.' });
    }

    const payroll = db.prepare('SELECT * FROM payrolls WHERE id = ?').get(existing.payroll_id);
    if (payroll && payroll.status === 'paid') {
      return res.status(400).json({ error: 'Cannot modify a payslip from a paid and disbursed payroll run.' });
    }

    const {
      basic_pay,
      overtime_pay,
      allowances,
      tax_deduction,
      social_deductions,
      other_deductions,
      total_hours_worked,
      overtime_hours
    } = req.body;

    const newBasic = basic_pay !== undefined ? parseFloat(basic_pay) : existing.basic_pay;
    const newOTPay = overtime_pay !== undefined ? parseFloat(overtime_pay) : existing.overtime_pay;
    const newAllowances = allowances !== undefined ? parseFloat(allowances) : existing.allowances;
    const newGross = parseFloat((newBasic + newOTPay + newAllowances).toFixed(2));

    const newTax = tax_deduction !== undefined ? parseFloat(tax_deduction) : existing.tax_deduction;
    const newSocial = social_deductions !== undefined ? parseFloat(social_deductions) : existing.social_deductions;
    const newOther = other_deductions !== undefined ? parseFloat(other_deductions) : existing.other_deductions;
    const newTotalDeductions = parseFloat((newTax + newSocial + newOther).toFixed(2));
    const newNet = parseFloat(Math.max(0, newGross - newTotalDeductions).toFixed(2));

    const newHours = total_hours_worked !== undefined ? parseFloat(total_hours_worked) : existing.total_hours_worked;
    const newOTHours = overtime_hours !== undefined ? parseFloat(overtime_hours) : existing.overtime_hours;

    db.transaction(() => {
      // 1. Update payslip
      db.prepare(`
        UPDATE payslips
        SET basic_pay = ?,
            overtime_pay = ?,
            allowances = ?,
            gross_pay = ?,
            tax_deduction = ?,
            social_deductions = ?,
            other_deductions = ?,
            net_pay = ?,
            total_hours_worked = ?,
            overtime_hours = ?
        WHERE id = ?
      `).run(newBasic, newOTPay, newAllowances, newGross, newTax, newSocial, newOther, newNet, newHours, newOTHours, slipId);

      // 2. Recalculate parent payroll run totals
      const totals = db.prepare(`
        SELECT 
          COALESCE(SUM(gross_pay), 0) as sum_gross,
          COALESCE(SUM(tax_deduction + social_deductions + other_deductions), 0) as sum_deductions,
          COALESCE(SUM(net_pay), 0) as sum_net
        FROM payslips
        WHERE payroll_id = ?
      `).get(existing.payroll_id);

      db.prepare(`
        UPDATE payrolls
        SET total_gross = ?, total_deductions = ?, total_net = ?
        WHERE id = ?
      `).run(totals.sum_gross, totals.sum_deductions, totals.sum_net, existing.payroll_id);
    })();

    const updatedSlip = db.prepare(`
      SELECT p.*, e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.bank_name, e.bank_account_number
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.id = ?
    `).get(slipId);

    const updatedPayroll = db.prepare('SELECT * FROM payrolls WHERE id = ?').get(existing.payroll_id);

    recordAudit({
      req,
      action: 'PAYSLIP_DEDUCTION_UPDATE',
      resourceType: 'payslip',
      resourceId: slipId,
      beforeState: existing,
      afterState: updatedSlip
    });

    res.json({
      message: 'Payslip deductions and earnings updated successfully.',
      payslip: updatedSlip,
      payroll: updatedPayroll
    });
  } catch (err) {
    console.error('Update payslip error:', err);
    res.status(500).json({ error: 'Failed to update payslip.' });
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
