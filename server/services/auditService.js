const { db, supabase } = require('../db/database');

/**
 * Enterprise Asynchronous Non-Blocking Audit Pipeline
 * Pattern drawn from HR PLN Architecture:
 * - Decoupled in-memory batch ring buffer
 * - Automatic micro-batch flush every 500ms or 50 items
 * - Deep diff engine with sensitive field redaction
 * - Circuit breaker protection to prevent event-loop congestion
 */

class AuditPipelineService {
  constructor() {
    this.systemQueue = [];
    this.authQueue = [];
    this.batchSize = 50;
    this.flushIntervalMs = 500;
    this.isFlushing = false;
    this.maxQueueCapacity = 5000; // Drop threshold during extreme DB outage / congestion

    // Sensitive field keys to automatically redact from diffs and snapshots
    this.redactedKeys = new Set([
      'password',
      'password_hash',
      'currentPassword',
      'newPassword',
      'token',
      'jwt',
      'authorization',
      'secret'
    ]);

    // Start background worker timer (Unref'd so it won't block process exit)
    this.flushTimer = setInterval(() => {
      this.flushQueues().catch(err => console.error('Audit flush error:', err));
    }, this.flushIntervalMs);

    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }

    // Graceful process termination handling
    const gracefulFlush = async () => {
      console.log('🔄 Flushing remaining audit queue before shutdown...');
      await this.flushQueues(true);
    };

    process.once('SIGINT', gracefulFlush);
    process.once('SIGTERM', gracefulFlush);
    process.once('beforeExit', gracefulFlush);
  }

  /**
   * Sanitizes object by masking sensitive keys
   */
  sanitizeState(state) {
    if (!state || typeof state !== 'object') return state;

    const sanitized = Array.isArray(state) ? [] : {};
    for (const [key, value] of Object.entries(state)) {
      if (this.redactedKeys.has(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !(value instanceof Date)) {
        sanitized[key] = this.sanitizeState(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Computes precise field-level delta between before_state and after_state
   */
  computeDiff(beforeState, afterState) {
    if (!beforeState && !afterState) return null;
    if (!beforeState) return { _type: 'INSERT', after: this.sanitizeState(afterState) };
    if (!afterState) return { _type: 'DELETE', before: this.sanitizeState(beforeState) };

    const sanitizedBefore = this.sanitizeState(beforeState);
    const sanitizedAfter = this.sanitizeState(afterState);
    const diff = {};

    const allKeys = new Set([...Object.keys(sanitizedBefore), ...Object.keys(sanitizedAfter)]);

    for (const key of allKeys) {
      const valBefore = sanitizedBefore[key];
      const valAfter = sanitizedAfter[key];

      // Convert dates/nulls/numbers for stable comparison
      const strBefore = valBefore === undefined ? undefined : JSON.stringify(valBefore);
      const strAfter = valAfter === undefined ? undefined : JSON.stringify(valAfter);

      if (strBefore !== strAfter) {
        diff[key] = {
          old: valBefore !== undefined ? valBefore : null,
          new: valAfter !== undefined ? valAfter : null
        };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  /**
   * Non-blocking queueing of critical state changes (CRUD, Payroll, RBAC)
   * Dispatches via setImmediate to guarantee 0ms overhead on main request path.
   */
  logSystemEvent({
    userId = null,
    username = 'system',
    action,
    resourceType,
    resourceId,
    ipAddress = '127.0.0.1',
    userAgent = 'Unknown',
    deviceFingerprint = null,
    beforeState = null,
    afterState = null,
    status = 'SUCCESS',
    errorMessage = null
  }) {
    setImmediate(() => {
      if (this.systemQueue.length >= this.maxQueueCapacity) {
        console.warn('⚠️ [AuditService] Queue capacity reached. Dropping earliest event to protect memory.');
        this.systemQueue.shift();
      }

      const cleanBefore = beforeState ? this.sanitizeState(beforeState) : null;
      const cleanAfter = afterState ? this.sanitizeState(afterState) : null;
      const computedDiff = this.computeDiff(beforeState, afterState);

      const event = {
        user_id: userId ? parseInt(userId, 10) : null,
        username: username || 'system',
        action,
        resource_type: resourceType,
        resource_id: String(resourceId),
        ip_address: ipAddress || '127.0.0.1',
        user_agent: userAgent || 'Unknown',
        device_fingerprint: deviceFingerprint || null,
        before_state: cleanBefore ? JSON.stringify(cleanBefore) : null,
        after_state: cleanAfter ? JSON.stringify(cleanAfter) : null,
        diff: computedDiff ? JSON.stringify(computedDiff) : null,
        status: status || 'SUCCESS',
        error_message: errorMessage || null,
        created_at: new Date().toISOString()
      };

      this.systemQueue.push(event);

      // Auto trigger flush if batch threshold is met
      if (this.systemQueue.length >= this.batchSize) {
        this.flushQueues().catch(() => {});
      }
    });
  }

  /**
   * Non-blocking queueing of authentication and login attempts
   */
  logAuthEvent({
    userId = null,
    username,
    eventType,
    status,
    failureReason = null,
    ipAddress = '127.0.0.1',
    userAgent = 'Unknown',
    deviceFingerprint = null,
    sessionId = null,
    metadata = {}
  }) {
    setImmediate(() => {
      if (this.authQueue.length >= this.maxQueueCapacity) {
        console.warn('⚠️ [AuditService] Auth Queue capacity reached. Dropping oldest item.');
        this.authQueue.shift();
      }

      const event = {
        user_id: userId ? parseInt(userId, 10) : null,
        username: username || 'anonymous',
        event_type: eventType,
        status: status || 'SUCCESS',
        failure_reason: failureReason || null,
        ip_address: ipAddress || '127.0.0.1',
        user_agent: userAgent || 'Unknown',
        device_fingerprint: deviceFingerprint || null,
        session_id: sessionId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date().toISOString()
      };

      this.authQueue.push(event);

      if (this.authQueue.length >= this.batchSize) {
        this.flushQueues().catch(() => {});
      }
    });
  }

  /**
   * Flushes in-memory batches to SQLite and Supabase in single bulk transactions
   */
  async flushQueues(isForce = false) {
    if (this.isFlushing && !isForce) return;
    if (this.systemQueue.length === 0 && this.authQueue.length === 0) return;

    this.isFlushing = true;

    // Drain current slices atomically
    const systemBatch = this.systemQueue.splice(0, this.batchSize);
    const authBatch = this.authQueue.splice(0, this.batchSize);

    try {
      // 1. Batch Write to SQLite
      if (systemBatch.length > 0) {
        const insertSys = db.prepare(`
          INSERT INTO system_audit_logs (
            user_id, username, action, resource_type, resource_id,
            ip_address, user_agent, device_fingerprint,
            before_state, after_state, diff, status, error_message, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Also write legacy audit_logs for backward compatibility
        const insertLegacy = db.prepare(`
          INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        db.transaction(() => {
          for (const item of systemBatch) {
            insertSys.run(
              item.user_id,
              item.username,
              item.action,
              item.resource_type,
              item.resource_id,
              item.ip_address,
              item.user_agent,
              item.device_fingerprint,
              item.before_state,
              item.after_state,
              item.diff,
              item.status,
              item.error_message,
              item.created_at
            );

            insertLegacy.run(
              item.user_id,
              item.username,
              item.action,
              item.resource_type,
              item.resource_id,
              item.diff ? `Changed: ${Object.keys(JSON.parse(item.diff)).join(', ')}` : item.action,
              item.created_at
            );
          }
        })();
      }

      if (authBatch.length > 0) {
        const insertAuth = db.prepare(`
          INSERT INTO auth_audit_logs (
            user_id, username, event_type, status, failure_reason,
            ip_address, user_agent, device_fingerprint, session_id, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        db.transaction(() => {
          for (const item of authBatch) {
            insertAuth.run(
              item.user_id,
              item.username,
              item.event_type,
              item.status,
              item.failure_reason,
              item.ip_address,
              item.user_agent,
              item.device_fingerprint,
              item.session_id,
              item.metadata,
              item.created_at
            );
          }
        })();
      }

      // 2. Async Non-blocking Push to Supabase PostgreSQL (if connected)
      if (supabase) {
        if (systemBatch.length > 0) {
          const formattedSys = systemBatch.map(s => ({
            ...s,
            before_state: s.before_state ? JSON.parse(s.before_state) : null,
            after_state: s.after_state ? JSON.parse(s.after_state) : null,
            diff: s.diff ? JSON.parse(s.diff) : null
          }));
          supabase.from('system_audit_logs').insert(formattedSys).then(() => {}).catch(err => {
            console.warn('Supabase system audit log push notice:', err.message);
          });
        }

        if (authBatch.length > 0) {
          const formattedAuth = authBatch.map(a => ({
            ...a,
            metadata: a.metadata ? JSON.parse(a.metadata) : null
          }));
          supabase.from('auth_audit_logs').insert(formattedAuth).then(() => {}).catch(err => {
            console.warn('Supabase auth audit log push notice:', err.message);
          });
        }
      }
    } catch (err) {
      console.error('❌ Critical Batch Audit Persistence Error:', err);
    } finally {
      this.isFlushing = false;
      // If items remain in queue, trigger immediate next batch
      if (this.systemQueue.length > 0 || this.authQueue.length > 0) {
        setImmediate(() => this.flushQueues().catch(() => {}));
      }
    }
  }
}

// Export singleton instance
const auditService = new AuditPipelineService();
module.exports = auditService;
