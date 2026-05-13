const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const slotId = Joi.string().trim().min(1).max(80);

const geometrySchema = Joi.object({
    x: Joi.number().min(0).required(),
    y: Joi.number().min(0).required(),
    width: Joi.number().positive().required(),
    height: Joi.number().positive().required(),
    rotation: Joi.number().default(0),
    shape: Joi.string().valid('rectangle', 'circle', 'custom').default('rectangle'),
    path: Joi.string().allow('').optional(),
});

const slotSchema = Joi.object({
    slotId: slotId.required(),
    name: Joi.string().trim().min(1).max(120).required(),
    type: Joi.string().valid('image', 'text').required(),
    geometry: geometrySchema.required(),
    behavior: Joi.object({
        movable: Joi.boolean().default(true),
        resizable: Joi.boolean().default(false),
        cropEnabled: Joi.boolean().default(true),
        zoomEnabled: Joi.boolean().default(true),
        rotateEnabled: Joi.boolean().default(false),
    }).default(),
    imageConfig: Joi.object({
        fitMode: Joi.string().valid('cover', 'contain', 'fill').default('cover'),
        minZoom: Joi.number().positive().default(1),
        maxZoom: Joi.number().positive().default(4),
        acceptedMimeTypes: Joi.array().items(Joi.string()).default([
            'image/jpeg',
            'image/png',
            'image/webp',
        ]),
        maxFileSizeMb: Joi.number().positive().default(10),
        minResolution: Joi.object({
            width: Joi.number().min(0).default(0),
            height: Joi.number().min(0).default(0),
        }).default(),
    }).default(),
    textConfig: Joi.object({
        minLength: Joi.number().integer().min(0).default(0),
        maxLength: Joi.number().integer().min(1).default(120),
        allowedFonts: Joi.array().items(Joi.string()).default(['Inter', 'Arial']),
        defaultFontFamily: Joi.string().default('Inter'),
        defaultFontSize: Joi.number().positive().default(24),
        minFontSize: Joi.number().positive().default(8),
        maxFontSize: Joi.number().positive().default(96),
        fontWeight: Joi.string().default('400'),
        color: Joi.string().default('#000000'),
        alignment: Joi.string().valid('left', 'center', 'right').default('center'),
        letterSpacing: Joi.number().default(0),
        lineHeight: Joi.number().positive().default(1.2),
    }).default(),
    zIndex: Joi.number().default(0),
    required: Joi.boolean().default(true),
});

const createTemplateDefinitionSchema = Joi.object({
    productTypeId: Joi.string().allow('').optional(),
    categoryId: Joi.string().allow('').optional(),
    variantId: Joi.string().required(),
    name: Joi.string().trim().min(2).max(160).required(),
    slug: Joi.string().trim().lowercase().min(2).max(180).required(),
    assets: Joi.object({
        editorBaseImage: Joi.string().required(),
        overlayImage: Joi.string().allow('').optional(),
        maskImage: Joi.string().allow('').optional(),
        mockupSceneImage: Joi.string().allow('').optional(),
    }).required(),
    canvas: Joi.object({
        width: Joi.number().positive().required(),
        height: Joi.number().positive().required(),
        unit: Joi.string().valid('px', 'mm', 'cm', 'in').default('px'),
        dpi: Joi.number().min(72).default(300),
        printWidth: Joi.number().min(0).optional(),
        printHeight: Joi.number().min(0).optional(),
    }).required(),
    slots: Joi.array().items(slotSchema).min(1).required(),
    previewConfig: Joi.object({
        renderer: Joi.string().valid('canvas', 'sharp', 'svg', 'fabric').default('sharp'),
        livePreview: Joi.boolean().default(true),
        mockups: Joi.array()
            .items(
                Joi.object({
                    mockupId: Joi.string().required(),
                    name: Joi.string().required(),
                    type: Joi.string()
                        .valid('wall_frame', 'room', 'pen_engraving', 'acrylic', 'flat')
                        .required(),
                    sceneImage: Joi.string().allow('').optional(),
                    targetBox: Joi.object({
                        x: Joi.number().min(0).required(),
                        y: Joi.number().min(0).required(),
                        width: Joi.number().positive().required(),
                        height: Joi.number().positive().required(),
                        rotation: Joi.number().default(0),
                    }).required(),
                    perspective: Joi.any().optional(),
                    shadow: Joi.any().optional(),
                    blendMode: Joi.string().default('normal'),
                    opacity: Joi.number().min(0).max(1).default(1),
                })
            )
            .default([]),
    }).default(),
    rules: Joi.object({
        allowFreeDesign: Joi.boolean().valid(false).default(false),
        requiredSlots: Joi.array().items(Joi.string()).default([]),
        minResolution: Joi.object({
            width: Joi.number().min(0).default(0),
            height: Joi.number().min(0).default(0),
        }).default(),
        safeArea: Joi.any().optional(),
        bleed: Joi.any().optional(),
    }).default(),
});

const updateTemplateDefinitionSchema = createTemplateDefinitionSchema.fork(
    ['variantId', 'name', 'slug', 'assets', 'canvas', 'slots'],
    (schema) => schema.optional()
);

const createCustomizationSchema = Joi.object({
    variantId: Joi.string().required(),
    templateId: objectId.optional(),
});

const assetSchema = Joi.object({
    assetId: Joi.string().allow('').optional(),
    originalUrl: Joi.string().allow('').optional(),
    processedUrl: Joi.string().allow('').optional(),
    mimeType: Joi.string().allow('').optional(),
    width: Joi.number().min(0).optional(),
    height: Joi.number().min(0).optional(),
    sizeBytes: Joi.number().min(0).optional(),
});

const updateSlotSchema = Joi.object({
    type: Joi.string().valid('image', 'text').required(),
    asset: assetSchema.optional(),
    transform: Joi.object({
        x: Joi.number().default(0),
        y: Joi.number().default(0),
        scale: Joi.number().positive().default(1),
        rotation: Joi.number().default(0),
        zoom: Joi.number().positive().default(1),
    }).optional(),
    crop: Joi.object({
        x: Joi.number().min(0).default(0),
        y: Joi.number().min(0).default(0),
        width: Joi.number().min(0).optional(),
        height: Joi.number().min(0).optional(),
        unit: Joi.string().valid('px', 'percent').default('px'),
    }).optional(),
    text: Joi.object({
        value: Joi.string().allow('').optional(),
        fontFamily: Joi.string().allow('').optional(),
        fontSize: Joi.number().positive().optional(),
        fontWeight: Joi.string().allow('').optional(),
        color: Joi.string().allow('').optional(),
        alignment: Joi.string().valid('left', 'center', 'right', '').optional(),
    }).optional(),
});

const finalizeCustomizationSchema = Joi.object({
    orderId: Joi.string().allow('').optional(),
});

module.exports = {
    createTemplateDefinitionSchema,
    updateTemplateDefinitionSchema,
    createCustomizationSchema,
    updateSlotSchema,
    finalizeCustomizationSchema,
};
