const { sendSuccess } = require('../../../../shared/utils/response');
const SystemState = require('../models/system-state.model');
const AuditLog = require('../models/audit-log.model');
const AbuseCase = require('../models/abuse-case.model');

const getStateDoc = async () =>
    SystemState.findOneAndUpdate(
        { key: 'global' },
        { $setOnInsert: { key: 'global' } },
        { upsert: true, new: true }
    );

const logAdminAction = async (req, action, metadata = {}, reason = '') => {
    await AuditLog.create({
        actorId: req.headers['x-user-id'] || '',
        actorRole: req.headers['x-user-role'] || 'admin',
        action,
        targetType: 'system_state',
        targetId: 'global',
        reason,
        metadata,
    });
};

const setOrderIntake = async (req, res) => {
    const enabled = req.body.enabled !== false;
    const state = await getStateDoc();
    state.orderIntakeEnabled = enabled;
    state.lastUpdatedBy = req.headers['x-user-id'] || '';
    await state.save();
    await logAdminAction(req, 'admin.control.order_intake.updated', { enabled });
    return sendSuccess(res, { orderIntakeEnabled: enabled }, 'Order intake updated');
};

const setVendorIntake = async (req, res) => {
    const enabled = req.body.enabled !== false;
    const state = await getStateDoc();
    state.vendorIntakeEnabled = enabled;
    state.lastUpdatedBy = req.headers['x-user-id'] || '';
    await state.save();
    await logAdminAction(req, 'admin.control.vendor_intake.updated', { enabled });
    return sendSuccess(res, { vendorIntakeEnabled: enabled }, 'Vendor intake updated');
};

const setKillSwitch = async (req, res) => {
    const enabled = req.body.enabled === true;
    const state = await getStateDoc();
    state.systemKillSwitchEnabled = enabled;
    state.lastUpdatedBy = req.headers['x-user-id'] || '';
    await state.save();
    await logAdminAction(req, 'admin.control.kill_switch.updated', { enabled }, req.body.reason);
    return sendSuccess(res, { systemKillSwitchEnabled: enabled }, 'System kill switch updated');
};

const setCityPause = async (req, res) => {
    const { city, paused, reason = '' } = req.body;
    const state = await getStateDoc();
    if (paused) {
        if (!state.pausedCities.includes(city)) state.pausedCities.push(city);
        state.pausedCityDetails = (state.pausedCityDetails || []).filter((entry) => entry.city !== city);
        state.pausedCityDetails.push({
            city,
            reason,
            pausedAt: new Date(),
        });
    } else {
        state.pausedCities = state.pausedCities.filter((c) => c !== city);
        state.pausedCityDetails = (state.pausedCityDetails || []).filter((entry) => entry.city !== city);
    }
    state.lastUpdatedBy = req.headers['x-user-id'] || '';
    await state.save();
    await logAdminAction(req, 'admin.control.city_pause.updated', { city, paused }, reason);
    return sendSuccess(
        res,
        {
            pausedCities: state.pausedCities,
            pausedCityDetails: state.pausedCityDetails || [],
        },
        'City pause updated'
    );
};

const setFeatureFlags = async (req, res) => {
    const state = await getStateDoc();
    Object.assign(state.featureFlags, req.body);
    state.lastUpdatedBy = req.headers['x-user-id'] || '';
    await state.save();
    await logAdminAction(req, 'admin.control.feature_flags.updated', req.body);
    return sendSuccess(res, state.featureFlags, 'Feature flags updated');
};

const getState = async (req, res) => {
    const state = await getStateDoc();
    const featureFlags = state.featureFlags?.toObject?.() || state.featureFlags || {};
    return sendSuccess(res, {
        orderIntakeEnabled: state.orderIntakeEnabled,
        vendorIntakeEnabled: state.vendorIntakeEnabled,
        systemKillSwitchEnabled: state.systemKillSwitchEnabled,
        pausedCities: state.pausedCities || [],
        pausedCityDetails: state.pausedCityDetails || [],
        featureFlags,
        retentionPolicy: state.retentionPolicy || {},
        metrics: {
            pausedCitiesCount: Array.isArray(state.pausedCities) ? state.pausedCities.length : 0,
            activeFlagsCount: Object.values(featureFlags).filter(Boolean).length,
        },
        lastUpdatedBy: state.lastUpdatedBy || '',
        updatedAt: state.updatedAt,
    });
};

const getRetentionPolicy = async (req, res) => {
    const state = await getStateDoc();
    return sendSuccess(res, state.retentionPolicy || {});
};

const setRetentionPolicy = async (req, res) => {
    const state = await getStateDoc();
    state.retentionPolicy = {
        ...(state.retentionPolicy?.toObject?.() || state.retentionPolicy || {}),
        ...req.body,
    };
    state.lastUpdatedBy = req.headers['x-user-id'] || '';
    await state.save();
    await logAdminAction(req, 'admin.control.retention_policy.updated', state.retentionPolicy);
    return sendSuccess(res, state.retentionPolicy, 'Retention policy updated');
};

const getComplianceSummary = async (req, res) => {
    const [state, recentAdminActions, openRiskCases] = await Promise.all([
        getStateDoc(),
        AuditLog.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
        AbuseCase.countDocuments({ status: { $in: ['open', 'investigating', 'restricted'] } }),
    ]);

    return sendSuccess(res, {
        retentionPolicy: state.retentionPolicy || {},
        featureFlags: state.featureFlags || {},
        controls: {
            orderIntakeEnabled: state.orderIntakeEnabled,
            vendorIntakeEnabled: state.vendorIntakeEnabled,
            systemKillSwitchEnabled: state.systemKillSwitchEnabled,
            pausedCities: state.pausedCities || [],
            pausedCityDetails: state.pausedCityDetails || [],
        },
        compliance: {
            recentAdminActions,
            openRiskCases,
            lastUpdatedBy: state.lastUpdatedBy || '',
            updatedAt: state.updatedAt,
        },
    });
};

module.exports = {
    setOrderIntake,
    setVendorIntake,
    setKillSwitch,
    setCityPause,
    setFeatureFlags,
    getState,
    getRetentionPolicy,
    setRetentionPolicy,
    getComplianceSummary,
};
