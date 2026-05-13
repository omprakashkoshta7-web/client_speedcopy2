const { Router } = require('express');
const dashboard = require('../controllers/admin.controller');
const adminProfiles = require('../controllers/admin-profile.controller');
const orders = require('../controllers/orders.controller');
const customers = require('../controllers/customers.controller');
const vendors = require('../controllers/vendors.controller');
const staff = require('../controllers/staff.controller');
const control = require('../controllers/control.controller');
const reports = require('../controllers/reports.controller');
const sla = require('../controllers/sla.controller');
const tickets = require('../controllers/tickets.controller');
const delivery = require('../controllers/delivery.controller');
const coupons = require('../controllers/coupons.controller');
const risk = require('../controllers/risk.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/admin.middleware');
const {
    requireAdminPermission,
    requireSuperAdmin,
} = require('../middlewares/admin-permissions.middleware');
const { attachmentUpload } = require('../config/upload');

const router = Router();
router.use(authenticate, adminOnly);

/**
 * @swagger
 * tags:
 *   - name: Admin Dashboard
 *     description: Platform overview stats
 *   - name: Admin Orders
 *     description: Order management
 *   - name: Admin Vendors
 *     description: Vendor management
 *   - name: Admin Customers
 *     description: Customer management
 *   - name: Admin Staff
 *     description: Staff management
 *   - name: Admin Control
 *     description: System control flags
 *   - name: Admin Reports
 *     description: Reports and audit logs
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get platform dashboard stats
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/dashboard', dashboard.getDashboard);

/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Get current admin profile
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile
 */
router.get('/profile', adminProfiles.getMyProfile);

/**
 * @swagger
 * /api/admin/profile:
 *   patch:
 *     summary: Update current admin profile
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile updated
 */
router.patch('/profile', adminProfiles.updateMyProfile);

/**
 * @swagger
 * /api/admin/profile/password:
 *   patch:
 *     summary: Change current admin password
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin password updated
 */
router.patch('/profile/password', adminProfiles.changeMyPassword);

/**
 * @swagger
 * /api/admin/profile/change-password:
 *   post:
 *     summary: Change current admin password
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin password updated
 */
router.post('/profile/change-password', adminProfiles.changeMyPassword);
router.patch('/profile/change-password', adminProfiles.changeMyPassword);

/**
 * @swagger
 * /api/admin/profiles:
 *   get:
 *     summary: List admin profiles
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profiles
 */
router.get('/profiles', requireAdminPermission('profiles.view'), adminProfiles.listProfiles);

/**
 * @swagger
 * /api/admin/profiles:
 *   post:
 *     summary: Create an admin profile
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Admin profile created
 */
router.post('/profiles', requireAdminPermission('profiles.manage'), adminProfiles.createProfile);

/**
 * @swagger
 * /api/admin/profiles/{id}:
 *   get:
 *     summary: Get an admin profile by id
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin profile
 */
router.get('/profiles/:id', requireAdminPermission('profiles.view'), adminProfiles.getProfileById);

/**
 * @swagger
 * /api/admin/profiles/{id}:
 *   patch:
 *     summary: Update an admin profile
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin profile updated
 */
router.patch('/profiles/:id', requireAdminPermission('profiles.manage'), adminProfiles.updateProfileById);

/**
 * @swagger
 * /api/admin/profiles/{id}:
 *   delete:
 *     summary: Delete an admin profile
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Admin profile deleted
 */
router.delete(
    '/profiles/:id',
    requireAdminPermission('profiles.manage'),
    requireSuperAdmin,
    adminProfiles.deleteProfileById
);

// ─── Orders ───────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders (filterable)
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated orders
 */
/**
 * @swagger
 * /orders:
 *   get:
 *     summary: GET /orders
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/orders', requireAdminPermission('orders.view'), orders.getOrders);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 */
router.get('/orders/:id', requireAdminPermission('orders.view'), orders.getOrder);

/**
 * @swagger
 * /api/admin/orders/{id}/reassign-vendor:
 *   patch:
 *     summary: Reassign order to a different vendor
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorId]
 *             properties:
 *               vendorId: { type: string }
 *               storeId: { type: string }
 *     responses:
 *       200:
 *         description: Vendor reassigned
 */
/**
 * @swagger
 * /orders/{id}/reassign-vendor:
 *   patch:
 *     summary: PATCH /orders/{id}/reassign-vendor
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/orders/:id/reassign-vendor', requireAdminPermission('orders.manage'), orders.reassignVendor);

/**
 * @swagger
 * /api/admin/orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled
 */
/**
 * @swagger
 * /orders/{id}/cancel:
 *   patch:
 *     summary: PATCH /orders/{id}/cancel
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/orders/:id/cancel', requireAdminPermission('orders.manage'), orders.cancelOrder);

/**
 * @swagger
 * /api/admin/orders/{id}/refund:
 *   patch:
 *     summary: Mark order as refunded
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refundId: { type: string }
 *     responses:
 *       200:
 *         description: Order refunded
 */
/**
 * @swagger
 * /orders/{id}/refund:
 *   patch:
 *     summary: PATCH /orders/{id}/refund
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/orders/:id/refund', requireAdminPermission('orders.manage'), orders.refundOrder);

// ─── Vendors ──────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/vendors:
 *   get:
 *     summary: Get all vendors
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isApproved
 *         schema: { type: boolean }
 *       - in: query
 *         name: isSuspended
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated vendors
 */
/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: GET /vendors
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/vendors', requireAdminPermission('vendors.view'), vendors.getVendors);

/**
 * @swagger
 * /api/admin/vendors:
 *   post:
 *     summary: Create a new vendor
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               location: { type: string }
 *               tier: { type: string, enum: [gold, silver, bronze], default: bronze }
 *     responses:
 *       201:
 *         description: Vendor created successfully
 */
router.post('/vendors', requireAdminPermission('vendors.manage'), vendors.createVendor);

/**
 * @swagger
 * /api/admin/vendors/{id}:
 *   get:
 *     summary: Get vendor by ID
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vendor details
 */
router.get('/vendors/:id', requireAdminPermission('vendors.view'), vendors.getVendor);

/**
 * @swagger
 * /api/admin/vendors/{id}/approve:
 *   patch:
 *     summary: Approve a vendor
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Vendor approved
 */
router.patch('/vendors/:id/approve', requireAdminPermission('vendors.manage'), vendors.approveVendor);

/**
 * @swagger
 * /api/admin/vendors/{id}/reject:
 *   patch:
 *     summary: Reject a vendor
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Vendor rejected
 */
router.patch('/vendors/:id/reject', requireAdminPermission('vendors.manage'), vendors.rejectVendor);

/**
 * @swagger
 * /api/admin/vendors/{id}/suspend:
 *   patch:
 *     summary: Suspend a vendor
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Vendor suspended
 */
/**
 * @swagger
 * /vendors/{id}/suspend:
 *   patch:
 *     summary: PATCH /vendors/{id}/suspend
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/vendors/:id/suspend', requireAdminPermission('vendors.manage'), vendors.suspendVendor);

/**
 * @swagger
 * /api/admin/vendors/{id}/priority:
 *   patch:
 *     summary: Set vendor assignment priority
 *     tags: [Admin Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [priority]
 *             properties:
 *               priority: { type: integer }
 *     responses:
 *       200:
 *         description: Priority updated
 */
/**
 * @swagger
 * /vendors/{id}/priority:
 *   patch:
 *     summary: PATCH /vendors/{id}/priority
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/vendors/:id/priority', requireAdminPermission('vendors.manage'), vendors.setPriority);

// ─── Customers ────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated customers
 */
/**
 * @swagger
 * /customers:
 *   get:
 *     summary: GET /customers
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/customers', requireAdminPermission('customers.view'), customers.getCustomers);

/**
 * @swagger
 * /api/admin/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer details
 */
router.get('/customers/:id', requireAdminPermission('customers.view'), customers.getCustomer);

/**
 * @swagger
 * /api/admin/customers/{id}/restrict:
 *   patch:
 *     summary: Restrict or activate a customer account
 *     tags: [Admin Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Customer status updated
 */
/**
 * @swagger
 * /customers/{id}/restrict:
 *   patch:
 *     summary: PATCH /customers/{id}/restrict
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/customers/:id/restrict', requireAdminPermission('customers.manage'), customers.restrictCustomer);

// ─── Staff ────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/staff:
 *   get:
 *     summary: Get all staff members
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Staff list
 *   post:
 *     summary: Create a staff member
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string, enum: [staff, admin] }
 *     responses:
 *       201:
 *         description: Staff created
 */
/**
 * @swagger
 * /staff:
 *   get:
 *     summary: GET /staff
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/staff', requireAdminPermission('staff.view'), staff.getStaff);
router.get('/staff/options', requireAdminPermission('staff.view'), staff.getStaffOptions);
router.post('/staff', requireAdminPermission('staff.manage'), staff.createStaff);
router.patch('/staff/:id/status', requireAdminPermission('staff.manage'), staff.updateStaffStatus);
router.delete('/staff/:id', requireAdminPermission('staff.manage'), staff.deleteStaff);

/**
 * @swagger
 * /api/admin/staff/{id}/role:
 *   patch:
 *     summary: Update staff member role
 *     tags: [Admin Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [staff, admin, super_admin] }
 *     responses:
 *       200:
 *         description: Role updated
 */
/**
 * @swagger
 * /staff/{id}/role:
 *   patch:
 *     summary: PATCH /staff/{id}/role
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/staff/:id/role', requireAdminPermission('staff.manage'), staff.updateStaffRole);

// ─── System Control ───────────────────────────────────────

/**
 * @swagger
 * /api/admin/control:
 *   get:
 *     summary: Get current system state (flags, paused cities)
 *     tags: [Admin Control]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System state
 */
router.get('/control', requireAdminPermission('control.view'), control.getState);

/**
 * @swagger
 * /api/admin/control/order-intake:
 *   patch:
 *     summary: Enable or disable order intake globally
 *     tags: [Admin Control]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled: { type: boolean }
 *     responses:
 *       200:
 *         description: Order intake updated
 */
router.patch('/control/order-intake', requireAdminPermission('control.manage'), control.setOrderIntake);
router.patch('/control/vendor-intake', requireAdminPermission('control.manage'), control.setVendorIntake);
/**
 * @swagger
 * /control/kill-switch:
 *   patch:
 *     summary: PATCH /control/kill-switch
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/control/kill-switch', requireSuperAdmin, control.setKillSwitch);

/**
 * @swagger
 * /api/admin/control/city-pause:
 *   patch:
 *     summary: Pause or resume orders for a city
 *     tags: [Admin Control]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [city, paused]
 *             properties:
 *               city: { type: string }
 *               paused: { type: boolean }
 *     responses:
 *       200:
 *         description: City pause updated
 */
/**
 * @swagger
 * /control/city-pause:
 *   patch:
 *     summary: PATCH /control/city-pause
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/control/city-pause', requireAdminPermission('control.manage'), control.setCityPause);

/**
 * @swagger
 * /api/admin/control/feature-flags:
 *   patch:
 *     summary: Update feature flags
 *     tags: [Admin Control]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gifting: { type: boolean }
 *               shopping: { type: boolean }
 *               printing: { type: boolean }
 *               referrals: { type: boolean }
 *               wallet: { type: boolean }
 *     responses:
 *       200:
 *         description: Feature flags updated
 */
/**
 * @swagger
 * /control/feature-flags:
 *   patch:
 *     summary: PATCH /control/feature-flags
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/control/feature-flags', requireSuperAdmin, control.setFeatureFlags);
router.get('/control/retention-policy', requireAdminPermission('control.view'), control.getRetentionPolicy);
router.patch('/control/retention-policy', requireAdminPermission('control.manage'), control.setRetentionPolicy);
router.get('/control/compliance-summary', requireAdminPermission('control.view'), control.getComplianceSummary);

// ─── Risk / Abuse ─────────────────────────────────────────
router.get('/risk/cases', requireAdminPermission('risk.view'), risk.getCases);
router.get('/risk/cases/summary', requireAdminPermission('risk.view'), risk.getSummary);
router.get('/risk/cases/:id', requireAdminPermission('risk.view'), risk.getCase);
router.post('/risk/cases', requireAdminPermission('risk.manage'), risk.createCase);
router.patch('/risk/cases/:id', requireAdminPermission('risk.manage'), risk.updateCase);
router.post('/risk/cases/:id/actions', requireAdminPermission('risk.manage'), risk.addCaseAction);

// ─── Reports ──────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Get revenue and order reports
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date, example: '2026-01-01' }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date, example: '2026-12-31' }
 *     responses:
 *       200:
 *         description: Revenue by day, orders by status, orders by flow
 */
router.get('/reports', requireAdminPermission('reports.view'), reports.getReports);
router.get('/reports/referrals', requireAdminPermission('reports.view'), reports.getReferralReport);
router.get('/reports/export', requireAdminPermission('reports.export'), reports.exportReports);

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit log entries
 */
router.get('/audit-logs', requireAdminPermission('reports.view'), reports.getAuditLogs);

// ═══════════════════════════════════════════════════════════
// SLA Management (7 endpoints)
// ═══════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   - name: Admin SLA
 *     description: SLA policy management and breach tracking
 */

/**
 * @swagger
 * /api/admin/sla/risks:
 *   get:
 *     summary: Get orders at risk of SLA breach
 *     tags: [Admin SLA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: At-risk orders with severity levels
 */
router.get('/sla/risks', requireAdminPermission('sla.view'), sla.getRisks);

/**
 * @swagger
 * /api/admin/sla/policies:
 *   get:
 *     summary: Get all SLA policies
 *     tags: [Admin SLA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: flowType
 *         schema: { type: string, enum: [printing, gifting, shopping, all] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: SLA policies list
 *   post:
 *     summary: Create an SLA policy
 *     tags: [Admin SLA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, flowType, fromStatus, toStatus, maxMinutes, warningMinutes]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               flowType: { type: string, enum: [printing, gifting, shopping, all] }
 *               fromStatus: { type: string }
 *               toStatus: { type: string }
 *               maxMinutes: { type: integer }
 *               warningMinutes: { type: integer }
 *               escalationLevel: { type: string, enum: [low, medium, high, critical] }
 *               compensationType: { type: string, enum: [none, refund, wallet_credit, coupon] }
 *               compensationValue: { type: number }
 *     responses:
 *       201:
 *         description: Policy created
 */
/**
 * @swagger
 * /sla/policies:
 *   get:
 *     summary: GET /sla/policies
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/sla/policies', requireAdminPermission('sla.view'), sla.getPolicies);
router.post('/sla/policies', requireAdminPermission('sla.manage'), sla.createPolicy);

/**
 * @swagger
 * /api/admin/sla/metrics:
 *   get:
 *     summary: Get SLA compliance metrics
 *     tags: [Admin SLA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: SLA metrics and breach statistics
 */
router.get('/sla/metrics', requireAdminPermission('sla.view'), sla.getMetrics);

/**
 * @swagger
 * /api/admin/sla/breaches:
 *   get:
 *     summary: Get SLA breach records
 *     tags: [Admin SLA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [warning, breach, critical] }
 *       - in: query
 *         name: flowType
 *         schema: { type: string }
 *       - in: query
 *         name: isEscalated
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated SLA breaches
 */
/**
 * @swagger
 * /sla/breaches:
 *   get:
 *     summary: GET /sla/breaches
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/sla/breaches', requireAdminPermission('sla.view'), sla.getBreaches);

/**
 * @swagger
 * /api/admin/sla/{orderId}/escalate:
 *   post:
 *     summary: Escalate an order for SLA breach
 *     tags: [Admin SLA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note: { type: string }
 *               policyId: { type: string }
 *     responses:
 *       200:
 *         description: Order escalated
 */
/**
 * @swagger
 * /sla/{orderId}/escalate:
 *   post:
 *     summary: POST /sla/{orderId}/escalate
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/sla/:orderId/escalate', requireAdminPermission('sla.manage'), sla.escalateOrder);

/**
 * @swagger
 * /api/admin/sla/{orderId}/compensate:
 *   post:
 *     summary: Record SLA compensation for an order
 *     tags: [Admin SLA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [compensationType, compensationValue]
 *             properties:
 *               compensationType: { type: string, enum: [refund, wallet_credit, coupon] }
 *               compensationValue: { type: number }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Compensation recorded
 */
/**
 * @swagger
 * /sla/{orderId}/compensate:
 *   post:
 *     summary: POST /sla/{orderId}/compensate
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/sla/:orderId/compensate', requireAdminPermission('sla.manage'), sla.compensateOrder);

// ═══════════════════════════════════════════════════════════
// Support Tickets (8 endpoints)
// ═══════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   - name: Admin Tickets
 *     description: Support ticket management
 */

/**
 * @swagger
 * /api/admin/tickets:
 *   get:
 *     summary: Get all support tickets (filterable)
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, in_progress, resolved, closed] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, urgent] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated tickets
 */
/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: GET /tickets
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/tickets', requireAdminPermission('tickets.view'), tickets.getTickets);

/**
 * @swagger
 * /api/admin/tickets/stats:
 *   get:
 *     summary: Get ticket statistics (by status, category, priority, resolution time)
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket statistics
 */
router.get('/tickets/stats', requireAdminPermission('tickets.view'), tickets.getStats);

/**
 * @swagger
 * /api/admin/tickets/agents/performance:
 *   get:
 *     summary: Get per-agent ticket performance metrics
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agent performance data
 */
router.get(
    '/tickets/agents/performance',
    requireAdminPermission('tickets.view'),
    tickets.getAgentPerformance
);

/**
 * @swagger
 * /api/admin/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket details
 */
router.get('/tickets/:ticketId', requireAdminPermission('tickets.view'), tickets.getTicket);

/**
 * @swagger
 * /api/admin/tickets/{ticketId}/assign:
 *   patch:
 *     summary: Assign ticket to a staff agent
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignedTo]
 *             properties:
 *               assignedTo: { type: string }
 *     responses:
 *       200:
 *         description: Ticket assigned
 */
/**
 * @swagger
 * /tickets/{ticketId}/assign:
 *   patch:
 *     summary: PATCH /tickets/{ticketId}/assign
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/tickets/:ticketId/assign', requireAdminPermission('tickets.manage'), tickets.assignTicket);

/**
 * @swagger
 * /api/admin/tickets/{ticketId}/escalate:
 *   patch:
 *     summary: Escalate a ticket (set priority to urgent)
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Ticket escalated
 */
/**
 * @swagger
 * /tickets/{ticketId}/escalate:
 *   patch:
 *     summary: PATCH /tickets/{ticketId}/escalate
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch(
    '/tickets/:ticketId/escalate',
    requireAdminPermission('tickets.manage'),
    tickets.escalateTicket
);

/**
 * @swagger
 * /api/admin/tickets/{ticketId}/resolve:
 *   patch:
 *     summary: Resolve a ticket
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution: { type: string }
 *     responses:
 *       200:
 *         description: Ticket resolved
 */
/**
 * @swagger
 * /tickets/{ticketId}/resolve:
 *   patch:
 *     summary: PATCH /tickets/{ticketId}/resolve
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch('/tickets/:ticketId/resolve', requireAdminPermission('tickets.manage'), tickets.resolveTicket);

/**
 * @swagger
 * /api/admin/tickets/{ticketId}/messages:
 *   post:
 *     summary: Add admin message to a ticket
 *     tags: [Admin Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *               attachments: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Message added
 */
/**
 * @swagger
 * /tickets/{ticketId}/messages:
 *   post:
 *     summary: POST /tickets/{ticketId}/messages
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/tickets/:ticketId/messages', requireAdminPermission('tickets.manage'), tickets.addMessage);
router.post(
    '/tickets/uploads/attachments',
    requireAdminPermission('tickets.manage'),
    attachmentUpload.array('attachments', 10),
    tickets.uploadAttachments
);

// ═══════════════════════════════════════════════════════════
// Delivery Partners (11 endpoints)
// ═══════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   - name: Admin Delivery
 *     description: Delivery partner management
 */

/**
 * @swagger
 * /api/admin/delivery/partners:
 *   get:
 *     summary: Get all delivery partners
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated delivery partners
 *   post:
 *     summary: Create a delivery partner
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               vehicleType: { type: string }
 *               zoneAssignments: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Partner created
 */
/**
 * @swagger
 * /delivery/partners:
 *   get:
 *     summary: GET /delivery/partners
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/delivery/partners', requireAdminPermission('delivery.view'), delivery.getPartners);
router.post('/delivery/partners', requireAdminPermission('delivery.manage'), delivery.createPartner);

/**
 * @swagger
 * /api/admin/delivery/sla-metrics:
 *   get:
 *     summary: Get delivery SLA metrics (success rate, avg time)
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Delivery SLA metrics
 */
router.get('/delivery/sla-metrics', requireAdminPermission('delivery.view'), delivery.getSlaMetrics);

/**
 * @swagger
 * /api/admin/delivery/partners/{partnerId}:
 *   get:
 *     summary: Get delivery partner details
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner details with profile and recent tasks
 *   put:
 *     summary: Update delivery partner
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               vehicleType: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Partner updated
 *   delete:
 *     summary: Remove (soft-delete) delivery partner
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner removed
 */
/**
 * @swagger
 * /delivery/partners/{partnerId}:
 *   get:
 *     summary: GET /delivery/partners/{partnerId}
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/delivery/partners/:partnerId', requireAdminPermission('delivery.view'), delivery.getPartner);
router.put('/delivery/partners/:partnerId', requireAdminPermission('delivery.manage'), delivery.updatePartner);
router.delete(
    '/delivery/partners/:partnerId',
    requireAdminPermission('delivery.manage'),
    delivery.deletePartner
);

/**
 * @swagger
 * /api/admin/delivery/partners/{partnerId}/suspend:
 *   patch:
 *     summary: Suspend a delivery partner
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Partner suspended
 */
/**
 * @swagger
 * /delivery/partners/{partnerId}/suspend:
 *   patch:
 *     summary: PATCH /delivery/partners/{partnerId}/suspend
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch(
    '/delivery/partners/:partnerId/suspend',
    requireAdminPermission('delivery.manage'),
    delivery.suspendPartner
);

/**
 * @swagger
 * /api/admin/delivery/partners/{partnerId}/resume:
 *   patch:
 *     summary: Resume a suspended delivery partner
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner resumed
 */
router.patch(
    '/delivery/partners/:partnerId/resume',
    requireAdminPermission('delivery.manage'),
    delivery.resumePartner
);

/**
 * @swagger
 * /api/admin/delivery/partners/{partnerId}/zones:
 *   post:
 *     summary: Update zone assignments for a delivery partner
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [zones]
 *             properties:
 *               zones: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Zones updated
 */
/**
 * @swagger
 * /delivery/partners/{partnerId}/zones:
 *   post:
 *     summary: POST /delivery/partners/{partnerId}/zones
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post(
    '/delivery/partners/:partnerId/zones',
    requireAdminPermission('delivery.manage'),
    delivery.updateZones
);

/**
 * @swagger
 * /api/admin/delivery/partners/{partnerId}/payout-rate:
 *   patch:
 *     summary: Update payout rate for a delivery partner
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payoutRatePerKm: { type: number }
 *               payoutRatePerOrder: { type: number }
 *     responses:
 *       200:
 *         description: Payout rate updated
 */
/**
 * @swagger
 * /delivery/partners/{partnerId}/payout-rate:
 *   patch:
 *     summary: PATCH /delivery/partners/{partnerId}/payout-rate
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.patch(
    '/delivery/partners/:partnerId/payout-rate',
    requireAdminPermission('delivery.manage'),
    delivery.updatePayoutRate
);

/**
 * @swagger
 * /api/admin/delivery/partners/{partnerId}/analytics:
 *   get:
 *     summary: Get delivery partner analytics
 *     tags: [Admin Delivery]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner analytics (tasks, success rate, avg time)
 */
router.get(
    '/delivery/partners/:partnerId/analytics',
    requireAdminPermission('delivery.view'),
    delivery.getPartnerAnalytics
);

// ═══════════════════════════════════════════════════════════
// Coupons (5 endpoints)
// ═══════════════════════════════════════════════════════════

/**
 * @swagger
 * tags:
 *   - name: Admin Coupons
 *     description: Coupon management
 */

/**
 * @swagger
 * /api/admin/coupons:
 *   get:
 *     summary: Get all coupons
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated coupons
 *   post:
 *     summary: Create a coupon
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discountType, discountValue]
 *             properties:
 *               code: { type: string }
 *               description: { type: string }
 *               discountType: { type: string, enum: [percentage, flat] }
 *               discountValue: { type: number }
 *               maxDiscount: { type: number }
 *               minOrderValue: { type: number }
 *               applicableFlows: { type: array, items: { type: string, enum: [printing, gifting, shopping] } }
 *               usageLimit: { type: integer }
 *               perUserLimit: { type: integer }
 *               isActive: { type: boolean }
 *               expiresAt: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Coupon created
 */
/**
 * @swagger
 * /coupons:
 *   get:
 *     summary: GET /coupons
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/coupons', requireAdminPermission('coupons.view'), coupons.getCoupons);
router.post('/coupons', requireAdminPermission('coupons.manage'), coupons.createCoupon);

/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   put:
 *     summary: Update a coupon
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description: { type: string }
 *               discountType: { type: string, enum: [percentage, flat] }
 *               discountValue: { type: number }
 *               maxDiscount: { type: number }
 *               minOrderValue: { type: number }
 *               applicableFlows: { type: array, items: { type: string } }
 *               usageLimit: { type: integer }
 *               perUserLimit: { type: integer }
 *               isActive: { type: boolean }
 *               expiresAt: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Coupon updated
 *   delete:
 *     summary: Delete a coupon
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Coupon deleted
 */
/**
 * @swagger
 * /coupons/{id}:
 *   put:
 *     summary: PUT /coupons/{id}
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.put('/coupons/:id', requireAdminPermission('coupons.manage'), coupons.updateCoupon);
router.delete('/coupons/:id', requireAdminPermission('coupons.manage'), coupons.deleteCoupon);

/**
 * @swagger
 * /api/admin/coupons/{id}/usage:
 *   get:
 *     summary: Get coupon usage analytics
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Coupon usage details with order list
 */
router.get('/coupons/:id/usage', requireAdminPermission('coupons.view'), coupons.getCouponUsage);

module.exports = router;
