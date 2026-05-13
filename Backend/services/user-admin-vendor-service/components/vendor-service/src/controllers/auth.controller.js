const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const { requireSecret } = require('../../../../../../shared/utils/env');
const VendorStaff = require('../models/vendor-staff.model');
const VendorOrg = require('../models/vendor-org.model');
const config = require('../config');
const { uniqueStrings, normalizeString } = require('../utils/vendor-scope');

const buildVendorPermissions = ({ linkedStaff, portalRole }) => {
    const normalizedRole = String(portalRole || 'Owner').trim().toLowerCase();
    const baseSupport = ['support.read', 'support.create', 'support.reply'];
    const baseRead = ['org.read', 'stores.read', 'orders.read', 'scoring.read'];

    if (normalizedRole === 'owner') {
        return ['*'];
    }

    if (normalizedRole === 'manager') {
        return [
            ...baseSupport,
            ...baseRead,
            'org.update',
            'legal.read',
            'legal.update',
            'stores.create',
            'stores.update',
            'stores.delete',
            'stores.manage_status',
            'stores.manage_capacity',
            'stores.manage_availability',
            'staff.read',
            'staff.create',
            'staff.update',
            'staff.assign',
            'orders.accept',
            'orders.reject',
            'orders.start_production',
            'orders.qc',
            'orders.ready',
            'analytics.read',
            ...(linkedStaff?.isFinancialAccessEnabled ? ['finance.read'] : []),
            'view_all',
            'view_assigned',
            'staff_management',
            'store_management',
        ];
    }

    if (normalizedRole === 'qc') {
        return [
            ...baseSupport,
            ...baseRead,
            'orders.qc',
            'orders.ready',
            'view_assigned',
        ];
    }

    return [
        ...baseSupport,
        ...baseRead,
        'orders.accept',
        'orders.reject',
        'orders.start_production',
        'view_assigned',
    ];
};

const getAuthConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;
    if (!config.authDbUri) {
        throw new Error('AUTH_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.authDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return sendError(res, 'Email and password required', 400);

        const conn = await getAuthConn();
        const normalizedEmail = email.toLowerCase();
        const user = await conn.db.collection('users').findOne({ email: normalizedEmail });

        if (!user || user.role !== 'vendor') {
            return sendError(res, 'Invalid vendor credentials', 401);
        }

        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) return sendError(res, 'Invalid vendor credentials', 401);

        if (!user.isActive) return sendError(res, 'Vendor account deactivated', 403);

        const linkedStaff = await VendorStaff.findOne({
            authUserId: user._id.toString(),
            deletedAt: null,
            isActive: true,
        }).lean();

        const authUserId = user._id.toString();
        const linkedVendorId = normalizeString(linkedStaff?.vendorId);
        const vendorOrg =
            (linkedVendorId &&
                (await VendorOrg.findOne({
                    deletedAt: null,
                    $or: [{ userId: linkedVendorId }, { _id: linkedVendorId }],
                }).lean())) ||
            (await VendorOrg.findOne({ userId: authUserId, deletedAt: null }).lean());

        const vendorUserId = normalizeString(linkedVendorId || vendorOrg?.userId || authUserId);
        const vendorOrgId = normalizeString(vendorOrg?._id);
        const vendorAliases = uniqueStrings([vendorUserId, vendorOrgId, authUserId]);
        const portalRole = linkedStaff
            ? linkedStaff.role === 'manager'
                ? 'Manager'
                : linkedStaff.role === 'qc'
                  ? 'QC'
                : 'Staff'
            : 'Owner';
        const permissions = buildVendorPermissions({ linkedStaff, portalRole });
        const storeScope = linkedStaff?.assignedStoreIds?.length
            ? linkedStaff.assignedStoreIds
            : linkedStaff?.storeId
              ? [linkedStaff.storeId]
              : [];

        const token = jwt.sign(
            {
                id: vendorUserId,
                role: user.role,
                email: user.email,
                vendorUserId,
                vendorOrgId,
                vendorAliases,
                portalRole,
                permissions,
                storeScope,
            },
            requireSecret('JWT_SECRET', 'speedcopy-dev-secret'),
            { expiresIn: '7d' }
        );

        delete user.password;

        return sendSuccess(res, {
            user: {
                ...user,
                portalRole,
                permissions,
                storeScope,
                staffId: linkedStaff?._id?.toString() || null,
                vendorUserId,
                vendorOrgId,
            },
            token,
            mfaRequired: false,
        });
    } catch (err) {
        next(err);
    }
};

const verifyMfa = async (req, res, next) => {
    try {
        const { otp } = req.body;
        if (!otp) return sendError(res, 'OTP required', 400);
        return sendSuccess(res, { verified: true }, 'MFA Verified');
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};

const getSession = async (req, res, next) => {
    try {
        const vendorUserId = normalizeString(
            req.headers['x-vendor-user-id'] || req.headers['x-user-id']
        );
        const vendorOrgId = normalizeString(req.headers['x-vendor-org-id']);
        const sessionEmail = req.headers['x-user-email'];
        const conn = await getAuthConn();
        const vendorOrg =
            (vendorOrgId &&
                mongoose.Types.ObjectId.isValid(vendorOrgId) &&
                (await VendorOrg.findOne({ _id: vendorOrgId, deletedAt: null }).lean())) ||
            (await VendorOrg.findOne({ userId: vendorUserId, deletedAt: null }).lean());
        const linkedStaff = sessionEmail
            ? await VendorStaff.findOne({
                  vendorId: { $in: uniqueStrings([vendorUserId, vendorOrgId]) },
                  email: String(sessionEmail).toLowerCase(),
                  deletedAt: null,
              }).lean()
            : null;

        const userQuery = linkedStaff?.authUserId
            ? { _id: new mongoose.Types.ObjectId(linkedStaff.authUserId) }
            : vendorOrg?.userId
              ? { _id: new mongoose.Types.ObjectId(vendorOrg.userId) }
              : { _id: new mongoose.Types.ObjectId(vendorUserId) };
        const user = await conn.db.collection('users').findOne(userQuery);

        if (!user) return sendError(res, 'Session invalid', 401);
        delete user.password;

        return sendSuccess(res, {
            ...user,
            vendorOrgId: normalizeString(vendorOrg?._id || vendorOrgId),
            vendorUserId: normalizeString(vendorOrg?.userId || vendorUserId),
            portalRole: linkedStaff
                ? linkedStaff.role === 'manager'
                    ? 'Manager'
                    : linkedStaff.role === 'qc'
                      ? 'QC'
                    : 'Staff'
                : 'Owner',
            storeScope: linkedStaff?.assignedStoreIds?.length
                ? linkedStaff.assignedStoreIds
                : linkedStaff?.storeId
                  ? [linkedStaff.storeId]
                  : [],
            permissions: buildVendorPermissions({
                linkedStaff,
                portalRole: linkedStaff
                    ? linkedStaff.role === 'manager'
                        ? 'Manager'
                        : linkedStaff.role === 'qc'
                          ? 'QC'
                          : 'Staff'
                    : 'Owner',
            }),
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    login,
    verifyMfa,
    logout,
    getSession,
};
