const mongoose = require('mongoose');

const renderJobSchema = new mongoose.Schema(
    {
        customizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserCustomization',
            required: true,
            index: true,
        },
        renderHash: { type: String, required: true, trim: true, index: true },
        type: { type: String, enum: ['preview', 'print_ready'], required: true },
        status: {
            type: String,
            enum: ['queued', 'processing', 'completed', 'failed'],
            default: 'queued',
            index: true,
        },
        outputUrl: { type: String, trim: true, default: '' },
        error: { type: String, trim: true, default: '' },
        metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
);

renderJobSchema.index({ renderHash: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('RenderJob', renderJobSchema);
