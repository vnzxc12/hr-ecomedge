const sessionService = require('../services/sessionService');
const auditService = require('../services/auditService');

/**
 * Express Middleware to inject audit context into request
 * and provide convenient snapshot recording helpers
 */
function auditContextMiddleware(req, res, next) {
  const ipAddress = sessionService.extractIp(req);
  const userAgent = req.headers?.['user-agent'] || 'Unknown';
  const deviceFingerprint = sessionService.generateDeviceFingerprint(req);
  const sessionId = req.headers?.['x-session-id'] || null;

  req.auditContext = {
    ipAddress,
    userAgent,
    deviceFingerprint,
    sessionId
  };

  next();
}

/**
 * Convenient helper to dispatch system audit events directly from route handlers
 * Supports both signatures:
 * - recordAudit(req, { action, resourceType, resourceId, ... })
 * - recordAudit({ req, action, resourceType, resourceId, ... })
 */
function recordAudit(arg1, arg2) {
  try {
    let req, action, resourceType, resourceId, beforeState, afterState, status, errorMessage;

    if (arg1 && arg1.headers) {
      // Called as: recordAudit(req, options)
      req = arg1;
      const opts = arg2 || {};
      action = opts.action;
      resourceType = opts.resourceType;
      resourceId = opts.resourceId;
      beforeState = opts.beforeState || null;
      afterState = opts.afterState || null;
      status = opts.status || 'SUCCESS';
      errorMessage = opts.errorMessage || null;
    } else if (arg1 && typeof arg1 === 'object') {
      // Called as: recordAudit({ req, action, resourceType, ... })
      req = arg1.req;
      action = arg1.action;
      resourceType = arg1.resourceType;
      resourceId = arg1.resourceId;
      beforeState = arg1.beforeState || null;
      afterState = arg1.afterState || null;
      status = arg1.status || 'SUCCESS';
      errorMessage = arg1.errorMessage || null;
    }

    if (!req) return;

    const ctx = req.auditContext || {
      ipAddress: sessionService.extractIp(req),
      userAgent: req.headers?.['user-agent'] || 'Unknown',
      deviceFingerprint: sessionService.generateDeviceFingerprint(req)
    };

    auditService.logSystemEvent({
      userId: req.user?.id || null,
      username: req.user?.username || 'system',
      action,
      resourceType,
      resourceId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      deviceFingerprint: ctx.deviceFingerprint,
      beforeState,
      afterState,
      status,
      errorMessage
    });
  } catch (err) {
    console.warn('Non-blocking recordAudit notice:', err.message);
  }
}

module.exports = {
  auditContextMiddleware,
  recordAudit
};
