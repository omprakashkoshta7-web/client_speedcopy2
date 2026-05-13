const customizationService = require('../services/customization.service');
const sharp = require('sharp');
const { toPublicUrl } = require('../services/rendering.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const createCustomization = async (req, res, next) => {
    try {
        const data = await customizationService.createCustomization(req.headers['x-user-id'], req.body);
        return sendCreated(res, data, 'Customization created');
    } catch (err) {
        next(err);
    }
};

const listCustomizations = async (req, res, next) => {
    try {
        const data = await customizationService.listCustomizations(
            req.headers['x-user-id'],
            req.query
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const getCustomization = async (req, res, next) => {
    try {
        const data = await customizationService.getCustomization(
            req.headers['x-user-id'],
            req.params.id
        );
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const deleteCustomization = async (req, res, next) => {
    try {
        await customizationService.deleteCustomization(
            req.headers['x-user-id'],
            req.params.id
        );
        return sendSuccess(res, null, 'Customization deleted');
    } catch (err) {
        next(err);
    }
};

const updateSlot = async (req, res, next) => {
    try {
        const data = await customizationService.updateSlot(
            req.headers['x-user-id'],
            req.params.id,
            req.params.slotId,
            req.body
        );
        return sendSuccess(res, data, 'Customization slot updated');
    } catch (err) {
        next(err);
    }
};

const generatePreview = async (req, res, next) => {
    try {
        const data = await customizationService.generatePreview(
            req.headers['x-user-id'],
            req.params.id,
            req
        );
        return sendSuccess(res, data, 'Preview generated');
    } catch (err) {
        next(err);
    }
};

const finalizeCustomization = async (req, res, next) => {
    try {
        const data = await customizationService.finalizeCustomization(
            req.headers['x-user-id'],
            req.params.id,
            req.body,
            req
        );
        return sendSuccess(res, data, 'Customization finalized');
    } catch (err) {
        next(err);
    }
};

const uploadCustomizationAsset = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Image file is required',
            });
        }

        const metadata = await sharp(req.file.path, { failOn: 'none' }).metadata().catch(() => ({}));

        return sendCreated(
            res,
            {
                asset: {
                    assetId: req.file.filename,
                    originalUrl: toPublicUrl(req, req.file.path),
                    processedUrl: '',
                    mimeType: req.file.mimetype,
                    width: metadata.width,
                    height: metadata.height,
                    sizeBytes: req.file.size,
                },
            },
            'Customization asset uploaded'
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createCustomization,
    listCustomizations,
    getCustomization,
    deleteCustomization,
    updateSlot,
    uploadCustomizationAsset,
    generatePreview,
    finalizeCustomization,
};
