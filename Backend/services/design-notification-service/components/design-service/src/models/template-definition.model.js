const mongoose = require('mongoose');

const geometrySchema = new mongoose.Schema(
    {
        x: { type: Number, required: true, min: 0 },
        y: { type: Number, required: true, min: 0 },
        width: { type: Number, required: true, min: 1 },
        height: { type: Number, required: true, min: 1 },
        rotation: { type: Number, default: 0 },
        shape: {
            type: String,
            enum: ['rectangle', 'circle', 'custom'],
            default: 'rectangle',
        },
        path: { type: String, trim: true, default: '' },
    },
    { _id: false }
);

const slotSchema = new mongoose.Schema(
    {
        slotId: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ['image', 'text'], required: true },
        geometry: { type: geometrySchema, required: true },
        behavior: {
            movable: { type: Boolean, default: true },
            resizable: { type: Boolean, default: false },
            cropEnabled: { type: Boolean, default: true },
            zoomEnabled: { type: Boolean, default: true },
            rotateEnabled: { type: Boolean, default: false },
        },
        imageConfig: {
            fitMode: { type: String, enum: ['cover', 'contain', 'fill'], default: 'cover' },
            minZoom: { type: Number, default: 1, min: 0.1 },
            maxZoom: { type: Number, default: 4, min: 0.1 },
            acceptedMimeTypes: {
                type: [String],
                default: ['image/jpeg', 'image/png', 'image/webp'],
            },
            maxFileSizeMb: { type: Number, default: 10, min: 1 },
            minResolution: {
                width: { type: Number, default: 0, min: 0 },
                height: { type: Number, default: 0, min: 0 },
            },
        },
        textConfig: {
            minLength: { type: Number, default: 0, min: 0 },
            maxLength: { type: Number, default: 120, min: 1 },
            allowedFonts: { type: [String], default: ['Inter', 'Arial'] },
            defaultFontFamily: { type: String, default: 'Inter' },
            defaultFontSize: { type: Number, default: 24, min: 1 },
            minFontSize: { type: Number, default: 8, min: 1 },
            maxFontSize: { type: Number, default: 96, min: 1 },
            fontWeight: { type: String, default: '400' },
            color: { type: String, default: '#000000' },
            alignment: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
            letterSpacing: { type: Number, default: 0 },
            lineHeight: { type: Number, default: 1.2 },
        },
        zIndex: { type: Number, default: 0 },
        required: { type: Boolean, default: true },
    },
    { _id: false }
);

const mockupSchema = new mongoose.Schema(
    {
        mockupId: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['wall_frame', 'room', 'pen_engraving', 'acrylic', 'flat'],
            required: true,
        },
        sceneImage: { type: String, trim: true, default: '' },
        targetBox: {
            x: { type: Number, required: true, min: 0 },
            y: { type: Number, required: true, min: 0 },
            width: { type: Number, required: true, min: 1 },
            height: { type: Number, required: true, min: 1 },
            rotation: { type: Number, default: 0 },
        },
        perspective: { type: mongoose.Schema.Types.Mixed, default: null },
        shadow: { type: mongoose.Schema.Types.Mixed, default: null },
        blendMode: { type: String, default: 'normal' },
        opacity: { type: Number, default: 1, min: 0, max: 1 },
    },
    { _id: false }
);

const templateDefinitionSchema = new mongoose.Schema(
    {
        productTypeId: { type: String, trim: true, default: '' },
        categoryId: { type: String, trim: true, default: '' },
        variantId: { type: String, required: true, trim: true, index: true },
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, lowercase: true, trim: true },
        version: { type: Number, default: 1, min: 1 },
        assets: {
            editorBaseImage: { type: String, required: true, trim: true },
            overlayImage: { type: String, trim: true, default: '' },
            maskImage: { type: String, trim: true, default: '' },
            mockupSceneImage: { type: String, trim: true, default: '' },
        },
        canvas: {
            width: { type: Number, required: true, min: 1 },
            height: { type: Number, required: true, min: 1 },
            unit: { type: String, enum: ['px', 'mm', 'cm', 'in'], default: 'px' },
            dpi: { type: Number, default: 300, min: 72 },
            printWidth: { type: Number, min: 0 },
            printHeight: { type: Number, min: 0 },
        },
        slots: { type: [slotSchema], default: [] },
        previewConfig: {
            renderer: { type: String, enum: ['canvas', 'sharp', 'svg', 'fabric'], default: 'sharp' },
            livePreview: { type: Boolean, default: true },
            mockups: { type: [mockupSchema], default: [] },
        },
        rules: {
            allowFreeDesign: { type: Boolean, default: false },
            requiredSlots: { type: [String], default: [] },
            minResolution: {
                width: { type: Number, default: 0, min: 0 },
                height: { type: Number, default: 0, min: 0 },
            },
            safeArea: { type: mongoose.Schema.Types.Mixed, default: null },
            bleed: { type: mongoose.Schema.Types.Mixed, default: null },
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            index: true,
        },
        isActive: { type: Boolean, default: true, index: true },
        publishedAt: { type: Date, default: null },
        createdBy: { type: String, trim: true, default: '' },
        updatedBy: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

templateDefinitionSchema.index(
    { variantId: 1, slug: 1, version: 1 },
    { unique: true, name: 'unique_variant_template_version' }
);
templateDefinitionSchema.index({ variantId: 1, status: 1, isActive: 1 });

module.exports = mongoose.model('TemplateDefinition', templateDefinitionSchema);
