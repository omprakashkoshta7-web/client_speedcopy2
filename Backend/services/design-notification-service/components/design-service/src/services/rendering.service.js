const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const config = require('../config');

const uploadsRoot = path.join(__dirname, '../../uploads');
const renderDir = path.join(uploadsRoot, 'renders');
if (!fs.existsSync(renderDir)) fs.mkdirSync(renderDir, { recursive: true });

const buildBaseUrl = (req) =>
    config.publicBaseUrl ||
    `${req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http'}://${req?.headers?.['x-forwarded-host'] || req?.get?.('host') || ''}`;

const toPublicUrl = (req, absolutePath) => {
    const relative = path.relative(uploadsRoot, absolutePath).split(path.sep).join('/');
    return `${buildBaseUrl(req).replace(/\/$/, '')}/uploads/${relative}`;
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const resolveLocalPathFromUrl = (value) => {
    const raw = String(value || '');
    const uploadIndex = raw.indexOf('/uploads/');
    if (uploadIndex === -1) return null;
    const relative = raw.slice(uploadIndex + '/uploads/'.length).split(/[?#]/)[0];
    return path.join(uploadsRoot, relative);
};

const loadImageBuffer = async (source) => {
    const value = String(source || '').trim();
    if (!value) return null;

    const localPath = value.startsWith('/uploads/')
        ? path.join(uploadsRoot, value.replace(/^\/uploads\//, ''))
        : resolveLocalPathFromUrl(value) || (path.isAbsolute(value) ? value : null);

    if (localPath && fs.existsSync(localPath)) {
        return fs.promises.readFile(localPath);
    }

    if (isHttpUrl(value)) {
        const response = await fetch(value);
        if (!response.ok) throw new Error(`Unable to fetch image asset: ${value}`);
        return Buffer.from(await response.arrayBuffer());
    }

    return null;
};

const buildShapeMask = async (slot) => {
    const geometry = slot.geometry || {};
    const width = Math.round(geometry.width);
    const height = Math.round(geometry.height);
    const shape = geometry.shape || 'rectangle';
    if (shape === 'rectangle') return null;

    const body =
        shape === 'circle'
            ? `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="white"/>`
            : `<path d="${geometry.path || `M0 0H${width}V${height}H0Z`}" fill="white"/>`;

    return Buffer.from(
        `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
    );
};

const renderImageSlot = async (slot, value) => {
    const source = value.asset?.processedUrl || value.asset?.originalUrl;
    const buffer = await loadImageBuffer(source);
    if (!buffer) return null;

    const geometry = slot.geometry || {};
    const width = Math.round(geometry.width);
    const height = Math.round(geometry.height);
    let image = sharp(buffer, { failOn: 'none' }).rotate();

    if (value.crop?.width && value.crop?.height && value.crop.unit !== 'percent') {
        image = image.extract({
            left: Math.max(0, Math.round(value.crop.x || 0)),
            top: Math.max(0, Math.round(value.crop.y || 0)),
            width: Math.max(1, Math.round(value.crop.width)),
            height: Math.max(1, Math.round(value.crop.height)),
        });
    }

    let rendered = await image.resize(width, height, { fit: 'cover' }).png().toBuffer();
    const mask = await buildShapeMask(slot);
    if (mask) {
        rendered = await sharp(rendered)
            .composite([{ input: mask, blend: 'dest-in' }])
            .png()
            .toBuffer();
    }

    return {
        input: rendered,
        left: Math.round(geometry.x + (value.transform?.x || 0)),
        top: Math.round(geometry.y + (value.transform?.y || 0)),
    };
};

const escapeXml = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const renderTextSlot = async (slot, value) => {
    const geometry = slot.geometry || {};
    const textConfig = slot.textConfig || {};
    const width = Math.round(geometry.width);
    const height = Math.round(geometry.height);
    const text = value.text || {};
    const fontSize = Number(text.fontSize || textConfig.defaultFontSize || 24);
    const fontFamily = text.fontFamily || textConfig.defaultFontFamily || 'Arial';
    const fontWeight = text.fontWeight || textConfig.fontWeight || '400';
    const color = text.color || textConfig.color || '#000000';
    const alignment = text.alignment || textConfig.alignment || 'center';
    const anchor = alignment === 'left' ? 'start' : alignment === 'right' ? 'end' : 'middle';
    const x = alignment === 'left' ? 0 : alignment === 'right' ? width : width / 2;
    const y = height / 2 + fontSize / 3;

    const svg = Buffer.from(`
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <text x="${x}" y="${y}"
                text-anchor="${anchor}"
                font-family="${escapeXml(fontFamily)}"
                font-size="${fontSize}"
                font-weight="${escapeXml(fontWeight)}"
                fill="${escapeXml(color)}">${escapeXml(text.value)}</text>
        </svg>
    `);

    return {
        input: await sharp(svg).png().toBuffer(),
        left: Math.round(geometry.x + (value.transform?.x || 0)),
        top: Math.round(geometry.y + (value.transform?.y || 0)),
    };
};

const renderCustomization = async ({ customization, req, type = 'preview' }) => {
    const template = customization.templateId;
    const canvas = template.canvas || {};
    const width = Math.round(canvas.width);
    const height = Math.round(canvas.height);
    const slotValues = new Map((customization.slots || []).map((slot) => [slot.slotId, slot]));
    const baseBuffer = await loadImageBuffer(template.assets?.editorBaseImage);
    const overlayBuffer = await loadImageBuffer(template.assets?.overlayImage);

    const composites = [];
    const sortedSlots = [...(template.slots || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const slot of sortedSlots) {
        const value = slotValues.get(slot.slotId);
        if (!value) continue;
        const layer =
            slot.type === 'image'
                ? await renderImageSlot(slot, value)
                : await renderTextSlot(slot, value);
        if (layer) composites.push(layer);
    }

    if (overlayBuffer) {
        composites.push({
            input: await sharp(overlayBuffer, { failOn: 'none' }).resize(width, height).png().toBuffer(),
            left: 0,
            top: 0,
        });
    }

    const filename = `${type}-${customization._id}-${crypto.randomBytes(6).toString('hex')}.png`;
    const outputPath = path.join(renderDir, filename);

    const pipeline = baseBuffer
        ? sharp(baseBuffer, { failOn: 'none' }).resize(width, height).png()
        : sharp({
              create: {
                  width,
                  height,
                  channels: 4,
                  background: { r: 255, g: 255, b: 255, alpha: 1 },
              },
          }).png();

    if (composites.length) {
        await pipeline.composite(composites).toFile(outputPath);
    } else {
        await pipeline.toFile(outputPath);
    }
    return {
        url: toPublicUrl(req, outputPath),
        path: outputPath,
        width,
        height,
        dpi: canvas.dpi || 300,
        format: 'png',
    };
};

module.exports = {
    renderCustomization,
    toPublicUrl,
    buildBaseUrl,
};
