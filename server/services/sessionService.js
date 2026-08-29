const crypto = require('crypto');
const { db, supabase } = require('../db/database');

/**
 * Enterprise Session Management & Fingerprint Service
 * - Automated TTL-based sliding expiration
 * - Multi-device fingerprinting
 * - Immediate session revocation capability
 * - Background automated cleanup cron to prevent session bloat
 */

class SessionService {
  constructor() {
    this.sessionTTLHours = 24 * 7; // 7 days standard enterprise sliding TTL
    this.cleanupIntervalMs = 15 * 60 * 1000; // Run cleanup worker every 15 minutes

    // Start background cleanup worker
    this.cleanupTimer = setInterval(() => {
      this.purgeExpiredSessions().catch(err => console.error('Session purge error:', err));
    }, this.cleanupIntervalMs);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Generates deterministic device fingerprint from request headers
   */
  generateDeviceFingerprint(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown-Agent';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    return crypto
      .createHash('sha256')
      .update(`${ip}|${userAgent}|${acceptLanguage}|${acceptEncoding}`)
      .digest('hex');
  }

  /**
   * Extracts clean IP address
   */
  extractIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || req.ip || '127.0.0.1';
  }

  /**
   * Creates a new active session
   */
  createSession(userId, req) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const deviceFingerprint = this.generateDeviceFingerprint(req);
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const expiresAt = new Date(Date.now() + this.sessionTTLHours * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO user_sessions (
        id, user_id, device_fingerprint, ip_address, user_agent, expires_at, is_revoked
      ) VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(sessionId, userId, deviceFingerprint, ipAddress, userAgent, expiresAt);

    if (supabase) {
      supabase.from('user_sessions').insert({
        id: sessionId,
        user_id: userId,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        is_revoked: false
      }).then(() => {}).catch(() => {});
    }

    return {
      sessionId,
      deviceFingerprint,
      expiresAt
    };
  }

  /**
   * Validates active session and slides TTL forward
   */
  validateSession(sessionId) {
    if (!sessionId) return { valid: false, reason: 'NO_SESSION' };

    const session = db.prepare(`
      SELECT * FROM user_sessions WHERE id = ?
    `).get(sessionId);

    if (!session) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }

    if (session.is_revoked === 1) {
      return { valid: false, reason: 'SESSION_REVOKED' };
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (expiresAt < now) {
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }

    // Slide expiration window if within 2 days of expiring
    const remainingMs = expiresAt.getTime() - now.getTime();
    if (remainingMs < 2 * 24 * 60 * 60 * 1000) {
      const newExpiresAt = new Date(Date.now() + this.sessionTTLHours * 60 * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE user_sessions
        SET expires_at = ?, last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newExpiresAt, sessionId);
    }

    return { valid: true, session };
  }

  /**
   * Revokes a specific session
   */
  revokeSession(sessionId) {
    db.prepare('UPDATE user_sessions SET is_revoked = 1 WHERE id = ?').run(sessionId);
    if (supabase) {
      supabase.from('user_sessions').update({ is_revoked: true }).eq('id', sessionId).then(() => {}).catch(() => {});
    }
  }

  /**
   * Revokes all active sessions for a user (e.g. upon password change)
   */
  revokeAllUserSessions(userId) {
    db.prepare('UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ?').run(userId);
    if (supabase) {
      supabase.from('user_sessions').update({ is_revoked: true }).eq('user_id', userId).then(() => {}).catch(() => {});
    }
  }

  /**
   * Automated cleanup of expired / dead sessions to prevent storage bloat
   */
  async purgeExpiredSessions() {
    try {
      const nowIso = new Date().toISOString();
      const result = db.prepare(`
        DELETE FROM user_sessions
        WHERE expires_at < ? OR (is_revoked = 1 AND datetime(created_at, '+30 days') < datetime('now'))
      `).run(nowIso);

      if (result.changes > 0) {
        console.log(`🧹 [SessionService] Cleaned up ${result.changes} expired/revoked sessions.`);
      }

      if (supabase) {
        await supabase
          .from('user_sessions')
          .delete()
          .lt('expires_at', nowIso);
      }
    } catch (err) {
      console.warn('⚠️ [SessionService] Purge error:', err.message);
    }
  }
}

const sessionService = new SessionService();
module.exports = sessionService;
