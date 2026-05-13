const templateRepository = require('../repositories/template-definition.repository');

const ensureUniqueSlotIds = (slots = []) => {
    const ids = slots.map((slot) => slot.slotId);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) {
        const err = new Error(`Duplicate slotId values are not allowed: ${[...new Set(duplicates)].join(', ')}`);
        err.statusCode = 400;
        throw err;
    }
};

const validateTemplateForPublish = (template) => {
    if (!template.assets?.editorBaseImage) {
        const err = new Error('editorBaseImage is required before publishing');
        err.statusCode = 400;
        throw err;
    }
    if (!template.slots?.length) {
        const err = new Error('At least one editable slot is required before publishing');
        err.statusCode = 400;
        throw err;
    }

    ensureUniqueSlotIds(template.slots);

    const requiredSlots = new Set(template.rules?.requiredSlots || []);
    template.slots
        .filter((slot) => slot.required)
        .forEach((slot) => requiredSlots.add(slot.slotId));

    const missingRequired = [...requiredSlots].filter(
        (slotId) => !template.slots.some((slot) => slot.slotId === slotId)
    );
    if (missingRequired.length) {
        const err = new Error(`Required slots are not defined: ${missingRequired.join(', ')}`);
        err.statusCode = 400;
        throw err;
    }

    const outsideCanvas = template.slots.find((slot) => {
        const geometry = slot.geometry || {};
        return (
            geometry.x + geometry.width > template.canvas.width ||
            geometry.y + geometry.height > template.canvas.height
        );
    });

    if (outsideCanvas) {
        const err = new Error(`Slot ${outsideCanvas.slotId} is outside the template canvas`);
        err.statusCode = 400;
        throw err;
    }
};

const listTemplates = async (query = {}) => {
    const filter = {};
    ['variantId', 'productTypeId', 'categoryId', 'status'].forEach((key) => {
        if (query[key]) filter[key] = query[key];
    });
    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === true || query.isActive === 'true';
    }
    return templateRepository.list(filter);
};

const createTemplate = async (adminId, payload) => {
    ensureUniqueSlotIds(payload.slots || []);
    return templateRepository.create({
        ...payload,
        status: 'draft',
        createdBy: adminId || '',
        updatedBy: adminId || '',
    });
};

const updateTemplate = async (adminId, templateId, payload) => {
    if (payload.slots) ensureUniqueSlotIds(payload.slots);
    const template = await templateRepository.updateById(templateId, {
        ...payload,
        updatedBy: adminId || '',
    });
    if (!template) {
        const err = new Error('Template definition not found');
        err.statusCode = 404;
        throw err;
    }
    return template;
};

const publishTemplate = async (adminId, templateId) => {
    const template = await templateRepository.findById(templateId);
    if (!template) {
        const err = new Error('Template definition not found');
        err.statusCode = 404;
        throw err;
    }

    validateTemplateForPublish(template);

    template.status = 'published';
    template.isActive = true;
    template.publishedAt = new Date();
    template.updatedBy = adminId || '';
    return template.save();
};

module.exports = {
    listTemplates,
    createTemplate,
    updateTemplate,
    publishTemplate,
    validateTemplateForPublish,
};
