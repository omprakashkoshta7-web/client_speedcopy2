const fs = require('fs/promises');
const path = require('path');
const { uploadDir } = require('../config/cloudinary');

const escapeXml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const getDocumentLabel = (mimeType = '', originalName = '') => {
    const normalizedMime = String(mimeType || '').toLowerCase();
    const extension = path.extname(originalName || '').replace('.', '').toUpperCase();

    if (normalizedMime.includes('pdf')) return 'PDF Preview';
    if (normalizedMime.includes('word') || normalizedMime.includes('document')) {
        return `${extension || 'DOC'} Preview`;
    }

    return `${extension || 'FILE'} Preview`;
};

const buildPreviewSvg = (file) => {
    const title = escapeXml(getDocumentLabel(file.mimetype, file.originalname));
    const fileName = escapeXml(file.originalname || 'Document');
    const fileSizeKb = Math.max(1, Math.round(Number(file.size || 0) / 1024));
    const subtitle = escapeXml(`${fileSizeKb} KB`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <rect x="110" y="110" width="980" height="1380" rx="48" fill="#ffffff" stroke="#cbd5e1" stroke-width="8"/>
  <rect x="180" y="220" width="220" height="260" rx="28" fill="#0f172a"/>
  <text x="290" y="375" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="700" fill="#ffffff">${escapeXml(
      path.extname(file.originalname || '').replace('.', '').slice(0, 4).toUpperCase() || 'DOC'
  )}</text>
  <text x="180" y="600" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="#0f172a">${title}</text>
  <text x="180" y="710" font-family="Arial, sans-serif" font-size="42" fill="#334155">${fileName}</text>
  <text x="180" y="780" font-family="Arial, sans-serif" font-size="36" fill="#64748b">${subtitle}</text>
  <text x="180" y="980" font-family="Arial, sans-serif" font-size="42" fill="#475569">Preview generated for uploaded document</text>
  <text x="180" y="1040" font-family="Arial, sans-serif" font-size="34" fill="#64748b">Use the original file URL for full file access.</text>
</svg>`;
};

const generateDocumentPreview = async (file) => {
    const normalizedMime = String(file?.mimetype || '').toLowerCase();
    const isImage = normalizedMime.startsWith('image/');
    if (isImage) {
        return { previewFileName: '', previewImage: '' };
    }

    const previewFileName = `${file.filename}.preview.svg`;
    const previewPath = path.join(uploadDir, previewFileName);
    await fs.writeFile(previewPath, buildPreviewSvg(file), 'utf8');

    return {
        previewFileName,
    };
};

module.exports = { generateDocumentPreview };
