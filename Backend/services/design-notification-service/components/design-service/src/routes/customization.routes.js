const { Router } = require('express');
const validate = require('../../../../shared/middlewares/validate.middleware');
const templateConfigController = require('../controllers/template-config.controller');
const adminTemplateController = require('../controllers/admin-template.controller');
const customizationController = require('../controllers/customization.controller');
const { customizationUpload } = require('../config/customization-upload');
const {
    adminOnly,
    requireDesignPermission,
} = require('../middlewares/design-admin.middleware');
const {
    createTemplateDefinitionSchema,
    updateTemplateDefinitionSchema,
    createCustomizationSchema,
    updateSlotSchema,
    finalizeCustomizationSchema,
} = require('../validators/customization.validator');

const router = Router();

router.get('/template-config/:variantId', templateConfigController.getTemplateConfig);

router.get(
    '/admin/template-definitions',
    adminOnly,
    requireDesignPermission('design.template.read'),
    adminTemplateController.listTemplates
);
router.post(
    '/admin/template-definitions',
    adminOnly,
    requireDesignPermission('design.template.create'),
    validate(createTemplateDefinitionSchema),
    adminTemplateController.createTemplate
);
router.patch(
    '/admin/template-definitions/:id',
    adminOnly,
    requireDesignPermission('design.template.update'),
    validate(updateTemplateDefinitionSchema),
    adminTemplateController.updateTemplate
);
router.post(
    '/admin/template-definitions/:id/publish',
    adminOnly,
    requireDesignPermission('design.template.publish'),
    adminTemplateController.publishTemplate
);

router.post(
    '/customizations',
    validate(createCustomizationSchema),
    customizationController.createCustomization
);
router.get('/customizations', customizationController.listCustomizations);
router.get('/customizations/:id', customizationController.getCustomization);
router.delete('/customizations/:id', customizationController.deleteCustomization);
router.post(
    '/customizations/:id/assets',
    customizationUpload.single('image'),
    customizationController.uploadCustomizationAsset
);
router.patch(
    '/customizations/:id/slots/:slotId',
    validate(updateSlotSchema),
    customizationController.updateSlot
);
router.post('/customizations/:id/render-preview', customizationController.generatePreview);
router.post(
    '/customizations/:id/finalize',
    validate(finalizeCustomizationSchema),
    customizationController.finalizeCustomization
);

module.exports = router;
