const multer = require('multer');

const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const ticketAttachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        file.safeFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizeFilename(
            file.originalname
        )}`;
        const allowed = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only PDF, image, DOC, DOCX, and TXT ticket attachments are allowed'));
    },
});

module.exports = {
    ticketAttachmentUpload,
};
