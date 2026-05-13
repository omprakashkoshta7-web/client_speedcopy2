const Joi = require('joi');

const createProductTypeSchema = Joi.object({
    name: Joi.string().trim().min(2).max(120).required(),
    slug: Joi.string().trim().lowercase().min(2).max(140).required(),
    description: Joi.string().trim().allow('').max(1000).optional(),
    image: Joi.string().trim().allow('').optional(),
    isActive: Joi.boolean().default(true),
    sortOrder: Joi.number().default(0),
    metadata: Joi.any().optional(),
});

const updateProductTypeSchema = createProductTypeSchema.fork(['name', 'slug'], (schema) =>
    schema.optional()
);

module.exports = {
    createProductTypeSchema,
    updateProductTypeSchema,
};
