const parseCsv = (value) =>
    String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

const getVendorPortalRole = (req) =>
    String(req.headers['x-user-portal-role'] || 'Owner')
        .trim()
        .toLowerCase();

const getVendorPermissions = (req) => {
    const permissions = parseCsv(req.headers['x-user-permissions']);
    if (permissions.includes('*')) return permissions;

    const portalRole = getVendorPortalRole(req);
    if (portalRole === 'owner') return ['*', ...permissions];
    return permissions;
};

const hasPermission = (req, requested) => {
    const permissions = getVendorPermissions(req);
    if (permissions.includes('*')) return true;
    if (permissions.includes(requested)) return true;

    const [domain] = String(requested || '').split('.');
    return permissions.includes(`${domain}.*`);
};

const vendorPermission =
    (...requiredPermissions) =>
    (req, res, next) => {
        const role = req.headers['x-user-role'];
        if (['admin', 'super_admin'].includes(String(role || '').trim())) return next();

        const allowed = requiredPermissions.some((permission) => hasPermission(req, permission));
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this vendor action',
            });
        }

        next();
    };

const vendorPortalRole =
    (...allowedRoles) =>
    (req, res, next) => {
        const role = req.headers['x-user-role'];
        if (['admin', 'super_admin'].includes(String(role || '').trim())) return next();

        const portalRole = getVendorPortalRole(req);
        if (allowedRoles.map((value) => String(value).trim().toLowerCase()).includes(portalRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Your vendor role cannot perform this action',
        });
    };

module.exports = {
    getVendorPortalRole,
    getVendorPermissions,
    vendorPermission,
    vendorPortalRole,
};
