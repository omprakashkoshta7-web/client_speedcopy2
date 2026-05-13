const { Router } = require('express');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const {
  buildAuthedProxyReqOptDecorator,
  buildProxyReqBodyDecorator,
  createServiceProxy,
} = require('../utils/proxy');

const router = Router();
const uploadProxy = createServiceProxy(config.services.user, {
  proxyReqPathResolver: (req) => `/api/users${req.url}`,
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.user),
  parseReqBody: false,
});

router.use('/profile/avatar', authenticate, uploadProxy);
router.use(
  '/',
  authenticate,
  createServiceProxy(config.services.user, {
    proxyReqPathResolver: (req) => `/api/users${req.url}`,
    proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
    proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.user),
  })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway User
 *     description: user gateway routes
 *
 * /api/user:
 *   get:
 *     summary: Base user route
 *     tags: [Gateway User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
