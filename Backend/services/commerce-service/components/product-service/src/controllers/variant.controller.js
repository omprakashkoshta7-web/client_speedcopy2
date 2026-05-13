const variantService = require('../services/variant.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const listVariants = async (req, res, next) => {
    try {
        const data = await variantService.listVariants({
            ...req.query,
            productId: req.params.productId || req.query.productId,
        });
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createVariant = async (req, res, next) => {
    try {
        const data = await variantService.createVariant(req.body);
        return sendCreated(res, data, 'Variant created');
    } catch (err) {
        next(err);
    }
};

const updateVariant = async (req, res, next) => {
    try {
        const data = await variantService.updateVariant(req.params.id, req.body);
        return sendSuccess(res, data, 'Variant updated');
    } catch (err) {
        next(err);
    }
};

const deleteVariant = async (req, res, next) => {
    try {
        const data = await variantService.deleteVariant(req.params.id);
        return sendSuccess(res, data, 'Variant archived');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listVariants,
    createVariant,
    updateVariant,
    deleteVariant,
};
