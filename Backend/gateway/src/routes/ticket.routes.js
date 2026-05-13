const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();
const uploadProxy = createServiceProxy(config.services.notification, {
  proxyReqPathResolver: () => '/api/notifications/tickets/uploads',
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.notification),
  parseReqBody: false,
});

// Tickets live in notification-service under /api/notifications/tickets
router.use('/uploads', authenticate, uploadProxy);
router.use(
  '/',
  authenticate,
  createServiceProxy(config.services.notification, {
    proxyReqPathResolver: (req) => `/api/notifications/tickets${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.notification),
  })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Ticket
 *     description: ticket gateway routes
 *
 * /api/ticket:
 *   get:
 *     summary: Base ticket route
 *     tags: [Gateway Ticket]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
