const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendCreated } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const AuditLog = require('../models/audit-log.model');
const Staff = require('../models/staff.model');
const SystemState = require('../models/system-state.model');
const staffAuthService = require('../services/staff-auth.service');
const config = require('../config');
const { getRolePermissions } = require('../utils/staff-permissions');

const OPS_AUDIENCE_ROLES = ['admin', 'ops', 'support', 'finance', 'marketing'];
const STAFF_PROFILE_ROLES = ['ops', 'support', 'finance', 'marketing', 'admin'];
const STAFF_ROLE_LABELS = {
    ops: 'Operations Staff',
    support: 'Support Staff',
    finance: 'Finance Staff',
    marketing: 'Marketing Staff',
    admin: 'Admin Staff',
};
const ORDER_STATUS_LABELS = {
    pending: 'Pending Assignment',
    confirmed: 'Confirmed',
    assigned_vendor: 'Assigned to Vendor',
    vendor_accepted: 'Vendor Accepted',
    in_production: 'In Production',
    qc_pending: 'QC Review',
    ready_for_pickup: 'Ready for Pickup',
    delivery_assigned: 'Delivery Assigned',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
};
const TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'refunded']);
const dbConnectionCache = new Map();

const emitNotification = async (payload) => {
    if (!config.notificationServiceUrl || !config.internalServiceToken) return;

    await fetch(`${config.notificationServiceUrl}/api/notifications/internal`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.internalServiceToken,
        },
        body: JSON.stringify({
            type: 'in_app',
            category: 'system',
            status: 'sent',
            ...payload,
        }),
    }).catch(() => null);
};

const getDbConn = async (name) => {
    const dbUri = config.getDbUri(name);
    const dbName = config.dbNames[name] || dbUri.split('/').pop()?.split('?')[0];
    const existing = mongoose.connections.find(
        (c) => c.name === dbName && (c.readyState === 1 || c.readyState === 2)
    );
    if (existing) {
        if (existing.readyState === 1) return existing;
        if (dbConnectionCache.has(dbName)) return dbConnectionCache.get(dbName);
    }

    if (!dbConnectionCache.has(dbName)) {
        const connectionPromise = mongoose
            .createConnection(dbUri, {
                family: 4,
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                retryWrites: true,
                retryReads: true,
            })
            .asPromise()
            .then((connection) => {
                dbConnectionCache.set(dbName, Promise.resolve(connection));
                return connection;
            })
            .catch((error) => {
                dbConnectionCache.delete(dbName);
                throw error;
            });

        dbConnectionCache.set(dbName, connectionPromise);
    }

    return dbConnectionCache.get(dbName);
};

const getOrderConn = () => getDbConn('order');
const getVendorConn = () => getDbConn('vendor');
const getNotificationConn = () => getDbConn('notification');
const getFinanceConn = () => getDbConn('finance');

const getAdminCollection = (name) => {
    if (!mongoose.connection?.db) {
        throw new Error('Admin database connection is not initialized');
    }

    return mongoose.connection.db.collection(name);
};

const getActor = (req) => ({
    userId: String(req.headers['x-user-id'] || '').trim(),
    role: String(req.headers['x-user-role'] || 'staff').trim(),
    email: String(req.headers['x-user-email'] || '').trim(),
});

const unwrapModifyResult = (result) => {
    if (!result) return null;
    if (Object.prototype.hasOwnProperty.call(result, 'value')) return result.value;
    return result;
};

const maskPassword = (staff) => {
    if (!staff) return null;
    const { password, ...safe } = staff.toObject ? staff.toObject() : staff;
    return safe;
};

const toObjectId = (value) =>
    mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const formatFlowType = (value = '') => {
    const text = String(value || 'general');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatRoleLabel = (role = '') =>
    STAFF_ROLE_LABELS[String(role || '').trim()] || formatFlowType(role);

const getRisk = (createdAt, status) => {
    if (!createdAt || TERMINAL_STATUSES.has(status)) return 'normal';

    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours >= 24) return 'critical';
    if (ageHours >= 6) return 'warning';
    return 'normal';
};

const getSlaLabel = (risk, status) => {
    if (TERMINAL_STATUSES.has(status)) return 'Done';
    if (risk === 'critical') return 'Breach Risk';
    if (risk === 'warning') return 'Monitor';
    return 'On Track';
};

const normalizeQueueOrder = (order) => {
    const status = String(order?.status || 'pending');
    const risk = getRisk(order?.createdAt, status);
    const firstItem = Array.isArray(order?.items) && order.items.length ? order.items[0] : null;
    const orderId = String(order?._id || '');
    const displayId = String(order?.orderNumber || orderId);

    return {
        _id: orderId,
        id: orderId,
        orderId: displayId,
        orderNumber: order?.orderNumber || '',
        displayId,
        mongoId: orderId,
        type: formatFlowType(firstItem?.flowType),
        vendor: order?._vendorDisplayName || order?.vendorName || order?.vendorId || order?.storeId || 'Unassigned',
        status: ORDER_STATUS_LABELS[status] || formatFlowType(status.replace(/_/g, ' ')),
        sla: getSlaLabel(risk, status),
        risk,
        customer: order?.shippingAddress?.fullName || order?.userId || 'Customer',
        rawStatus: status,
        customerId: String(order?.userId || ''),
        amount: Number(order?.total || 0),
    };
};

const sendPlaceholder =
    (name, statusCode = 200) =>
    (req, res) =>
        sendSuccess(
            res,
            {
                endpoint: name,
                params: req.params,
                query: req.query,
                body: req.body,
            },
            `${name} is available`,
            statusCode
        );

const formatRelativeAge = (value) => {
    if (!value) return '';
    const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};

const formatDisplayDate = (value) =>
    new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));

const formatMonthYear = (value) =>
    new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const formatMoneySigned = (amount, type) => {
    const sign = type === 'debit' ? '-' : '+';
    return `${sign}\u20B9${Number(amount || 0)}`;
};

const getClientIp = (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip =
        forwarded
        || req.headers['x-real-ip']
        || req.ip
        || req.connection?.remoteAddress
        || '';
    return String(ip).replace('::ffff:', '').trim() || 'Unknown';
};

const getLocationLabel = (req) =>
    String(req.headers['x-location'] || req.headers['x-user-location'] || 'Unknown').trim()
    || 'Unknown';

const detectBrowser = (userAgent) => {
    const agent = String(userAgent || '').toLowerCase();
    if (agent.includes('edg/')) return 'Edge';
    if (agent.includes('chrome/')) return 'Chrome';
    if (agent.includes('firefox/')) return 'Firefox';
    if (agent.includes('safari/') && !agent.includes('chrome/')) return 'Safari';
    return 'Browser';
};

const detectOs = (userAgent) => {
    const agent = String(userAgent || '').toLowerCase();
    if (agent.includes('windows')) return 'Windows';
    if (agent.includes('android')) return 'Android';
    if (agent.includes('iphone') || agent.includes('ipad') || agent.includes('ios')) return 'iOS';
    if (agent.includes('mac')) return 'macOS';
    if (agent.includes('linux')) return 'Linux';
    return 'Device';
};

const getDeviceLabel = (req) => {
    const userAgent = String(req.headers['user-agent'] || '');
    return `${detectBrowser(userAgent)} on ${detectOs(userAgent)}`;
};

const buildSessionFingerprint = (req, userId) =>
    crypto
        .createHash('sha1')
        .update(
            [
                userId,
                String(req.headers['user-agent'] || ''),
                getClientIp(req),
                String(req.headers['x-session-id'] || ''),
            ].join('|')
        )
        .digest('hex');

const mapSession = (session, currentSessionId) => ({
    id: session.sessionId,
    device: session.device || 'Unknown device',
    ip: session.ip || 'Unknown',
    location: session.location || 'Unknown',
    lastActive: session.lastActive,
    createdAt: session.createdAt,
    current: session.sessionId === currentSessionId,
});

const resolveStaffActor = async (req) => {
    const actor = getActor(req);
    if (actor.userId && mongoose.Types.ObjectId.isValid(actor.userId)) {
        const byId = await Staff.findById(actor.userId);
        if (byId) return byId;
    }

    if (actor.email) {
        const byEmail = await Staff.findOne({ email: actor.email.toLowerCase() });
        if (byEmail) return byEmail;
    }

    return null;
};

const mapStaffProfile = (staff) => ({
    id: String(staff._id),
    fullName: staff.name || '',
    emailAddress: staff.email || '',
    role: staff.role || 'ops',
    roleLabel: formatRoleLabel(staff.role),
    team: staff.role || 'ops',
    accessLevel: staff.role === 'admin' ? 'Admin' : 'Staff',
    permissions: getRolePermissions(staff.role, staff.permissions),
    memberSince: staff.metadata?.joinDate || staff.createdAt || null,
    lastLogin: staff.lastLogin || null,
    status: staff.status || 'active',
    mfaEnabled: Boolean(staff.mfaEnabled),
    department: staff.metadata?.department || '',
    manager: staff.metadata?.manager || '',
    createdAt: staff.createdAt || null,
    updatedAt: staff.updatedAt || null,
});

const buildStaffProfileUpdate = (body = {}, { allowRole = false, allowStatus = false } = {}) => {
    const update = { updatedAt: new Date() };

    if (body.fullName !== undefined || body.name !== undefined) {
        update.name = String(body.fullName ?? body.name ?? '').trim();
    }

    if (body.emailAddress !== undefined || body.email !== undefined) {
        update.email = String(body.emailAddress ?? body.email ?? '')
            .trim()
            .toLowerCase();
    }

    if (body.permissions !== undefined) {
        update.permissions = Array.isArray(body.permissions) ? body.permissions : [];
    }

    if (body.mfaEnabled !== undefined) {
        update.mfaEnabled = Boolean(body.mfaEnabled);
    }

    if (allowRole && body.role !== undefined) {
        update.role = String(body.role || '').trim();
    }

    if (allowStatus && body.status !== undefined) {
        update.status = String(body.status || '').trim();
    }

    if (
        body.department !== undefined ||
        body.manager !== undefined ||
        body.memberSince !== undefined ||
        body.joinDate !== undefined
    ) {
        if (body.department !== undefined) update['metadata.department'] = String(body.department || '').trim();
        if (body.manager !== undefined) update['metadata.manager'] = String(body.manager || '').trim();
        if (body.memberSince !== undefined || body.joinDate !== undefined) {
            const dateValue = body.memberSince ?? body.joinDate;
            update['metadata.joinDate'] = dateValue ? new Date(dateValue) : null;
        }
    }

    if (body.password !== undefined) {
        update.password = String(body.password || '');
    }

    return update;
};

const upsertCurrentSession = async (req) => {
    const actor = getActor(req);
    if (!actor.userId) return null;

    const now = new Date();
    const sessions = getAdminCollection('staffsessions');
    const fingerprint = buildSessionFingerprint(req, actor.userId);
    const existing = await sessions.findOne({
        userId: actor.userId,
        fingerprint,
        isActive: true,
    });

    const payload = {
        userId: actor.userId,
        email: actor.email,
        role: actor.role,
        fingerprint,
        device: getDeviceLabel(req),
        ip: getClientIp(req),
        location: getLocationLabel(req),
        lastActive: now,
        updatedAt: now,
        isActive: true,
    };

    if (existing) {
        await sessions.updateOne({ _id: existing._id }, { $set: payload });
        return { ...existing, ...payload };
    }

    const session = {
        sessionId: `session_${crypto.randomBytes(8).toString('hex')}`,
        createdAt: now,
        ...payload,
    };
    await sessions.insertOne(session);
    return session;
};

const auditAction = async (req, action, targetType, targetId, metadata = {}, reason = '') => {
    const actor = getActor(req);
    if (!actor.userId) return;

    await AuditLog.create({
        actorId: actor.userId,
        actorRole: actor.role || 'staff',
        action,
        targetType,
        targetId,
        reason,
        metadata,
    }).catch(() => null);
};

const buildCustomerTicketFilter = (req) => {
    const actor = getActor(req);
    const filter = {
        $or: [{ createdForRole: 'user' }, { visibilityScope: 'customer' }],
    };

    if (req.query.status) filter.status = String(req.query.status).trim();
    if (req.query.priority) filter.priority = String(req.query.priority).trim();
    if (req.query.assignedTo) {
        filter.assignedTo = String(req.query.assignedTo).trim();
    } else if (['support', 'finance', 'marketing'].includes(actor.role) && actor.userId) {
        filter.assignedTo = actor.userId;
    }
    if (req.query.search) {
        const pattern = new RegExp(String(req.query.search).trim(), 'i');
        filter.$and = [
            {
                $or: [{ subject: pattern }, { description: pattern }, { orderId: pattern }],
            },
        ];
    }

    return filter;
};

const normalizeTicket = (ticket) => ({
    ...ticket,
    _id: String(ticket._id),
    userId: String(ticket.userId || ''),
    orderId: ticket.orderId || null,
    assignedTo: ticket.assignedTo || '',
    replies: Array.isArray(ticket.replies)
        ? ticket.replies.map((reply) => ({
              authorId: reply.authorId || reply.sender || '',
              authorRole: reply.authorRole || reply.sender || 'user',
              message: reply.message || '',
              attachments: Array.isArray(reply.attachments) ? reply.attachments : [],
              createdAt: reply.createdAt || reply.updatedAt || ticket.updatedAt || ticket.createdAt,
          }))
        : [],
});

const buildVendorNameMap = async (vendorIds = []) => {
    const ids = [...new Set(vendorIds.filter(Boolean).map((value) => String(value).trim()))];
    if (!ids.length) return new Map();

    const conn = await getVendorConn();
    const objectIds = ids
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));
    const vendors = await conn.db
        .collection('vendororgs')
        .find({
            $or: [
                { userId: { $in: ids } },
                ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
            ],
        })
        .project({ userId: 1, name: 1, businessName: 1 })
        .toArray();

    const vendorMap = new Map();
    vendors.forEach((vendor) => {
        const label = vendor.name || vendor.businessName || 'Vendor';
        vendorMap.set(String(vendor.userId), label);
        vendorMap.set(String(vendor._id), label);
    });
    return vendorMap;
};

const isAssignedTicketRole = (role = '') => ['support', 'finance', 'marketing'].includes(String(role).trim());

const getTicketCollection = async () => {
    const conn = await getNotificationConn();
    return conn.db.collection('tickets');
};

const getFinanceCollections = async () => {
    const conn = await getFinanceConn();
    return {
        conn,
        wallets: conn.db.collection('wallets'),
        ledgers: conn.db.collection('ledgers'),
        payouts: conn.db.collection('payouts'),
    };
};

const getOrCreateWalletRaw = async (wallets, userId, userType = 'customer') => {
    let wallet = await wallets.findOne({ userId });
    if (wallet) return wallet;

    const now = new Date();
    const doc = {
        userId,
        userType,
        balance: 0,
        currency: 'INR',
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };
    const result = await wallets.insertOne(doc);
    return { ...doc, _id: result.insertedId };
};

const transactWalletRaw = async (
    wallets,
    ledgers,
    userId,
    {
        type,
        category,
        amount,
        referenceId = '',
        referenceType = '',
        description = '',
        metadata = {},
        userType = 'customer',
    }
) => {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw Object.assign(new Error('amount must be greater than 0'), { statusCode: 400 });
    }

    const wallet = await getOrCreateWalletRaw(wallets, userId, userType);
    const balanceBefore = Number(wallet.balance || 0);
    const balanceAfter =
        type === 'debit' ? balanceBefore - normalizedAmount : balanceBefore + normalizedAmount;

    if (type === 'debit' && balanceAfter < 0) {
        throw Object.assign(new Error('Insufficient wallet balance'), { statusCode: 400 });
    }

    const now = new Date();
    await wallets.updateOne(
        { _id: wallet._id },
        {
            $set: {
                balance: balanceAfter,
                updatedAt: now,
            },
        }
    );

    const ledgerDoc = {
        walletId: wallet._id,
        userId,
        type,
        category,
        amount: normalizedAmount,
        balanceBefore,
        balanceAfter,
        referenceId,
        referenceType,
        description,
        metadata,
        createdAt: now,
        updatedAt: now,
    };
    const result = await ledgers.insertOne(ledgerDoc);

    return {
        walletId: String(wallet._id),
        entryId: String(result.insertedId),
        newBalance: balanceAfter,
    };
};

const getOrderNumberMap = async (referenceIds = []) => {
    const objectIds = referenceIds.map(toObjectId).filter(Boolean);
    if (!objectIds.length) return new Map();

    const conn = await getOrderConn();
    const orders = await conn.db
        .collection('orders')
        .find({ _id: { $in: objectIds } })
        .project({ orderNumber: 1 })
        .toArray();

    return new Map(orders.map((order) => [String(order._id), order.orderNumber || String(order._id)]));
};

const bootstrapRefundQueue = async () => {
    const refunds = getAdminCollection('staffrefundrequests');
    const conn = await getOrderConn();
    const candidateOrders = await conn.db
        .collection('orders')
        .find({
            status: 'cancelled',
            paymentStatus: 'paid',
        })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();

    for (const order of candidateOrders) {
        const existing = await refunds.findOne({ orderId: String(order._id) });
        if (existing) continue;

        const cancellationNote =
            Array.isArray(order.timeline)
            && order.timeline.find((entry) => entry.status === 'cancelled')?.note;
        await refunds.insertOne({
            orderId: String(order._id),
            orderNumber: order.orderNumber || String(order._id),
            customerId: String(order.userId || ''),
            customerName: order.shippingAddress?.fullName || 'Customer',
            amount: Number(order.total || 0),
            reason: cancellationNote || 'Refund review required',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
};

const bootstrapPayoutQueue = async () => {
    const { payouts } = await getFinanceCollections();
    const orderConn = await getOrderConn();

    const [existingPayouts, deliveredOrders] = await Promise.all([
        payouts
            .find({}, { projection: { vendorId: 1, orderIds: 1 } })
            .sort({ createdAt: -1 })
            .limit(500)
            .toArray(),
        orderConn.db
            .collection('orders')
            .find({
                status: 'delivered',
                vendorId: { $exists: true, $nin: [null, ''] },
                vendorPayout: { $gt: 0 },
            })
            .sort({ updatedAt: -1 })
            .limit(500)
            .toArray(),
    ]);

    const payoutOrderIds = new Set(
        existingPayouts.flatMap((payout) =>
            Array.isArray(payout.orderIds) ? payout.orderIds.map((id) => String(id)) : []
        )
    );

    const grouped = new Map();

    for (const order of deliveredOrders) {
        const orderId = String(order._id);
        if (payoutOrderIds.has(orderId)) continue;

        const vendorId = String(order.vendorId || '').trim();
        if (!vendorId) continue;

        if (!grouped.has(vendorId)) {
            grouped.set(vendorId, {
                amount: 0,
                orderIds: [],
                periodStart: order.deliveredAt || order.updatedAt || order.createdAt || new Date(),
                periodEnd: order.deliveredAt || order.updatedAt || order.createdAt || new Date(),
            });
        }

        const bucket = grouped.get(vendorId);
        const eventDate = order.deliveredAt || order.updatedAt || order.createdAt || new Date();
        bucket.amount += Number(order.vendorPayout || 0);
        bucket.orderIds.push(orderId);
        if (eventDate < bucket.periodStart) bucket.periodStart = eventDate;
        if (eventDate > bucket.periodEnd) bucket.periodEnd = eventDate;
    }

    for (const [vendorId, bucket] of grouped.entries()) {
        const amount = roundMoney(bucket.amount);
        if (amount <= 0 || !bucket.orderIds.length) continue;

        await payouts.insertOne({
            vendorId,
            amount,
            platformFee: 0,
            netAmount: amount,
            currency: 'INR',
            status: 'pending',
            orderIds: bucket.orderIds,
            periodStart: bucket.periodStart,
            periodEnd: bucket.periodEnd,
            notes: 'Auto-generated from delivered orders',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
};

const mapRefund = (refund) => ({
    id: String(refund._id),
    order: refund.orderNumber || refund.orderId || '',
    customer: refund.customerName || refund.customerId || 'Customer',
    amount: Number(refund.amount || 0),
    reason: refund.reason || '',
    status: refund.status || 'pending',
});

const mapPayoutStatus = (status) => {
    if (status === 'pending') return 'scheduled';
    if (status === 'failed') return 'issue';
    return status || 'scheduled';
};

const login = async (req, res, next) => {
    try {
        const result = await staffAuthService.login(
            String(req.body?.email || '').trim(),
            String(req.body?.password || ''),
            String(req.body?.role || '').trim()
        );

        if (!result.success) {
            return sendError(res, result.message || 'Login failed', 400);
        }

        return sendSuccess(
            res,
            {
                sessionId: result.sessionId,
                requiresMfa: result.requiresMFA !== false,
                mfaCode: result.mfaCode,
            },
            result.message || 'Login successful'
        );
    } catch (err) {
        next(err);
    }
};

const verifyMfa = async (req, res, next) => {
    try {
        const sessionId = String(req.body?.sessionId || '').trim();
        const code = String(req.body?.code || req.body?.mfaCode || '').trim();
        if (!sessionId || !code) {
            return sendError(res, 'sessionId and code are required', 400);
        }

        const result = await staffAuthService.verifyMFA(sessionId, code);
        if (!result.success) {
            return sendError(res, result.message || 'MFA verification failed', 400);
        }

        req.headers['x-user-id'] = String(result.user?.id || '');
        req.headers['x-user-role'] = String(result.user?.role || 'staff');
        req.headers['x-user-email'] = String(result.user?.email || '');
        const currentSession = await upsertCurrentSession(req);

        return sendSuccess(
            res,
            {
                token: result.token,
                user: result.user,
                session: currentSession
                    ? mapSession(currentSession, currentSession.sessionId)
                    : null,
            },
            result.message || 'MFA verified successfully'
        );
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (actor.userId) {
            const currentSession = await upsertCurrentSession(req);
            if (currentSession) {
                await getAdminCollection('staffsessions').updateOne(
                    { sessionId: currentSession.sessionId },
                    {
                        $set: {
                            isActive: false,
                            killedAt: new Date(),
                            killedBy: actor.userId,
                            updatedAt: new Date(),
                        },
                    }
                );
            }
        }

        return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};

const getSession = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor.userId) return sendError(res, 'User ID not found', 400);

        const currentSession = await upsertCurrentSession(req);
        if (!currentSession) return sendError(res, 'Session not found', 404);

        return sendSuccess(res, mapSession(currentSession, currentSession.sessionId));
    } catch (err) {
        next(err);
    }
};

const getMyProfile = async (req, res, next) => {
    try {
        const staff = await resolveStaffActor(req);
        if (!staff) return sendError(res, 'Staff profile not found', 404);

        return sendSuccess(res, mapStaffProfile(staff));
    } catch (err) {
        next(err);
    }
};

const updateMyProfile = async (req, res, next) => {
    try {
        const staff = await resolveStaffActor(req);
        if (!staff) return sendError(res, 'Staff profile not found', 404);

        const update = buildStaffProfileUpdate(req.body, { allowRole: false, allowStatus: false });
        if (update.name !== undefined && !update.name) {
            return sendError(res, 'Full name is required', 400);
        }
        if (update.email !== undefined && !update.email) {
            return sendError(res, 'Email address is required', 400);
        }

        if (update.email) {
            const existing = await Staff.findOne({
                email: update.email,
                _id: { $ne: staff._id },
            });
            if (existing) return sendError(res, 'A staff user already exists with this email', 409);
        }

        if (update.password !== undefined && !update.password) {
            return sendError(res, 'Password cannot be empty', 400);
        }

        const updated = await Staff.findByIdAndUpdate(
            staff._id,
            { $set: update },
            { new: true, runValidators: true }
        );

        await auditAction(req, 'staff.profile.update_self', 'staff_profile', String(staff._id), {
            updatedFields: Object.keys(update).filter((key) => key !== 'updatedAt'),
        });

        return sendSuccess(res, mapStaffProfile(updated), 'Profile updated');
    } catch (err) {
        next(err);
    }
};

const listProfiles = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const filter = {};
        if (req.query.role) filter.role = String(req.query.role || '').trim();
        if (req.query.status) filter.status = String(req.query.status || '').trim();
        if (req.query.search) {
            const pattern = new RegExp(String(req.query.search || '').trim(), 'i');
            filter.$or = [{ name: pattern }, { email: pattern }];
        }

        const [profiles, total] = await Promise.all([
            Staff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Staff.countDocuments(filter),
        ]);

        return sendSuccess(res, {
            profiles: profiles.map(mapStaffProfile),
            meta: paginateMeta(total, page, limit),
        });
    } catch (err) {
        next(err);
    }
};

const getProfileById = async (req, res, next) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 'Invalid staff profile id', 400);
        }

        const profile = await Staff.findById(id);
        if (!profile) return sendError(res, 'Staff profile not found', 404);

        return sendSuccess(res, mapStaffProfile(profile));
    } catch (err) {
        next(err);
    }
};

const createProfile = async (req, res, next) => {
    try {
        const {
            fullName,
            name,
            emailAddress,
            email,
            password,
            role = 'ops',
            permissions = [],
            mfaEnabled = true,
            status = 'active',
            department = '',
            manager = '',
            memberSince,
            joinDate,
        } = req.body || {};

        const normalizedName = String(fullName ?? name ?? '').trim();
        const normalizedEmail = String(emailAddress ?? email ?? '')
            .trim()
            .toLowerCase();
        const normalizedRole = String(role || 'ops').trim();

        if (!normalizedName || !normalizedEmail || !password) {
            return sendError(res, 'Full name, email address, and password are required', 400);
        }
        if (!STAFF_PROFILE_ROLES.includes(normalizedRole)) {
            return sendError(res, 'Invalid staff role', 400);
        }

        const existing = await Staff.findOne({ email: normalizedEmail });
        if (existing) return sendError(res, 'A staff user already exists with this email', 409);

        const profile = await Staff.create({
            name: normalizedName,
            email: normalizedEmail,
            password: String(password),
            role: normalizedRole,
            permissions: Array.isArray(permissions) ? permissions : [],
            mfaEnabled: Boolean(mfaEnabled),
            status: String(status || 'active').trim() || 'active',
            metadata: {
                department: String(department || '').trim(),
                manager: String(manager || '').trim(),
                joinDate: memberSince || joinDate ? new Date(memberSince || joinDate) : undefined,
            },
        });

        await auditAction(req, 'staff.profile.create', 'staff_profile', String(profile._id), {
            role: profile.role,
        });

        return sendCreated(
            res,
            {
                ...mapStaffProfile(profile),
                loginCredentials: {
                    email: normalizedEmail,
                    password: String(password),
                },
            },
            'Staff profile created'
        );
    } catch (err) {
        next(err);
    }
};

const updateProfileById = async (req, res, next) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 'Invalid staff profile id', 400);
        }

        const update = buildStaffProfileUpdate(req.body, { allowRole: true, allowStatus: true });
        if (update.name !== undefined && !update.name) {
            return sendError(res, 'Full name is required', 400);
        }
        if (update.email !== undefined && !update.email) {
            return sendError(res, 'Email address is required', 400);
        }
        if (update.role !== undefined && !STAFF_PROFILE_ROLES.includes(update.role)) {
            return sendError(res, 'Invalid staff role', 400);
        }

        if (update.email) {
            const existing = await Staff.findOne({
                email: update.email,
                _id: { $ne: new mongoose.Types.ObjectId(id) },
            });
            if (existing) return sendError(res, 'A staff user already exists with this email', 409);
        }

        const updated = await Staff.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        );
        if (!updated) return sendError(res, 'Staff profile not found', 404);

        await auditAction(req, 'staff.profile.update', 'staff_profile', id, {
            updatedFields: Object.keys(update).filter((key) => key !== 'updatedAt'),
        });

        return sendSuccess(res, mapStaffProfile(updated), 'Staff profile updated');
    } catch (err) {
        next(err);
    }
};

const deleteProfileById = async (req, res, next) => {
    try {
        const id = String(req.params.id || '').trim();
        const actor = getActor(req);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 'Invalid staff profile id', 400);
        }
        if (actor.userId && String(actor.userId) === id) {
            return sendError(res, 'You cannot delete your own staff profile', 400);
        }

        const deleted = await Staff.findByIdAndDelete(id);
        if (!deleted) return sendError(res, 'Staff profile not found', 404);

        await auditAction(req, 'staff.profile.delete', 'staff_profile', id);
        return sendSuccess(res, { id }, 'Staff profile deleted');
    } catch (err) {
        next(err);
    }
};

const getSessions = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor.userId) return sendError(res, 'User ID not found', 400);

        const currentSession = await upsertCurrentSession(req);
        const sessions = await getAdminCollection('staffsessions')
            .find({ userId: actor.userId, isActive: true })
            .sort({ lastActive: -1 })
            .toArray();

        return sendSuccess(
            res,
            sessions.map((session) => mapSession(session, currentSession?.sessionId))
        );
    } catch (err) {
        next(err);
    }
};

const killSession = async (req, res, next) => {
    try {
        const actor = getActor(req);
        if (!actor.userId) return sendError(res, 'User ID not found', 400);

        const result = await getAdminCollection('staffsessions').findOneAndUpdate(
            {
                sessionId: req.params.id,
                userId: actor.userId,
                isActive: true,
            },
            {
                $set: {
                    isActive: false,
                    killedAt: new Date(),
                    killedBy: actor.userId,
                    updatedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        const session = unwrapModifyResult(result);
        if (!session) return sendError(res, 'Session not found', 404);
        await auditAction(req, 'staff.sessions.kill', 'session', req.params.id);
        return sendSuccess(res, null, 'Session killed');
    } catch (err) {
        next(err);
    }
};

const getUserRole = async (req, res, next) => {
    try {
        const userId = String(req.params.userId || '').trim();
        let staff = null;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            staff = await Staff.findById(userId);
        }
        if (!staff) {
            staff = await Staff.findOne({ email: userId.toLowerCase?.() || userId });
        }
        if (!staff) return sendError(res, 'Staff user not found', 404);

        return sendSuccess(res, {
            id: String(staff._id),
            name: staff.name,
            email: staff.email,
            role: staff.role,
            permissions: getRolePermissions(staff.role, staff.permissions),
            status: staff.status,
        });
    } catch (err) {
        next(err);
    }
};

const getPermissions = async (req, res, next) => {
    try {
        const role = String(req.params.role || '').trim();
        return sendSuccess(res, {
            role,
            permissions: getRolePermissions(role),
        });
    } catch (err) {
        next(err);
    }
};

const assignRole = async (req, res, next) => {
    try {
        const userId = String(req.body?.userId || '').trim();
        const role = String(req.body?.role || '').trim();
        if (!userId || !role) return sendError(res, 'userId and role are required', 400);

        const permissions = getRolePermissions(role, req.body?.permissions);
        const staff = await Staff.findByIdAndUpdate(
            userId,
            {
                $set: {
                    role,
                    permissions,
                    updatedAt: new Date(),
                },
            },
            { new: true }
        );
        if (!staff) return sendError(res, 'Staff user not found', 404);
        await auditAction(req, 'staff.roles.assign', 'staff', userId, { role, permissions });
        return sendSuccess(
            res,
            {
                id: String(staff._id),
                role: staff.role,
                permissions: getRolePermissions(staff.role, staff.permissions),
                status: staff.status,
            },
            'Role assigned successfully'
        );
    } catch (err) {
        next(err);
    }
};

const buildStaffTaskRows = async (actor) => {
    const tickets = await getTicketCollection();
    const refunds = getAdminCollection('staffrefundrequests');
    const orderConn = await getOrderConn();

    const [customerTickets, vendorTickets, deliveryTickets, refundRows, orderRows] = await Promise.all([
        tickets
            .find({
                $or: [{ createdForRole: 'user' }, { visibilityScope: 'customer' }],
                status: { $in: ['open', 'in_progress'] },
            })
            .sort({ updatedAt: -1 })
            .limit(50)
            .toArray(),
        tickets
            .find({
                $or: [{ createdForRole: 'vendor' }, { visibilityScope: 'vendor_internal' }],
                status: { $in: ['open', 'in_progress'] },
            })
            .sort({ updatedAt: -1 })
            .limit(50)
            .toArray(),
        tickets
            .find({
                $or: [{ createdForRole: 'delivery_partner' }, { visibilityScope: 'delivery_internal' }],
                status: { $in: ['open', 'in_progress'] },
            })
            .sort({ updatedAt: -1 })
            .limit(50)
            .toArray(),
        refunds.find({ status: { $in: ['pending', 'escalated'] } }).sort({ updatedAt: -1 }).limit(50).toArray(),
        orderConn.db
            .collection('orders')
            .find({
                status: { $in: ['pending', 'confirmed', 'assigned_vendor', 'vendor_accepted'] },
            })
            .sort({ updatedAt: -1 })
            .limit(50)
            .toArray(),
    ]);

    const rows = [];
    for (const ticket of customerTickets) {
        rows.push({
            id: String(ticket._id),
            type: 'customer_ticket',
            title: ticket.subject || 'Customer support ticket',
            status: ticket.status || 'open',
            priority: ticket.priority || 'medium',
            assignedTo: ticket.assignedTo || '',
            updatedAt: ticket.updatedAt || ticket.createdAt,
            summary: ticket.description || '',
        });
    }
    for (const ticket of vendorTickets) {
        rows.push({
            id: String(ticket._id),
            type: 'vendor_ticket',
            title: ticket.subject || 'Vendor support ticket',
            status: ticket.status || 'open',
            priority: ticket.priority || 'medium',
            assignedTo: ticket.assignedTo || '',
            updatedAt: ticket.updatedAt || ticket.createdAt,
            summary: ticket.description || '',
        });
    }
    for (const ticket of deliveryTickets) {
        rows.push({
            id: String(ticket._id),
            type: 'delivery_ticket',
            title: ticket.subject || 'Delivery support ticket',
            status: ticket.status || 'open',
            priority: ticket.priority || 'medium',
            assignedTo: ticket.assignedTo || '',
            updatedAt: ticket.updatedAt || ticket.createdAt,
            summary: ticket.description || '',
        });
    }
    for (const refund of refundRows) {
        rows.push({
            id: String(refund._id),
            type: 'refund',
            title: `Refund ${refund.orderNumber || refund.orderId || ''}`.trim(),
            status: refund.status || 'pending',
            priority: refund.status === 'escalated' ? 'urgent' : 'high',
            assignedTo: refund.assignedTo || '',
            updatedAt: refund.updatedAt || refund.createdAt,
            summary: refund.reason || 'Refund review required',
        });
    }
    for (const order of orderRows) {
        rows.push({
            id: String(order._id),
            type: 'order',
            title: `Order ${order.orderNumber || String(order._id)}`,
            status: order.status,
            priority: order.clarification?.isRequired ? 'high' : 'medium',
            assignedTo: order.opsAssignment?.assignedTo || '',
            updatedAt: order.updatedAt || order.createdAt,
            summary: order.customerFacingStatus || 'Order requires review',
        });
    }

    const relevantRows =
        actor.role === 'finance'
            ? rows.filter(
                  (row) =>
                      row.type === 'refund'
                      || (
                          ['customer_ticket', 'vendor_ticket', 'delivery_ticket'].includes(row.type)
                          && row.assignedTo === actor.userId
                      )
              )
            : actor.role === 'support'
              ? rows.filter(
                    (row) =>
                        ['customer_ticket', 'vendor_ticket', 'delivery_ticket'].includes(row.type)
                        && (!row.assignedTo || row.assignedTo === actor.userId)
                )
              : actor.role === 'ops'
                ? rows.filter((row) =>
                    ['order', 'customer_ticket', 'vendor_ticket', 'delivery_ticket'].includes(row.type)
                )
                : actor.role === 'marketing'
                  ? rows.filter(
                        (row) =>
                            (
                                ['customer_ticket', 'vendor_ticket', 'delivery_ticket'].includes(row.type)
                                && row.assignedTo === actor.userId
                            )
                            || row.type === 'campaign'
                    )
                  : rows;

    return relevantRows.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
};

const getTasks = async (req, res, next) => {
    try {
        const actor = getActor(req);
        const { page, limit, skip } = paginate(req.query);
        const rows = await buildStaffTaskRows(actor);
        const scopedRows = req.query.status
            ? rows.filter((row) => row.status === String(req.query.status).trim())
            : rows;
        return sendSuccess(res, {
            tasks: scopedRows.slice(skip, skip + limit),
            meta: paginateMeta(scopedRows.length, page, limit),
        });
    } catch (err) {
        next(err);
    }
};

const getTaskDetail = async (req, res, next) => {
    try {
        const id = String(req.params.id || '').trim();
        const ticketId = toObjectId(id);
        if (ticketId) {
            const tickets = await getTicketCollection();
            const ticket = await tickets.findOne({ _id: ticketId });
            if (ticket) {
                return sendSuccess(res, {
                    taskType:
                        ticket.createdForRole === 'vendor'
                            ? 'vendor_ticket'
                            : ticket.createdForRole === 'delivery_partner'
                              || ticket.visibilityScope === 'delivery_internal'
                              ? 'delivery_ticket'
                              : 'customer_ticket',
                    detail: normalizeTicket(ticket),
                });
            }

            const refund = await getAdminCollection('staffrefundrequests').findOne({ _id: ticketId });
            if (refund) {
                return sendSuccess(res, {
                    taskType: 'refund',
                    detail: refund,
                });
            }
        }

        const order = await (await getOrderConn()).db.collection('orders').findOne({ _id: toObjectId(id) });
        if (order) {
            return sendSuccess(res, {
                taskType: 'order',
                detail: {
                    ...normalizeQueueOrder(order),
                    orderNumber: order.orderNumber || '',
                    timeline: order.timeline || [],
                    clarification: order.clarification || null,
                },
            });
        }

        return sendError(res, 'Task not found', 404);
    } catch (err) {
        next(err);
    }
};

const completeTask = async (req, res, next) => {
    try {
        const id = String(req.params.id || '').trim();
        const objectId = toObjectId(id);
        if (!objectId) return sendError(res, 'Invalid task id', 400);

        const tickets = await getTicketCollection();
        const ticket = await tickets.findOne({ _id: objectId });
        if (ticket) {
            await tickets.updateOne(
                { _id: objectId },
                { $set: { status: 'resolved', resolvedAt: new Date(), updatedAt: new Date() } }
            );
            await auditAction(req, 'staff.tasks.complete', 'ticket', id);
            const updated = await tickets.findOne({ _id: objectId });
            return sendSuccess(res, { taskType: 'ticket', detail: normalizeTicket(updated) }, 'Task completed');
        }

        const refunds = getAdminCollection('staffrefundrequests');
        const refund = await refunds.findOne({ _id: objectId });
        if (refund) {
            await refunds.updateOne(
                { _id: objectId },
                {
                    $set: {
                        status: 'completed',
                        completedAt: new Date(),
                        completedBy: getActor(req).userId,
                        updatedAt: new Date(),
                    },
                }
            );
            await auditAction(req, 'staff.tasks.complete', 'refund', id);
            const updated = await refunds.findOne({ _id: objectId });
            return sendSuccess(res, { taskType: 'refund', detail: updated }, 'Task completed');
        }

        const orderConn = await getOrderConn();
        const order = await orderConn.db.collection('orders').findOne({ _id: objectId });
        if (order) {
            await orderConn.db.collection('orders').updateOne(
                { _id: objectId },
                {
                    $push: {
                        timeline: {
                            status: order.status,
                            note: req.body?.note || 'Reviewed by staff',
                            timestamp: new Date(),
                        },
                    },
                    $set: {
                        opsAssignment: {
                            ...(order.opsAssignment || {}),
                            completedBy: getActor(req).userId,
                            completedAt: new Date(),
                        },
                    },
                }
            );
            await auditAction(req, 'staff.tasks.complete', 'order', id);
            const updated = await orderConn.db.collection('orders').findOne({ _id: objectId });
            return sendSuccess(res, { taskType: 'order', detail: normalizeQueueOrder(updated) }, 'Task completed');
        }

        return sendError(res, 'Task not found', 404);
    } catch (err) {
        next(err);
    }
};

const assignTask = async (req, res, next) => {
    try {
        const assigneeId = String(req.body?.assigneeId || '').trim();
        if (!assigneeId) return sendError(res, 'assigneeId is required', 400);

        const objectId = toObjectId(req.params.id);
        if (!objectId) return sendError(res, 'Invalid task id', 400);

        const tickets = await getTicketCollection();
        const ticket = await tickets.findOne({ _id: objectId });
        if (ticket) {
            await tickets.updateOne(
                { _id: objectId },
                { $set: { assignedTo: assigneeId, status: 'in_progress', updatedAt: new Date() } }
            );
            await auditAction(req, 'staff.tasks.assign', 'ticket', req.params.id, { assigneeId });
            const updated = await tickets.findOne({ _id: objectId });
            return sendSuccess(res, { taskType: 'ticket', detail: normalizeTicket(updated) }, 'Task assigned');
        }

        const refunds = getAdminCollection('staffrefundrequests');
        const refund = await refunds.findOne({ _id: objectId });
        if (refund) {
            await refunds.updateOne(
                { _id: objectId },
                { $set: { assignedTo: assigneeId, updatedAt: new Date() } }
            );
            await auditAction(req, 'staff.tasks.assign', 'refund', req.params.id, { assigneeId });
            const updated = await refunds.findOne({ _id: objectId });
            return sendSuccess(res, { taskType: 'refund', detail: updated }, 'Task assigned');
        }

        const orderConn = await getOrderConn();
        const order = await orderConn.db.collection('orders').findOne({ _id: objectId });
        if (order) {
            await orderConn.db.collection('orders').updateOne(
                { _id: objectId },
                {
                    $set: {
                        opsAssignment: {
                            assignedTo: assigneeId,
                            assignedBy: getActor(req).userId,
                            assignedAt: new Date(),
                        },
                    },
                }
            );
            await auditAction(req, 'staff.tasks.assign', 'order', req.params.id, { assigneeId });
            const updated = await orderConn.db.collection('orders').findOne({ _id: objectId });
            return sendSuccess(res, { taskType: 'order', detail: normalizeQueueOrder(updated) }, 'Task assigned');
        }

        return sendError(res, 'Task not found', 404);
    } catch (err) {
        next(err);
    }
};

const getAssignableVendors = async (req, res, next) => {
    try {
        const conn = await getVendorConn();
        const vendors = await conn.db
            .collection('vendororgs')
            .find({
                deletedAt: null,
                isApproved: true,
                isSuspended: { $ne: true },
                userId: { $exists: true, $nin: ['', null] },
            })
            .sort({ priority: -1, createdAt: -1 })
            .limit(100)
            .toArray();

        return sendSuccess(
            res,
            {
                vendors: vendors.map((vendor) => ({
                    id: String(vendor.userId),
                    orgId: String(vendor._id),
                    name: vendor.name || vendor.businessName || 'Vendor',
                    location:
                        vendor.location ||
                        vendor.address?.city ||
                        vendor.address?.state ||
                        'Unknown',
                    score: Number(vendor.healthScore || 0),
                    priority: Number(vendor.priority || 0),
                })),
            },
            'Assignable vendors fetched'
        );
    } catch (err) {
        next(err);
    }
};

const getOrdersQueue = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const filter = {
            status: {
                $in: [
                    'pending',
                    'confirmed',
                    'assigned_vendor',
                    'vendor_accepted',
                    'in_production',
                    'qc_pending',
                    'ready_for_pickup',
                    'delivery_assigned',
                    'out_for_delivery',
                ],
            },
        };

        const orders = await conn.db
            .collection('orders')
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        const vendorNames = await buildVendorNameMap(orders.map((order) => order.vendorId));

        return sendSuccess(
            res,
            orders.map((order) =>
                normalizeQueueOrder({
                    ...order,
                    _vendorDisplayName: vendorNames.get(String(order.vendorId || '')) || '',
                })
            ),
            'Order queue fetched'
        );
    } catch (err) {
        next(err);
    }
};

const getOrderDetail = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const order = await conn.db
            .collection('orders')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });

        if (!order) {
            return sendError(res, 'Order not found', 404);
        }

        const vendorNames = await buildVendorNameMap([order.vendorId]);

        return sendSuccess(
            res,
            {
                ...normalizeQueueOrder({
                    ...order,
                    _vendorDisplayName: vendorNames.get(String(order.vendorId || '')) || '',
                }),
                shippingAddress: order.shippingAddress || null,
                items: order.items || [],
                timeline: order.timeline || [],
                clarification: order.clarification || null,
                paymentStatus: order.paymentStatus || 'unpaid',
                createdAt: order.createdAt,
            },
            'Order detail fetched'
        );
    } catch (err) {
        next(err);
    }
};

const reassignVendor = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const requestedVendorId = String(req.body?.newVendorId || req.body?.vendorId || '').trim();
        const reason = String(req.body?.reason || '').trim();

        if (!requestedVendorId) {
            return sendError(res, 'newVendorId is required', 400);
        }

        const vendorConn = await getVendorConn();
        const vendorRecord = await vendorConn.db.collection('vendororgs').findOne({
            $or: [
                { userId: requestedVendorId },
                ...(mongoose.Types.ObjectId.isValid(requestedVendorId)
                    ? [{ _id: new mongoose.Types.ObjectId(requestedVendorId) }]
                    : []),
            ],
            deletedAt: null,
        });

        if (!vendorRecord?.userId) {
            return sendError(res, 'Vendor not found', 404);
        }

        const vendorId = String(vendorRecord.userId);

        const orderId = new mongoose.Types.ObjectId(req.params.id);
        const existingOrder = await conn.db.collection('orders').findOne({ _id: orderId });
        const result = await conn.db.collection('orders').findOneAndUpdate(
            { _id: orderId },
            {
                $set: {
                    vendorId,
                    status: 'assigned_vendor',
                    assignedAt: new Date(),
                    customerFacingStatus: 'Processing by SpeedCopy',
                },
                $push: {
                    timeline: {
                        status: 'assigned_vendor',
                        note: reason || `Reassigned to vendor ${vendorId}`,
                        timestamp: new Date(),
                    },
                    assignmentHistory: {
                        vendorId,
                        storeId: '',
                        assignedBy: req.headers['x-user-id'] || 'staff',
                        reason: reason || `Reassigned to vendor ${vendorId}`,
                        assignedAt: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        const updatedOrder = unwrapModifyResult(result);
        if (!updatedOrder) {
            return sendError(res, 'Order not found', 404);
        }

        await Promise.allSettled([
            emitNotification({
                userId: String(vendorId),
                title: 'Order assigned by staff',
                message: `Order ${existingOrder?.orderNumber || req.params.id} has been assigned to your queue.`,
                category: 'orders',
                metadata: { orderId: req.params.id, vendorId, reason },
            }),
            existingOrder?.userId
                ? emitNotification({
                      userId: String(existingOrder.userId),
                      title: 'Order reassigned',
                      message: `Your order ${existingOrder.orderNumber || req.params.id} has been reassigned for processing.`,
                      category: 'orders',
                      metadata: { orderId: req.params.id, vendorId, reason },
                  })
                : Promise.resolve(null),
            emitNotification({
                title: 'Staff reassigned vendor',
                message: `Order ${existingOrder?.orderNumber || req.params.id} was reassigned by ${req.headers['x-user-role'] || 'staff'}.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { orderId: req.params.id, vendorId, reason },
            }),
        ]);

        await auditAction(req, 'staff.orders.reassign_vendor', 'order', req.params.id, { vendorId }, reason);
        return sendSuccess(res, normalizeQueueOrder(updatedOrder), 'Vendor reassigned');
    } catch (err) {
        next(err);
    }
};

const raiseClarification = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const message = String(req.body?.message || req.body?.question || '').trim();

        if (!message) {
            return sendError(res, 'message is required', 400);
        }

        const dueAt = new Date();
        dueAt.setMinutes(dueAt.getMinutes() + 30);

        const orderId = new mongoose.Types.ObjectId(req.params.id);
        const result = await conn.db.collection('orders').findOneAndUpdate(
            { _id: orderId },
            {
                $set: {
                    clarification: {
                        isRequired: true,
                        status: 'requested',
                        requestedByRole: req.headers['x-user-role'] || 'staff',
                        question: message,
                        response: '',
                        requestedAt: new Date(),
                        respondedAt: null,
                        dueAt,
                    },
                },
                $push: {
                    timeline: {
                        status: 'clarification_required',
                        note: message,
                        timestamp: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        const updatedOrder = unwrapModifyResult(result);
        if (!updatedOrder) {
            return sendError(res, 'Order not found', 404);
        }

        await Promise.allSettled([
            updatedOrder?.userId
                ? emitNotification({
                      userId: String(updatedOrder.userId),
                      title: 'Clarification required',
                      message,
                      category: 'support',
                      metadata: { orderId: req.params.id, dueAt },
                  })
                : Promise.resolve(null),
            emitNotification({
                title: 'Staff requested clarification',
                message: `Clarification was requested for order ${updatedOrder?.orderNumber || req.params.id}.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: {
                    orderId: req.params.id,
                    dueAt,
                    requestedByRole: req.headers['x-user-role'] || 'staff',
                },
            }),
        ]);

        await auditAction(
            req,
            'staff.orders.request_clarification',
            'order',
            req.params.id,
            { dueAt },
            message
        );
        return sendSuccess(res, normalizeQueueOrder(updatedOrder), 'Clarification requested');
    } catch (err) {
        next(err);
    }
};

const getTickets = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const { page, limit, skip } = paginate(req.query);
        const filter = buildCustomerTicketFilter(req);

        const [rows, total] = await Promise.all([
            tickets.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
            tickets.countDocuments(filter),
        ]);

        return sendSuccess(res, {
            tickets: rows.map(normalizeTicket),
            meta: paginateMeta(total, page, limit),
        });
    } catch (err) {
        next(err);
    }
};

const getTicketDetail = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const ticketId = toObjectId(req.params.id);
        if (!ticketId) return sendError(res, 'Invalid ticket id', 400);

        const ticket = await tickets.findOne({
            _id: ticketId,
            $or: [{ createdForRole: 'user' }, { visibilityScope: 'customer' }],
        });

        if (!ticket) return sendError(res, 'Ticket not found', 404);
        return sendSuccess(res, normalizeTicket(ticket));
    } catch (err) {
        next(err);
    }
};

const replyTicket = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const ticketId = toObjectId(req.params.id);
        if (!ticketId) return sendError(res, 'Invalid ticket id', 400);

        const message = String(req.body?.message || '').trim();
        if (!message) return sendError(res, 'message is required', 400);

        const actor = getActor(req);
        const reply = {
            authorId: actor.userId,
            authorRole: actor.role || 'staff',
            message,
            attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
            createdAt: new Date(),
        };

        const result = await tickets.findOneAndUpdate(
            {
                _id: ticketId,
                $or: [{ createdForRole: 'user' }, { visibilityScope: 'customer' }],
            },
            {
                $push: { replies: reply },
                $set: {
                    status: 'in_progress',
                    assignedTo: actor.userId,
                    updatedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        const ticket = unwrapModifyResult(result);
        if (!ticket) return sendError(res, 'Ticket not found', 404);

        await Promise.allSettled([
            ticket.userId
                ? emitNotification({
                      userId: String(ticket.userId),
                      title: 'Support replied',
                      message,
                      category: 'support',
                      metadata: { ticketId: req.params.id },
                  })
                : Promise.resolve(null),
            auditAction(req, 'staff.tickets.reply', 'ticket', req.params.id),
        ]);

        return sendSuccess(res, normalizeTicket(ticket), 'Reply sent');
    } catch (err) {
        next(err);
    }
};

const closeTicket = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const ticketId = toObjectId(req.params.id);
        if (!ticketId) return sendError(res, 'Invalid ticket id', 400);

        const result = await tickets.findOneAndUpdate(
            {
                _id: ticketId,
                $or: [{ createdForRole: 'user' }, { visibilityScope: 'customer' }],
            },
            {
                $set: {
                    status: 'resolved',
                    resolvedAt: new Date(),
                    updatedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        const ticket = unwrapModifyResult(result);
        if (!ticket) return sendError(res, 'Ticket not found', 404);

        await Promise.allSettled([
            ticket.userId
                ? emitNotification({
                      userId: String(ticket.userId),
                      title: 'Support ticket resolved',
                      message: `Ticket ${req.params.id} has been resolved.`,
                      category: 'support',
                      metadata: { ticketId: req.params.id },
                  })
                : Promise.resolve(null),
            auditAction(req, 'staff.tickets.close', 'ticket', req.params.id),
        ]);

        return sendSuccess(res, normalizeTicket(ticket), 'Ticket closed');
    } catch (err) {
        next(err);
    }
};

const escalateTicket = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const ticketId = toObjectId(req.params.id);
        if (!ticketId) return sendError(res, 'Invalid ticket id', 400);

        const reason = String(req.body?.reason || '').trim();
        if (!reason) return sendError(res, 'reason is required', 400);

        const actor = getActor(req);
        const result = await tickets.findOneAndUpdate(
            {
                _id: ticketId,
                $or: [{ createdForRole: 'user' }, { visibilityScope: 'customer' }],
            },
            {
                $set: {
                    status: 'in_progress',
                    priority: 'urgent',
                    assignedTo: actor.userId,
                    updatedAt: new Date(),
                },
                $push: {
                    replies: {
                        authorId: actor.userId,
                        authorRole: actor.role || 'staff',
                        message: reason,
                        attachments: [],
                        createdAt: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        const ticket = unwrapModifyResult(result);
        if (!ticket) return sendError(res, 'Ticket not found', 404);

        await Promise.allSettled([
            emitNotification({
                title: 'Ticket escalated by staff',
                message: `Customer ticket ${req.params.id} requires senior attention.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { ticketId: req.params.id, reason },
            }),
            auditAction(req, 'staff.tickets.escalate', 'ticket', req.params.id, {}, reason),
        ]);

        return sendSuccess(res, normalizeTicket(ticket), 'Ticket escalated');
    } catch (err) {
        next(err);
    }
};

const getVendorTickets = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const { page, limit, skip } = paginate(req.query);
        const actor = getActor(req);
        const filter = {
            $or: [{ createdForRole: 'vendor' }, { visibilityScope: 'vendor_internal' }],
        };
        if (req.query.status) filter.status = String(req.query.status).trim();
        if (req.query.assignedTo) {
            filter.assignedTo = String(req.query.assignedTo).trim();
        } else if (isAssignedTicketRole(actor.role) && actor.userId) {
            filter.assignedTo = actor.userId;
        }

        const [rows, total] = await Promise.all([
            tickets.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).toArray(),
            tickets.countDocuments(filter),
        ]);
        const vendorNames = await buildVendorNameMap(rows.map((ticket) => ticket.userId));

        return sendSuccess(res, {
            tickets: rows.map((ticket) => ({
                id: String(ticket._id),
                issue: ticket.subject || ticket.description || 'Vendor issue',
                vendor: vendorNames.get(String(ticket.userId)) || 'Vendor',
                status: ticket.status || 'open',
                sla: formatRelativeAge(ticket.updatedAt || ticket.createdAt),
                priority: ticket.priority || 'medium',
            })),
            meta: paginateMeta(total, page, limit),
        });
    } catch (err) {
        next(err);
    }
};

const replyVendorTicket = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const ticketId = toObjectId(req.params.id);
        if (!ticketId) return sendError(res, 'Invalid ticket id', 400);

        const message = String(req.body?.message || '').trim();
        if (!message) return sendError(res, 'message is required', 400);

        const actor = getActor(req);
        const result = await tickets.findOneAndUpdate(
            {
                _id: ticketId,
                $or: [{ createdForRole: 'vendor' }, { visibilityScope: 'vendor_internal' }],
            },
            {
                $push: {
                    replies: {
                        authorId: actor.userId,
                        authorRole: actor.role || 'staff',
                        message,
                        attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
                        createdAt: new Date(),
                    },
                },
                $set: {
                    status: 'in_progress',
                    assignedTo: actor.userId,
                    updatedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        const ticket = unwrapModifyResult(result);
        if (!ticket) return sendError(res, 'Vendor ticket not found', 404);
        await auditAction(req, 'staff.vendor_tickets.reply', 'ticket', req.params.id);
        return sendSuccess(
            res,
            {
                id: String(ticket._id),
                status: ticket.status || 'in_progress',
            },
            'Reply sent'
        );
    } catch (err) {
        next(err);
    }
};

const escalateVendorTicket = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const ticketId = toObjectId(req.params.id);
        if (!ticketId) return sendError(res, 'Invalid ticket id', 400);

        const reason = String(req.body?.reason || '').trim();
        if (!reason) return sendError(res, 'reason is required', 400);

        const actor = getActor(req);
        const result = await tickets.findOneAndUpdate(
            {
                _id: ticketId,
                $or: [{ createdForRole: 'vendor' }, { visibilityScope: 'vendor_internal' }],
            },
            {
                $set: {
                    status: 'in_progress',
                    priority: 'urgent',
                    assignedTo: actor.userId,
                    updatedAt: new Date(),
                },
                $push: {
                    replies: {
                        authorId: actor.userId,
                        authorRole: actor.role || 'staff',
                        message: reason,
                        attachments: [],
                        createdAt: new Date(),
                    },
                },
            },
            { returnDocument: 'after' }
        );

        const ticket = unwrapModifyResult(result);
        if (!ticket) return sendError(res, 'Vendor ticket not found', 404);

        await Promise.allSettled([
            emitNotification({
                title: 'Vendor ticket escalated by staff',
                message: `Vendor ticket ${req.params.id} requires admin review.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { ticketId: req.params.id, reason, source: 'vendor_support' },
            }),
            ticket.userId
                ? emitNotification({
                      userId: String(ticket.userId),
                      title: 'Your support ticket is under review',
                      message: 'SpeedCopy support has escalated your ticket for priority handling.',
                      category: 'support',
                      metadata: { ticketId: req.params.id },
                  })
                : Promise.resolve(null),
            auditAction(req, 'staff.vendor_tickets.escalate', 'ticket', req.params.id, {}, reason),
        ]);

        return sendSuccess(
            res,
            {
                id: String(ticket._id),
                status: ticket.status || 'in_progress',
                priority: ticket.priority || 'urgent',
                vendor: '',
                issue: ticket.subject || ticket.description || 'Vendor issue',
            },
            'Vendor ticket escalated'
        );
    } catch (err) {
        next(err);
    }
};

const uploadAttachments = (req, res) =>
    sendSuccess(
        res,
        {
            attachments: (req.files || []).map((file) => ({
                originalName: file.originalname,
                filename: file.filename,
                size: file.size,
                mimeType: file.mimetype,
                url: `${req.protocol}://${req.get('host')}/uploads/admin/attachments/${file.filename}`,
            })),
        },
        'Attachments uploaded'
    );

const getRefunds = async (req, res, next) => {
    try {
        await bootstrapRefundQueue();
        const refunds = getAdminCollection('staffrefundrequests');
        const filter = {};
        if (req.query.status) filter.status = String(req.query.status).trim();

        const rows = await refunds.find(filter).sort({ updatedAt: -1, createdAt: -1 }).limit(100).toArray();
        return sendSuccess(res, rows.map(mapRefund));
    } catch (err) {
        next(err);
    }
};

const approveRefund = async (req, res, next) => {
    try {
        const refundId = toObjectId(req.params.id);
        if (!refundId) return sendError(res, 'Invalid refund id', 400);

        const refunds = getAdminCollection('staffrefundrequests');
        const refund = await refunds.findOne({ _id: refundId });
        if (!refund) return sendError(res, 'Refund not found', 404);

        const actor = getActor(req);
        const { wallets, ledgers } = await getFinanceCollections();
        const orderConn = await getOrderConn();
        const transaction = await transactWalletRaw(wallets, ledgers, refund.customerId, {
            type: 'credit',
            category: 'refund',
            amount: Number(refund.amount || 0),
            referenceId: refund.orderId || String(refund._id),
            referenceType: 'order',
            description: refund.reason || 'Refund approved by staff',
            metadata: {
                refundRequestId: String(refund._id),
                approvedBy: actor.userId,
            },
            userType: 'customer',
        });

        if (refund.orderId) {
            const orderObjectId = toObjectId(refund.orderId);
            if (orderObjectId) {
                await orderConn.db.collection('orders').updateOne(
                    { _id: orderObjectId },
                    {
                        $set: {
                            status: 'refunded',
                            paymentStatus: 'refunded',
                            customerFacingStatus: 'Refund initiated by SpeedCopy',
                            refundId: transaction.entryId,
                            updatedAt: new Date(),
                        },
                        $push: {
                            timeline: {
                                status: 'refunded',
                                note: refund.reason || 'Refund approved by staff',
                                timestamp: new Date(),
                            },
                        },
                    }
                );
            }
        }

        const approvedAt = new Date();
        await refunds.updateOne(
            { _id: refundId },
            {
                $set: {
                    status: 'approved',
                    approvedAt,
                    approvedBy: actor.userId,
                    transactionId: transaction.entryId,
                    newBalance: transaction.newBalance,
                    updatedAt: approvedAt,
                },
            }
        );

        await Promise.allSettled([
            emitNotification({
                userId: refund.customerId,
                title: 'Refund approved',
                message: `A refund of INR ${refund.amount} has been approved.`,
                category: 'rewards',
                metadata: { refundId: String(refund._id), orderId: refund.orderId || '' },
            }),
            auditAction(req, 'staff.refunds.approve', 'refund', req.params.id),
        ]);

        return sendSuccess(res, {
            id: String(refund._id),
            status: 'approved',
            approvedAt,
            approvedBy: actor.userId,
        });
    } catch (err) {
        next(err);
    }
};

const escalateRefund = async (req, res, next) => {
    try {
        const refundId = toObjectId(req.params.id);
        if (!refundId) return sendError(res, 'Invalid refund id', 400);

        const actor = getActor(req);
        const escalatedAt = new Date();
        const result = await getAdminCollection('staffrefundrequests').findOneAndUpdate(
            { _id: refundId },
            {
                $set: {
                    status: 'escalated',
                    escalatedAt,
                    escalatedBy: actor.userId,
                    updatedAt: escalatedAt,
                },
            },
            { returnDocument: 'after' }
        );

        const refund = unwrapModifyResult(result);
        if (!refund) return sendError(res, 'Refund not found', 404);

        await Promise.allSettled([
            emitNotification({
                title: 'Refund escalated by staff',
                message: `Refund ${String(refund._id)} needs senior review.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { refundId: String(refund._id), orderId: refund.orderId || '' },
            }),
            auditAction(req, 'staff.refunds.escalate', 'refund', req.params.id),
        ]);

        return sendSuccess(res, {
            id: String(refund._id),
            status: 'escalated',
            escalatedAt,
        });
    } catch (err) {
        next(err);
    }
};

const creditWallet = async (req, res, next) => {
    try {
        const userId = String(req.body?.userId || '').trim();
        const amount = Number(req.body?.amount || 0);
        const reason = String(req.body?.reason || 'Manual credit by staff').trim();
        if (!userId) return sendError(res, 'userId is required', 400);

        const actor = getActor(req);
        const { wallets, ledgers } = await getFinanceCollections();
        const transaction = await transactWalletRaw(wallets, ledgers, userId, {
            type: 'credit',
            category: 'admin_credit',
            amount,
            referenceId: actor.userId,
            referenceType: 'staff',
            description: reason,
            metadata: { actorId: actor.userId, actorRole: actor.role },
        });

        await auditAction(req, 'staff.wallet.credit', 'wallet', userId, { amount }, reason);
        return sendSuccess(res, {
            userId,
            amount,
            newBalance: transaction.newBalance,
            transactionId: transaction.entryId,
        });
    } catch (err) {
        next(err);
    }
};

const debitWallet = async (req, res, next) => {
    try {
        const userId = String(req.body?.userId || '').trim();
        const amount = Number(req.body?.amount || 0);
        const reason = String(req.body?.reason || 'Manual debit by staff').trim();
        if (!userId) return sendError(res, 'userId is required', 400);

        const actor = getActor(req);
        const { wallets, ledgers } = await getFinanceCollections();
        const transaction = await transactWalletRaw(wallets, ledgers, userId, {
            type: 'debit',
            category: 'admin_debit',
            amount,
            referenceId: actor.userId,
            referenceType: 'staff',
            description: reason,
            metadata: { actorId: actor.userId, actorRole: actor.role },
        });

        await auditAction(req, 'staff.wallet.debit', 'wallet', userId, { amount }, reason);
        return sendSuccess(res, {
            userId,
            amount,
            newBalance: transaction.newBalance,
            transactionId: transaction.entryId,
        });
    } catch (err) {
        next(err);
    }
};

const getWalletLedger = async (req, res, next) => {
    try {
        const { ledgers } = await getFinanceCollections();
        const { limit, skip } = paginate(req.query);
        const filter = {};
        if (req.query.userId) filter.userId = String(req.query.userId).trim();
        if (req.query.category) filter.category = String(req.query.category).trim();

        const entries = await ledgers.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
        const orderRefs = await getOrderNumberMap(
            entries
                .filter((entry) => entry.referenceType === 'order' || entry.category === 'order_payment')
                .map((entry) => entry.referenceId)
        );

        return sendSuccess(
            res,
            entries.map((entry) => ({
                id: String(entry._id),
                type: entry.category || entry.type,
                ref:
                    orderRefs.get(String(entry.referenceId))
                    || entry.referenceId
                    || `LED-${String(entry._id).slice(-6).toUpperCase()}`,
                amount: formatMoneySigned(entry.amount, entry.type),
                date: formatDisplayDate(entry.createdAt),
                note: entry.description || '',
            }))
        );
    } catch (err) {
        next(err);
    }
};

const getPayouts = async (req, res, next) => {
    try {
        await bootstrapPayoutQueue();
        const { payouts } = await getFinanceCollections();
        const rows = await payouts.find({}).sort({ createdAt: -1 }).limit(100).toArray();
        const vendorNames = await buildVendorNameMap(rows.map((row) => row.vendorId));

        return sendSuccess(
            res,
            rows.map((payout) => ({
                id: String(payout._id),
                vendor: vendorNames.get(String(payout.vendorId)) || 'Vendor',
                amount: String(Number(payout.netAmount ?? payout.amount ?? 0)),
                period: formatMonthYear(payout.periodEnd || payout.createdAt),
                status: mapPayoutStatus(payout.status),
                date: formatDisplayDate(payout.transferredAt || payout.periodEnd || payout.createdAt),
            }))
        );
    } catch (err) {
        next(err);
    }
};

const issuePayoutTicket = async (req, res, next) => {
    try {
        const payoutId = toObjectId(req.body?.payoutId);
        const issueDetails = String(req.body?.issueDetails || '').trim();
        if (!payoutId) return sendError(res, 'payoutId is required', 400);
        if (!issueDetails) return sendError(res, 'issueDetails is required', 400);

        const actor = getActor(req);
        const { payouts } = await getFinanceCollections();
        const ticketCollection = await getTicketCollection();
        const payout = await payouts.findOne({ _id: payoutId });
        if (!payout) return sendError(res, 'Payout not found', 404);

        const now = new Date();
        const ticketDoc = {
            userId: String(payout.vendorId || ''),
            orderId: '',
            subject: `Payout issue for ${formatMonthYear(payout.periodEnd || payout.createdAt)}`,
            description: issueDetails,
            category: 'payment_issue',
            status: 'open',
            priority: 'high',
            assignedTo: actor.userId,
            createdForRole: 'vendor',
            visibilityScope: 'vendor_internal',
            replies: [],
            attachments: [],
            metadata: {
                payoutId: String(payout._id),
                raisedBy: actor.userId,
            },
            createdAt: now,
            updatedAt: now,
        };
        const result = await ticketCollection.insertOne(ticketDoc);

        await Promise.allSettled([
            auditAction(req, 'staff.payouts.issue_ticket', 'payout', String(payout._id), {}, issueDetails),
            emitNotification({
                title: 'Payout issue raised',
                message: `A payout issue ticket was raised for payout ${String(payout._id)}.`,
                audienceRoles: OPS_AUDIENCE_ROLES,
                metadata: { payoutId: String(payout._id), ticketId: String(result.insertedId) },
            }),
        ]);

        return sendSuccess(res, {
            ticketId: String(result.insertedId),
            payoutId: String(payout._id),
            status: 'ticket_raised',
        });
    } catch (err) {
        next(err);
    }
};

const getCampaigns = async (req, res, next) => {
    try {
        const orderConn = await getOrderConn();
        const [coupons, orders] = await Promise.all([
            orderConn.db.collection('coupons').find({}).sort({ createdAt: -1 }).limit(100).toArray(),
            orderConn.db.collection('orders').find({ couponCode: { $exists: true, $ne: '' } }).toArray(),
        ]);
        const usageByCode = orders.reduce((acc, order) => {
            const code = String(order.couponCode || '').trim();
            if (!code) return acc;
            acc[code] = acc[code] || { uses: 0, revenue: 0, discount: 0 };
            acc[code].uses += 1;
            acc[code].revenue += Number(order.total || 0);
            acc[code].discount += Number(order.discount || 0);
            return acc;
        }, {});

        return sendSuccess(res, {
            campaigns: coupons.map((coupon) => ({
                id: String(coupon._id),
                code: coupon.code,
                description: coupon.description || '',
                status: coupon.isActive === false ? 'inactive' : 'active',
                expiresAt: coupon.expiresAt || null,
                usage: usageByCode[coupon.code]?.uses || 0,
                revenue: usageByCode[coupon.code]?.revenue || 0,
                discount: usageByCode[coupon.code]?.discount || 0,
            })),
        });
    } catch (err) {
        next(err);
    }
};

const getCoupons = async (req, res, next) => {
    try {
        const orderConn = await getOrderConn();
        const { limit, skip, page } = paginate(req.query);
        const filter = {};

        if (req.query.status) {
            const status = String(req.query.status).trim().toLowerCase();
            if (status === 'active') filter.isActive = true;
            if (status === 'inactive') filter.isActive = false;
        }

        if (req.query.search) {
            const pattern = new RegExp(String(req.query.search).trim(), 'i');
            filter.$or = [{ code: pattern }, { description: pattern }];
        }

        const [coupons, total] = await Promise.all([
            orderConn.db.collection('coupons').find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
            orderConn.db.collection('coupons').countDocuments(filter),
        ]);

        return sendSuccess(res, {
            coupons,
            meta: paginateMeta(total, page, limit),
        });
    } catch (err) {
        next(err);
    }
};

const createCoupon = async (req, res, next) => {
    try {
        const code = String(req.body?.code || '').trim().toUpperCase();
        const discount = Number(req.body?.discount || req.body?.discountValue || 0);
        if (!code || !discount) {
            return sendError(res, 'code and discount are required', 400);
        }

        const orderConn = await getOrderConn();
        const existing = await orderConn.db.collection('coupons').findOne({ code });
        if (existing) return sendError(res, 'Coupon already exists', 409);

        const doc = {
            code,
            description: String(req.body?.description || '').trim(),
            discountType: req.body?.discountType || 'flat',
            discountValue: discount,
            maxDiscount: Number(req.body?.maxDiscount || discount),
            minOrderValue: Number(req.body?.minOrderValue || 0),
            applicableFlows: Array.isArray(req.body?.applicableFlows) ? req.body.applicableFlows : [],
            usageLimit: Number(req.body?.usageLimit || 0),
            usedCount: 0,
            perUserLimit: Number(req.body?.perUserLimit || 1),
            isActive: req.body?.isActive !== false,
            expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await orderConn.db.collection('coupons').insertOne(doc);
        await auditAction(req, 'staff.coupons.create', 'coupon', String(result.insertedId), { code });
        return sendSuccess(res, { ...doc, _id: result.insertedId }, 'Coupon created', 201);
    } catch (err) {
        next(err);
    }
};

const createTargeting = async (req, res, next) => {
    try {
        const segment = String(req.body?.segment || '').trim();
        const action = String(req.body?.action || '').trim();
        if (!segment || !action) return sendError(res, 'segment and action are required', 400);

        const doc = {
            segment,
            action,
            filters: req.body?.filters || {},
            createdBy: getActor(req).userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await getAdminCollection('stafftargetings').insertOne(doc);
        await auditAction(req, 'staff.targeting.create', 'targeting', String(result.insertedId), { segment, action });
        return sendSuccess(res, { ...doc, _id: result.insertedId }, 'Targeting action created');
    } catch (err) {
        next(err);
    }
};

const getAnalyticsReports = async (req, res, next) => {
    try {
        const orderConn = await getOrderConn();
        const tickets = await getTicketCollection();
        const refunds = getAdminCollection('staffrefundrequests');
        const [ordersByStatus, revenueRows, ticketStatusRows, refundStatusRows] = await Promise.all([
            orderConn.db.collection('orders').aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, revenue: { $sum: '$total' } } }])
                .toArray(),
            tickets.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
            refunds.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
        ]);

        return sendSuccess(res, {
            ordersByStatus,
            ticketsByStatus: ticketStatusRows,
            refundsByStatus: refundStatusRows,
            revenue: Number(revenueRows[0]?.revenue || 0),
        });
    } catch (err) {
        next(err);
    }
};

const triggerEscalation = async (req, res, next) => {
    try {
        const entityId = String(req.body?.entityId || '').trim();
        const type = String(req.body?.type || '').trim();
        const reason = String(req.body?.reason || '').trim();
        if (!entityId || !type || !reason) {
            return sendError(res, 'entityId, type, and reason are required', 400);
        }

        const doc = {
            entityId,
            type,
            reason,
            status: 'open',
            priority: req.body?.priority || 'urgent',
            raisedBy: getActor(req).userId,
            raisedByRole: getActor(req).role,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await getAdminCollection('staffescalations').insertOne(doc);
        await auditAction(req, 'staff.escalations.create', type, entityId, {}, reason);
        return sendSuccess(res, { ...doc, _id: result.insertedId }, 'Escalation triggered');
    } catch (err) {
        next(err);
    }
};

const getEscalations = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = String(req.query.status).trim();
        if (req.query.type) filter.type = String(req.query.type).trim();
        const rows = await getAdminCollection('staffescalations').find(filter).sort({ createdAt: -1 }).limit(100).toArray();
        return sendSuccess(res, { escalations: rows });
    } catch (err) {
        next(err);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.action) filter.action = String(req.query.action).trim();
        if (req.query.actorId) filter.actorId = String(req.query.actorId).trim();
        if (req.query.targetType) filter.targetType = String(req.query.targetType).trim();
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
        const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit);
        return sendSuccess(res, { logs });
    } catch (err) {
        next(err);
    }
};

const getActivity = async (req, res, next) => {
    try {
        const actorId = String(req.query.actorId || getActor(req).userId || '').trim();
        const logs = await AuditLog.find(actorId ? { actorId } : {}).sort({ createdAt: -1 }).limit(50);
        return sendSuccess(res, {
            activity: logs.map((log) => ({
                id: String(log._id),
                action: log.action,
                targetType: log.targetType,
                targetId: log.targetId,
                reason: log.reason,
                createdAt: log.createdAt,
            })),
        });
    } catch (err) {
        next(err);
    }
};

const getPerformance = async (req, res, next) => {
    try {
        const tickets = await getTicketCollection();
        const staffId = String(req.query.staffId || getActor(req).userId || '').trim();
        const [assignedTickets, resolvedTickets, auditCount] = await Promise.all([
            tickets.countDocuments({ assignedTo: staffId }),
            tickets.countDocuments({ assignedTo: staffId, status: 'resolved' }),
            AuditLog.countDocuments({ actorId: staffId }),
        ]);
        return sendSuccess(res, {
            staffId,
            metrics: {
                assignedTickets,
                resolvedTickets,
                resolutionRate: assignedTickets ? Math.round((resolvedTickets / assignedTickets) * 100) : 0,
                actionsLogged: auditCount,
            },
        });
    } catch (err) {
        next(err);
    }
};

const getSystemStatus = async (req, res, next) => {
    try {
        const state = await SystemState.findOneAndUpdate(
            { key: 'global' },
            { $setOnInsert: { key: 'global' } },
            { upsert: true, new: true }
        );
        const dbStatus = mongoose.connections.map((connection) => ({
            name: connection.name || 'default',
            readyState: connection.readyState,
        }));
        return sendSuccess(res, {
            controls: state,
            databases: dbStatus,
            now: new Date(),
        });
    } catch (err) {
        next(err);
    }
};

const checkPermissions = async (req, res, next) => {
    try {
        const actor = getActor(req);
        const staff = actor.userId && mongoose.Types.ObjectId.isValid(actor.userId)
            ? await Staff.findById(actor.userId)
            : await Staff.findOne({ email: actor.email.toLowerCase?.() || actor.email });
        const permissions = getRolePermissions(staff?.role || actor.role, staff?.permissions);
        const requested = String(req.query.permission || req.body?.permission || '').trim();
        const granted =
            !requested ||
            permissions.includes(requested) ||
            permissions.includes(`${requested.split('.')[0]}.*`) ||
            permissions.includes('*');
        return sendSuccess(res, {
            role: staff?.role || actor.role,
            permissions,
            requested,
            granted,
        });
    } catch (err) {
        next(err);
    }
};

const conflictLock = async (req, res, next) => {
    try {
        const resourceId = String(req.body?.resourceId || '').trim();
        const lockType = String(req.body?.lockType || '').trim();
        if (!resourceId || !lockType) return sendError(res, 'resourceId and lockType are required', 400);

        const actor = getActor(req);
        const now = new Date();
        const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : new Date(now.getTime() + 30 * 60 * 1000);
        const existing = await getAdminCollection('staffconflictlocks').findOne({
            resourceId,
            lockType,
            expiresAt: { $gt: now },
        });
        if (existing && existing.lockedBy !== actor.userId) {
            return sendError(res, 'Resource is already locked by another staff member', 409);
        }

        await getAdminCollection('staffconflictlocks').updateOne(
            { resourceId, lockType },
            {
                $set: {
                    resourceId,
                    lockType,
                    lockedBy: actor.userId,
                    lockedByRole: actor.role,
                    reason: String(req.body?.reason || '').trim(),
                    expiresAt,
                    updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true }
        );
        await auditAction(req, 'staff.conflict.lock', lockType, resourceId, { expiresAt });
        const lock = await getAdminCollection('staffconflictlocks').findOne({ resourceId, lockType });
        return sendSuccess(res, lock, 'Lock applied');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    listProfiles,
    getProfileById,
    createProfile,
    updateProfileById,
    deleteProfileById,
    login,
    verifyMfa,
    logout,
    getSession,
    getSessions,
    killSession,
    getUserRole,
    getPermissions,
    assignRole,
    getTasks,
    getTaskDetail,
    completeTask,
    assignTask,
    getAssignableVendors,
    getOrdersQueue,
    getOrderDetail,
    reassignVendor,
    raiseClarification,
    getTickets,
    getTicketDetail,
    replyTicket,
    closeTicket,
    escalateTicket,
    getVendorTickets,
    replyVendorTicket,
    escalateVendorTicket,
    uploadAttachments,
    getRefunds,
    approveRefund,
    escalateRefund,
    creditWallet,
    debitWallet,
    getWalletLedger,
    getPayouts,
    issuePayoutTicket,
    getCampaigns,
    getCoupons,
    createCoupon,
    createTargeting,
    getAnalyticsReports,
    triggerEscalation,
    getEscalations,
    getAuditLogs,
    getActivity,
    getPerformance,
    getSystemStatus,
    checkPermissions,
    conflictLock,
};
