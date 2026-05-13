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
const printingProxy = createServiceProxy(config.services.product, {
    proxyReqPathResolver: (req) => `/api/printing${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
});

router.use('/upload', optionalAuth, uploadProxy);
router.use('/', optionalAuth, printingProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Printing
 *     description: printing gateway routes
 *
 * /api/printing:
 *   get:
 *     summary: Base printing route
 *     tags: [Gateway Printing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
