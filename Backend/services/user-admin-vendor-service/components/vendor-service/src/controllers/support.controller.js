const mongoose = require('mongoose');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
const config = require('../config');
const { buildAliasMatch, resolveVendorScope, normalizeString } = require('../utils/vendor-scope');

const getNotifConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_notifications' && c.readyState === 1
    );
    if (existing) return existing;
    if (!config.notificationDbUri) {
        throw new Error('NOTIFICATION_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.notificationDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getVendorId = (req) => req.headers['x-user-id'];
const getVendorScope = (req) =>
    resolveVendorScope({
        vendorId: getVendorId(req),
        vendorUserId: req.headers['x-vendor-user-id'],
        vendorOrgId: req.headers['x-vendor-org-id'],
        vendorAliases: String(req.headers['x-vendor-aliases'] || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
    });

const TICKET_CATEGORY_MAP = {
    finance: 'payment_issue',
    payment: 'payment_issue',
    payments: 'payment_issue',
    billing: 'payment_issue',
    operations: 'order_issue',
    production: 'order_issue',
    printing: 'order_issue',
    order: 'order_issue',
    orders: 'order_issue',
    delivery: 'delivery_issue',
    logistics: 'delivery_issue',
    quality: 'product_issue',
    product: 'product_issue',
    account: 'account_issue',
    profile: 'account_issue',
    store: 'account_issue',
    stores: 'account_issue',
    other: 'other',
};

const normalizeTicketCategory = (value) =>
    TICKET_CATEGORY_MAP[normalizeString(value).toLowerCase()] || 'other';

const buildReply = (req, scope, message) => ({
    authorId: scope.vendorUserId || scope.vendorOrgId || getVendorId(req),
    authorRole: 'vendor',
    message,
    attachments: buildAttachmentUrls(req).length
        ? buildAttachmentUrls(req)
        : Array.isArray(req.body?.attachments)
          ? req.body.attachments
          : [],
    createdAt: new Date(),
    updatedAt: new Date(),
});
const buildAttachmentUrls = (req) =>
    (req.files || []).map(
        (file) => `${req.protocol}://${req.get('host')}/uploads/vendors/support/${file.filename}`
    );

const createTicket = async (req, res, next) => {
    try {
        const { subject, category, description, orderId } = req.body;
        if (!subject || !description)
            return sendError(res, 'Subject and description required', 400);

        const conn = await getNotifConn();
        const scope = await getVendorScope(req);
        const ticketDoc = {
            userId: scope.vendorUserId || getVendorId(req),
            createdForRole: 'vendor',
            subject,
            visibilityScope: 'vendor_internal',
            category: normalizeTicketCategory(category),
            description,
            orderId: orderId || null,
            status: 'open',
            priority: 'medium',
            attachments: buildAttachmentUrls(req).length
                ? buildAttachmentUrls(req)
                : Array.isArray(req.body?.attachments)
                  ? req.body.attachments
                  : [],
            replies: [],
            metadata: {
                vendorUserId: scope.vendorUserId || '',
                vendorOrgId: scope.vendorOrgId || '',
                vendorAliases: scope.aliases || [],
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await conn.db.collection('tickets').insertOne(ticketDoc);
        return sendCreated(res, { ...ticketDoc, _id: result.insertedId });
    } catch (err) {
        next(err);
    }
};

const getTickets = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const scope = await getVendorScope(req);
        const data = await conn.db
            .collection('tickets')
            .find(buildAliasMatch('userId', scope.aliases))
            .sort({ createdAt: -1 })
            .toArray();
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getTicket = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const scope = await getVendorScope(req);
        const data = await conn.db
            .collection('tickets')
            .findOne({
                _id: new mongoose.Types.ObjectId(req.params.ticket_id),
                ...buildAliasMatch('userId', scope.aliases),
            });

        if (!data) return sendError(res, 'Ticket not found', 404);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const replyTicket = async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message) return sendError(res, 'Message is required', 400);

        const conn = await getNotifConn();
        const scope = await getVendorScope(req);
        const ticket = await conn.db
            .collection('tickets')
            .findOne({
                _id: new mongoose.Types.ObjectId(req.params.ticket_id),
                ...buildAliasMatch('userId', scope.aliases),
            });

        if (!ticket) return sendError(res, 'Ticket not found', 404);

        const reply = buildReply(req, scope, message);

        await conn.db.collection('tickets').updateOne(
            { _id: new mongoose.Types.ObjectId(req.params.ticket_id) },
            {
                $push: { replies: reply },
                $set: {
                    updatedAt: new Date(),
                    status: ticket.status === 'resolved' ? 'open' : ticket.status,
                },
            }
        );

        const updated = await conn.db
            .collection('tickets')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.ticket_id) });

        return sendSuccess(res, updated, 'Reply sent');
    } catch (err) {
        next(err);
    }
};

const uploadAttachments = async (req, res, next) => {
    try {
        return sendSuccess(
            res,
            { attachments: buildAttachmentUrls(req) },
            'Attachments uploaded'
        );
    } catch (err) {
        next(err);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const conn = await getNotifConn();
        const scope = await getVendorScope(req);
        const tickets = await conn.db
            .collection('tickets')
            .find(buildAliasMatch('userId', scope.aliases))
            .toArray();

        const status_counts = tickets.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {});

        return sendSuccess(res, { status_counts, total: tickets.length });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createTicket,
    getTickets,
    getTicket,
    replyTicket,
    getSummary,
    uploadAttachments,
};
