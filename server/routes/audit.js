const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');

/**
 * Enterprise Audit Querying Layer with Keyset / Cursor-Based Pagination
 * Resolves severe OFFSET pagination bottlenecks on million-row tables.
 */

// Helper to decode/encode cursor
function encodeCursor(createdAt, id) {
  return Buffer.from(JSON.stringify({ t: createdAt, id })).toString('base64');
}

function decodeCursor(cursorStr) {
  if (!cursorStr) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursorStr, 'base64').toString('utf8'));
    return { createdAt: parsed.t, id: parsed.id };
  } catch (e) {
    return null;
  }
}

// 1. GET /api/audit/system (System state changes: CRUD, Payroll, RBAC)
router.get('/system', authenticate, requireManager, (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const cursor = decodeCursor(req.query.cursor);
    const { resource_type, action, user_id, search } = req.query;

    let query = `
      SELECT id, user_id, username, action, resource_type, resource_id,
             ip_address, user_agent, device_fingerprint,
             before_state, after_state, diff, status, error_message, created_at
      FROM system_audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (resource_type) {
      query += ` AND resource_type = ?`;
      params.push(resource_type);
    }

    if (action) {
      query += ` AND action = ?`;
      params.push(action);
    }

    if (user_id) {
      query += ` AND user_id = ?`;
      params.push(parseInt(user_id, 10));
    }

    if (search) {
      query += ` AND (username LIKE ? OR resource_id LIKE ? OR action LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    // Keyset / Cursor condition: index-friendly (created_at, id)
    if (cursor) {
      query += ` AND (created_at < ? OR (created_at = ? AND id < ?))`;
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    // Query limit + 1 to check if another page exists without running COUNT(*)
    query += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // Parse JSON fields
    const formatted = items.map(row => ({
      ...row,
      before_state: row.before_state ? JSON.parse(row.before_state) : null,
      after_state: row.after_state ? JSON.parse(row.after_state) : null,
      diff: row.diff ? JSON.parse(row.diff) : null
    }));

    let nextCursor = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor(lastItem.created_at, lastItem.id);
    }

    res.json({
      items: formatted,
      has_more: hasMore,
      next_cursor: nextCursor,
      limit
    });
  } catch (err) {
    console.error('Error fetching system audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve system audit logs.' });
  }
});

// 2. GET /api/audit/auth (Authentication, Logins, MFA & Session Events)
router.get('/auth', authenticate, requireManager, (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const cursor = decodeCursor(req.query.cursor);
    const { event_type, status, username, ip_address } = req.query;

    let query = `
      SELECT id, user_id, username, event_type, status, failure_reason,
             ip_address, user_agent, device_fingerprint, session_id, metadata, created_at
      FROM auth_audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (event_type) {
      query += ` AND event_type = ?`;
      params.push(event_type);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (username) {
      query += ` AND username LIKE ?`;
      params.push(`%${username}%`);
    }

    if (ip_address) {
      query += ` AND ip_address = ?`;
      params.push(ip_address);
    }

    if (cursor) {
      query += ` AND (created_at < ? OR (created_at = ? AND id < ?))`;
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    query += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const formatted = items.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));

    let nextCursor = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor(lastItem.created_at, lastItem.id);
    }

    res.json({
      items: formatted,
      has_more: hasMore,
      next_cursor: nextCursor,
      limit
    });
  } catch (err) {
    console.error('Error fetching auth audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve auth audit logs.' });
  }
});

// 3. GET /api/audit (Unified / Legacy Endpoint for Settings Viewer)
router.get('/', authenticate, requireManager, (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const cursor = decodeCursor(req.query.cursor);

    let query = `
      SELECT id, user_id, username, action, resource_type as entity_type, resource_id as entity_id,
             COALESCE(diff, details, action) as details, created_at, status
      FROM (
        SELECT id, user_id, username, action, resource_type, resource_id,
               CASE 
                 WHEN diff IS NOT NULL THEN diff 
                 ELSE action 
               END as diff,
               NULL as details, created_at, status
        FROM system_audit_logs
        UNION ALL
        SELECT id, user_id, username, action, entity_type as resource_type, entity_id as resource_id,
               NULL as diff, details, created_at, 'SUCCESS' as status
        FROM audit_logs
      )
      WHERE 1=1
    `;
    const params = [];

    if (cursor) {
      query += ` AND (created_at < ? OR (created_at = ? AND id < ?))`;
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }

    query += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
    params.push(limit + 1);

    const rows = db.prepare(query).all(...params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor(lastItem.created_at, lastItem.id);
    }

    res.json({
      logs: items,
      has_more: hasMore,
      next_cursor: nextCursor
    });
  } catch (err) {
    console.error('Error fetching unified audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// 4. GET /api/audit/stats (Real-time telemetry & Security Dashboard)
router.get('/stats', authenticate, requireManager, (req, res) => {
  try {
    const totalSystemEvents = db.prepare('SELECT COUNT(*) as count FROM system_audit_logs').get().count;
    const failedLogins24h = db.prepare(`
      SELECT COUNT(*) as count FROM auth_audit_logs
      WHERE status = 'FAILED' AND datetime(created_at) >= datetime('now', '-24 hours')
    `).get().count;
    const activeSessionsCount = db.prepare(`
      SELECT COUNT(*) as count FROM user_sessions
      WHERE is_revoked = 0 AND expires_at > datetime('now')
    `).get().count;

    res.json({
      total_system_events: totalSystemEvents,
      failed_logins_24h: failedLogins24h,
      active_sessions: activeSessionsCount
    });
  } catch (err) {
    console.error('Error fetching audit stats:', err);
    res.status(500).json({ error: 'Failed to fetch audit stats.' });
  }
});

module.exports = router;
