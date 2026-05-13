const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();
const uploadProxy = createServiceProxy(config.services.delivery, {
  proxyReqPathResolver: (req) => req.originalUrl,
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.delivery),
  parseReqBody: false,
});
const deliveryProxy = createServiceProxy(config.services.delivery, {
  proxyReqPathResolver: (req) => req.originalUrl,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.delivery),
});

router.post('/auth/send-otp', deliveryProxy);
router.post('/auth/verify-otp', deliveryProxy);
router.post('/auth/logout', authenticate, deliveryProxy);
router.use('/track', deliveryProxy);
router.use('/support/incident/uploads', authenticate, uploadProxy);

router.use('/', authenticate, deliveryProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Delivery
 *     description: delivery gateway routes
 *
 * /api/delivery:
 *   get:
 *     summary: Base delivery route
 *     tags: [Gateway Delivery]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
