const mongoose = require('mongoose');

const featureFlagsSchema = new mongoose.Schema(
    {
        gifting: { type: Boolean, default: true },
        shopping: { type: Boolean, default: true },
        printing: { type: Boolean, default: true },
        referrals: { type: Boolean, default: true },
        wallet: { type: Boolean, default: true },
    },
    { _id: false }
);

const pausedCityDetailSchema = new mongoose.Schema(
    {
        city: { type: String, required: true },
        reason: { type: String, default: '' },
        pausedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const systemStateSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'global', unique: true, index: true },
        orderIntakeEnabled: { type: Boolean, default: true },
        vendorIntakeEnabled: { type: Boolean, default: true },
        systemKillSwitchEnabled: { type: Boolean, default: false },
        pausedCities: { type: [String], default: [] },
        pausedCityDetails: { type: [pausedCityDetailSchema], default: [] },
        featureFlags: { type: featureFlagsSchema, default: () => ({}) },
        retentionPolicy: {
            exportRetentionDays: { type: Number, default: 30 },
            auditLogRetentionDays: { type: Number, default: 180 },
            ticketRetentionDays: { type: Number, default: 365 },
            deleteBlockedWhenOrdersActive: { type: Boolean, default: true },
        },
        lastUpdatedBy: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('SystemState', systemStateSchema);
