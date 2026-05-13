const printingService = require('../services/printing.service');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
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

/**
 * GET /api/products/printing/home
 * Returns printing entry points plus document printing cards.
 */
const getHome = (req, res) => {
    const data = printingService.getPrintingHome();
    return sendSuccess(res, data);
};

/**
 * GET /api/products/printing/document-types
 * Returns all 4 document print types with their config options.
 */
const getDocumentTypes = (req, res) => {
    const data = printingService.getDocumentPrintTypes();
    return sendSuccess(res, data);
};

const getDocumentType = (req, res, next) => {
    try {
        return sendSuccess(res, printingService.getDocumentPrintType(req.params.type));
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/products/printing/service-packages
 * Returns Standard / Express / Instant delivery packages.
 */
const getServicePackages = (req, res) => {
    const data = printingService.getServicePackages();
    return sendSuccess(res, data);
};

/**
 * GET /api/products/printing/pickup-locations?lat=28.6139&lng=77.2090&radius=10
 * Returns nearest shops for pickup (supports both GPS and pincode).
 */
const getPickupLocations = async (req, res, next) => {
    try {
        const data = await printingService.getPickupLocations(req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/products/printing/upload
 * Uploads print files to local storage via multer.
 * Accepts multipart/form-data with field name "files" (multiple).
 */
const uploadFiles = async (req, res, next) => {
    try {
        if (!req.files || !req.files.length) {
            return sendError(res, 'No files uploaded', 400);
        }

        const uploaded = await Promise.all(
            req.files.map(async (file) => {
                const baseUrl = getRequestBaseUrl(req);
                const fileUrl = `${baseUrl}/uploads/documents/${file.filename}`;
                const { previewFileName } = await generateDocumentPreview(file);
                const pages = await detectPageCount(file);
                const previewImage = file.mimetype?.startsWith('image/')
                    ? fileUrl
                    : previewFileName
                      ? `${baseUrl}/uploads/documents/${previewFileName}`
                      : '';

                return {
                    originalName: file.originalname,
                    url: fileUrl,
                    publicId: file.filename || null,
                    size: file.size,
                    pages,
                    mimeType: file.mimetype,
                    previewImage,
                    thumbnailUrl: previewImage,
                    firstPageImage: previewImage,
                };
            })
        );

        return sendSuccess(res, { files: uploaded }, 'Files uploaded successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/products/printing/configure
 * Saves the full print configuration (files + options + delivery method).
 * Returns a configId to be used when placing the order.
 */
const savePrintConfig = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const data = await printingService.savePrintConfig(userId, req.body);
        return sendCreated(res, data, 'Print configuration saved');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/products/printing/config/:id
 * Get a saved print config (used by checkout page to show summary).
 */
const getPrintConfig = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const data = await printingService.getPrintConfig(req.params.id, userId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getHome,
    getDocumentTypes,
    getDocumentType,
    getServicePackages,
    getPickupLocations,
    uploadFiles,
    savePrintConfig,
    getPrintConfig,
};
