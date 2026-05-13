const { Router } = require('express');

const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');
const {
  buildProxyReqBodyDecorator,
  buildProxyReqOptDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();
const uploadProxy = createServiceProxy(config.services.product, {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
    parseReqBody: false,
});
const businessPrintingProxy = createServiceProxy(config.services.product, {
    proxyReqPathResolver: (req) => `/api/business-printing${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
});

router.use('/upload', optionalAuth, uploadProxy);
router.use('/', optionalAuth, businessPrintingProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Business-printing
 *     description: business-printing gateway routes
 *
 * /api/business-printing:
 *   get:
 *     summary: Base business-printing route
 *     tags: [Gateway Business-printing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
