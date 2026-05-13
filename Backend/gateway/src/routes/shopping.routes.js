const { Router } = require('express');

const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');
const {
  buildProxyReqBodyDecorator,
  buildProxyReqOptDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();

router.use(
    '/',
    optionalAuth,
    createServiceProxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/products/shopping${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
    })
);

module.exports = router;
