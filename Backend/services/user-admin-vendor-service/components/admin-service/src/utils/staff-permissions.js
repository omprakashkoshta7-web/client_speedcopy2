const { normalizePermissions } = require('./permission-aliases');

const STAFF_ROLE_PERMISSIONS = {
    ops: [
        'orders.view',
        'orders.assign',
        'orders.clarify',
        'tasks.view',
        'tasks.assign',
        'tickets.view',
    ],
    support: [
        'tickets.view',
        'tickets.reply',
        'tickets.close',
        'tickets.escalate',
        'tasks.view',
    ],
    finance: [
        'tasks.view',
        'tickets.view',
        'tickets.reply',
        'tickets.close',
        'tickets.escalate',
        'refunds.view',
        'refunds.approve',
        'refunds.escalate',
        'wallet.credit',
        'wallet.debit',
        'wallet.view',
        'payouts.view',
        'payouts.issue_ticket',
    ],
    marketing: [
        'tasks.view',
        'tickets.view',
        'tickets.reply',
        'campaigns.view',
        'coupons.view',
        'coupons.create',
        'targeting.create',
        'analytics.view',
    ],
    admin: [
        'orders.*',
        'tickets.*',
        'refunds.*',
        'wallet.*',
        'payouts.*',
        'roles.assign',
        'audit.view',
        'system.view',
        'system.lock',
        'campaigns.*',
        'profiles.*',
        'tasks.*',
    ],
};

const getRolePermissions = (role, explicitPermissions = []) => {
    const base = STAFF_ROLE_PERMISSIONS[String(role || '').trim()] || [];
    return [...new Set([...normalizePermissions(explicitPermissions), ...base])];
};

module.exports = {
    STAFF_ROLE_PERMISSIONS,
    getRolePermissions,
};
