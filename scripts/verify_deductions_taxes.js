const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../server/db/database');
const { auditContextMiddleware } = require('../server/middleware/auditMiddleware');
const payrollRouter = require('../server/routes/payroll');

const JWT_SECRET = process.env.JWT_SECRET || 'hr-ecomedge-super-secure-jwt-secret-key-2026';

async function verifyDeductionsAndTaxes() {
  console.log('🧪 Testing Taxes & Deductions Configuration and Editing...');

  const app = express();
  app.use(express.json());
  app.use(auditContextMiddleware);
  app.use('/api/payroll', payrollRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'manager' LIMIT 1").get();
    const token = jwt.sign({ id: adminUser.id, username: adminUser.username, role: 'manager', session_id: 'tax-test' }, JWT_SECRET);

    // 1. Test GET /api/payroll/config
    console.log('  1. Testing GET /api/payroll/config...');
    const getRes = await fetch(`${baseUrl}/api/payroll/config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getData = await getRes.json();
    console.log(`     Current Tax Rate: ${getData.config.tax_rate}% | Social Rate: ${getData.config.social_security_rate}% | Allowance: ₱${getData.config.default_allowance}`);
    if (getRes.status !== 200) throw new Error('Get config failed');

    // 2. Test PUT /api/payroll/config
    console.log('  2. Testing PUT /api/payroll/config (Updating Tax: 10%, Social: 5%, Allowance: ₱2,000)...');
    const updateRes = await fetch(`${baseUrl}/api/payroll/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        tax_rate: 10.0,
        social_security_rate: 5.0,
        default_allowance: 2000.0,
        standard_monthly_hours: 160.0,
        overtime_multiplier: 1.5
      })
    });
    const updateData = await updateRes.json();
    console.log(`     Status: ${updateRes.status} | Message: ${updateData.message}`);
    if (updateRes.status !== 200 || updateData.config.tax_rate !== 10) throw new Error('Update config failed');

    // 3. Test Payslip Itemized Editing (PUT /api/payroll/payslips/:id)
    console.log('  3. Testing PUT /api/payroll/payslips/:id (Editing itemized deductions)...');
    
    // Generate fresh test run
    const genRes = await fetch(`${baseUrl}/api/payroll/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ period_start: '2026-08-01', period_end: '2026-08-31' })
    });
    const genData = await genRes.json();
    const run = genData.payroll;
    const slip = genData.payslips[0];

    const editSlipRes = await fetch(`${baseUrl}/api/payroll/payslips/${slip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        basic_pay: 15000.0,
        overtime_pay: 1500.0,
        allowances: 2000.0,
        tax_deduction: 1850.0,
        social_deductions: 925.0,
        other_deductions: 500.0 // e.g. health insurance / equipment
      })
    });

    const editSlipData = await editSlipRes.json();
    console.log(`     Status: ${editSlipRes.status} | Message: ${editSlipData.message}`);
    console.log(`     Updated Gross: ₱${editSlipData.payslip.gross_pay} | Total Deductions: -₱${editSlipData.payslip.tax_deduction + editSlipData.payslip.social_deductions + editSlipData.payslip.other_deductions} | Net Pay: ₱${editSlipData.payslip.net_pay}`);

    if (editSlipRes.status !== 200 || editSlipData.payslip.other_deductions !== 500) {
      throw new Error('Edit payslip failed');
    }

    // Clean up
    await fetch(`${baseUrl}/api/payroll/runs/${run.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('\n🎉 ALL TAXES & DEDUCTIONS CONFIGURATION AND EDITING TESTS PASSED!');
  } finally {
    server.close();
  }
}

verifyDeductionsAndTaxes().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
