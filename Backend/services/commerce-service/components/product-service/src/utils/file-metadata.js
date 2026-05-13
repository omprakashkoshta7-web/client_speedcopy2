const fs = require('fs/promises');

const countPdfPages = async (filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        const content = buffer.toString('latin1');
        const matches = content.match(/\/Type\s*\/Page\b/g);
        return Array.isArray(matches) && matches.length ? matches.length : 0;
    } catch {
        return 0;
    }
};

const detectPageCount = async (file) => {
    const mimeType = String(file?.mimetype || '').toLowerCase();

    if (mimeType.startsWith('image/')) {
        return 1;
    }

    if (mimeType.includes('pdf')) {
        return countPdfPages(file.path);
    }

    return 0;
};

module.exports = {
    detectPageCount,
};
