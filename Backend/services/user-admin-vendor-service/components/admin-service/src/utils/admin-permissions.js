const { normalizePermissions } = require('./permission-aliases');

const ADMIN_ROLE_PERMISSIONS = {
    admin: [
        'profiles.view',
        'profiles.manage',
        'orders.view',
        'orders.manage',
        'vendors.view',
        'vendors.manage',
        'customers.view',
        'customers.manage',
        'staff.view',
        'staff.manage',
        'control.view',
        'control.manage',
        'reports.view',
        'reports.export',
        'sla.view',
        'sla.manage',
        'tickets.view',
        'tickets.manage',
        'delivery.view',
        'delivery.manage',
        'coupons.view',
        'coupons.manage',
        'risk.view',
        'risk.manage',
    ],
    super_admin: ['*'],
};

const getAdminPermissions = (role, explicitPermissions = []) => {
    const normalizedRole = String(role || '')
        .trim()
        .toLowerCase()
        .replace('superadmin', 'super_admin');
    const base = ADMIN_ROLE_PERMISSIONS[normalizedRole] || [];
    return [...new Set([...normalizePermissions(explicitPermissions), ...base])];
};

module.exports = {
    ADMIN_ROLE_PERMISSIONS,
    getAdminPermissions,
};
