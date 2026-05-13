const productTypeService = require('../services/product-type.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const listProductTypes = async (req, res, next) => {
    try {
        const data = await productTypeService.listProductTypes(req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createProductType = async (req, res, next) => {
    try {
        const data = await productTypeService.createProductType(req.body);
        return sendCreated(res, data, 'Product type created');
    } catch (err) {
        next(err);
    }
};

const updateProductType = async (req, res, next) => {
    try {
        const data = await productTypeService.updateProductType(req.params.id, req.body);
        return sendSuccess(res, data, 'Product type updated');
    } catch (err) {
        next(err);
    }
};

const deleteProductType = async (req, res, next) => {
    try {
        const data = await productTypeService.deleteProductType(req.params.id);
        return sendSuccess(res, data, 'Product type archived');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listProductTypes,
    createProductType,
    updateProductType,
    deleteProductType,
};
