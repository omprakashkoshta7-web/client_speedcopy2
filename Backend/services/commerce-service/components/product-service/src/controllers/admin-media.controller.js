const path = require('path');
const { sendSuccess } = require('../../../../shared/utils/response');
const config = require('../config');

const buildBaseUrl = (req) =>
    config.publicBaseUrl ||
    `${req.headers['x-forwarded-proto'] || req.protocol || 'http'}://${req.headers['x-forwarded-host'] || req.get('host')}`;

const normalizeUploadedFiles = (req) => {
    if (Array.isArray(req.files)) return req.files;
    if (req.files && typeof req.files === 'object') {
        return Object.values(req.files).flat();
    }
    return [];
};

const uploadCatalogMedia = async (req, res, next) => {
    try {
        const files = normalizeUploadedFiles(req);
        if (!files.length) {
            return res.status(400).json({
                success: false,
                message: 'At least one image file is required',
            });
        }

        const baseUrl = buildBaseUrl(req).replace(/\/$/, '');
        const payload = files.map((file) => ({
            fieldName: file.fieldname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            filename: file.filename,
            path: `/uploads/catalog/${file.filename}`,
            url: `${baseUrl}/uploads/catalog/${file.filename}`,
        }));

        return sendSuccess(
            res,
            {
                files: payload,
                file: payload[0],
                url: payload[0]?.url || '',
                path: payload[0]?.path || '',
                urls: payload.map((file) => file.url),
            },
            'Catalog media uploaded successfully'
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadCatalogMedia,
};
