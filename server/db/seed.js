const { db } = require('./database');
const bcrypt = require('bcryptjs');

console.log('🔄 Re-seeding database...');

// Clean existing data
db.transaction(() => {
  db.prepare('DELETE FROM documents').run();
  db.prepare('DELETE FROM payslips').run();
  db.prepare('DELETE FROM payrolls').run();
  db.prepare('DELETE FROM assets').run();
  db.prepare('DELETE FROM training_records').run();
  db.prepare('DELETE FROM training_programs').run();
  db.prepare('DELETE FROM time_logs').run();
  db.prepare('DELETE FROM leaves').run();
  db.prepare('DELETE FROM leave_balances').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM employees').run();
})();

const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
const passwordHashEmp = bcrypt.hashSync('password123', 10);

const insertEmp = db.prepare(`
  INSERT INTO employees (id, employee_code, first_name, last_name, job_title, department, employment_status, employment_type, hire_date, hourly_rate, monthly_salary, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, username, password_hash, role, employee_id)
  VALUES (?, ?, ?, ?, ?)
`);

const insertBalance = db.prepare(`
  INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const currentYear = new Date().getFullYear();

db.transaction(() => {
  // 1. Employees
  insertEmp.run(1, 'EMP-001', 'Alex', 'Vance', 'HR & Operations Director', 'Human Resources', 'active', 'full_time', '2023-01-15', 35.00, 6000.00, '+1 (555) 019-2834', '742 Evergreen Terrace, Springfield', 'Elena Vance', '+1 (555) 019-2835', 'Chase Bank', '**** 4892');
  insertEmp.run(2, 'EMP-002', 'John', 'Doe', 'Senior Full-Stack Engineer', 'Engineering', 'active', 'full_time', '2023-03-01', 45.00, 7800.00, '+1 (555) 349-1102', '124 Conch Street, Pacific City', 'Jane Doe', '+1 (555) 349-9944', 'Bank of America', '**** 1120');
  insertEmp.run(3, 'EMP-003', 'Sarah', 'Smith', 'UI/UX Product Designer', 'Design & Product', 'active', 'full_time', '2023-06-15', 38.00, 6500.00, '+1 (555) 882-9901', '405 Lexington Ave, Metro City', 'David Smith', '+1 (555) 882-9902', 'Wells Fargo', '**** 3391');
  insertEmp.run(4, 'EMP-004', 'Michael', 'Lee', 'Marketing Lead', 'Marketing', 'active', 'full_time', '2023-09-01', 32.00, 5500.00, '+1 (555) 441-2098', '89 Ocean Drive, Bay Area', 'Grace Lee', '+1 (555) 441-2099', 'Citibank', '**** 7762');
  insertEmp.run(5, 'EMP-005', 'Emily', 'Davis', 'Customer Operations Specialist', 'Operations', 'active', 'full_time', '2024-02-10', 25.00, 4300.00, '+1 (555) 672-4411', '12 Elm Street, Riverdale', 'Robert Davis', '+1 (555) 672-4412', 'Capital One', '**** 5510');

  // 2. Users
  insertUser.run(1, 'admin', passwordHashAdmin, 'manager', 1);
  insertUser.run(2, 'john.doe', passwordHashEmp, 'employee', 2);
  insertUser.run(3, 'sarah.smith', passwordHashEmp, 'employee', 3);
  insertUser.run(4, 'michael.lee', passwordHashEmp, 'employee', 4);
  insertUser.run(5, 'emily.davis', passwordHashEmp, 'employee', 5);

  // 3. Balances
  for (let i = 1; i <= 5; i++) {
    insertBalance.run(i, currentYear, 15, 10, 5, i === 2 ? 3 : (i === 3 ? 1 : 0), i === 3 ? 2 : 0, 0);
  }

  // 4. Leaves
  const insertLeave = db.prepare(`
    INSERT INTO leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, reviewed_by, review_notes, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const today = new Date().toISOString().split('T')[0];
  insertLeave.run(2, 'vacation', '2026-09-10', '2026-09-13', 3, 'Annual family holiday', 'approved', 1, 'Approved! Have a great trip.');
  insertLeave.run(3, 'sick', '2026-08-10', '2026-08-11', 2, 'Flu and recovery', 'approved', 1, 'Acknowledged');
  insertLeave.run(4, 'vacation', '2026-09-20', '2026-09-22', 2, 'Attending family wedding', 'pending', null, null);

  // 5. Punch Logs
  const insertTime = db.prepare(`
    INSERT INTO time_logs (employee_id, date, clock_in, break_start, break_end, clock_out, total_hours, break_duration_mins, overtime_hours, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date();
  const isoNow = now.toISOString();
  const fiveHoursAgo = new Date(now.getTime() - 5 * 3600000).toISOString();
  const fourHoursAgo = new Date(now.getTime() - 4 * 3600000).toISOString();
  const threeHoursAgo = new Date(now.getTime() - 3 * 3600000).toISOString();
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 1 * 3600000).toISOString();
  const eightHoursAgo = new Date(now.getTime() - 8 * 3600000).toISOString();

  insertTime.run(2, today, fiveHoursAgo, twoHoursAgo, oneHourAgo, null, 4.00, 60, 0.00, 'clocked_in', 'Backend optimization');
  insertTime.run(3, today, fiveHoursAgo, twoHoursAgo, null, null, 3.00, 0, 0.00, 'on_break', 'Lunch with design team');
  insertTime.run(4, today, eightHoursAgo, fourHoursAgo, threeHoursAgo, isoNow, 7.00, 60, 0.00, 'clocked_out', 'Completed marketing campaign review');

  // 6. Training
  db.prepare(`
    INSERT INTO training_programs (id, title, description, instructor, duration_hours, start_date, end_date, status)
    VALUES
    (1, 'E-Commerce Security & Data Privacy (GDPR/SOC2)', 'Essential compliance and security practices for customer data handling.', 'Dr. Alan Vance', 12, '2026-08-01', '2026-08-30', 'in_progress'),
    (2, 'Advanced Modern React & Performance Engineering', 'Deep dive into rendering optimization, state machines, and micro-frontends.', 'Senior Architect Mark', 16, '2026-07-01', '2026-07-25', 'completed'),
    (3, 'Customer Success & Conflict Resolution Masterclass', 'Techniques for high-stakes customer negotiations and empathy-first support.', 'Sarah Lin', 8, '2026-09-05', '2026-09-10', 'upcoming')
  `).run();

  db.prepare(`
    INSERT INTO training_records (training_id, employee_id, completion_status, score, certificate_url, completion_date)
    VALUES
    (1, 2, 'in_progress', 88.50, NULL, NULL),
    (1, 4, 'in_progress', 75.00, NULL, NULL),
    (2, 2, 'completed', 96.00, 'https://example.com/certs/react-mastery.pdf', '2026-07-25'),
    (3, 5, 'enrolled', NULL, NULL, NULL)
  `).run();

  // 7. Assets
  db.prepare(`
    INSERT INTO assets (id, asset_tag, name, category, model_serial, status, assigned_to, assigned_date, expected_return_date, condition, notes)
    VALUES
    (1, 'AST-MBP-01', 'MacBook Pro 16" M3 Max', 'laptop', 'C02G4190MD6R', 'assigned', 2, '2023-03-01', '2027-03-01', 'new', 'Engineering primary laptop'),
    (2, 'AST-MBP-02', 'MacBook Pro 14" M3 Pro', 'laptop', 'C02F3910KL1X', 'assigned', 3, '2023-06-15', '2027-06-15', 'good', 'Design powerhouse workstation'),
    (3, 'AST-MON-01', 'Dell UltraSharp 27" 4K USB-C Monitor', 'monitor', 'CN-0K793H-74443', 'assigned', 2, '2023-03-05', '2027-03-05', 'good', 'Primary external monitor'),
    (4, 'AST-MON-02', 'LG UltraFine 32" Ergo 4K Monitor', 'monitor', '32UN880-B-99124', 'assigned', 3, '2023-06-20', '2027-06-20', 'good', 'Color-accurate 4K display'),
    (5, 'AST-KEY-01', 'Logitech MX Master 3S & Mechanical Keyboard', 'peripheral', 'MX-SET-9910', 'assigned', 4, '2023-09-01', '2027-09-01', 'good', 'Wireless workspace combo'),
    (6, 'AST-LAP-03', 'Dell XPS 15 9530 i9 32GB', 'laptop', 'DL-XPS-499120', 'available', NULL, NULL, NULL, 'new', 'Ready for new hire deployment')
  `).run();

  // 8. Payroll
  db.prepare(`
    INSERT INTO payrolls (id, payroll_code, period_start, period_end, status, total_gross, total_deductions, total_net, created_by, payment_date)
    VALUES (1, 'PAY-2026-07', '2026-07-01', '2026-07-31', 'paid', 30100.00, 3612.00, 26488.00, 1, '2026-07-31')
  `).run();

  const insertSlip = db.prepare(`
    INSERT INTO payslips (payroll_id, employee_id, basic_pay, overtime_pay, allowances, gross_pay, tax_deduction, social_deductions, other_deductions, net_pay, total_hours_worked, overtime_hours, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSlip.run(1, 1, 6000.00, 0.00, 500.00, 6500.00, 520.00, 260.00, 0.00, 5720.00, 160.00, 0.00, 'paid');
  insertSlip.run(1, 2, 7800.00, 450.00, 500.00, 8750.00, 700.00, 350.00, 0.00, 7700.00, 168.00, 8.00, 'paid');
  insertSlip.run(1, 3, 6500.00, 0.00, 400.00, 6900.00, 552.00, 276.00, 0.00, 6072.00, 160.00, 0.00, 'paid');
  insertSlip.run(1, 4, 5500.00, 200.00, 400.00, 6100.00, 488.00, 244.00, 0.00, 5368.00, 164.00, 4.00, 'paid');
  insertSlip.run(1, 5, 4300.00, 0.00, 300.00, 4600.00, 368.00, 184.00, 0.00, 4048.00, 160.00, 0.00, 'paid');

  // 9. Sample Documents
  db.prepare(`
    INSERT INTO documents (employee_id, title, category, file_name, file_path, file_size, mime_type, uploaded_by)
    VALUES
    (2, 'John_Doe_Curriculum_Vitae.pdf', 'resume_cv', 'sample_cv_johndoe.pdf', '/uploads/sample_cv_johndoe.pdf', 142050, 'application/pdf', 2),
    (2, 'Government_Passport_ID.pdf', 'government_id', 'passport_johndoe.pdf', '/uploads/passport_johndoe.pdf', 215000, 'application/pdf', 2),
    (2, 'Senior_Fullstack_Employment_Contract.pdf', 'contract', 'contract_emp002.pdf', '/uploads/contract_emp002.pdf', 540200, 'application/pdf', 1),
    (3, 'Sarah_Smith_Portfolio_Resume.pdf', 'resume_cv', 'sarah_smith_cv.pdf', '/uploads/sarah_smith_cv.pdf', 312000, 'application/pdf', 3),
    (3, 'Employment_Offer_Letter_NDA.pdf', 'contract', 'nda_sarahsmith.pdf', '/uploads/nda_sarahsmith.pdf', 410000, 'application/pdf', 1)
  `).run();
})();

console.log('✅ Standalone seeding completed successfully!');
