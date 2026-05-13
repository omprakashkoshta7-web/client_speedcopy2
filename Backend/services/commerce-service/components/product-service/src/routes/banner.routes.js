const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/shopping.controller');
const { adminOnly } = require('../middlewares/admin.middleware');
const { requireCatalogPermission } = require('../middlewares/catalog-permissions.middleware');
const { bannerSchema } = require('../validators/shopping.validator');

const router = Router();

/**
 * @swagger
 * /api/banners:
 *   post:
 *     summary: Create banner (admin)
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Banner'
 *     responses:
 *       201:
 *         description: Banner created
 *
 * /api/banners/{id}:
 *   put:
 *     summary: Update banner (admin)
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Banner'
 *     responses:
 *       200:
 *         description: Banner updated
 *   delete:
 *     summary: Delete banner (admin)
 *     tags: [Admin Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Banner deleted
 */

/**
 * @swagger
 * /:
 *   post:
 *     summary: POST /
 *     tags: [Banner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/', adminOnly, requireCatalogPermission('catalog.create'), validate(bannerSchema), controller.createBanner);
router.put('/:id', adminOnly, requireCatalogPermission('catalog.update'), validate(bannerSchema), controller.updateBanner);
router.delete('/:id', adminOnly, requireCatalogPermission('catalog.delete'), controller.deleteBanner);

module.exports = router;
