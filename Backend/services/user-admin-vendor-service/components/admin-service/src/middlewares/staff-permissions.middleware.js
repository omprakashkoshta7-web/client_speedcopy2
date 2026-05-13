const { normalizePermissions } = require('../utils/permission-aliases');

const parsePermissions = (value) =>
    String(value || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

const getStaffPermissions = (req) => {
    const fromUser = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const fromHeaders = parsePermissions(req.headers['x-user-permissions']);
    return normalizePermissions([...fromUser, ...fromHeaders]);
};

const hasStaffPermission = (req, requested) => {
    const role = String(req.user?.role || req.headers['x-user-role'] || '').trim();
    if (['admin', 'super_admin'].includes(role)) return true;

    const permissions = getStaffPermissions(req);
    if (permissions.includes('*') || permissions.includes(requested)) return true;

    const [domain] = String(requested || '').split('.');
    return permissions.includes(`${domain}.*`);
};

const requireStaffPermission =
    (...requiredPermissions) =>
    (req, res, next) => {
        const allowed = requiredPermissions.some((permission) => hasStaffPermission(req, permission));
        if (allowed) return next();

        return res.status(403).json({
            success: false,
            message: 'You do not have permission to perform this staff action',
        });
    };

module.exports = {
    getStaffPermissions,
    hasStaffPermission,
    requireStaffPermission,
};
