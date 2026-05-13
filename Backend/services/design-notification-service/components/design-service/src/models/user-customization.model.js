const mongoose = require('mongoose');

const slotCustomizationSchema = new mongoose.Schema(
    {
        slotId: { type: String, required: true, trim: true },
        type: { type: String, enum: ['image', 'text'], required: true },
        asset: {
            assetId: { type: String, trim: true, default: '' },
            originalUrl: { type: String, trim: true, default: '' },
            processedUrl: { type: String, trim: true, default: '' },
            mimeType: { type: String, trim: true, default: '' },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 },
            sizeBytes: { type: Number, min: 0 },
        },
        transform: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
            scale: { type: Number, default: 1, min: 0.01 },
            rotation: { type: Number, default: 0 },
            zoom: { type: Number, default: 1, min: 0.01 },
        },
        crop: {
            x: { type: Number, default: 0, min: 0 },
            y: { type: Number, default: 0, min: 0 },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 },
            unit: { type: String, enum: ['px', 'percent'], default: 'px' },
        },
        text: {
            value: { type: String, default: '' },
            fontFamily: { type: String, default: '' },
            fontSize: { type: Number, min: 1 },
            fontWeight: { type: String, default: '' },
            color: { type: String, default: '' },
            alignment: { type: String, enum: ['left', 'center', 'right', ''], default: '' },
        },
        updatedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const userCustomizationSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, trim: true, index: true },
        variantId: { type: String, required: true, trim: true, index: true },
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TemplateDefinition',
            required: true,
            index: true,
        },
        templateVersion: { type: Number, required: true, min: 1 },
        status: {
            type: String,
            enum: ['draft', 'preview_generated', 'print_ready', 'locked'],
            default: 'draft',
            index: true,
        },
        slots: { type: [slotCustomizationSchema], default: [] },
        renderedPreview: {
            url: { type: String, trim: true, default: '' },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 },
            generatedAt: { type: Date, default: null },
        },
        printReadyAsset: {
            url: { type: String, trim: true, default: '' },
            dpi: { type: Number, min: 0 },
            format: { type: String, trim: true, default: '' },
            generatedAt: { type: Date, default: null },
        },
        renderHash: { type: String, trim: true, default: '' },
        validationSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
        lockedOrderId: { type: String, trim: true, default: '' },
        lockedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

userCustomizationSchema.index({ userId: 1, variantId: 1, status: 1 });
userCustomizationSchema.index({ templateId: 1, templateVersion: 1 });

module.exports = mongoose.model('UserCustomization', userCustomizationSchema);
