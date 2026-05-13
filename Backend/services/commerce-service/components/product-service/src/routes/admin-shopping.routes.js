const { Router } = require('express');

const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/shopping.controller');
const { adminOnly } = require('../middlewares/admin.middleware');
const { requireCatalogPermission } = require('../middlewares/catalog-permissions.middleware');
const {
    createShoppingProductSchema,
    updateShoppingProductSchema,
    createShoppingCategorySchema,
    updateShoppingCategorySchema,
    patchDealSchema,
    patchDiscountSchema,
} = require('../validators/shopping.validator');

const router = Router();
const withShowAll = (handler) => (req, res, next) => {
    req.query = { ...req.query, show_all: 'true' };
    return handler(req, res, next);
};

/**
 * @swagger
 * /api/admin-shopping/products:
 *   post:
 *     summary: Create shopping product (admin)
 *     tags: [Admin Shopping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShoppingProduct'
 *     responses:
 *       201:
 *         description: Product created
 *
 * /api/admin-shopping/products/{id}:
 *   put:
 *     summary: Update shopping product (admin)
 *     tags: [Admin Shopping]
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
 *             $ref: '#/components/schemas/UpdateShoppingProduct'
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete shopping product (admin)
 *     tags: [Admin Shopping]
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
 * /api/admin-shopping/products/{id}/deal:
 *   patch:
 *     summary: Update product deal (admin)
 *     tags: [Admin Shopping]
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
 *             $ref: '#/components/schemas/PatchDeal'
 *     responses:
 *       200:
 *         description: Deal updated
 *
 * /api/admin-shopping/categories:
 *   post:
 *     summary: Create shopping category (admin)
 *     tags: [Admin Shopping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShoppingCategory'
 *     responses:
 *       201:
 *         description: Category created
 *
 * /api/admin-shopping/categories/{id}:
 *   put:
 *     summary: Update shopping category (admin)
 *     tags: [Admin Shopping]
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
 *             $ref: '#/components/schemas/UpdateShoppingCategory'
 *     responses:
 *       200:
 *         description: Category updated
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: POST /products
 *     tags: [Admin-shopping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post(
    '/products',
    adminOnly,
    requireCatalogPermission('catalog.create'),
    validate(createShoppingProductSchema),
    controller.createProduct
);
router.get('/products', adminOnly, requireCatalogPermission('catalog.read'), withShowAll(controller.listProducts));
router.put(
    '/products/:id',
    adminOnly,
    requireCatalogPermission('catalog.update'),
    validate(updateShoppingProductSchema),
    controller.updateProduct
);
router.delete('/products/:id', adminOnly, requireCatalogPermission('catalog.delete'), controller.deleteProduct);
router.patch(
    '/products/:id/deal',
    adminOnly,
    requireCatalogPermission('catalog.update'),
    validate(patchDealSchema),
    controller.patchDeal
);
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
    validate(createShoppingCategorySchema),
    controller.createCategory
);
router.put(
    '/categories/:id',
    adminOnly,
    requireCatalogPermission('catalog.update'),
    validate(updateShoppingCategorySchema),
    controller.updateCategory
);

module.exports = router;
