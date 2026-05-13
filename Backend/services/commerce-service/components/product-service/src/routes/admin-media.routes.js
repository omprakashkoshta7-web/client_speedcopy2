const { Router } = require('express');

const { adminOnly } = require('../middlewares/admin.middleware');
const { requireCatalogPermission } = require('../middlewares/catalog-permissions.middleware');
const { imageUpload } = require('../config/catalog-upload');
const controller = require('../controllers/admin-media.controller');

const router = Router();

const uploadFields = imageUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 10 },
]);

router.post('/', adminOnly, requireCatalogPermission('catalog.media.upload'), uploadFields, controller.uploadCatalogMedia);
router.post('/images', adminOnly, requireCatalogPermission('catalog.media.upload'), uploadFields, controller.uploadCatalogMedia);

module.exports = router;
