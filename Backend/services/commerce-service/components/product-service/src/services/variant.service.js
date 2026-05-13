const Product = require('../models/product.model');
const Variant = require('../models/variant.model');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const normalizeVariantPayload = async (payload, existingVariant = null) => {
    const productId = payload.product || existingVariant?.product;
    const product = await Product.findById(productId).select('category flowType');
    if (!product) throw createError('Product not found', 404);

    const categoryId = payload.categoryId || existingVariant?.categoryId || String(product.category || '');
    const normalized = {
        ...payload,
        product: productId,
        categoryId,
    };

    if (!normalized.pricing && normalized.price !== undefined) {
        normalized.pricing = {
            salePrice: normalized.price,
            currency: 'INR',
            taxInclusive: true,
        };
    }

    return normalized;
};

const listVariants = async (query = {}) => {
    const filter = {};
    if (query.productId) filter.product = query.productId;
    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.productTypeId) filter.productTypeId = query.productTypeId;
    if (query.includeInactive !== 'true') filter.isActive = true;
    return Variant.find(filter).sort({ createdAt: -1 });
};

const createVariant = async (payload) => {
    const normalized = await normalizeVariantPayload(payload);
    return Variant.create(normalized);
};

const updateVariant = async (id, payload) => {
    const existingVariant = await Variant.findById(id);
    if (!existingVariant) throw createError('Variant not found', 404);

    const normalized = await normalizeVariantPayload(payload, existingVariant);
    const variant = await Variant.findByIdAndUpdate(id, normalized, {
        new: true,
        runValidators: true,
    });
    if (!variant) throw createError('Variant not found', 404);
    return variant;
};

const deleteVariant = async (id) => {
    const variant = await Variant.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!variant) throw createError('Variant not found', 404);
    return variant;
};

module.exports = {
    listVariants,
    createVariant,
    updateVariant,
    deleteVariant,
};
