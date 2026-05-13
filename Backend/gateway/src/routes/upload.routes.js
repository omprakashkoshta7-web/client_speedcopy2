const { Router } = require('express');
const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');
const {
    buildAuthedProxyReqOptDecorator,
    createServiceProxy,
} = require('../utils/proxy');

const router = Router();

const legacyImageUploadProxy = createServiceProxy(config.services.product, {
    proxyReqPathResolver: () => '/api/admin/catalog/uploads/images',
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    parseReqBody: false,
});

router.post('/image', optionalAuth, legacyImageUploadProxy);

module.exports = router;
