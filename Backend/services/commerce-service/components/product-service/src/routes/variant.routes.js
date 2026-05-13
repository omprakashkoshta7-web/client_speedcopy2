const { Router } = require('express');
const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/variant.controller');
const { adminOnly } = require('../middlewares/admin.middleware');
const { requireCatalogPermission } = require('../middlewares/catalog-permissions.middleware');
const { createVariantSchema, updateVariantSchema } = require('../validators/variant.validator');

const router = Router();

router.get('/', controller.listVariants);
router.get('/product/:productId', controller.listVariants);
router.post(
    '/',
    adminOnly,
    requireCatalogPermission('catalog.variant.create'),
    validate(createVariantSchema),
    controller.createVariant
);
router.patch(
    '/:id',
    adminOnly,
    requireCatalogPermission('catalog.variant.update'),
    validate(updateVariantSchema),
    controller.updateVariant
);
router.delete(
    '/:id',
    adminOnly,
    requireCatalogPermission('catalog.variant.delete'),
    controller.deleteVariant
);

module.exports = router;
