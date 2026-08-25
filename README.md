# 🏢 HR-EcomEdge | Enterprise HR & Workforce Management System

A modern, full-stack Human Resource & Workforce Management System built with React, Vite, Express.js, and dual database support for **Supabase (PostgreSQL)** and **Local SQLite**.

---

## 🌟 Key Capabilities & Requirements Implemented

- **Strict Username & Password Authentication**: No email required for logins. Users authenticate with their assigned unique username and password.
- **Role-Based Access Control (RBAC)**:
  - 👑 **Manager / Owner Portal**: Full-access executive command over employee records, payroll runs & payslip generation, live attendance radar, leave approvals, document vault, training tracks, and asset allocations.
  - 👤 **Employee Self-Service (ESS)**: Restricted workspace where employees manage their profiles, upload personal documents (CV, Passport/Government IDs, Certificates), submit leave applications, review payslips, and punch in/out.
- **Live Punch Clock & Shift Tracker**:
  - **Time In (Shift Start)**
  - **Lunch / Break Start**
  - **End Break (Resume Work)**
  - **Time Out (End Shift)**
  - Real-time elapsed working timer ticker with live status indicators and confetti celebration.
  - Live floor attendance monitor for managers.
- **Automated Payroll Engine & Printable Payslips**:
  - Auto-computes hours from time logs, applies 1.5x overtime multiplier, meal/transport allowances, and tax/social withholdings.
  - Itemized digital & official printable payslips (Print dialog formatting included).
- **Document Vault**:
  - Categorized employee file archive (Curriculum Vitae, Government IDs, Passports, Employment Contracts, NDAs, Appraisals).
  - Direct local upload & secure file download/preview.
- **Leave Management**:
  - Quota visualizer (Vacation, Sick, Emergency days remaining).
  - Employee application form with live business-day counter.
  - Manager one-click Approve / Decline with feedback notes & auto-balance adjustment.
- **Training & Skills Development**:
  - Program catalog with instructor, duration, and dates.
  - Staff enrollment tracking with progress, scores, and completion certificates.
- **Asset & Hardware Inventory**:
  - Equipment tracking (Laptops, MacBooks, Displays, Peripherals, Keys, Vehicles).
  - One-click assign to employee with return dates and return condition audits.

---

## 🔐 Default Demo Accounts

| Role | Username | Password | Access Level |
|---|---|---|---|
| 👑 **Manager / Owner** | `admin` | `admin123` | Full access across all modules & settings |
| 👤 **Employee (Engineering)** | `john.doe` | `password123` | Employee Self-Service (ESS) |
| 🎨 **Employee (Design)** | `sarah.smith` | `password123` | Employee Self-Service (ESS) |
| 📢 **Employee (Marketing)** | `michael.lee` | `password123` | Employee Self-Service (ESS) |
| 🎧 **Employee (Operations)** | `emily.davis` | `password123` | Employee Self-Service (ESS) |

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
# Install root & backend dependencies
npm install

# Install client dependencies
npm --prefix client install
```

### 2. Running Locally (Development)
```bash
# Run both Backend API (Port 5000) and Frontend (Port 5173) concurrently
npm run dev
```

Visit **http://localhost:5173** in your browser.

### 3. Re-seeding Initial Data
```bash
npm run seed
```

---

## ⚡ Supabase Integration (Optional)

The system includes complete SQL scripts to deploy directly to **Supabase**:

1. Open your project on [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run `supabase/schema.sql`.
3. Run `supabase/seed.sql` to populate sample employees, time logs, and records.
4. Copy your project URL and service/anon key into `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-anon-or-service-key
   ```
5. If `.env` is empty, the application automatically uses local high-performance SQLite without any external configuration.

---

## 🏗️ Project Architecture

```
hr-ecomedge/
├── client/                      # React 18 + Vite UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/          # Navbar with live punch pill & Sidebar
│   │   │   ├── TimeClock/       # Interactive Punch Clock Modal
│   │   │   └── UI/              # Toast notifications & cards
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # User session, JWT tokens, punch status
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Username & Password login
│   │   │   ├── Dashboard.jsx    # Role-adaptive Dashboard
│   │   │   ├── Employees.jsx    # Employee directory & details drawer
│   │   │   ├── TimeLogs.jsx     # Timesheets & Live floor attendance
│   │   │   ├── Payroll.jsx      # Payroll runs & printable payslip modal
│   │   │   ├── Leaves.jsx       # Leave applications & manager approvals
│   │   │   ├── Documents.jsx    # Categorized Document Vault
│   │   │   ├── Training.jsx     # Training catalog & records
│   │   │   ├── Assets.jsx       # Hardware inventory & allocations
│   │   │   └── Profile.jsx      # Profile settings & change password
│   │   ├── services/
│   │   │   └── api.js           # REST API client
│   │   ├── index.css            # Custom glassmorphic design system
│   │   └── App.jsx
├── server/                      # Express.js REST API
│   ├── db/
│   │   ├── database.js          # SQLite & Supabase adapter
│   │   └── seed.js              # Seed data script
│   ├── middleware/
│   │   ├── auth.js              # JWT & RBAC authorization
│   │   └── upload.js            # Multer document upload handler
│   ├── routes/                  # API endpoints
│   └── index.js                 # Server entry point
├── supabase/
│   ├── schema.sql               # PostgreSQL / Supabase DDL
│   └── seed.sql                 # PostgreSQL / Supabase seed data
├── scripts/
│   └── test_e2e.js              # Automated E2E verification test suite
└── package.json
```
