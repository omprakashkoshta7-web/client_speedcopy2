const ProductType = require('../models/product-type.model');
const Category = require('../models/category.model');

const listProductTypes = async (query = {}) => {
    const filter = {};
    if (query.includeInactive !== 'true') filter.isActive = true;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    return ProductType.find(filter).sort({ sortOrder: 1, createdAt: -1 });
};

const createProductType = async (payload) => ProductType.create(payload);

const updateProductType = async (id, payload) => {
    const productType = await ProductType.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    if (!productType) {
        const err = new Error('Product type not found');
        err.statusCode = 404;
        throw err;
    }
    return productType;
};

const deleteProductType = async (id) => {
    const linkedCategories = await Category.countDocuments({ productTypeId: String(id), isActive: true });
    if (linkedCategories > 0) {
        const err = new Error('Product type has active categories and cannot be deleted');
        err.statusCode = 409;
        throw err;
    }

    const productType = await ProductType.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!productType) {
        const err = new Error('Product type not found');
        err.statusCode = 404;
        throw err;
    }
    return productType;
};

module.exports = {
    listProductTypes,
    createProductType,
    updateProductType,
    deleteProductType,
};
