const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://bmlhdnexcxdjoqoebtyt.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_IF_CV_WXZAwGh90QgAZNkg_Z28bzo0N';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSupabase() {
  console.log('🌱 Starting direct Supabase Database Seeding...');

  const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
  const passwordHashMgr = bcrypt.hashSync('password01', 10);

  // 1. Employees
  console.log('1. Seeding Employees...');
  const { data: empData, error: empErr } = await supabase.from('employees').upsert([
    {
      id: 1,
      employee_code: 'EMP-001',
      first_name: 'Admin',
      last_name: 'User',
      job_title: 'System Owner / Executive Director',
      department: 'Management',
      employment_status: 'active',
      employment_type: 'full_time',
      hire_date: '2026-01-01',
      monthly_salary: 75000.00,
      hourly_rate: 0.00,
      phone: '+63 900 000 0001',
      address: 'Metro Manila, Philippines',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '+63 900 000 0000',
      bank_name: 'BDO',
      bank_account_number: '**** 0001'
    },
    {
      id: 2,
      employee_code: 'EMP-002',
      first_name: 'Operations',
      last_name: 'Manager',
      job_title: 'Operations HR Manager',
      department: 'Operations',
      employment_status: 'active',
      employment_type: 'full_time',
      hire_date: '2026-01-01',
      monthly_salary: 50000.00,
      hourly_rate: 0.00,
      phone: '+63 900 000 0002',
      address: 'Metro Manila, Philippines',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '+63 900 000 0000',
      bank_name: 'BPI',
      bank_account_number: '**** 0002'
    }
  ]);

  if (empErr) {
    console.error('❌ Employees Error:', empErr);
  } else {
    console.log('✅ Employees seeded!');
  }

  // 2. Users / Auth
  console.log('2. Seeding Users (admin & manager)...');
  const { data: usrData, error: usrErr } = await supabase.from('users').upsert([
    {
      id: 1,
      username: 'admin',
      password_hash: passwordHashAdmin,
      role: 'manager',
      employee_id: 1
    },
    {
      id: 2,
      username: 'manager',
      password_hash: passwordHashMgr,
      role: 'manager',
      employee_id: 2
    }
  ]);

  if (usrErr) {
    console.error('❌ Users Error:', usrErr);
  } else {
    console.log('✅ Users seeded successfully!');
  }

  // 3. Leave balances
  console.log('3. Seeding Leave Balances...');
  const { data: lbData, error: lbErr } = await supabase.from('leave_balances').upsert([
    { employee_id: 1, year: 2026, vacation_days: 15, sick_days: 10, emergency_days: 5, vacation_used: 0, sick_used: 0, emergency_used: 0 },
    { employee_id: 2, year: 2026, vacation_days: 15, sick_days: 10, emergency_days: 5, vacation_used: 0, sick_used: 0, emergency_used: 0 }
  ]);

  if (lbErr) {
    console.error('❌ Leave Balances Error:', lbErr);
  } else {
    console.log('✅ Leave Balances seeded!');
  }

  console.log('\n🎉 Supabase seeding process finished!');
}

seedSupabase();
