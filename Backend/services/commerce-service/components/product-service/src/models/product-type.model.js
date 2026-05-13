const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        description: { type: String, trim: true, default: '' },
        image: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
        metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
);

productTypeSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('ProductType', productTypeSchema);
