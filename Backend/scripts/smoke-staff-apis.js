require('dotenv').config();
const mongoose = require('mongoose');

const serviceBaseUrl = process.env.USER_ADMIN_VENDOR_SERVICE_URL || 'http://localhost:4101';
const baseUrl = `${serviceBaseUrl}/api/staff`;
const marker = `staff-smoke-${Date.now()}`;
const actorHeaders = {
    'Content-Type': 'application/json',
    'x-user-id': 'staff_smoke_agent',
    'x-user-role': 'staff',
    'x-user-email': 'staff.smoke@speedcopy.test',
    'x-location': 'Delhi, India',
    'user-agent': 'SpeedCopy Smoke Runner/1.0',
};

const state = {
    customerTicketId: '',
    vendorTicketId: '',
    refundId: '',
    payoutId: '',
    sessionId: '',
    customerUserId: `customer_${marker}`,
    vendorUserId: `vendor_${marker}`,
    orderId: new mongoose.Types.ObjectId(),
};

const connections = [];

const connectDb = async (uri) => {
    const conn = await mongoose
        .createConnection(uri, {
            family: 4,
            serverSelectionTimeoutMS: 5000,
        })
        .asPromise();
    connections.push(conn);
    return conn;
};

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const request = async (method, path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: actorHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    } catch (err) {
        throw new Error(`Invalid JSON from ${method} ${path}: ${text}`);
    }

    if (!response.ok) {
        throw new Error(
            `${method} ${path} failed with ${response.status}: ${json?.message || text || 'Unknown error'}`
        );
    }

    return json;
};

const seedData = async () => {
    const [notificationConn, vendorConn, financeConn, orderConn, adminConn] = await Promise.all([
        connectDb(process.env.MONGO_URI_NOTIFICATIONS),
        connectDb(process.env.MONGO_URI_VENDORS),
        connectDb(process.env.MONGO_URI_FINANCE),
        connectDb(process.env.MONGO_URI_ORDERS),
        connectDb(process.env.MONGO_URI_ADMIN),
    ]);

    await Promise.all([
        notificationConn.db.collection('tickets').deleteMany({
            $or: [{ subject: new RegExp(marker) }, { userId: { $in: [state.customerUserId, state.vendorUserId] } }],
        }),
        vendorConn.db.collection('vendororgs').deleteMany({ userId: state.vendorUserId }),
        financeConn.db.collection('payouts').deleteMany({ vendorId: state.vendorUserId }),
        financeConn.db.collection('wallets').deleteMany({ userId: state.customerUserId }),
        financeConn.db.collection('ledgers').deleteMany({ userId: state.customerUserId }),
        orderConn.db.collection('orders').deleteMany({ _id: state.orderId }),
        adminConn.db.collection('staffrefundrequests').deleteMany({
            $or: [{ orderId: String(state.orderId) }, { customerId: state.customerUserId }],
        }),
        adminConn.db.collection('staffsessions').deleteMany({ userId: actorHeaders['x-user-id'] }),
    ]);

    const now = new Date();
    const customerTicket = {
        userId: state.customerUserId,
        orderId: String(state.orderId),
        subject: `Order not delivered ${marker}`,
        description: 'Smoke test customer ticket',
        category: 'order_issue',
        status: 'open',
        priority: 'high',
        assignedTo: '',
        createdForRole: 'user',
        visibilityScope: 'customer',
        replies: [],
        attachments: [],
        metadata: { marker },
        createdAt: now,
        updatedAt: now,
    };
    const vendorTicket = {
        userId: state.vendorUserId,
        orderId: '',
        subject: `Payment not received ${marker}`,
        description: 'Smoke test vendor ticket',
        category: 'payment_issue',
        status: 'open',
        priority: 'high',
        assignedTo: '',
        createdForRole: 'vendor',
        visibilityScope: 'vendor_internal',
        replies: [],
        attachments: [],
        metadata: { marker },
        createdAt: now,
        updatedAt: now,
    };
    const payout = {
        vendorId: state.vendorUserId,
        amount: 12500,
        platformFee: 500,
        netAmount: 12000,
        currency: 'INR',
        status: 'pending',
        orderIds: [String(state.orderId)],
        periodStart: new Date('2026-04-01T00:00:00.000Z'),
        periodEnd: new Date('2026-04-30T00:00:00.000Z'),
        notes: marker,
        createdAt: now,
        updatedAt: now,
    };
    const order = {
        _id: state.orderId,
        orderNumber: `ORD-${marker.toUpperCase()}`,
        userId: state.customerUserId,
        items: [{ flowType: 'shopping', productId: 'smoke_product', qty: 1 }],
        total: 450,
        status: 'cancelled',
        paymentStatus: 'paid',
        customerFacingStatus: 'Cancelled',
        shippingAddress: { fullName: 'Smoke Test Customer' },
        timeline: [{ status: 'cancelled', note: 'Product damaged', timestamp: now }],
        createdAt: now,
        updatedAt: now,
    };
    const vendorOrg = {
        userId: state.vendorUserId,
        name: 'Print Hub Delhi Smoke',
        businessName: 'Print Hub Delhi Smoke',
        isApproved: true,
        isSuspended: false,
        deletedAt: null,
        priority: 5,
        healthScore: 92,
        createdAt: now,
        updatedAt: now,
    };

    const [customerTicketResult, vendorTicketResult, payoutResult] = await Promise.all([
        notificationConn.db.collection('tickets').insertOne(customerTicket),
        notificationConn.db.collection('tickets').insertOne(vendorTicket),
        financeConn.db.collection('payouts').insertOne(payout),
        orderConn.db.collection('orders').insertOne(order),
        vendorConn.db.collection('vendororgs').insertOne(vendorOrg),
    ]);

    state.customerTicketId = String(customerTicketResult.insertedId);
    state.vendorTicketId = String(vendorTicketResult.insertedId);
    state.payoutId = String(payoutResult.insertedId);
};

const checks = [
    {
        name: 'GET /auth/sessions',
        run: async () => {
            const json = await request('GET', '/auth/sessions');
            assert(Array.isArray(json.data), 'sessions response data must be an array');
            assert(json.data.length >= 1, 'sessions must contain at least one active session');
            state.sessionId = json.data[0].id;
        },
    },
    {
        name: 'DELETE /auth/session/:id',
        run: async () => {
            assert(state.sessionId, 'session id missing for delete');
            const json = await request('DELETE', `/auth/session/${state.sessionId}`);
            assert(json.success === true, 'delete session should succeed');
            assert(json.message === 'Session killed', 'delete session message mismatch');
        },
    },
    {
        name: 'GET /tickets',
        run: async () => {
            const json = await request('GET', '/tickets');
            assert(Array.isArray(json.data?.tickets), 'tickets data must contain tickets array');
            assert(
                json.data.tickets.some((ticket) => ticket._id === state.customerTicketId),
                'customer ticket must appear in list'
            );
        },
    },
    {
        name: 'GET /tickets/:id',
        run: async () => {
            const json = await request('GET', `/tickets/${state.customerTicketId}`);
            assert(json.data?._id === state.customerTicketId, 'ticket detail id mismatch');
        },
    },
    {
        name: 'POST /tickets/:id/reply',
        run: async () => {
            const json = await request('POST', `/tickets/${state.customerTicketId}/reply`, {
                message: 'We are looking into this',
            });
            assert(json.data?.status === 'in_progress', 'ticket reply should move status to in_progress');
            assert(Array.isArray(json.data?.replies) && json.data.replies.length >= 1, 'ticket reply missing');
        },
    },
    {
        name: 'POST /tickets/:id/escalate',
        run: async () => {
            const json = await request('POST', `/tickets/${state.customerTicketId}/escalate`, {
                reason: 'Customer is very upset, needs senior attention',
            });
            assert(json.data?.priority === 'urgent', 'ticket escalate should set urgent priority');
        },
    },
    {
        name: 'POST /tickets/:id/close',
        run: async () => {
            const json = await request('POST', `/tickets/${state.customerTicketId}/close`);
            assert(json.data?.status === 'resolved', 'ticket close should resolve ticket');
            assert(Boolean(json.data?.resolvedAt), 'ticket close should set resolvedAt');
        },
    },
    {
        name: 'GET /vendor-tickets',
        run: async () => {
            const json = await request('GET', '/vendor-tickets');
            assert(Array.isArray(json.data?.tickets), 'vendor tickets data must contain tickets array');
            assert(
                json.data.tickets.some((ticket) => ticket.id === state.vendorTicketId),
                'vendor ticket must appear in list'
            );
        },
    },
    {
        name: 'POST /vendor-tickets/:id/reply',
        run: async () => {
            const json = await request('POST', `/vendor-tickets/${state.vendorTicketId}/reply`, {
                message: 'We will process your payment by EOD',
            });
            assert(json.data?.id === state.vendorTicketId, 'vendor ticket reply id mismatch');
            assert(json.data?.status === 'in_progress', 'vendor ticket reply should set in_progress');
        },
    },
    {
        name: 'GET /refunds',
        run: async () => {
            const json = await request('GET', '/refunds');
            assert(Array.isArray(json.data), 'refunds data must be an array');
            const refund = json.data.find((item) => item.order === `ORD-${marker.toUpperCase()}`);
            assert(refund, 'refund queue must contain seeded cancelled paid order');
            state.refundId = refund.id;
        },
    },
    {
        name: 'POST /refunds/:id/escalate',
        run: async () => {
            assert(state.refundId, 'refund id missing for escalate');
            const json = await request('POST', `/refunds/${state.refundId}/escalate`);
            assert(json.data?.status === 'escalated', 'refund escalate should set escalated status');
        },
    },
    {
        name: 'POST /refunds/:id/approve',
        run: async () => {
            assert(state.refundId, 'refund id missing for approve');
            const json = await request('POST', `/refunds/${state.refundId}/approve`);
            assert(json.data?.status === 'approved', 'refund approve should set approved status');
            assert(Boolean(json.data?.approvedAt), 'refund approve should set approvedAt');
        },
    },
    {
        name: 'POST /wallet/credit',
        run: async () => {
            const json = await request('POST', '/wallet/credit', {
                userId: state.customerUserId,
                amount: 100,
                reason: 'Compensation for delay',
            });
            assert(json.data?.userId === state.customerUserId, 'wallet credit user mismatch');
            assert(Number(json.data?.newBalance) >= 100, 'wallet credit should increase balance');
        },
    },
    {
        name: 'POST /wallet/debit',
        run: async () => {
            const json = await request('POST', '/wallet/debit', {
                userId: state.customerUserId,
                amount: 50,
                reason: 'Correction entry',
            });
            assert(json.data?.userId === state.customerUserId, 'wallet debit user mismatch');
        },
    },
    {
        name: 'GET /wallet/ledger',
        run: async () => {
            const json = await request('GET', `/wallet/ledger?userId=${state.customerUserId}`);
            assert(Array.isArray(json.data), 'wallet ledger data must be an array');
            assert(json.data.length >= 3, 'wallet ledger should include refund, credit, and debit entries');
        },
    },
    {
        name: 'GET /payouts',
        run: async () => {
            const json = await request('GET', '/payouts');
            assert(Array.isArray(json.data), 'payouts data must be an array');
            assert(json.data.some((item) => item.id === state.payoutId), 'seeded payout must appear');
        },
    },
    {
        name: 'POST /payouts/issue-ticket',
        run: async () => {
            const json = await request('POST', '/payouts/issue-ticket', {
                payoutId: state.payoutId,
                issueDetails: 'Bank account details mismatch',
            });
            assert(Boolean(json.data?.ticketId), 'issue payout ticket must return ticketId');
            assert(json.data?.status === 'ticket_raised', 'issue payout ticket status mismatch');
        },
    },
];

const run = async () => {
    const results = [];
    try {
        await seedData();

        for (const check of checks) {
            try {
                await check.run();
                results.push({ name: check.name, status: 'PASS' });
            } catch (err) {
                results.push({ name: check.name, status: 'FAIL', error: err.message });
                break;
            }
        }
    } finally {
        await Promise.allSettled(connections.map((conn) => conn.close()));
    }

    const failed = results.find((result) => result.status === 'FAIL');
    for (const result of results) {
        if (result.status === 'PASS') {
            console.log(`PASS ${result.name}`);
        } else {
            console.log(`FAIL ${result.name}: ${result.error}`);
        }
    }

    if (failed) {
        process.exitCode = 1;
        return;
    }

    console.log(`Smoke test passed: ${results.length}/${checks.length} staff endpoint checks passed.`);
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
