const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  notificationReadLimiter,
  notificationWriteLimiter,
} = require('../middlewares/rate-limit');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();

const notifUploadProxy = createServiceProxy(config.services.notification, {
  proxyReqPathResolver: () => '/api/notifications/tickets/uploads',
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.notification),
  parseReqBody: false,
});
const notifProxy = createServiceProxy(config.services.notification, {
  proxyReqPathResolver: (req) => `/api/notifications${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.notification),
});

router.get('/', authenticate, notificationReadLimiter, notifProxy);
router.get('/summary', authenticate, notificationReadLimiter, notifProxy);
router.patch('/:id/read', authenticate, notificationWriteLimiter, notifProxy);
router.patch('/read-all', authenticate, notificationWriteLimiter, notifProxy);
router.use('/tickets/uploads', authenticate, notificationWriteLimiter, notifUploadProxy);
router.use('/', authenticate, notificationWriteLimiter, notifProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Notification
 *     description: notification gateway routes
 *
 * /api/notification:
 *   get:
 *     summary: Base notification route
 *     tags: [Gateway Notification]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
