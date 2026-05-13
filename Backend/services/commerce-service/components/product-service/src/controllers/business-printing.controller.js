const service = require('../services/business-printing.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');
const { generateDocumentPreview } = require('../utils/document-preview');
const { detectPageCount } = require('../utils/file-metadata');

const getRequestBaseUrl = (req) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');

    if (forwardedProto && forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    }

    return `${req.protocol}://${req.get('host')}`;
};

// GET /api/products/business-printing/types
const getBusinessTypes = async (req, res, next) => {
    try {
        const businessTypes = await service.getBusinessPrintingTypes();
        return sendSuccess(res, businessTypes);
    } catch (err) {
        next(err);
    }
};

const getHome = async (req, res, next) => {
    try {
        return sendSuccess(res, await service.getBusinessPrintingHome());
    } catch (err) {
        next(err);
    }
};

// GET /api/products/business-printing/products?type=business_card
const getProducts = async (req, res, next) => {
    try {
        const data = await service.getBusinessProducts(req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/products/business-printing/products/:id
const getProductById = async (req, res, next) => {
    try {
        const data = await service.getBusinessProductById(req.params.id);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/products/business-printing/service-packages
const getServicePackages = (req, res) => {
    return sendSuccess(res, service.getServicePackages());
};

// GET /api/products/business-printing/pickup-locations?lat=28.6139&lng=77.2090&radius=10
const getPickupLocations = async (req, res, next) => {
    try {
        const data = await service.getPickupLocations(req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// POST /api/products/business-printing/configure
const saveConfig = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const data = await service.saveBusinessPrintConfig(userId, req.body);
        return sendCreated(res, data, 'Business print configuration saved');
    } catch (err) {
        next(err);
    }
};

// GET /api/products/business-printing/config/:id
const getConfig = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const data = await service.getBusinessPrintConfig(req.params.id, userId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// GET /api/products/printing/files
const getUploadedFiles = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const data = await service.getUploadedFiles(userId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

// POST /api/products/printing/upload
const uploadFiles = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files provided' });
        }

        const baseUrl = getRequestBaseUrl(req);
        const files = await Promise.all(
            req.files.map(async (file, index) => {
                const { previewFileName } = await generateDocumentPreview(file);
                const previewImage = file.mimetype?.startsWith('image/')
                    ? `${baseUrl}/uploads/documents/${file.filename}`
                    : previewFileName
                      ? `${baseUrl}/uploads/documents/${previewFileName}`
                      : '';

                return {
                    id: `${Date.now()}_${index}`,
                    name: file.originalname || file.filename,
                    originalName: file.originalname || file.filename,
                    url: `${baseUrl}/uploads/documents/${file.filename}`,
                    publicId: file.filename || null,
                    size: file.size,
                    pages: await detectPageCount(file),
                    uploadedAt: new Date(),
                    mimeType: file.mimetype,
                    previewImage,
                    thumbnailUrl: previewImage,
                    firstPageImage: previewImage,
                };
            })
        );

        return sendCreated(res, files, 'Files uploaded successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getHome,
    getBusinessTypes,
    getProducts,
    getProductById,
    getServicePackages,
    getPickupLocations,
    saveConfig,
    getConfig,
    getUploadedFiles,
    uploadFiles,
};
