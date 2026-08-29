const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure Database & Schema is loaded
const { isSupabaseConfigured } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Audit context extractor middleware
const { auditContextMiddleware } = require('./middleware/auditMiddleware');
app.use(auditContextMiddleware);

// Static uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'HR-EcomEdge Enterprise System',
    timestamp: new Date().toISOString(),
    database: isSupabaseConfigured() ? 'Supabase (PostgreSQL)' : 'SQLite (Local High-Performance)',
    version: '1.0.0'
  });
});

const { syncFromSupabase } = require('./db/database');

// Non-blocking background sync on cold starts
let initialSynced = false;
app.use((req, res, next) => {
  if (!initialSynced && req.path.startsWith('/api') && req.path !== '/api/health') {
    initialSynced = true;
    syncFromSupabase(true).catch(() => {});
  }
  next();
});

// Register API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/timesheets', require('./routes/timesheets'));
app.use('/api/timelogs', require('./routes/timelogs'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/training', require('./routes/training'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit', require('./routes/audit'));

// Serve client static build in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && req.method === 'GET') {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 HR-EcomEdge Server running on http://localhost:${PORT}`);
    console.log(`📊 DB Mode: ${isSupabaseConfigured() ? 'Supabase PostgreSQL' : 'Local SQLite'}`);
    console.log(`📁 Uploads available at http://localhost:${PORT}/uploads`);
  });
}

module.exports = app;
