const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    sendSuccess,
    sendCreated,
    sendNotFound,
    sendError,
} = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const AuditLog = require('../models/audit-log.model');
const config = require('../config');
const {
    normalizeStaffAssignment,
    getStaffRoleLabel,
    normalizePermissions,
} = require('../utils/permission-aliases');

const getAuthConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('auth'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getOrderConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_orders' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('order'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getNotifConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_notifications' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose
        .createConnection(config.getDbUri('notification'), {
            family: 4,
            serverSelectionTimeoutMS: 5000,
        })
        .asPromise();
};

const startOfToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};

// Staff Dashboard API
const getStaffDashboard = async (req, res, next) => {
    try {
        const { role = 'ops' } = req.query;
        const authConn = await getAuthConn();
        const [orderConn, notifConn] = await Promise.all([getOrderConn(), getNotifConn()]);
        const since = startOfToday();

        const [openTickets, vendorTickets, todayOrders, activeStaff, recentTickets, recentOrders] =
            await Promise.all([
                notifConn.db
                    .collection('tickets')
                    .countDocuments({
                        createdForRole: { $ne: 'vendor' },
                        status: { $in: ['open', 'in_progress'] },
                    }),
                notifConn.db
                    .collection('tickets')
                    .countDocuments({
                        createdForRole: 'vendor',
                        status: { $in: ['open', 'in_progress'] },
                    }),
                orderConn.db.collection('orders').countDocuments({ createdAt: { $gte: since } }),
                authConn.db
                    .collection('users')
                    .countDocuments({ role: { $in: ['staff', 'admin'] }, isActive: true }),
                notifConn.db.collection('tickets').find({}).sort({ updatedAt: -1 }).limit(5).toArray(),
                orderConn.db.collection('orders').find({}).sort({ updatedAt: -1 }).limit(5).toArray(),
            ]);

        const kpis = [
            { key: 'tickets_open', label: 'Open tickets', value: openTickets },
            { key: 'vendor_tickets_open', label: 'Vendor tickets', value: vendorTickets },
            { key: 'orders_today', label: 'Orders today', value: todayOrders },
            { key: 'active_staff', label: 'Active staff', value: activeStaff },
        ];

        const tasks = [
            ...recentTickets.map((ticket) => ({
                id: String(ticket._id),
                type: ticket.createdForRole === 'vendor' ? 'vendor_ticket' : 'ticket',
                title: ticket.subject || 'Support ticket',
                status: ticket.status || 'open',
                priority: ticket.priority || 'medium',
                updatedAt: ticket.updatedAt || ticket.createdAt,
            })),
            ...recentOrders.map((order) => ({
                id: String(order._id),
                type: 'order',
                title: order.orderNumber || String(order._id),
                status: order.status || 'pending',
                priority: order.clarification?.isRequired ? 'high' : 'medium',
                updatedAt: order.updatedAt || order.createdAt,
            })),
        ].slice(0, 8);

        const alerts = [];
        if (openTickets > 10) {
            alerts.push({
                type: 'ticket_backlog',
                severity: 'high',
                message: `${openTickets} support tickets need attention.`,
            });
        }
        if (vendorTickets > 5) {
            alerts.push({
                type: 'vendor_support_backlog',
                severity: 'medium',
                message: `${vendorTickets} vendor tickets are still open.`,
            });
        }

        const dashboardData = {
            role,
            kpis,
            tasks,
            alerts,
        };

        return sendSuccess(res, dashboardData, 'Dashboard data retrieved successfully');
    } catch (err) {
        next(err);
    }
};

const getStaff = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = { role: { $in: ['admin', 'staff'] } };
        if (req.query.team) filter['staffProfile.team'] = req.query.team;

        const [staff, total] = await Promise.all([
            conn.db
                .collection('users')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('users').countDocuments(filter),
        ]);

        const normalizedStaff = staff.map((member) => ({
            ...member,
            authRole: member.role,
            role: getStaffRoleLabel({
                role: member.role,
                team: member.staffProfile?.team,
                roleLabel: member.staffProfile?.roleLabel,
            }),
            permissions: normalizePermissions(member.staffProfile?.permissions || []),
            scopes: Array.isArray(member.staffProfile?.scopes) ? member.staffProfile.scopes : [],
        }));

        return sendSuccess(res, { staff: normalizedStaff, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

const getStaffOptions = async (req, res, next) => {
    try {
        return sendSuccess(res, {
            teams: [
                { value: 'ops', label: 'Operations' },
                { value: 'support', label: 'Support' },
                { value: 'finance', label: 'Finance' },
                { value: 'marketing', label: 'Marketing' },
            ],
            roles: [
                { value: 'Operations', authRole: 'staff', team: 'ops' },
                { value: 'Support', authRole: 'staff', team: 'support' },
                { value: 'Finance', authRole: 'staff', team: 'finance' },
                { value: 'Marketing', authRole: 'staff', team: 'marketing' },
                { value: 'Moderator', authRole: 'staff', team: 'support' },
                { value: 'Admin', authRole: 'admin', team: 'ops' },
                { value: 'SuperAdmin', authRole: 'super_admin', team: 'ops' },
            ],
            permissions: [
                { value: 'orders.view', label: 'Orders - Read', group: 'Orders' },
                { value: 'orders.manage', label: 'Orders - Write', group: 'Orders' },
                { value: 'vendors.view', label: 'Vendors - Read', group: 'Vendors' },
                { value: 'vendors.manage', label: 'Vendors - Write', group: 'Vendors' },
                { value: 'customers.view', label: 'Customers - Read', group: 'Customers' },
                { value: 'customers.manage', label: 'Customers - Write', group: 'Customers' },
                { value: 'tickets.view', label: 'Support - Read', group: 'Support' },
                { value: 'tickets.manage', label: 'Support - Write', group: 'Support' },
                { value: 'reports.view', label: 'Reports - Read', group: 'Reports' },
                { value: 'reports.export', label: 'Reports - Export', group: 'Reports' },
                { value: 'delivery.view', label: 'Delivery - Read', group: 'Delivery' },
                { value: 'delivery.manage', label: 'Delivery - Write', group: 'Delivery' },
                { value: 'control.manage', label: 'Platform - Manage', group: 'Platform' },
            ],
            scopes: [
                { value: 'global', label: 'Global Access' },
                { value: 'regional', label: 'Regional Access' },
                { value: 'store-specific', label: 'Store Specific' },
                { value: 'department-specific', label: 'Department Specific' },
            ],
        });
    } catch (err) {
        next(err);
    }
};

const createStaff = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const {
            name,
            email,
            password,
            role,
            phone,
            permissions = [],
            team = 'ops',
            scopes = [],
        } = req.body;
        const normalized = normalizeStaffAssignment({ role, team, permissions, scopes });
        const normalizedEmail = String(email || '')
            .trim()
            .toLowerCase();
        if (!name || !normalizedEmail || !password) {
            return sendError(res, 'Name, email, and password are required', 400);
        }

        const existing = await conn.db.collection('users').findOne({ email: normalizedEmail });
        if (existing) {
            return sendError(res, 'A user already exists with this email', 409);
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await conn.db.collection('users').insertOne({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            phone,
            role: normalized.authRole,
            isActive: true,
            staffProfile: {
                team: normalized.team,
                roleLabel: normalized.roleLabel,
                permissions: normalized.permissions,
                scopes: normalized.scopes,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.staff.create',
            targetType: 'staff',
            targetId: String(result.insertedId),
            metadata: {
                role: normalized.roleLabel,
                authRole: normalized.authRole,
                team: normalized.team,
                permissions: normalized.permissions,
                scopes: normalized.scopes,
            },
        });
        return sendCreated(
            res,
            {
                _id: result.insertedId,
                role: normalized.roleLabel,
                authRole: normalized.authRole,
                loginCredentials: {
                    email: normalizedEmail,
                    password,
                },
            },
            'Staff created'
        );
    } catch (err) {
        next(err);
    }
};

const updateStaffRole = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { role, permissions, scopes, team } = req.body;
        const existing = await conn.db
            .collection('users')
            .findOne({ _id: new mongoose.Types.ObjectId(req.params.id) });

        if (!existing) {
            return sendNotFound(res, 'Staff member not found');
        }

        const normalized = normalizeStaffAssignment({
            role: role || existing.staffProfile?.roleLabel || existing.role,
            team: team || existing.staffProfile?.team,
            permissions:
                permissions !== undefined ? permissions : existing.staffProfile?.permissions || [],
            scopes: scopes !== undefined ? scopes : existing.staffProfile?.scopes || [],
        });
        const update = { role: normalized.authRole, updatedAt: new Date() };
        if (role || permissions || scopes || team) {
            update.staffProfile = {
                team: normalized.team,
                roleLabel: normalized.roleLabel,
                permissions: normalized.permissions,
                scopes: normalized.scopes,
            };
        }
        await conn.db
            .collection('users')
            .updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: update });
        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.staff.update_role',
            targetType: 'staff',
            targetId: req.params.id,
            metadata: {
                role: normalized.roleLabel,
                authRole: normalized.authRole,
                permissions: normalized.permissions,
                scopes: normalized.scopes,
                team: normalized.team,
            },
        });
        return sendSuccess(res, null, 'Role updated');
    } catch (err) {
        next(err);
    }
};

const updateStaffStatus = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { isActive = true, reason } = req.body;
        const result = await conn.db.collection('users').updateOne(
            { _id: new mongoose.Types.ObjectId(req.params.id), role: { $in: ['admin', 'staff'] } },
            {
                $set: {
                    isActive: Boolean(isActive),
                    status: isActive ? 'active' : 'inactive',
                    suspendedReason: isActive ? null : reason,
                    updatedAt: new Date(),
                },
            }
        );

        if (!result.matchedCount) {
            return sendNotFound(res, 'Staff member not found');
        }

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: isActive ? 'admin.staff.activate' : 'admin.staff.deactivate',
            targetType: 'staff',
            targetId: req.params.id,
            reason,
        });

        return sendSuccess(
            res,
            { id: req.params.id, isActive: Boolean(isActive) },
            `Staff member ${isActive ? 'activated' : 'deactivated'}`
        );
    } catch (err) {
        next(err);
    }
};

const deleteStaff = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const result = await conn.db
            .collection('users')
            .deleteOne({
                _id: new mongoose.Types.ObjectId(req.params.id),
                role: { $in: ['admin', 'staff'] },
            });

        if (!result.deletedCount) {
            return sendNotFound(res, 'Staff member not found');
        }

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.staff.delete',
            targetType: 'staff',
            targetId: req.params.id,
        });

        return sendSuccess(res, null, 'Staff member deleted');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getStaff,
    getStaffOptions,
    createStaff,
    updateStaffRole,
    updateStaffStatus,
    deleteStaff,
    getStaffDashboard,
};
