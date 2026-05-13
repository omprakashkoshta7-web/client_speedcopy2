const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const previewImageSchema = Joi.object({
    label: Joi.string().allow('').optional(),
    url: Joi.string().required(),
    type: Joi.string().valid('thumbnail', 'gallery', 'editor', 'mockup', 'preview').default('preview'),
});

const variantSchema = Joi.object({
    product: objectId.required(),
    name: Joi.string().trim().min(1).max(160).required(),
    attributes: Joi.object().pattern(Joi.string(), Joi.string().allow('')).default({}),
    productTypeId: Joi.string().allow('').optional(),
    categoryId: Joi.string().allow('').optional(),
    slug: Joi.string().lowercase().allow('').optional(),
    shape: Joi.string().allow('').optional(),
    material: Joi.string().allow('').optional(),
    previewImages: Joi.array().items(previewImageSchema).default([]),
    templateIds: Joi.array().items(Joi.string()).default([]),
    defaultTemplateId: Joi.string().allow('').optional(),
    pricing: Joi.object({
        mrp: Joi.number().min(0).optional(),
        salePrice: Joi.number().min(0).optional(),
        currency: Joi.string().default('INR'),
        taxInclusive: Joi.boolean().default(true),
    }).optional(),
    price: Joi.number().min(0).required(),
    stock: Joi.number().min(0).default(0),
    sku: Joi.string().allow('').optional(),
    isActive: Joi.boolean().default(true),
});

const createVariantSchema = variantSchema;
const updateVariantSchema = variantSchema.fork(['product', 'name', 'price'], (schema) =>
    schema.optional()
);

module.exports = {
    createVariantSchema,
    updateVariantSchema,
};
