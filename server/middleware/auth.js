const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'hr-ecomedge-super-secure-jwt-secret-key-2026';

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user and employee data
    const user = db.prepare(`
      SELECT u.id, u.username, u.role, u.employee_id, u.avatar_url,
             e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.hourly_rate, e.monthly_salary
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.id = ?
    `).get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Session expired or invalid token.' });
  }
}

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Access denied. Manager / Owner privilege required.' });
  }
  next();
}

function requireSelfOrManager(paramName = 'employeeId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role === 'manager') {
      return next();
    }

    const targetEmployeeId = parseInt(req.params[paramName] || req.query[paramName] || req.body[paramName], 10);
    if (req.user.employee_id && req.user.employee_id === targetEmployeeId) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied. You can only view or manage your own records.' });
  };
}

module.exports = {
  authenticate,
  requireManager,
  requireSelfOrManager,
  JWT_SECRET
};
