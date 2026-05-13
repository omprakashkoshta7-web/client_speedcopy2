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

const designPublicProxy = createServiceProxy(config.services.design, {
  proxyReqPathResolver: (req) => `/api/designs${req.url}`,
  proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.design),
  parseReqBody: false,
  proxyErrorMessage: 'Design service is unavailable.',
});

const designAuthedProxy = createServiceProxy(config.services.design, {
  proxyReqPathResolver: (req) => `/api/designs${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.design),
});

const designAuthedUploadProxy = createServiceProxy(config.services.design, {
  proxyReqPathResolver: (req) => `/api/designs${req.url}`,
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.design),
  parseReqBody: false,
  proxyErrorMessage: 'Design service is unavailable.',
});

router.get('/templates', designPublicProxy);
router.get('/templates/premium', designPublicProxy);
router.get('/product/:productId/frames', designPublicProxy);
router.get('/template-config/:variantId', designPublicProxy);
router.post('/customizations/:id/assets', authenticate, designAuthedUploadProxy);

router.use('/', authenticate, designAuthedProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Design
 *     description: design gateway routes
 *
 * /api/design:
 *   get:
 *     summary: Base design route
 *     tags: [Gateway Design]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
