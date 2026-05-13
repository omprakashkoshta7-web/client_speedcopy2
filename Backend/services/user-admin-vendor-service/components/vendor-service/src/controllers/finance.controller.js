const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const config = require('../config');
const { buildAliasMatch, resolveVendorScope } = require('../utils/vendor-scope');

const getOrderConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_orders' && c.readyState === 1
    );
    if (existing) return existing;
    if (!config.orderDbUri) {
        throw new Error('ORDER_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.orderDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getFinanceConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_finance' && c.readyState === 1
    );
    if (existing) return existing;
    if (!config.financeDbUri) {
        throw new Error('FINANCE_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.financeDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
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

const startOfDay = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const startOfWeek = (value = new Date()) => {
    const date = startOfDay(value);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return date;
};

const startOfMonth = (value = new Date()) => {
    const date = startOfDay(value);
    date.setDate(1);
    return date;
};

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const bootstrapVendorPayouts = async (vendorAliases) => {
    const [orderConn, financeConn] = await Promise.all([getOrderConn(), getFinanceConn()]);
    const payouts = financeConn.db.collection('payouts');

    const [existingPayouts, deliveredOrders] = await Promise.all([
        payouts
            .find(buildAliasMatch('vendorId', vendorAliases), { projection: { vendorId: 1, orderIds: 1 } })
            .sort({ createdAt: -1 })
            .limit(200)
            .toArray(),
        orderConn.db
            .collection('orders')
            .find({
                ...buildAliasMatch('vendorId', vendorAliases),
                status: 'delivered',
                vendorPayout: { $gt: 0 },
            })
            .sort({ updatedAt: -1 })
            .limit(200)
            .toArray(),
    ]);

    const payoutOrderIds = new Set(
        existingPayouts.flatMap((payout) =>
            Array.isArray(payout.orderIds) ? payout.orderIds.map((id) => String(id)) : []
        )
    );

    const buckets = new Map();

    for (const order of deliveredOrders) {
        const orderId = String(order._id);
        if (payoutOrderIds.has(orderId)) continue;

        const vendorId = String(order.vendorId || '').trim();
        if (!vendorId) continue;

        if (!buckets.has(vendorId)) {
            buckets.set(vendorId, {
                amount: 0,
                orderIds: [],
                periodStart: order.deliveredAt || order.updatedAt || order.createdAt || new Date(),
                periodEnd: order.deliveredAt || order.updatedAt || order.createdAt || new Date(),
            });
        }

        const bucket = buckets.get(vendorId);
        const eventDate = order.deliveredAt || order.updatedAt || order.createdAt || new Date();
        bucket.amount += Number(order.vendorPayout || 0);
        bucket.orderIds.push(orderId);
        if (eventDate < bucket.periodStart) bucket.periodStart = eventDate;
        if (eventDate > bucket.periodEnd) bucket.periodEnd = eventDate;
    }

    for (const [vendorId, bucket] of buckets.entries()) {
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

const buildClosure = async (vendorAliases, startDate, period) => {
    const conn = await getOrderConn();
    const rows = await conn.db
        .collection('orders')
        .aggregate([
            {
                $match: {
                    ...buildAliasMatch('vendorId', vendorAliases),
                    status: 'delivered',
                    updatedAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: null,
                    earnings: { $sum: { $ifNull: ['$vendorPayout', 0] } },
                    count: { $sum: 1 },
                    grossSales: { $sum: { $ifNull: ['$total', 0] } },
                    discount: { $sum: { $ifNull: ['$discount', 0] } },
                },
            },
        ])
        .toArray();

    const stats = rows[0] || { earnings: 0, count: 0, grossSales: 0, discount: 0 };
    return {
        period,
        from: startDate,
        to: new Date(),
        earnings: Number(stats.earnings || 0),
        count: Number(stats.count || 0),
        grossSales: Number(stats.grossSales || 0),
        discount: Number(stats.discount || 0),
    };
};

const getWalletSummary = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const scope = await getVendorScope(req);
        const orders = await conn.db
            .collection('orders')
            .find({
                ...buildAliasMatch('vendorId', scope.aliases),
                status: 'delivered',
            })
            .toArray();

        const totalEarnings = orders.reduce((sum, o) => sum + (o.vendorPayout || 0), 0);

        return sendSuccess(res, {
            balance: totalEarnings,
            pendingSettlement: totalEarnings * 0.2,
            availableForWithdrawal: totalEarnings * 0.8,
        });
    } catch (err) {
        next(err);
    }
};

const getWalletStoreWise = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const scope = await getVendorScope(req);
        const data = await conn.db
            .collection('orders')
            .aggregate([
                { $match: { ...buildAliasMatch('vendorId', scope.aliases), status: 'delivered' } },
                {
                    $group: {
                        _id: '$storeId',
                        earnings: { $sum: '$vendorPayout' },
                        orderCount: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getWalletDeductions = async (req, res, next) => {
    try {
        const conn = await getOrderConn();
        const scope = await getVendorScope(req);
        const data = await conn.db
            .collection('orders')
            .aggregate([
                { $match: { ...buildAliasMatch('vendorId', scope.aliases), status: 'delivered' } },
                {
                    $project: {
                        platformFee: {
                            $max: [
                                {
                                    $subtract: [
                                        { $ifNull: ['$total', 0] },
                                        { $ifNull: ['$vendorPayout', 0] },
                                    ],
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalPlatformFee: { $sum: '$platformFee' },
                        orderCount: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        const totals = data[0] || { totalPlatformFee: 0, orderCount: 0 };
        return sendSuccess(res, {
            deductions: [
                {
                    type: 'platform_fee',
                    amount: Number(totals.totalPlatformFee || 0),
                    orderCount: Number(totals.orderCount || 0),
                },
            ],
        });
    } catch (err) {
        next(err);
    }
};

const getClosureDaily = async (req, res, next) => {
    try {
        const scope = await getVendorScope(req);
        return sendSuccess(res, await buildClosure(scope.aliases, startOfDay(), 'daily'));
    } catch (err) {
        next(err);
    }
};

const getClosureWeekly = async (req, res, next) => {
    try {
        const scope = await getVendorScope(req);
        return sendSuccess(res, await buildClosure(scope.aliases, startOfWeek(), 'weekly'));
    } catch (err) {
        next(err);
    }
};

const getClosureMonthly = async (req, res, next) => {
    try {
        const scope = await getVendorScope(req);
        return sendSuccess(res, await buildClosure(scope.aliases, startOfMonth(), 'monthly'));
    } catch (err) {
        next(err);
    }
};

const getPayoutsSchedule = async (req, res, next) => {
    try {
        const scope = await getVendorScope(req);
        await bootstrapVendorPayouts(scope.aliases);
        const [financeConn, closure] = await Promise.all([
            getFinanceConn(),
            buildClosure(scope.aliases, startOfWeek(), 'weekly'),
        ]);

        const pending = await financeConn.db.collection('payouts').findOne(
            { ...buildAliasMatch('vendorId', scope.aliases), status: { $in: ['pending', 'processing'] } },
            { sort: { createdAt: -1 } }
        );

        const nextPayoutDate = new Date();
        nextPayoutDate.setDate(nextPayoutDate.getDate() + (7 - nextPayoutDate.getDay() || 7));

        return sendSuccess(res, {
            nextPayoutDate,
            estimatedAmount: Number(pending?.netAmount || closure.earnings || 0),
            status: pending?.status || 'scheduled',
            payoutId: pending?._id ? String(pending._id) : '',
        });
    } catch (err) {
        next(err);
    }
};

const getPayoutsHistory = async (req, res, next) => {
    try {
        const scope = await getVendorScope(req);
        await bootstrapVendorPayouts(scope.aliases);
        const conn = await getFinanceConn();
        const payouts = await conn.db
            .collection('payouts')
            .find(buildAliasMatch('vendorId', scope.aliases))
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        return sendSuccess(res, {
            payouts: payouts.map((payout) => ({
                id: String(payout._id),
                amount: Number(payout.netAmount ?? payout.amount ?? 0),
                grossAmount: Number(payout.amount || 0),
                platformFee: Number(payout.platformFee || 0),
                status: payout.status || 'pending',
                periodStart: payout.periodStart || null,
                periodEnd: payout.periodEnd || null,
                createdAt: payout.createdAt,
                transferredAt: payout.transferredAt || null,
                notes: payout.notes || '',
            })),
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getWalletSummary,
    getWalletStoreWise,
    getWalletDeductions,
    getClosureDaily,
    getClosureWeekly,
    getClosureMonthly,
    getPayoutsSchedule,
    getPayoutsHistory,
};
