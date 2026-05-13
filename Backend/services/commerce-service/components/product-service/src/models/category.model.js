const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        description: { type: String, trim: true },
        productTypeId: { type: String, trim: true, default: '' },
        flowType: {
            type: String,
            enum: ['printing', 'gifting', 'shopping'],
            required: true,
        },
        image: { type: String },
        section: {
            type: String,
            enum: ['printing', 'gifting', 'shopping'],
        },
        starting_from: { type: Number, min: 0, default: null },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

categorySchema.pre('validate', function (next) {
    if (!this.section && this.flowType) this.section = this.flowType;
    if (!this.flowType && this.section) this.flowType = this.section;
    next();
});

categorySchema.index({ productTypeId: 1, isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);
