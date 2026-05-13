const { Router } = require('express');
const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');
const {
  buildProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();
const uploadProxy = createServiceProxy(config.services.product, {
  proxyReqPathResolver: (req) => req.originalUrl,
  proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
  parseReqBody: false,
});
const productProxy = createServiceProxy(config.services.product, {
  proxyReqPathResolver: (req) => `/api/products${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
});

// Products are publicly readable; writes require auth (handled in product-service)
router.use('/printing/upload', optionalAuth, uploadProxy);
router.use('/business-printing/upload', optionalAuth, uploadProxy);
router.use('/', optionalAuth, productProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Product
 *     description: product gateway routes
 *
 * /api/product:
 *   get:
 *     summary: Base product route
 *     tags: [Gateway Product]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
