const uniq = (values = []) => [...new Set(values.filter(Boolean))];

const PERMISSION_ALIAS_MAP = {
    'orders:read': ['orders.view'],
    'orders:write': ['orders.manage'],
    'orders.management': ['orders.view', 'orders.manage'],
    'orders.full_control': ['orders.*'],
    'vendors:read': ['vendors.view'],
    'vendors:write': ['vendors.manage'],
    'vendors.control': ['vendors.view', 'vendors.manage'],
    'vendors.full_control': ['vendors.*'],
    'customers:read': ['customers.view'],
    'customers:write': ['customers.manage'],
    'customers.management': ['customers.view', 'customers.manage'],
    'customers.full_control': ['customers.*'],
    'finance:read': ['reports.view', 'refunds.view', 'wallet.view', 'payouts.view'],
    'finance:write': [
        'reports.view',
        'reports.export',
        'refunds.approve',
        'wallet.credit',
        'wallet.debit',
        'payouts.issue_ticket',
    ],
    'finance.full_access': [
        'reports.view',
        'reports.export',
        'refunds.view',
        'refunds.approve',
        'wallet.view',
        'wallet.credit',
        'wallet.debit',
        'payouts.view',
        'payouts.issue_ticket',
    ],
    'refunds:read': ['refunds.view'],
    'refunds:write': ['refunds.approve', 'refunds.escalate'],
    'wallet:read': ['wallet.view'],
    'wallet:write': ['wallet.credit', 'wallet.debit'],
    'ledger:read': ['wallet.view'],
    'ledger:write': ['wallet.credit', 'wallet.debit'],
    'payouts:read': ['payouts.view'],
    'payouts:write': ['payouts.issue_ticket'],
    view_payouts: ['payouts.view'],
    issue_payout_ticket: ['payouts.issue_ticket'],
    view_wallet: ['wallet.view'],
    credit_wallet: ['wallet.credit'],
    debit_wallet: ['wallet.debit'],
    view_refunds: ['refunds.view'],
    approve_refund: ['refunds.approve'],
    'reports:read': ['reports.view'],
    'reports.basic': ['reports.view'],
    'reports.operational': ['reports.view'],
    'reports.all': ['reports.view', 'reports.export'],
    'support:read': ['tickets.view'],
    'support:write': ['tickets.manage'],
    'support.tickets': ['tickets.view'],
    'support.escalation': ['tickets.view', 'tickets.manage'],
    'sla.management': ['sla.view', 'sla.manage'],
    'delivery.control': ['delivery.view', 'delivery.manage'],
    'staff.management': ['staff.view', 'staff.manage'],
    'platform.config': ['control.view', 'control.manage'],
    'system.feature_flags': ['control.view', 'control.manage'],
    'system.kill_switch': ['control.view', 'control.manage'],
    'audit.full_access': ['reports.view', 'reports.export', 'risk.view', 'risk.manage'],
};

const normalizePermissionToken = (permission) =>
    String(permission || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');

const expandPermissionAlias = (permission) => {
    const token = normalizePermissionToken(permission);
    if (!token) return [];

    if (token === '*') return ['*'];

    const direct = PERMISSION_ALIAS_MAP[token];
    if (direct) return direct;

    const dotToken = token.replace(/:/g, '.');
    if (PERMISSION_ALIAS_MAP[dotToken]) {
        return PERMISSION_ALIAS_MAP[dotToken];
    }

    const [domain, action] = dotToken.split('.');
    if (domain && action === 'read') return [`${domain}.view`];
    if (domain && action === 'write') return [`${domain}.manage`];

    return [dotToken];
};

const normalizePermissions = (permissions = []) =>
    uniq(
        (Array.isArray(permissions) ? permissions : [])
            .flatMap((permission) => expandPermissionAlias(permission))
            .map((permission) => String(permission || '').trim())
    );

const normalizeScope = (scope) =>
    String(scope || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

const normalizeScopes = (scopes = []) => uniq((Array.isArray(scopes) ? scopes : []).map(normalizeScope));

const TEAM_ALIAS_MAP = {
    ops: 'ops',
    operations: 'ops',
    support: 'support',
    finance: 'finance',
    marketing: 'marketing',
    moderator: 'support',
};

const canonicalTeam = (team, fallback = 'ops') =>
    TEAM_ALIAS_MAP[String(team || '').trim().toLowerCase()] || fallback;

const getStaffRoleLabel = ({ role, team, roleLabel } = {}) => {
    if (roleLabel) return roleLabel;

    const normalizedRole = String(role || '').trim().toLowerCase();
    const normalizedTeam = canonicalTeam(team, '');

    if (normalizedRole === 'super_admin') return 'SuperAdmin';
    if (normalizedRole === 'admin') return 'Admin';
    if (normalizedTeam === 'support') return 'Support';
    if (normalizedTeam === 'finance') return 'Finance';
    if (normalizedTeam === 'marketing') return 'Marketing';
    return 'Operations';
};

const normalizeStaffAssignment = ({ role, team, permissions = [], scopes = [] } = {}) => {
    const requestedRole = String(role || '').trim().toLowerCase();
    const resolvedTeam = canonicalTeam(team || role, 'ops');

    let authRole = 'staff';
    if (requestedRole === 'superadmin' || requestedRole === 'super_admin') {
        authRole = 'super_admin';
    } else if (requestedRole === 'admin') {
        authRole = 'admin';
    }

    const roleLabel =
        requestedRole === 'superadmin' || requestedRole === 'super_admin'
            ? 'SuperAdmin'
            : requestedRole === 'admin'
              ? 'Admin'
              : requestedRole === 'moderator'
                ? 'Moderator'
                : getStaffRoleLabel({ role: authRole, team: resolvedTeam });

    return {
        authRole,
        team: resolvedTeam,
        roleLabel,
        permissions: normalizePermissions(permissions),
        scopes: normalizeScopes(scopes),
    };
};

module.exports = {
    expandPermissionAlias,
    normalizePermissions,
    normalizeScopes,
    canonicalTeam,
    getStaffRoleLabel,
    normalizeStaffAssignment,
};
