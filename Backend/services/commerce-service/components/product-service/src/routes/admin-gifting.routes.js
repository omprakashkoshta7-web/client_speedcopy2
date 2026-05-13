const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/gifting.controller');
const { adminOnly } = require('../middlewares/admin.middleware');
const { requireCatalogPermission } = require('../middlewares/catalog-permissions.middleware');
const {
    createGiftingProductSchema,
    updateGiftingProductSchema,
    createGiftingCategorySchema,
    updateGiftingCategorySchema,
    patchDiscountSchema,
} = require('../validators/gifting.validator');

const router = Router();
const withShowAll = (handler) => (req, res, next) => {
    req.query = { ...req.query, show_all: 'true' };
    return handler(req, res, next);
};

/**
 * @swagger
 * /api/admin-gifting/products:
 *   post:
 *     summary: Create gifting product (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGiftingProduct'
 *     responses:
 *       201:
 *         description: Product created
 *
 * /api/admin-gifting/products/{id}:
 *   put:
 *     summary: Update gifting product (admin)
 *     tags: [Admin Gifting]
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
 *             $ref: '#/components/schemas/UpdateGiftingProduct'
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete gifting product (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *
 * /api/admin-gifting/categories:
 *   post:
 *     summary: Create gifting category (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGiftingCategory'
 *     responses:
 *       201:
 *         description: Category created
 *
 * /api/admin-gifting/categories/{id}:
 *   put:
 *     summary: Update gifting category (admin)
 *     tags: [Admin Gifting]
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
 *             $ref: '#/components/schemas/UpdateGiftingCategory'
 *     responses:
 *       200:
 *         description: Category updated
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: List gifting products (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of gifting products
 *   post:
 *     summary: Create gifting product (admin)
 *     tags: [Admin Gifting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGiftingProduct'
 *     responses:
 *       201:
 *         description: Product created
 */
router.get('/products', adminOnly, requireCatalogPermission('catalog.read'), withShowAll(controller.listProducts));
router.post(
    '/products',
    adminOnly,
    requireCatalogPermission('catalog.create'),
    validate(createGiftingProductSchema),
    controller.createProduct
);
router.put(
    '/products/:id',
    adminOnly,
    requireCatalogPermission('catalog.update'),
    validate(updateGiftingProductSchema),
    controller.updateProduct
);
router.delete('/products/:id', adminOnly, requireCatalogPermission('catalog.delete'), controller.deleteProduct);
router.patch(
    '/products/:id/discount',
    adminOnly,
    requireCatalogPermission('catalog.update'),
    validate(patchDiscountSchema),
    controller.patchDiscount
);

router.get('/categories', adminOnly, requireCatalogPermission('catalog.read'), withShowAll(controller.getCategories));
router.post(
    '/categories',
    adminOnly,
    requireCatalogPermission('catalog.create'),
    validate(createGiftingCategorySchema),
    controller.createCategory
);
router.put(
    '/categories/:id',
    adminOnly,
    requireCatalogPermission('catalog.update'),
    validate(updateGiftingCategorySchema),
    controller.updateCategory
);

module.exports = router;
