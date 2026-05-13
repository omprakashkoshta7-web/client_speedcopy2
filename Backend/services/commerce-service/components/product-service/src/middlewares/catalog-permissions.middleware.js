const parsePermissions = (value) =>
    String(value || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

const getCatalogPermissions = (req) => {
    const fromUser = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const fromHeaders = parsePermissions(req.headers['x-user-permissions']);
    return [...new Set([...fromUser, ...fromHeaders])];
};

const hasCatalogPermission = (req, requested) => {
    const role = String(req.user?.role || req.headers['x-user-role'] || '').trim().toLowerCase();
    if (['admin', 'super_admin'].includes(role)) return true;

    const permissions = getCatalogPermissions(req);
    if (permissions.includes('catalog') || permissions.includes('*') || permissions.includes(requested)) {
        return true;
    }

    const [domain] = String(requested || '').split('.');
    return permissions.includes('catalog.*') || permissions.includes(`${domain}.*`);
};

const requireCatalogPermission =
    (...permissions) =>
    (req, res, next) => {
        const allowed = permissions.some((permission) => hasCatalogPermission(req, permission));
        if (allowed) return next();

        return res.status(403).json({
            success: false,
            message: 'You do not have permission to manage the catalog',
        });
    };

module.exports = {
    getCatalogPermissions,
    hasCatalogPermission,
    requireCatalogPermission,
};
