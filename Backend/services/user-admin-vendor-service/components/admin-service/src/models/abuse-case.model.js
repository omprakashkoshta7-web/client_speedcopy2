const mongoose = require('mongoose');

const abuseCaseActionSchema = new mongoose.Schema(
    {
        action: { type: String, required: true, trim: true },
        note: { type: String, default: '', trim: true },
        actorId: { type: String, default: '' },
        actorRole: { type: String, default: 'admin' },
        metadata: { type: mongoose.Schema.Types.Mixed, default: null },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const abuseCaseSchema = new mongoose.Schema(
    {
        subject: { type: String, required: true, trim: true },
        entityType: {
            type: String,
            enum: ['customer', 'vendor', 'order', 'delivery_partner', 'staff', 'system', 'other'],
            default: 'other',
            index: true,
        },
        entityId: { type: String, default: '', index: true },
        category: {
            type: String,
            enum: ['fraud', 'abuse', 'chargeback', 'refund', 'sla', 'compliance', 'other'],
            default: 'other',
            index: true,
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
            index: true,
        },
        status: {
            type: String,
            enum: ['open', 'investigating', 'restricted', 'resolved', 'closed'],
            default: 'open',
            index: true,
        },
        description: { type: String, default: '', trim: true },
        evidence: { type: [String], default: [] },
        assignedTo: { type: String, default: '', index: true },
        tags: { type: [String], default: [] },
        resolution: { type: String, default: '', trim: true },
        actions: { type: [abuseCaseActionSchema], default: [] },
        resolvedAt: { type: Date, default: null },
        closedAt: { type: Date, default: null },
        createdBy: { type: String, default: '' },
        updatedBy: { type: String, default: '' },
    },
    { timestamps: true }
);

abuseCaseSchema.index({ status: 1, severity: -1, updatedAt: -1 });

module.exports = mongoose.model('AbuseCase', abuseCaseSchema);
