const crypto = require('crypto');
const templateRepository = require('../repositories/template-definition.repository');
const customizationRepository = require('../repositories/user-customization.repository');
const RenderJob = require('../models/render-job.model');
const { renderCustomization } = require('./rendering.service');

const buildRenderHash = (customization) =>
    crypto
        .createHash('sha256')
        .update(
            JSON.stringify({
                templateId: String(customization.templateId?._id || customization.templateId),
                templateVersion: customization.templateVersion,
                slots: customization.slots,
            })
        )
        .digest('hex');

const findSlotDefinition = (template, slotId) =>
    (template.slots || []).find((slot) => slot.slotId === slotId);

const validateImageSlot = (slotDefinition, slotData) => {
    if (!slotData.asset?.originalUrl && !slotData.asset?.processedUrl) {
        const err = new Error(`Image slot ${slotDefinition.slotId} requires an uploaded asset`);
        err.statusCode = 400;
        throw err;
    }

    const mimeType = slotData.asset?.mimeType;
    const allowed = slotDefinition.imageConfig?.acceptedMimeTypes || [];
    if (mimeType && allowed.length && !allowed.includes(mimeType)) {
        const err = new Error(`Unsupported image type for slot ${slotDefinition.slotId}`);
        err.statusCode = 400;
        throw err;
    }

    const maxBytes = Number(slotDefinition.imageConfig?.maxFileSizeMb || 10) * 1024 * 1024;
    if (slotData.asset?.sizeBytes && slotData.asset.sizeBytes > maxBytes) {
        const err = new Error(`Uploaded asset is too large for slot ${slotDefinition.slotId}`);
        err.statusCode = 400;
        throw err;
    }

    const zoom = Number(slotData.transform?.zoom || 1);
    const minZoom = Number(slotDefinition.imageConfig?.minZoom || 1);
    const maxZoom = Number(slotDefinition.imageConfig?.maxZoom || 4);
    if (zoom < minZoom || zoom > maxZoom) {
        const err = new Error(`Zoom for slot ${slotDefinition.slotId} must be between ${minZoom} and ${maxZoom}`);
        err.statusCode = 400;
        throw err;
    }
};

const validateTextSlot = (slotDefinition, slotData) => {
    const value = String(slotData.text?.value || '');
    const minLength = Number(slotDefinition.textConfig?.minLength || 0);
    const maxLength = Number(slotDefinition.textConfig?.maxLength || 120);
    if (value.length < minLength || value.length > maxLength) {
        const err = new Error(`Text slot ${slotDefinition.slotId} must be ${minLength}-${maxLength} characters`);
        err.statusCode = 400;
        throw err;
    }

    const fontFamily = slotData.text?.fontFamily;
    const allowedFonts = slotDefinition.textConfig?.allowedFonts || [];
    if (fontFamily && allowedFonts.length && !allowedFonts.includes(fontFamily)) {
        const err = new Error(`Font ${fontFamily} is not allowed for slot ${slotDefinition.slotId}`);
        err.statusCode = 400;
        throw err;
    }

    const fontSize = Number(slotData.text?.fontSize || slotDefinition.textConfig?.defaultFontSize || 24);
    const minFontSize = Number(slotDefinition.textConfig?.minFontSize || 8);
    const maxFontSize = Number(slotDefinition.textConfig?.maxFontSize || 96);
    if (fontSize < minFontSize || fontSize > maxFontSize) {
        const err = new Error(`Font size for slot ${slotDefinition.slotId} must be between ${minFontSize} and ${maxFontSize}`);
        err.statusCode = 400;
        throw err;
    }
};

const validateSlotUpdate = (template, slotId, slotData) => {
    if (!template) {
        const err = new Error('Template not found for this customization');
        err.statusCode = 500;
        throw err;
    }
    const slotDefinition = findSlotDefinition(template, slotId);
    if (!slotDefinition) {
        const err = new Error(`Slot ${slotId} does not exist on this template`);
        err.statusCode = 400;
        throw err;
    }
    if (slotDefinition.type !== slotData.type) {
        const err = new Error(`Slot ${slotId} must be updated as ${slotDefinition.type}`);
        err.statusCode = 400;
        throw err;
    }
    if (slotDefinition.type === 'image') validateImageSlot(slotDefinition, slotData);
    if (slotDefinition.type === 'text') validateTextSlot(slotDefinition, slotData);
    return slotDefinition;
};

const validateRequiredSlots = (template, customization) => {
    const values = new Map((customization.slots || []).map((slot) => [slot.slotId, slot]));
    const missing = (template.slots || [])
        .filter((slot) => slot.required)
        .filter((slot) => {
            const value = values.get(slot.slotId);
            if (!value) return true;
            if (slot.type === 'image') return !value.asset?.originalUrl && !value.asset?.processedUrl;
            if (slot.type === 'text') return !String(value.text?.value || '').trim();
            return false;
        })
        .map((slot) => slot.slotId);

    if (missing.length) {
        const err = new Error(`Required customization slots are missing: ${missing.join(', ')}`);
        err.statusCode = 400;
        throw err;
    }
};

const createCustomization = async (userId, payload) => {
    const template = payload.templateId
        ? await templateRepository.findById(payload.templateId)
        : await templateRepository.findPublishedByVariantId(payload.variantId);

    if (!template || template.status !== 'published' || !template.isActive) {
        const err = new Error('Published template configuration not found');
        err.statusCode = 404;
        throw err;
    }

    return customizationRepository.create({
        userId,
        variantId: payload.variantId,
        templateId: template._id,
        templateVersion: template.version,
        slots: [],
    });
};

const getCustomization = async (userId, id) => {
    const customization = await customizationRepository.findOwnedById(userId, id);
    if (!customization) {
        const err = new Error('Customization not found');
        err.statusCode = 404;
        throw err;
    }
    // If templateId is not populated (still an ObjectId), fetch the template
    if (customization.templateId && typeof customization.templateId === 'string') {
        const template = await templateRepository.findById(customization.templateId);
        if (template) {
            customization.templateId = template;
        }
    }
    return customization;
};

/**
 * List all customizations for the current user.
 * Supports optional query filters: variantId, status
 */
const listCustomizations = async (userId, query = {}) => {
    const filter = {};
    if (query.variantId) filter.variantId = query.variantId;
    if (query.status) filter.status = query.status;
    return customizationRepository.listForUser(userId, filter);
};

/**
 * Delete a draft customization owned by the user.
 * Only drafts (status !== 'locked') can be deleted.
 */
const deleteCustomization = async (userId, id) => {
    const customization = await customizationRepository.findOwnedById(userId, id);
    if (!customization) {
        const err = new Error('Customization not found');
        err.statusCode = 404;
        throw err;
    }
    if (customization.status === 'locked') {
        const err = new Error('Locked customizations cannot be deleted');
        err.statusCode = 409;
        throw err;
    }
    await customizationRepository.deleteOwnedById(userId, id);
};

const updateSlot = async (userId, customizationId, slotId, slotData) => {
    try {
        const customization = await getCustomization(userId, customizationId);
        if (customization.status === 'locked') {
            const err = new Error('Customization is locked');
            err.statusCode = 409;
            throw err;
        }

        validateSlotUpdate(customization.templateId, slotId, slotData);

    const slots = (customization.slots || []).filter((slot) => slot.slotId !== slotId);
    slots.push({
        slotId,
        type: slotData.type,
        asset: slotData.asset || {},
        transform: slotData.transform || {},
        crop: slotData.crop || {},
        text: slotData.text || {},
        updatedAt: new Date(),
    });

    return customizationRepository.updateOwnedById(userId, customizationId, { slots });
};

const generatePreview = async (userId, customizationId, req = null) => {
    const customization = await getCustomization(userId, customizationId);
    validateRequiredSlots(customization.templateId, customization);

    const renderHash = buildRenderHash(customization);
    const rendered = await renderCustomization({ customization, req, type: 'preview' });

    await RenderJob.findOneAndUpdate(
        { renderHash, type: 'preview' },
        {
            customizationId,
            renderHash,
            type: 'preview',
            status: 'completed',
            outputUrl: rendered.url,
            metadata: {
                renderer: customization.templateId.previewConfig?.renderer || 'sharp',
                path: rendered.path,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return customizationRepository.updateOwnedById(userId, customizationId, {
        status: 'preview_generated',
        renderHash,
        renderedPreview: {
            url: rendered.url,
            width: rendered.width,
            height: rendered.height,
            generatedAt: new Date(),
        },
        validationSnapshot: {
            requiredSlotsValidatedAt: new Date(),
            templateVersion: customization.templateVersion,
        },
    });
};

const finalizeCustomization = async (userId, customizationId, { orderId } = {}, req = null) => {
    const customization = await generatePreview(userId, customizationId, req);
    const renderHash = customization.renderHash || buildRenderHash(customization);
    const rendered = await renderCustomization({ customization, req, type: 'print-ready' });

    await RenderJob.findOneAndUpdate(
        { renderHash, type: 'print_ready' },
        {
            customizationId,
            renderHash,
            type: 'print_ready',
            status: 'completed',
            outputUrl: rendered.url,
            metadata: {
                dpi: rendered.dpi,
                path: rendered.path,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return customizationRepository.updateOwnedById(userId, customizationId, {
        status: 'locked',
        lockedOrderId: orderId || '',
        lockedAt: new Date(),
        printReadyAsset: {
            url: rendered.url,
            dpi: rendered.dpi,
            format: rendered.format,
            generatedAt: new Date(),
        },
    });
};

module.exports = {
    createCustomization,
    listCustomizations,
    getCustomization,
    deleteCustomization,
    updateSlot,
    generatePreview,
    finalizeCustomization,
};
