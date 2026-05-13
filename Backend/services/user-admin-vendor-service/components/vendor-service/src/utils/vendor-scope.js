const mongoose = require('mongoose');
const VendorOrg = require('../models/vendor-org.model');

const normalizeString = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const uniqueStrings = (values = []) =>
    [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))];

const buildAliasMatch = (field, aliases = []) => {
    const normalized = uniqueStrings(aliases);
    if (!normalized.length) return { [field]: '' };
    if (normalized.length === 1) return { [field]: normalized[0] };
    return { [field]: { $in: normalized } };
};

const resolveVendorScope = async ({
    vendorId,
    vendorUserId,
    vendorOrgId,
    vendorAliases = [],
} = {}) => {
    const aliases = uniqueStrings([vendorId, vendorUserId, vendorOrgId, ...vendorAliases]);
    let org = null;

    if (normalizeString(vendorOrgId) && mongoose.Types.ObjectId.isValid(normalizeString(vendorOrgId))) {
        org = await VendorOrg.findOne({
            _id: normalizeString(vendorOrgId),
            deletedAt: null,
        }).lean();
    }

    if (!org && normalizeString(vendorUserId)) {
        org = await VendorOrg.findOne({
            userId: normalizeString(vendorUserId),
            deletedAt: null,
        }).lean();
    }

    if (!org && aliases.length) {
        org = await VendorOrg.findOne({
            deletedAt: null,
            $or: [{ userId: { $in: aliases } }, { _id: { $in: aliases } }],
        }).lean();
    }

    const resolvedUserId = normalizeString(vendorUserId || org?.userId || vendorId);
    const resolvedOrgId = normalizeString(vendorOrgId || org?._id);
    const resolvedAliases = uniqueStrings([
        ...aliases,
        resolvedUserId,
        resolvedOrgId,
        org?.userId,
        org?._id,
    ]);

    return {
        vendorUserId: resolvedUserId,
        vendorOrgId: resolvedOrgId,
        aliases: resolvedAliases,
        vendorOrg: org,
    };
};

module.exports = {
    buildAliasMatch,
    resolveVendorScope,
    uniqueStrings,
    normalizeString,
};
