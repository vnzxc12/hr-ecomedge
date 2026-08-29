const sessionService = require('../services/sessionService');
const auditService = require('../services/auditService');

/**
 * Express Middleware to inject audit context into request
 * and provide convenient snapshot recording helpers
 */
function auditContextMiddleware(req, res, next) {
  const ipAddress = sessionService.extractIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const deviceFingerprint = sessionService.generateDeviceFingerprint(req);
  const sessionId = req.headers['x-session-id'] || null;

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
 */
function recordAudit({
  req,
  action,
  resourceType,
  resourceId,
  beforeState = null,
  afterState = null,
  status = 'SUCCESS',
  errorMessage = null
}) {
  const ctx = req.auditContext || {
    ipAddress: sessionService.extractIp(req),
    userAgent: req.headers['user-agent'] || 'Unknown',
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
}

module.exports = {
  auditContextMiddleware,
  recordAudit
};
