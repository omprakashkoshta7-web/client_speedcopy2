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
    '/catalog/uploads',
    authenticate,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/catalog/uploads${req.url}`,
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
        parseReqBody: false,
    })
);

router.use(
    '/categories/uploads',
    authenticate,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/categories/uploads${req.url}`,
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
        parseReqBody: false,
    })
);

router.use(
    '/variants',
    authenticate,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/variants${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);

router.use(
    '/product-types',
    authenticate,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/product-types${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);

router.use(
    '/shop',
    authenticate,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/shop${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);

router.use(
    '/gifting',
    authenticate,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/gifting${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);

router.use(
    '/banners',
    authenticate,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/banners${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Admin-shop
 *     description: admin-shop gateway routes
 *
 * /api/admin-shop:
 *   get:
 *     summary: Base admin-shop route
 *     tags: [Gateway Admin-shop]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
