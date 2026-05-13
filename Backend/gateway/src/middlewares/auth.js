const { verifyToken, normalizeVerifiedToken } = require('../../../shared/utils/jwt');

const applyUserHeaders = (req, userLike) => {
  const userId = userLike.id || userLike.userId || userLike._id || userLike.uid;
  if (userId) req.headers['x-user-id'] = String(userId);
  if (userLike.role) req.headers['x-user-role'] = userLike.role;
  if (userLike.email) req.headers['x-user-email'] = userLike.email;
  if (userLike.portalRole) req.headers['x-user-portal-role'] = String(userLike.portalRole);
  const team = userLike.team || userLike.staffProfile?.team;
  if (team) req.headers['x-user-team'] = String(team);
  if (userLike.vendorUserId) req.headers['x-vendor-user-id'] = String(userLike.vendorUserId);
  if (userLike.vendorOrgId) req.headers['x-vendor-org-id'] = String(userLike.vendorOrgId);
  if (Array.isArray(userLike.vendorAliases) && userLike.vendorAliases.length) {
    req.headers['x-vendor-aliases'] = userLike.vendorAliases.map(String).join(',');
  }
  if (Array.isArray(userLike.storeScope) && userLike.storeScope.length) {
    req.headers['x-user-store-scope'] = userLike.storeScope.map(String).join(',');
  }

  const permissions = Array.isArray(userLike.permissions)
    ? userLike.permissions
    : Array.isArray(userLike.staffProfile?.permissions)
      ? userLike.staffProfile.permissions
      : [];

  if (permissions.length) {
    req.headers['x-user-permissions'] = permissions.join(',');
  }

  if (userLike.firebaseUid || userLike.uid) {
    req.headers['x-firebase-uid'] = String(userLike.firebaseUid || userLike.uid);
  }
};

/**
 * Gateway auth for short internal JWTs issued after the one-time Firebase exchange.
 * Injects x-user-id, x-user-role, x-user-email headers for downstream services.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = normalizeVerifiedToken(verifyToken(token));
    applyUserHeaders(req, user);
    next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = normalizeVerifiedToken(verifyToken(token));
    applyUserHeaders(req, user);
  } catch {
    // ignore — optional auth
  }

  next();
};

module.exports = { authenticate, optionalAuth };
