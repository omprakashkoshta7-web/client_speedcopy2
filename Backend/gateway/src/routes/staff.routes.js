const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  buildProxyReqOptDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();
const adminService = config.services.admin;
const staffUploadProxy = createServiceProxy(adminService, {
    proxyReqPathResolver: (req) => `/api/staff${req.url}`,
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(adminService),
    parseReqBody: false,
});

const staffProxy = createServiceProxy(adminService, {
    proxyReqPathResolver: (req) => `/api/staff${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildProxyReqOptDecorator(adminService),
    proxyErrorMessage: 'Staff service is unavailable. Please try again shortly.',
});

// Staff login/MFA start before a gateway session exists.
router.post('/auth/login', staffProxy);
router.post('/auth/mfa/verify', staffProxy);

// All remaining staff APIs require a valid platform JWT at the gateway.
router.use('/uploads/attachments', authenticate, staffUploadProxy);
router.use(
    '/',
    authenticate,
    createServiceProxy(adminService, {
        proxyReqPathResolver: (req) => `/api/staff${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(adminService),
        proxyErrorMessage: 'Staff service is unavailable. Please try again shortly.',
    })
);

module.exports = router;
