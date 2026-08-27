const { db } = require('./database');
const bcrypt = require('bcryptjs');

console.log('🔄 Seeding ECOMEDGE Research & Analytics Enterprise Database...');

db.transaction(() => {
  // Clear existing records
  db.prepare('DELETE FROM notifications').run();
  db.prepare('DELETE FROM audit_logs').run();
  db.prepare('DELETE FROM performance_reviews').run();
  db.prepare('DELETE FROM timesheets').run();
  db.prepare('DELETE FROM project_assignments').run();
  db.prepare('DELETE FROM projects').run();
  db.prepare('DELETE FROM clients').run();
  db.prepare('DELETE FROM designations').run();
  db.prepare('DELETE FROM teams').run();
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

  // 1. Teams
  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, description, department, status)
    VALUES (?, ?, ?, ?, 'active')
  `);
  insertTeam.run(1, 'E-Commerce Research', 'Product research, Amazon intelligence, competitor benchmarking', 'Research & Analytics');
  insertTeam.run(2, 'Data & Analytics', 'Pricing modeling, data scraping, conversion & margin analytics', 'Research & Analytics');
  insertTeam.run(3, 'Market Intelligence & QA', 'Market sentiment, catalog auditing, keyword discovery', 'Operations');
  insertTeam.run(4, 'Client Services & Accounts', 'Client deliverables, project management, communications', 'Client Services');
  insertTeam.run(5, 'Operations & HR', 'Internal workforce management, timesheets, agency administration', 'Operations');
  insertTeam.run(6, 'Technology & Systems', 'Infrastructure, analytics tooling, internal portal development', 'Management');

  // 2. Designations
  const insertDesig = db.prepare(`
    INSERT INTO designations (id, title, department, level, description, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `);
  insertDesig.run(1, 'System Owner / Executive Director', 'Management', 'Executive', 'Executive strategic management');
  insertDesig.run(2, 'Operations HR Manager', 'Operations', 'Manager', 'Workforce & agency operations oversight');
  insertDesig.run(3, 'Team Lead - Research', 'Research & Analytics', 'Lead', 'Lead project execution and team mentoring');
  insertDesig.run(4, 'Senior Research Analyst', 'Research & Analytics', 'Senior', 'Deep-dive marketplace research and analysis');
  insertDesig.run(5, 'Research Analyst', 'Research & Analytics', 'Mid-Level', 'Catalog research, competitor scraping & reporting');
  insertDesig.run(6, 'Lead Data Analyst', 'Research & Analytics', 'Senior', 'Big data, pricing algorithms, dashboard modeling');
  insertDesig.run(7, 'Data Analyst', 'Research & Analytics', 'Mid-Level', 'Data pipeline maintenance, extraction & visualization');
  insertDesig.run(8, 'E-Commerce Specialist', 'Operations', 'Mid-Level', 'Store operations, listing optimization, catalog QA');
  insertDesig.run(9, 'Account Manager', 'Client Services', 'Mid-Level', 'Client accounts, project delivery & SLA reporting');
  insertDesig.run(10, 'Quality Analyst', 'Operations', 'Mid-Level', 'Deliverable QA, accuracy verification');
  insertDesig.run(11, 'IT Systems Specialist', 'Management', 'Mid-Level', 'Hardware, portal systems, security management');

  // 3. Employees
  const insertEmp = db.prepare(`
    INSERT INTO employees (
      id, employee_code, first_name, last_name, job_title, department,
      team_id, designation_id, employment_status, employment_type, hire_date,
      hourly_rate, monthly_salary, phone, address, emergency_contact_name,
      emergency_contact_phone, bank_name, bank_account_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEmp.run(1, 'EMP-001', 'Admin', 'User', 'System Owner / Executive Director', 'Management', 6, 1, 'active', 'full_time', '2026-01-01', 0.00, 75000.00, '+63 917 000 0001', 'BGC, Taguig City, Metro Manila', 'Grace User', '+63 917 000 0000', 'BDO', '1092-8821-01');
  insertEmp.run(2, 'EMP-002', 'Operations', 'Manager', 'Operations HR Manager', 'Operations', 5, 2, 'active', 'full_time', '2026-01-01', 0.00, 55000.00, '+63 917 000 0002', 'Makati City, Metro Manila', 'Carlos Manager', '+63 917 000 0000', 'BPI', '3829-1920-02');
  insertEmp.run(3, 'EMP-003', 'Maria', 'Santos', 'Research Analyst', 'Research & Analytics', 1, 5, 'active', 'full_time', '2026-01-15', 187.50, 30000.00, '+63 918 111 2222', 'Pasig City, Metro Manila', 'Eduardo Santos', '+63 918 111 0000', 'Metrobank', '8472-1029-03');
  insertEmp.run(4, 'EMP-004', 'John', 'Reyes', 'Data Analyst', 'Research & Analytics', 2, 7, 'active', 'full_time', '2026-02-01', 200.00, 32000.00, '+63 918 333 4444', 'Quezon City, Metro Manila', 'Elena Reyes', '+63 918 333 0000', 'BDO', '5930-1092-04');
  insertEmp.run(5, 'EMP-005', 'Kevin', 'Cruz', 'E-Commerce Specialist', 'Operations', 3, 8, 'active', 'full_time', '2026-02-15', 187.50, 30000.00, '+63 918 555 6666', 'Mandaluyong City, Metro Manila', 'Lourdes Cruz', '+63 918 555 0000', 'UnionBank', '9920-3841-05');
  insertEmp.run(6, 'EMP-006', 'Angela', 'Garcia', 'Account Manager', 'Client Services', 4, 9, 'active', 'full_time', '2026-03-01', 218.75, 35000.00, '+63 918 777 8888', 'Taguig City, Metro Manila', 'Roberto Garcia', '+63 918 777 0000', 'BPI', '7721-0029-06');
  insertEmp.run(7, 'EMP-007', 'Mark', 'Dela Cruz', 'Team Lead - Research', 'Research & Analytics', 1, 3, 'active', 'full_time', '2026-01-05', 262.50, 42000.00, '+63 918 999 0000', 'Makati City, Metro Manila', 'Teresa Dela Cruz', '+63 918 999 1111', 'BDO', '6620-1192-07');

  // Update team leads
  db.prepare('UPDATE teams SET team_lead_id = 7 WHERE id = 1').run();
  db.prepare('UPDATE teams SET team_lead_id = 4 WHERE id = 2').run();
  db.prepare('UPDATE teams SET team_lead_id = 5 WHERE id = 3').run();
  db.prepare('UPDATE teams SET team_lead_id = 6 WHERE id = 4').run();
  db.prepare('UPDATE teams SET team_lead_id = 2 WHERE id = 5').run();
  db.prepare('UPDATE teams SET team_lead_id = 1 WHERE id = 6').run();

  // 4. Users (Auth)
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, employee_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run(1, 'admin', bcrypt.hashSync('admin123', 10), 'manager', 1);
  insertUser.run(2, 'manager', bcrypt.hashSync('password01', 10), 'manager', 2);
  insertUser.run(3, 'maria', bcrypt.hashSync('maria123', 10), 'employee', 3);
  insertUser.run(4, 'john', bcrypt.hashSync('john123', 10), 'employee', 4);
  insertUser.run(5, 'kevin', bcrypt.hashSync('kevin123', 10), 'employee', 5);
  insertUser.run(6, 'angela', bcrypt.hashSync('angela123', 10), 'employee', 6);
  insertUser.run(7, 'mark', bcrypt.hashSync('mark123', 10), 'employee', 7);

  // 5. Leave Balances
  const insertBalance = db.prepare(`
    INSERT INTO leave_balances (employee_id, year, vacation_days, sick_days, emergency_days, vacation_used, sick_used, emergency_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const currentYear = new Date().getFullYear();
  for (let i = 1; i <= 7; i++) {
    insertBalance.run(i, currentYear, 15, 10, 5, 0, 0, 0);
  }

  // 6. Clients
  const insertClient = db.prepare(`
    INSERT INTO clients (id, name, code, industry, contact_person, email, phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `);
  insertClient.run(1, 'Apex Global Brands', 'CLI-APX', 'Amazon US & Shopify DTC Brands', 'Sarah Jenkins', 'sjenkins@apexglobal.com', '+1 (555) 234-5678');
  insertClient.run(2, 'Nova Retail Labs', 'CLI-NRL', 'Cross-Border Marketplace Aggregator', 'David Chen', 'dchen@novaretaillabs.io', '+1 (555) 876-5432');
  insertClient.run(3, 'Zenith Market Direct', 'CLI-ZMD', 'DTC Consumer Electronics Analytics', 'Emma Watson', 'ewatson@zenithdirect.co', '+1 (555) 345-6789');
  insertClient.run(4, 'PrimeEdge Sellers Hub', 'CLI-PSH', 'E-Commerce Intelligence & Seller Tools', 'Marcus Vance', 'mvance@primeedgesellers.com', '+1 (555) 901-2345');

  // 7. Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (id, client_id, name, project_code, description, project_manager_id, team_id, start_date, end_date, status, priority, budget)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProject.run(1, 1, 'Amazon US Product Research & Competitor Intelligence', 'PRJ-AMZ-01', 'High-volume product category discovery, keyword competition mapping, and BSR velocity tracking on Amazon US.', 7, 1, '2026-01-10', '2026-12-31', 'active', 'high', 450000.00);
  insertProject.run(2, 2, 'Cross-Border Pricing & Margin Analytics', 'PRJ-NRL-02', 'Real-time multi-currency price monitoring, automated fee calculation, and distributor margin gap analysis across Southeast Asia & US.', 4, 2, '2026-02-01', '2026-10-31', 'active', 'high', 380000.00);
  insertProject.run(3, 3, 'E-Commerce Customer Sentiment & Keyword Tracking', 'PRJ-ZMD-03', 'Natural language processing on verified review data, defect clustering, and search volume trend forecasting for DTC gadgets.', 5, 3, '2026-03-01', '2026-09-30', 'active', 'medium', 290000.00);
  insertProject.run(4, 4, 'Multi-Channel Velocity & Listing Optimization', 'PRJ-PSH-04', 'A/B testing product titles, image assets, search terms, and stock reorder velocity curves across TikTok Shop & Amazon.', 7, 1, '2026-02-15', '2026-11-30', 'active', 'medium', 320000.00);

  // 8. Project Assignments
  const insertAssign = db.prepare(`
    INSERT INTO project_assignments (project_id, employee_id, role_on_project, allocation_percent, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);
  insertAssign.run(1, 7, 'Lead Project Manager', 70, '2026-01-10', '2026-12-31');
  insertAssign.run(1, 3, 'Lead Research Analyst', 80, '2026-01-15', '2026-12-31');
  insertAssign.run(1, 6, 'Client Success Liaison', 50, '2026-01-10', '2026-12-31');

  insertAssign.run(2, 4, 'Lead Data Engineer & Analyst', 100, '2026-02-01', '2026-10-31');
  insertAssign.run(2, 6, 'Account Manager', 50, '2026-02-01', '2026-10-31');

  insertAssign.run(3, 5, 'Sentiment & NLP Analyst', 100, '2026-03-01', '2026-09-30');

  insertAssign.run(4, 7, 'Project Supervisor', 30, '2026-02-15', '2026-11-30');
  insertAssign.run(4, 3, 'Associate Researcher', 20, '2026-02-15', '2026-11-30');

  // 9. Time Logs (Today)
  const todayStr = new Date().toISOString().split('T')[0];
  const insertLog = db.prepare(`
    INSERT INTO time_logs (employee_id, date, clock_in, clock_out, total_hours, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertLog.run(3, todayStr, `${todayStr} 08:55:00`, null, 4.5, 'clocked_in', 'Amazon US catalog deep-dive in progress');
  insertLog.run(4, todayStr, `${todayStr} 09:02:00`, null, 4.4, 'clocked_in', 'Pricing pipeline data scraping job');
  insertLog.run(5, todayStr, `${todayStr} 09:15:00`, null, 4.2, 'clocked_in', 'Sentiment audit on review exports');
  insertLog.run(7, todayStr, `${todayStr} 08:45:00`, null, 4.7, 'clocked_in', 'Client sprint review with Apex Brands');

  // 10. Sample Timesheets
  const insertTimesheet = db.prepare(`
    INSERT INTO timesheets (employee_id, project_id, date, start_time, end_time, break_mins, total_hours, overtime_hours, task_description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTimesheet.run(3, 1, todayStr, '09:00', '18:00', 60, 8.0, 0.0, 'Scraped 450 ASINs for category ranking and competitor price shifts on Amazon US Kitchen niche.', 'submitted');
  insertTimesheet.run(4, 2, todayStr, '09:00', '18:00', 60, 8.0, 0.5, 'Constructed automated margin gap calculator and connected live currency exchange rate API.', 'approved');
  insertTimesheet.run(5, 3, todayStr, '09:00', '18:00', 60, 8.0, 0.0, 'Extracted customer sentiment clusters for 12 top-selling wireless chargers on Amazon & TikTok Shop.', 'submitted');

  // 11. Assets
  const insertAsset = db.prepare(`
    INSERT INTO assets (asset_tag, name, category, model_serial, status, assigned_to, assigned_date, condition, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAsset.run('AST-ECOM-001', 'Apple MacBook Pro 14" M3', 'Laptop', 'SN-MBP14-99201', 'assigned', 3, '2026-01-15', 'excellent', 'Assigned to Maria Santos for E-Commerce analytics');
  insertAsset.run('AST-ECOM-002', 'Dell XPS 15 (Core i7 / 32GB RAM)', 'Laptop', 'SN-DELL-XPS-38291', 'assigned', 4, '2026-02-01', 'excellent', 'Data analytics modeling workstation');
  insertAsset.run('AST-ECOM-003', 'Dell UltraSharp 27" 4K Monitor', 'Monitor', 'SN-MON-4K-88291', 'assigned', 4, '2026-02-01', 'good', 'Secondary dual monitor setup');
  insertAsset.run('AST-ECOM-004', 'Lenovo ThinkPad T14s', 'Laptop', 'SN-LEN-T14-22910', 'assigned', 5, '2026-02-15', 'excellent', 'Operations & listing auditing machine');
  insertAsset.run('AST-ECOM-005', 'Apple MacBook Air 15" M2', 'Laptop', 'SN-MBA15-55102', 'assigned', 6, '2026-03-01', 'excellent', 'Client services & presentation laptop');
  insertAsset.run('AST-ECOM-006', 'Apple MacBook Pro 16" M3 Max', 'Laptop', 'SN-MBP16-11029', 'assigned', 7, '2026-01-05', 'excellent', 'Research lead workstation');
  insertAsset.run('AST-ECOM-007', 'Dell UltraSharp 27" 4K Monitor', 'Monitor', 'SN-MON-4K-99012', 'available', null, null, 'excellent', 'Available in IT storage');

  // 12. Training Programs
  const insertTraining = db.prepare(`
    INSERT INTO training_programs (id, title, description, instructor, duration_hours, start_date, end_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTraining.run(1, 'Advanced Amazon Product & Competitor Intelligence', 'Mastering Helium 10, Jungle Scout API, and automated reverse ASIN scraping methodologies.', 'Dr. Alexander Vance', 16, '2026-03-10', '2026-03-25', 'ongoing');
  insertTraining.run(2, 'E-Commerce Pricing Algorithms & Elasticity Modeling', 'Python and SQL workflows for dynamic market pricing and margin simulations.', 'Prof. David Lee', 20, '2026-04-01', '2026-04-20', 'upcoming');
  insertTraining.run(3, 'Data Visualization with Power BI & Metabase', 'Building interactive agency dashboards for e-commerce executive reporting.', 'Elena Cruz', 12, '2026-01-10', '2026-01-20', 'completed');

  // 13. Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (title, message, type, link_tab, is_read)
    VALUES (?, ?, ?, ?, 0)
  `);
  insertNotif.run('Timesheets Pending Approval', '2 research project timesheets require review for the current sprint.', 'info', 'timesheets');
  insertNotif.run('Client Sprint Milestone', 'Apex Global Brands sprint review milestone scheduled for this week.', 'success', 'projects');
  insertNotif.run('Asset Assignment Updated', 'Dell 4K Monitor successfully assigned to John Reyes (Data & Analytics).', 'info', 'assets');

  // 14. Performance Reviews
  const insertReview = db.prepare(`
    INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, rating, productivity_score, quality_score, accuracy_score, client_satisfaction, goals, manager_comments, employee_comments, status, review_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReview.run(3, 1, 'Q2 2026 Review', 4.9, 4.8, 5.0, 5.0, 4.8, 'Expand automated scraping knowledge and lead category benchmarking workshops.', 'Maria consistently produces flawless competitor intelligence reports with exceptional data accuracy.', 'Excited to continue working on our Amazon US flagship accounts.', 'completed', '2026-06-30');
  insertReview.run(4, 1, 'Q2 2026 Review', 4.8, 5.0, 4.7, 4.9, 4.8, 'Deploy automated cross-border margin gap alerts across all top 100 SKUs.', 'John built an impressive data extraction pipeline that reduced report generation time by 60%.', 'Looking forward to integrating live predictive forecasting next quarter.', 'completed', '2026-06-30');
})();

console.log('✅ ECOMEDGE database successfully seeded with teams, clients, projects, employees, and operations data!');
