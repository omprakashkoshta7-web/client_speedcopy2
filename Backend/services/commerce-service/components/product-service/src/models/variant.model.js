const mongoose = require('mongoose');

/**
 * Product variants (e.g., size/color combinations with individual pricing).
 */
const variantSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        name: { type: String, required: true, trim: true }, // e.g., "A4 - Color - Double Side"
        attributes: { type: Map, of: String }, // { size: 'A4', color: 'Color' }
        productTypeId: { type: String, trim: true, default: '' },
        categoryId: { type: String, trim: true, default: '' },
        slug: { type: String, lowercase: true, trim: true, default: '' },
        shape: { type: String, trim: true, default: '' },
        material: { type: String, trim: true, default: '' },
        previewImages: [
            {
                label: { type: String, trim: true, default: '' },
                url: { type: String, trim: true, default: '' },
                type: {
                    type: String,
                    enum: ['thumbnail', 'gallery', 'editor', 'mockup', 'preview'],
                    default: 'preview',
                },
            },
        ],
        templateIds: [{ type: String, trim: true }],
        defaultTemplateId: { type: String, trim: true, default: '' },
        pricing: {
            mrp: { type: Number, min: 0 },
            salePrice: { type: Number, min: 0 },
            currency: { type: String, default: 'INR' },
            taxInclusive: { type: Boolean, default: true },
        },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, default: 0 },
        sku: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

variantSchema.index({ product: 1 });
variantSchema.index({ productTypeId: 1, categoryId: 1, isActive: 1 });
variantSchema.index({ sku: 1 }, { sparse: true });

module.exports = mongoose.model('Variant', variantSchema);
