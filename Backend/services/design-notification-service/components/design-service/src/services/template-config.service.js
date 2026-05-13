const mongoose = require('mongoose');
const config = require('../config');
const templateRepository = require('../repositories/template-definition.repository');
const { toTemplateConfigDto } = require('../dtos/template-config.dto');

const dbConnections = {};

const getDbConnection = async (name) => {
    if (dbConnections[name] && dbConnections[name].readyState === 1) {
        return dbConnections[name];
    }

    const conn = await mongoose
        .createConnection(config.getDbUri(name), {
            serverSelectionTimeoutMS: 5000,
            family: 4,
        })
        .asPromise();

    dbConnections[name] = conn;
    return conn;
};

const normalizeVariant = (variant) => {
    if (!variant) return null;

    const attrs =
        variant.attributes instanceof Map
            ? Object.fromEntries(variant.attributes)
            : variant.attributes || {};

    return {
        id: String(variant._id || variant.id || ''),
        productId: String(variant.product || variant.productId || ''),
        productTypeId: String(variant.productTypeId || ''),
        categoryId: String(variant.categoryId || ''),
        name: variant.name || '',
        slug: variant.slug || '',
        sku: variant.sku || '',
        price: variant.price ?? variant.pricing?.salePrice ?? variant.salePrice ?? 0,
        mrp: variant.pricing?.mrp ?? variant.mrp,
        salePrice: variant.pricing?.salePrice ?? variant.salePrice ?? variant.price,
        currency: variant.pricing?.currency || variant.currency || 'INR',
        attributes: {
            size: variant.size || attrs.size || '',
            shape: variant.shape || attrs.shape || '',
            material: variant.material || attrs.material || '',
            ...attrs,
        },
        previewImages: variant.previewImages || [],
    };
};

const getVariantById = async (variantId) => {
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
        const err = new Error('Invalid variantId');
        err.statusCode = 400;
        throw err;
    }

    const productConn = await getDbConnection('product');
    const variant = await productConn.db.collection('variants').findOne({
        _id: new mongoose.Types.ObjectId(variantId),
        isActive: { $ne: false },
    });

    if (!variant) {
        const err = new Error('Variant not found');
        err.statusCode = 404;
        throw err;
    }

    return normalizeVariant(variant);
};

const getTemplateConfig = async (variantId) => {
    const [variant, template] = await Promise.all([
        getVariantById(variantId),
        templateRepository.findPublishedByVariantId(String(variantId)),
    ]);

    if (!template) {
        const err = new Error('No published template configuration found for this variant');
        err.statusCode = 404;
        throw err;
    }

    return toTemplateConfigDto({ variant, template });
};

module.exports = {
    getTemplateConfig,
    getVariantById,
};
