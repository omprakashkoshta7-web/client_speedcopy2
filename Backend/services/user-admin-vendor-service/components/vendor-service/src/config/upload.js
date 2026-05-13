const fs = require('fs');
const path = require('path');
const multer = require('multer');

const rootUploadDir = path.join(__dirname, '../uploads');
const legalUploadDir = path.join(rootUploadDir, 'vendors', 'legal');
const qcUploadDir = path.join(rootUploadDir, 'vendors', 'qc');
const supportUploadDir = path.join(rootUploadDir, 'vendors', 'support');

for (const dir of [rootUploadDir, legalUploadDir, qcUploadDir, supportUploadDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const createDiskStorage = (destination) =>
    multer.diskStorage({
        destination,
        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${unique}-${sanitizeFilename(file.originalname)}`);
        },
    });

const legalUpload = multer({
    storage: createDiskStorage(legalUploadDir),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG legal files are allowed'));
    },
});

const qcUpload = multer({
    storage: createDiskStorage(qcUploadDir),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error('Only JPG, PNG, and WEBP QC images are allowed'));
    },
});

const supportAttachmentUpload = multer({
    storage: createDiskStorage(supportUploadDir),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
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
        cb(new Error('Only PDF, image, DOC, DOCX, and TXT support files are allowed'));
    },
});

module.exports = {
    rootUploadDir,
    legalUpload,
    qcUpload,
    supportAttachmentUpload,
};
