const mongoose = require('mongoose');
const { sendSuccess } = require('../../../../shared/utils/response');
const AuditLog = require('../models/audit-log.model');
const config = require('../config');

const resolveDbUri = (dbName) => {
    if (dbName === 'speedcopy_orders') {
        return config.getDbUri('order');
    }

    if (dbName === 'speedcopy_finance') {
        return config.getDbUri('finance');
    }

    throw new Error(`No configured URI for ${dbName}`);
};

const getConn = async (dbName) => {
    const existing = mongoose.connections.find((c) => c.name === dbName && c.readyState === 1);
    if (existing) return existing;

    const uri = resolveDbUri(dbName);

    return mongoose
        .createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const parseDateFilter = (from, to, res) => {
    const dateFilter = {};
    if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
            res.status(400).json({ success: false, message: 'Invalid from date' });
            return null;
        }
        dateFilter.$gte = fromDate;
    }
    if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
            res.status(400).json({ success: false, message: 'Invalid to date' });
            return null;
        }
        dateFilter.$lte = toDate;
    }

    return dateFilter;
};

const escapeCsvValue = (value) => {
    const normalized =
        value instanceof Date
            ? value.toISOString()
            : typeof value === 'object' && value !== null
              ? JSON.stringify(value)
              : String(value ?? '');

    return `"${normalized.replace(/"/g, '""')}"`;
};

const toCsv = (rows = []) => {
    if (!rows.length) return '';
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
    const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escapeCsvValue(row?.[header])).join(',')),
    ];
    return lines.join('\n');
};

const escapePdfText = (value) =>
    String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

const buildSimplePdf = (title, lines = []) => {
    const textLines = [title, '', ...lines.slice(0, 40)];
    const content = [
        'BT',
        '/F1 12 Tf',
        '50 780 Td',
        ...textLines.map((line, index) =>
            index === 0 ? `(${escapePdfText(line)}) Tj` : `0 -16 Td (${escapePdfText(line)}) Tj`
        ),
        'ET',
    ].join('\n');

    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
        '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
        `5 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    objects.forEach((object) => {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += `${object}\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
};

const getReports = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const dateFilter = parseDateFilter(from, to, res);
        if (dateFilter === null) return;

        const orderConn = await getConn('speedcopy_orders');

        const matchStage = Object.keys(dateFilter).length
            ? { $match: { createdAt: dateFilter } }
            : { $match: {} };

        const [revenueByDay, ordersByStatus, ordersByFlow, revenueByStore] = await Promise.all([
            orderConn.db
                .collection('orders')
                .aggregate([
                    matchStage,
                    { $match: { paymentStatus: 'paid' } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            revenue: { $sum: '$total' },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([matchStage, { $group: { _id: '$status', count: { $sum: 1 } } }])
                .toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([
                    matchStage,
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: '$items.flowType',
                            count: { $sum: 1 },
                            revenue: { $sum: '$items.totalPrice' },
                        },
                    },
                ])
                .toArray(),
            orderConn.db
                .collection('orders')
                .aggregate([
                    matchStage,
                    { $match: { paymentStatus: 'paid' } },
                    {
                        $group: {
                            _id: '$storeId',
                            revenue: { $sum: '$total' },
                            orders: { $sum: 1 },
                        },
                    },
                    { $sort: { revenue: -1, orders: -1 } },
                    { $limit: 20 },
                ])
                .toArray(),
        ]);

        const summary = {
            totalRevenue: revenueByDay.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
            totalOrders: ordersByStatus.reduce((sum, row) => sum + Number(row.count || 0), 0),
            paidOrders: revenueByDay.reduce((sum, row) => sum + Number(row.count || 0), 0),
            refundedOrders: Number(
                ordersByStatus.find((row) => String(row._id || '') === 'refunded')?.count || 0
            ),
        };

        return sendSuccess(res, {
            summary,
            revenueByDay,
            ordersByStatus,
            ordersByFlow,
            revenueByStore,
        });
    } catch (err) {
        next(err);
    }
};

const getReferralReport = async (req, res, next) => {
    try {
        const dateFilter = parseDateFilter(req.query.from, req.query.to, res);
        if (dateFilter === null) return;

        const financeConn = await getConn('speedcopy_finance');
        const referralCollection = financeConn.db.collection('referrals');
        const ledgerCollection = financeConn.db.collection('ledgers');
        const matchStage = Object.keys(dateFilter).length
            ? { $match: { createdAt: dateFilter } }
            : { $match: {} };

        const [statusSummary, topReferrers, recentReferrals, rewardSummary] = await Promise.all([
            referralCollection
                .aggregate([
                    matchStage,
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                            rewardAmount: { $sum: '$rewardAmount' },
                        },
                    },
                ])
                .toArray(),
            referralCollection
                .aggregate([
                    matchStage,
                    {
                        $group: {
                            _id: '$referrerId',
                            referrals: { $sum: 1 },
                            rewards: { $sum: '$rewardAmount' },
                        },
                    },
                    { $sort: { referrals: -1, rewards: -1 } },
                    { $limit: 10 },
                ])
                .toArray(),
            referralCollection.find(matchStage.$match).sort({ createdAt: -1 }).limit(25).toArray(),
            ledgerCollection
                .aggregate([
                    {
                        $match: {
                            category: 'referral_reward',
                            ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            totalRewardCredits: { $sum: '$amount' },
                            count: { $sum: 1 },
                        },
                    },
                ])
                .toArray(),
        ]);

        return sendSuccess(res, {
            statusSummary,
            topReferrers,
            recentReferrals,
            rewardSummary: rewardSummary[0] || { totalRewardCredits: 0, count: 0 },
        });
    } catch (err) {
        next(err);
    }
};

const exportReports = async (req, res, next) => {
    try {
        const type = String(req.query.type || 'orders').trim().toLowerCase();
        const format = String(req.query.format || 'json').trim().toLowerCase();
        const dateFilter = parseDateFilter(req.query.from, req.query.to, res);
        if (dateFilter === null) return;

        let rows = [];

        if (type === 'orders' || type === 'orders_report' || type === 'invoices') {
            const orderConn = await getConn('speedcopy_orders');
            const query = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
            const orders = await orderConn.db
                .collection('orders')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(Math.min(2000, Math.max(1, Number(req.query.limit || 1000))))
                .toArray();

            rows = orders.map((order) => ({
                orderId: String(order._id),
                orderNumber: order.orderNumber || '',
                userId: String(order.userId || ''),
                flowType: order.items?.[0]?.flowType || '',
                status: order.status || '',
                paymentStatus: order.paymentStatus || '',
                subtotal: Number(order.subtotal || 0),
                discount: Number(order.discount || 0),
                deliveryCharge: Number(order.deliveryCharge || 0),
                total: Number(order.total || 0),
                invoiceNumber: `INV-${order.orderNumber || String(order._id)}`,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
            }));
        } else if (type === 'revenue' || type === 'revenue_report') {
            const orderConn = await getConn('speedcopy_orders');
            const matchStage = Object.keys(dateFilter).length
                ? { $match: { createdAt: dateFilter, paymentStatus: 'paid' } }
                : { $match: { paymentStatus: 'paid' } };

            rows = await orderConn.db
                .collection('orders')
                .aggregate([
                    matchStage,
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            grossRevenue: { $sum: '$total' },
                            orders: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ])
                .toArray()
                .then((items) =>
                    items.map((item) => ({
                        date: item._id,
                        grossRevenue: Number(item.grossRevenue || 0),
                        estimatedNetRevenue: Math.round(Number(item.grossRevenue || 0) * 0.85),
                        orders: Number(item.orders || 0),
                    }))
                );
        } else if (type === 'audit_logs' || type === 'audit') {
            const logs = await AuditLog.find({})
                .sort({ createdAt: -1 })
                .limit(Math.min(2000, Math.max(1, Number(req.query.limit || 1000))))
                .lean();
            rows = logs.map((log) => ({
                id: String(log._id),
                actorId: log.actorId || '',
                actorRole: log.actorRole || '',
                action: log.action || '',
                targetType: log.targetType || '',
                targetId: log.targetId || '',
                reason: log.reason || '',
                createdAt: log.createdAt,
            }));
        } else if (type === 'referrals') {
            const financeConn = await getConn('speedcopy_finance');
            const query = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
            const referrals = await financeConn.db
                .collection('referrals')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(Math.min(2000, Math.max(1, Number(req.query.limit || 1000))))
                .toArray();
            rows = referrals.map((referral) => ({
                referralId: String(referral._id),
                referrerId: referral.referrerId || '',
                referredId: referral.referredId || '',
                referralCode: referral.referralCode || '',
                status: referral.status || '',
                rewardAmount: Number(referral.rewardAmount || 0),
                firstOrderId: referral.firstOrderId || '',
                completedAt: referral.completedAt || null,
                rewardedAt: referral.rewardedAt || null,
                createdAt: referral.createdAt,
            }));
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported export type' });
        }

        if (format === 'pdf' && type === 'invoices') {
            const title = `SpeedCopy Invoice Export - ${new Date().toISOString().slice(0, 10)}`;
            const lines = rows.slice(0, 40).map(
                (row) =>
                    `${row.invoiceNumber} | ${row.orderNumber || row.orderId} | ${row.status} | Rs.${row.total}`
            );
            const pdfBuffer = buildSimplePdf(title, lines);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="invoice-export.pdf"');
            return res.status(200).send(pdfBuffer);
        }

        if (format === 'csv' || format === 'excel' || format === 'xlsx') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
            return res.status(200).send(toCsv(rows));
        }

        return sendSuccess(res, { type, count: rows.length, rows });
    } catch (err) {
        next(err);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
        const filter = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.actorId) filter.actorId = req.query.actorId;
        if (req.query.targetType) filter.targetType = req.query.targetType;

        const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit);
        return sendSuccess(res, { logs });
    } catch (err) {
        next(err);
    }
};

module.exports = { getReports, getReferralReport, exportReports, getAuditLogs };
