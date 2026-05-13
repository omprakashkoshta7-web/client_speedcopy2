const TemplateDefinition = require('../models/template-definition.model');

const findPublishedByVariantId = (variantId) =>
    TemplateDefinition.findOne({
        variantId,
        status: 'published',
        isActive: true,
    }).sort({ version: -1, publishedAt: -1 });

const findById = (id) => TemplateDefinition.findById(id);

const list = (filter = {}) =>
    TemplateDefinition.find(filter).sort({ updatedAt: -1, version: -1 });

const create = (payload) => TemplateDefinition.create(payload);

const updateById = (id, payload) =>
    TemplateDefinition.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });

module.exports = {
    findPublishedByVariantId,
    findById,
    list,
    create,
    updateById,
};
