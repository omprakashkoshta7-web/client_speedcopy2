const orderService = require('../services/order.service');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');

const getVendorContext = (req) => {
    const aliases = [
        req.headers['x-user-id'],
        req.headers['x-vendor-user-id'],
        req.headers['x-vendor-org-id'],
        ...String(req.headers['x-vendor-aliases'] || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
    ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

    return {
        vendorId: aliases[0] || '',
        vendorAliases: [...new Set(aliases)],
    };
};

const getVendorPermissions = (req) => {
    const permissions = String(req.headers['x-user-permissions'] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const portalRole = String(req.headers['x-user-portal-role'] || 'Owner')
        .trim()
        .toLowerCase();
    if (portalRole === 'owner' && !permissions.includes('*')) return ['*', ...permissions];
    return permissions;
};

const hasVendorPermission = (req, permission) => {
    const permissions = getVendorPermissions(req);
    if (permissions.includes('*') || permissions.includes(permission)) return true;
    const [domain] = String(permission || '').split('.');
    return permissions.includes(`${domain}.*`);
};

const requireVendorPermission = (req, res, permission) => {
    if (hasVendorPermission(req, permission)) return true;
    sendError(res, 'You do not have permission to perform this vendor action', 403);
    return false;
};

// GET /api/vendor/orders/queue — orders assigned to this vendor awaiting acceptance
const getQueue = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.read')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.getVendorQueue(vendorId, req.query, vendorAliases);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getAssigned = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.read')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.getVendorQueue(vendorId, req.query, vendorAliases);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/vendor/orders/:id
const getVendorOrder = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.read')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.getVendorOrderById(vendorId, req.params.id, vendorAliases);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// POST /api/vendor/orders/:id/accept
const acceptOrder = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.accept')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            vendorId,
            'vendor_accepted',
            'Vendor accepted the order',
            vendorAliases
        );
        return sendSuccess(res, data, 'Order accepted');
    } catch (err) {
        next(err);
    }
};

// POST /api/vendor/orders/:id/reject
const rejectOrder = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.reject')) return;
        const { reason } = req.body;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            vendorId,
            'cancelled',
            reason || 'Rejected by vendor',
            vendorAliases
        );
        return sendSuccess(res, data, 'Order rejected');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/vendor/orders/:id/start-production
const startProduction = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.start_production')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            vendorId,
            'in_production',
            'Production started',
            vendorAliases
        );
        return sendSuccess(res, data, 'Production started');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/vendor/orders/:id/qc-pending
const markQcPending = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.qc')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            vendorId,
            'qc_pending',
            'Quality check in progress',
            vendorAliases
        );
        return sendSuccess(res, data, 'QC pending');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/vendor/orders/:id/ready-for-pickup
const markReadyForPickup = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.ready')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            vendorId,
            'ready_for_pickup',
            'Order ready for pickup',
            vendorAliases
        );
        return sendSuccess(res, data, 'Ready for pickup');
    } catch (err) {
        next(err);
    }
};

const completeHandover = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.ready')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.vendorCompleteHandover(
            req.params.id,
            vendorId,
            req.body || {},
            vendorAliases
        );
        return sendSuccess(res, data, 'Handover completed');
    } catch (err) {
        next(err);
    }
};

const updateStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        const permissionMap = {
            vendor_accepted: 'orders.accept',
            cancelled: 'orders.reject',
            in_production: 'orders.start_production',
            qc_pending: 'orders.qc',
            ready_for_pickup: 'orders.ready',
        };
        const neededPermission = permissionMap[String(status || '').trim()];
        if (!neededPermission || !requireVendorPermission(req, res, neededPermission)) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.vendorUpdateStatus(
            req.params.id,
            vendorId,
            status,
            note || 'Status updated by vendor',
            vendorAliases
        );
        return sendSuccess(res, data, 'Order status updated');
    } catch (err) {
        next(err);
    }
};

const qcUpload = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'orders.qc')) return;
        const { images } = req.body;
        return sendSuccess(res, { images, status: 'uploaded' }, 'QC evidence uploaded');
    } catch (err) {
        next(err);
    }
};

// GET /api/vendor/orders/score
const getVendorScore = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'scoring.read')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const data = await orderService.getVendorScore(vendorId, vendorAliases);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/vendor/orders/closure
const getVendorClosure = async (req, res, next) => {
    try {
        if (!requireVendorPermission(req, res, 'finance.read')) return;
        const { vendorId, vendorAliases } = getVendorContext(req);
        const { period = 'daily', date } = req.query;
        const data = await orderService.getVendorClosure(vendorId, period, date, vendorAliases);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getQueue,
    getAssigned,
    getVendorOrder,
    acceptOrder,
    rejectOrder,
    startProduction,
    markQcPending,
    markReadyForPickup,
    completeHandover,
    updateStatus,
    qcUpload,
    getVendorScore,
    getVendorClosure,
};
