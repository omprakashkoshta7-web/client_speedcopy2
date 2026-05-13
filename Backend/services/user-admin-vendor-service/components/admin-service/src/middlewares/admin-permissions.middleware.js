const { getAdminPermissions } = require('../utils/admin-permissions');
const { normalizePermissions } = require('../utils/permission-aliases');

const parsePermissions = (value) =>
    String(value || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

const getRequestPermissions = (req) => {
    const explicit = [
        ...(Array.isArray(req.user?.permissions) ? req.user.permissions : []),
        ...parsePermissions(req.headers['x-user-permissions']),
    ];

    return getAdminPermissions(req.user?.role || req.headers['x-user-role'], explicit);
};

const hasAdminPermission = (req, requested) => {
    const role = String(req.user?.role || req.headers['x-user-role'] || '').trim().toLowerCase();
    if (role === 'super_admin') return true;
    if (role !== 'admin') return false;

    const permissions = getRequestPermissions(req);
    if (permissions.includes('*') || permissions.includes(requested)) return true;

    const [domain] = String(requested || '').split('.');
    return permissions.includes(`${domain}.*`);
};

const requireAdminPermission =
    (...permissions) =>
    (req, res, next) => {
        const allowed = permissions.some((permission) => hasAdminPermission(req, permission));
        if (allowed) return next();

        return res.status(403).json({
            success: false,
            message: 'You do not have permission to perform this admin action',
        });
    };

const requireSuperAdmin = (req, res, next) => {
    const role = String(req.user?.role || req.headers['x-user-role'] || '')
        .trim()
        .toLowerCase()
        .replace('superadmin', 'super_admin');
    if (role === 'super_admin') return next();

    const permissions = normalizePermissions([
        ...(Array.isArray(req.user?.permissions) ? req.user.permissions : []),
        ...parsePermissions(req.headers['x-user-permissions']),
    ]);

    if (
        permissions.includes('*') ||
        permissions.includes('control.manage') ||
        permissions.includes('risk.manage')
    ) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Super admin access required',
    });
};

module.exports = {
    getRequestPermissions,
    hasAdminPermission,
    requireAdminPermission,
    requireSuperAdmin,
};
