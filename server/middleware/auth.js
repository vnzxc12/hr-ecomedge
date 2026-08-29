const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const sessionService = require('../services/sessionService');
const cacheService = require('../services/cacheService');

const JWT_SECRET = process.env.JWT_SECRET || 'hr-ecomedge-super-secure-jwt-secret-key-2026';

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { supabase } = require('../db/database');
    const sessionId = decoded.session_id || req.headers['x-session-id'];

    // 1. If session ID exists, validate active session status & 20-min idle timeout
    if (sessionId) {
      const sessionCheck = sessionService.validateSession(sessionId, decoded.id, req);
      if (!sessionCheck.valid) {
        return res.status(401).json({
          error: sessionCheck.reason === 'SESSION_REVOKED'
            ? 'Session has been revoked. Please log in again.'
            : 'Session expired due to 20 minutes of inactivity. Please log in again.',
          code: sessionCheck.reason
        });
      }
    }

    // 2. Fetch user profile with Multi-Tier Cache (30s TTL, auto-invalidated on RBAC updates)
    const cacheKey = `rbac:user:${decoded.id}`;
    const user = await cacheService.getOrSet(
      cacheKey,
      async () => {
        let u = db.prepare(`
          SELECT u.id, u.username, u.role, u.employee_id, u.avatar_url,
                 e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.hourly_rate, e.monthly_salary, e.employment_status
          FROM users u
          LEFT JOIN employees e ON u.employee_id = e.id
          WHERE u.id = ?
        `).get(decoded.id);

        if (!u && supabase) {
          const { data: sbUser } = await supabase.from('users').select('*').eq('id', decoded.id).single();
          if (sbUser) {
            db.prepare('INSERT OR REPLACE INTO users (id, username, password_hash, role, employee_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?)')
              .run(sbUser.id, sbUser.username, sbUser.password_hash, sbUser.role || 'employee', sbUser.employee_id || null, sbUser.avatar_url || null);

            u = db.prepare(`
              SELECT u.id, u.username, u.role, u.employee_id, u.avatar_url,
                     e.first_name, e.last_name, e.job_title, e.department, e.employee_code, e.hourly_rate, e.monthly_salary, e.employment_status
              FROM users u
              LEFT JOIN employees e ON u.employee_id = e.id
              WHERE u.id = ?
            `).get(decoded.id);
          }
        }

        return u;
      },
      30 * 1000,
      ['rbac', `user:${decoded.id}`]
    );

    if (!user) {
      return res.status(401).json({ error: 'User account not found or deactivated.' });
    }

    if (user.employment_status === 'terminated') {
      return res.status(403).json({ error: 'Account has been deactivated. Contact your HR administrator.' });
    }

    req.user = {
      ...user,
      session_id: sessionId
    };

    next();
  } catch (err) {
    console.error('Authentication verification error:', err.message);
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
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
