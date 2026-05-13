const { Router } = require('express');
const validate = require('../../../../shared/middlewares/validate.middleware');
const controller = require('../controllers/product-type.controller');
const { adminOnly } = require('../middlewares/admin.middleware');
const { requireCatalogPermission } = require('../middlewares/catalog-permissions.middleware');
const {
    createProductTypeSchema,
    updateProductTypeSchema,
} = require('../validators/product-type.validator');

const router = Router();

router.get('/', controller.listProductTypes);
router.post(
    '/',
    adminOnly,
    requireCatalogPermission('catalog.product-type.create'),
    validate(createProductTypeSchema),
    controller.createProductType
);
router.patch(
    '/:id',
    adminOnly,
    requireCatalogPermission('catalog.product-type.update'),
    validate(updateProductTypeSchema),
    controller.updateProductType
);
router.delete(
    '/:id',
    adminOnly,
    requireCatalogPermission('catalog.product-type.delete'),
    controller.deleteProductType
);

module.exports = router;
