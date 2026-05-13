const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();

router.use(
  '/',
  authenticate,
  createServiceProxy(config.services.order, {
    proxyReqPathResolver: (req) => `/api/orders${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.order),
  })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Order
 *     description: order gateway routes
 *
 * /api/order:
 *   get:
 *     summary: Base order route
 *     tags: [Gateway Order]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
