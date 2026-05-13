const parsePermissions = (value) =>
    String(value || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

const getRole = (req) => String(req.user?.role || req.headers['x-user-role'] || '').trim();

const getPermissions = (req) => {
    const fromUser = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const fromHeaders = parsePermissions(req.headers['x-user-permissions']);
    return [...new Set([...fromUser, ...fromHeaders])];
};

const hasDesignPermission = (req, requested) => {
    const role = getRole(req);
    if (['admin', 'super_admin'].includes(role)) return true;

    const permissions = getPermissions(req);
    if (permissions.includes('*') || permissions.includes('design') || permissions.includes(requested)) {
        return true;
    }

    const [domain] = String(requested || '').split('.');
    return permissions.includes('design.*') || permissions.includes(`${domain}.*`);
};

const adminOnly = (req, res, next) => {
    const role = getRole(req);
    const permissions = getPermissions(req);
    const isDesignStaff =
        role === 'staff' &&
        permissions.some(
            (permission) =>
                permission === 'design' ||
                permission === 'design.*' ||
                permission.startsWith('design.')
        );

    if (!role || (!['admin', 'super_admin'].includes(role) && !isDesignStaff)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    next();
};

const requireDesignPermission =
    (...permissions) =>
    (req, res, next) => {
        if (permissions.some((permission) => hasDesignPermission(req, permission))) return next();
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to manage design templates',
        });
    };

module.exports = {
    adminOnly,
    requireDesignPermission,
};
