const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();
const financeProxy = createServiceProxy(config.services.finance, {
  proxyReqPathResolver: (req) => `/api/admin${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.finance),
});
const adminService = config.services.admin;
const staffCouponProxy = createServiceProxy(adminService, {
  proxyReqPathResolver: (req) => `/api/staff/coupons${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(adminService),
});
const isMarketingStaff = (req) => {
  const role = String(req.headers['x-user-role'] || '').trim().toLowerCase();
  const team = String(req.headers['x-user-portal-role'] || req.headers['x-user-team'] || '').trim().toLowerCase();
  const permissions = String(req.headers['x-user-permissions'] || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (role !== 'staff') return false;
  if (team === 'marketing') return true;
  return permissions.includes('coupons.view') || permissions.includes('coupons.create');
};

router.use('/finance', authenticate, financeProxy);
router.use('/refunds', authenticate, financeProxy);
router.get('/coupons', authenticate, (req, res, next) => {
  if (String(req.headers['x-user-role'] || '').trim().toLowerCase() === 'staff') {
    return staffCouponProxy(req, res, next);
  }
  if (isMarketingStaff(req)) return staffCouponProxy(req, res, next);
  return next();
});
router.post('/coupons', authenticate, (req, res, next) => {
  if (String(req.headers['x-user-role'] || '').trim().toLowerCase() === 'staff') {
    return staffCouponProxy(req, res, next);
  }
  if (isMarketingStaff(req)) return staffCouponProxy(req, res, next);
  return next();
});

/**
 * @swagger
 * tags:
 *   - name: Admin SLA
 *     description: Admin SLA policy and breach management
 *   - name: Admin Tickets
 *     description: Admin support ticket management
 *   - name: Admin Delivery
 *     description: Admin delivery partner management
 *   - name: Admin Coupons
 *     description: Admin coupon management
 * 
 * /api/admin/sla/risks:
 *   get:
 *     summary: Get orders at risk of SLA breach
 *     tags: [Admin SLA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: At-risk orders
 * 
 * /api/admin/sla/policies:
 *   get:
 *     summary: Get all SLA policies
 *     tags: [Admin SLA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: SLA policies list
 *   post:
 *     summary: Create an SLA policy
 *     tags: [Admin SLA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Policy created
 * 
 * /api/admin/sla/metrics:
 *   get:
 *     summary: Get SLA compliance metrics
 *     tags: [Admin SLA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: SLA metrics
 * 
 * /api/admin/sla/breaches:
 *   get:
 *     summary: Get SLA breach records
 *     tags: [Admin SLA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: SLA breaches
 * 
 * /api/admin/sla/{orderId}/escalate:
 *   post:
 *     summary: Escalate an order for SLA breach
 *     tags: [Admin SLA]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order escalated
 * 
 * /api/admin/sla/{orderId}/compensate:
 *   post:
 *     summary: Record SLA compensation for an order
 *     tags: [Admin SLA]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Compensation recorded
 * 
 * /api/admin/tickets:
 *   get:
 *     summary: Get all support tickets
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Support tickets
 * 
 * /api/admin/tickets/stats:
 *   get:
 *     summary: Get ticket statistics
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ticket statistics
 * 
 * /api/admin/tickets/agents/performance:
 *   get:
 *     summary: Get per-agent ticket performance metrics
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Agent performance data
 * 
 * /api/admin/tickets/{ticketId}:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket details
 * 
 * /api/admin/tickets/{ticketId}/assign:
 *   patch:
 *     summary: Assign ticket to a staff agent
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket assigned
 * 
 * /api/admin/tickets/{ticketId}/escalate:
 *   patch:
 *     summary: Escalate a ticket
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket escalated
 * 
 * /api/admin/tickets/{ticketId}/resolve:
 *   patch:
 *     summary: Resolve a ticket
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket resolved
 * 
 * /api/admin/tickets/{ticketId}/messages:
 *   post:
 *     summary: Add admin message to a ticket
 *     tags: [Admin Tickets]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message added
 * 
 * /api/admin/delivery/partners:
 *   get:
 *     summary: Get all delivery partners
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Delivery partners
 *   post:
 *     summary: Create a delivery partner
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Partner created
 * 
 * /api/admin/delivery/sla-metrics:
 *   get:
 *     summary: Get delivery SLA metrics
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: SLA metrics
 * 
 * /api/admin/delivery/partners/{partnerId}:
 *   get:
 *     summary: Get delivery partner details
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner details
 *   put:
 *     summary: Update delivery partner
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner updated
 *   delete:
 *     summary: Soft-delete delivery partner
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner deleted
 * 
 * /api/admin/delivery/partners/{partnerId}/suspend:
 *   patch:
 *     summary: Suspend a delivery partner
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner suspended
 * 
 * /api/admin/delivery/partners/{partnerId}/resume:
 *   patch:
 *     summary: Resume a suspended delivery partner
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner resumed
 * 
 * /api/admin/delivery/partners/{partnerId}/zones:
 *   post:
 *     summary: Update zone assignments for a delivery partner
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Zones updated
 * 
 * /api/admin/delivery/partners/{partnerId}/payout-rate:
 *   patch:
 *     summary: Update payout rate for a delivery partner
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payout rate updated
 * 
 * /api/admin/delivery/partners/{partnerId}/analytics:
 *   get:
 *     summary: Get delivery partner analytics
 *     tags: [Admin Delivery]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner analytics
 * 
 * /api/admin/coupons:
 *   get:
 *     summary: Get all coupons
 *     tags: [Admin Coupons]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Coupons
 *   post:
 *     summary: Create a coupon
 *     tags: [Admin Coupons]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Coupon created
 * 
 * /api/admin/coupons/{id}:
 *   put:
 *     summary: Update a coupon
 *     tags: [Admin Coupons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Coupon updated
 *   delete:
 *     summary: Delete a coupon
 *     tags: [Admin Coupons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Coupon deleted
 * 
 * /api/admin/coupons/{id}/usage:
 *   get:
 *     summary: Get coupon usage analytics
 *     tags: [Admin Coupons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Coupon usage details
 */

router.use(
  '/',
  authenticate,
  createServiceProxy(config.services.admin, {
    proxyReqPathResolver: (req) => `/api/admin${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.admin),
    proxyErrorMessage: 'Admin service is unavailable. Please try again shortly.',
  })
);

module.exports = router;
