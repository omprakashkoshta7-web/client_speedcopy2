const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  buildProxyReqOptDecorator,
  createServiceProxy,
} = require('../utils/proxy');
const {
  notificationReadLimiter,
  notificationWriteLimiter,
} = require('../middlewares/rate-limit');

const router = Router();
const vendorService = config.services.vendor;
const notificationService = config.services.notification;
const vendorUploadProxy = createServiceProxy(vendorService, {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(vendorService),
    parseReqBody: false,
});
const vendorNotificationProxy = createServiceProxy(notificationService, {
    proxyReqPathResolver: (req) => `/api/notifications${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(notificationService),
});

/**
 * @swagger
 * /api/vendor/stores/nearby:
 *   get:
 *     summary: Find nearby vendor stores
 *     description: Get approved and active vendor stores within specified radius for delivery/location-based search. Public endpoint - no authentication required.
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         description: User latitude (e.g., 28.6139 for New Delhi)
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         description: User longitude (e.g., 77.2090 for New Delhi)
 *       - in: query
 *         name: radius
 *         schema: { type: number, default: 10 }
 *         description: Search radius in kilometers
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: List of nearby stores with vendor info and distance
 *       400:
 *         description: Missing latitude/longitude
 *
 * /api/vendor/orders/queue:
 *   get:
 *     summary: Get vendor order queue
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order queue
 *
 * /api/vendor/org/profile:
 *   get:
 *     summary: Get vendor org profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Org profile
 *
 * /api/vendor/stores:
 *   get:
 *     summary: Get vendor stores
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stores list
 *
 * /api/vendor/staff:
 *   get:
 *     summary: Get vendor staff
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff list
 *
 * /api/vendor/analytics/performance:
 *   get:
 *     summary: Get vendor performance analytics
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance stats
 *
 * /api/vendor/finance/summary:
 *   get:
 *     summary: Get vendor finance summary
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Finance summary
 *
 * /api/vendor/finance/payout-history:
 *   get:
 *     summary: Get vendor payout history
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout history
 */

// Public nearby stores → vendor-service (no auth required)
router.get(
    '/stores/nearby',
    createServiceProxy(vendorService, {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildProxyReqOptDecorator(vendorService),
    })
);

// Vendor login/MFA start before a gateway session exists.
router.post(
    '/auth/login',
    createServiceProxy(vendorService, {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildProxyReqOptDecorator(vendorService),
    })
);
router.post(
    '/auth/mfa/verify',
    createServiceProxy(vendorService, {
        proxyReqPathResolver: (req) => req.originalUrl,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildProxyReqOptDecorator(vendorService),
    })
);

// Vendor order routes → order-service
router.use(
    '/orders',
    authenticate,
    createServiceProxy(config.services.order, {
        proxyReqPathResolver: (req) => `/api/vendor/orders${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.order),
    })
);

// Vendor notifications → notification-service
router.get('/notifications', authenticate, notificationReadLimiter, vendorNotificationProxy);
router.get('/notifications/summary', authenticate, notificationReadLimiter, vendorNotificationProxy);
router.patch('/notifications/read-all', authenticate, notificationWriteLimiter, vendorNotificationProxy);
router.patch('/notifications/:id/read', authenticate, notificationWriteLimiter, vendorNotificationProxy);

// Vendor org/store/staff/analytics → vendor-service
router.use('/org/legal', authenticate, vendorUploadProxy);
router.use('/vendor-org/legal', authenticate, vendorUploadProxy);
router.use('/support/tickets/uploads', authenticate, vendorUploadProxy);
router.use('/tickets/uploads', authenticate, vendorUploadProxy);
router.use(/^\/orders\/[^/]+\/qc-upload$/, authenticate, vendorUploadProxy);
router.use(
    '/',
    authenticate,
    createServiceProxy(vendorService, {
        proxyReqPathResolver: (req) => `/api/vendor${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(vendorService),
    })
);

module.exports = router;
