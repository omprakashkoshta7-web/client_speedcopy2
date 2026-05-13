const VendorOrg = require('../models/vendor-org.model');
const Store = require('../models/store.model');
const VendorStaff = require('../models/vendor-staff.model');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { buildAliasMatch, resolveVendorScope, uniqueStrings } = require('../utils/vendor-scope');

const toFiniteNumber = (value) => {
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
};

const normalizeStoreLocation = (data = {}) => {
    const next = { ...data };
    const location = data.location || {};
    const lat = toFiniteNumber(location.lat);
    const lng = toFiniteNumber(location.lng);

    if (lat !== null && lng !== null) {
        next.location = {
            ...location,
            lat,
            lng,
        };
        next.geo = {
            type: 'Point',
            coordinates: [lng, lat],
        };
    } else if (Object.prototype.hasOwnProperty.call(next, 'geo')) {
        delete next.geo;
    }

    return next;
};

const toRadians = (value) => (value * Math.PI) / 180;

const haversineDistanceMeters = (origin, destination) => {
    const earthRadiusMeters = 6371000;
    const dLat = toRadians(destination.lat - origin.lat);
    const dLng = toRadians(destination.lng - origin.lng);
    const lat1 = toRadians(origin.lat);
    const lat2 = toRadians(destination.lat);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
};

const getAuthConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;
    if (!config.authDbUri) {
        throw new Error('AUTH_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.authDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getDeliveryConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_delivery' && c.readyState === 1
    );
    if (existing) return existing;
    if (!config.deliveryDbUri) {
        throw new Error('DELIVERY_DB_URI is not set');
    }

    return mongoose
        .createConnection(config.deliveryDbUri, { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getOrCreateOrg = async (userId) => {
    const scope = await resolveVendorScope({ vendorId: userId, vendorUserId: userId });
    let org = scope.vendorOrg;
    if (!org) {
        org = await VendorOrg.create({ userId: scope.vendorUserId, businessName: 'My Business' });
    }
    return org;
};

const updateOrg = async (userId, data) => {
    const scope = await resolveVendorScope({ vendorId: userId, vendorUserId: userId });
    const org = await VendorOrg.findOneAndUpdate({ userId: scope.vendorUserId, deletedAt: null }, data, {
        new: true,
        upsert: true,
        runValidators: true,
    });
    return org;
};

const getStores = async (vendorId) => {
    const scope = await resolveVendorScope({ vendorId });
    return Store.find({ ...buildAliasMatch('vendorId', scope.aliases), deletedAt: null }).sort({
        createdAt: -1,
    });
};

const getStoreById = async (vendorId, storeId) => {
    const scope = await resolveVendorScope({ vendorId });
    const store = await Store.findOne({
        _id: storeId,
        ...buildAliasMatch('vendorId', scope.aliases),
        deletedAt: null,
    });
    if (!store) {
        const err = new Error('Store not found');
        err.statusCode = 404;
        throw err;
    }
    return store;
};

const createStore = async (vendorId, userId, data) => {
    const scope = await resolveVendorScope({ vendorId, vendorUserId: userId });
    const payload = normalizeStoreLocation({
        ...data,
        vendorId: scope.vendorUserId,
        userId: scope.vendorUserId,
        internalCode: data.internalCode || `${scope.vendorUserId}-${Date.now()}`,
    });
    if (data.capacity?.dailyLimit && !data.capacity?.maxOrdersPerDay) {
        payload.capacity = {
            ...data.capacity,
            maxOrdersPerDay: data.capacity.dailyLimit,
        };
    }
    return Store.create(payload);
};

const updateStore = async (vendorId, storeId, data) => {
    const scope = await resolveVendorScope({ vendorId });
    const updates = normalizeStoreLocation(data);
    const store = await Store.findOneAndUpdate(
        { _id: storeId, ...buildAliasMatch('vendorId', scope.aliases), deletedAt: null },
        updates,
        {
            new: true,
            runValidators: true,
        }
    );
    if (!store) {
        const err = new Error('Store not found');
        err.statusCode = 404;
        throw err;
    }
    return store;
};

const deleteStore = async (vendorId, storeId) => {
    const scope = await resolveVendorScope({ vendorId });
    const store = await Store.findOne({
        _id: storeId,
        ...buildAliasMatch('vendorId', scope.aliases),
        deletedAt: null,
    });

    if (!store) {
        const err = new Error('Store not found');
        err.statusCode = 404;
        throw err;
    }

    const assignedStaffCount = await VendorStaff.countDocuments({
        ...buildAliasMatch('vendorId', scope.aliases),
        deletedAt: null,
        $or: [{ storeId: storeId }, { assignedStoreIds: storeId }],
    });

    if (assignedStaffCount > 0) {
        const err = new Error('Store cannot be deleted while staff members are still assigned');
        err.statusCode = 409;
        throw err;
    }

    store.deletedAt = new Date();
    store.isActive = false;
    store.isAvailable = false;
    await store.save();

    return {
        id: String(store._id),
        deletedAt: store.deletedAt,
        isActive: store.isActive,
        isAvailable: store.isAvailable,
    };
};

const updateStoreStatus = async (vendorId, storeId, isActive) => {
    return updateStore(vendorId, storeId, { isActive });
};

const updateStoreCapacity = async (vendorId, storeId, capacity) => {
    return updateStore(vendorId, storeId, { capacity });
};

const updateStoreAvailability = async (vendorId, storeId, isAvailable) => {
    return updateStore(vendorId, storeId, {
        isAvailable,
        availabilityReason: isAvailable ? '' : 'Marked unavailable by vendor',
    });
};

const getStaff = async (vendorId) => {
    const scope = await resolveVendorScope({ vendorId });
    return VendorStaff.find({ ...buildAliasMatch('vendorId', scope.aliases), deletedAt: null }).sort({
        createdAt: -1,
    });
};

const createStaff = async (vendorId, data) => {
    if (!data?.name || !data?.email || !data?.password) {
        const err = new Error('Name, email, and password are required');
        err.statusCode = 400;
        throw err;
    }

    const normalizedEmail = String(data.email).trim().toLowerCase();
    const authConn = await getAuthConn();
    const existingAuthUser = await authConn.db
        .collection('users')
        .findOne({ email: normalizedEmail });
    if (existingAuthUser) {
        const err = new Error('A login account already exists with this email');
        err.statusCode = 409;
        throw err;
    }

    const scope = await resolveVendorScope({ vendorId });
    const existingStaff = await VendorStaff.findOne({
        ...buildAliasMatch('vendorId', scope.aliases),
        email: normalizedEmail,
        deletedAt: null,
    });
    if (existingStaff) {
        const err = new Error('Staff member already exists with this email');
        err.statusCode = 409;
        throw err;
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const authUser = {
        name: data.name,
        email: normalizedEmail,
        password: hashedPassword,
        phone: data.phone || '',
        role: 'vendor',
        isActive: true,
        isEmailVerified: false,
        vendorStaffProfile: {
            vendorId: scope.vendorUserId,
            role: data.role || 'operator',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const authResult = await authConn.db.collection('users').insertOne(authUser);

    return VendorStaff.create({
        ...data,
        vendorId: scope.vendorUserId,
        email: normalizedEmail,
        authUserId: authResult.insertedId.toString(),
        assignedStoreIds: data.assignedStoreIds || (data.storeId ? [data.storeId] : []),
        isFinancialAccessEnabled: false,
    });
};

const updateStaff = async (vendorId, staffId, data) => {
    const scope = await resolveVendorScope({ vendorId });
    const staff = await VendorStaff.findOneAndUpdate(
        { _id: staffId, ...buildAliasMatch('vendorId', scope.aliases), deletedAt: null },
        data,
        { new: true, runValidators: true }
    );
    if (!staff) {
        const err = new Error('Staff member not found');
        err.statusCode = 404;
        throw err;
    }
    return staff;
};

const updateStaffStatus = async (vendorId, staffId, isActive) => {
    return updateStaff(vendorId, staffId, { isActive });
};

const assignStaffStores = async (vendorId, staffId, assignedStoreIds) => {
    return updateStaff(vendorId, staffId, {
        assignedStoreIds,
        storeId: assignedStoreIds?.[0] || '',
    });
};

const getNearbyStores = async (userLat, userLng, radiusKm = 10, limit = 20) => {
    const radiusMeters = radiusKm * 1000;
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const safeOrigin = { lat: Number(userLat), lng: Number(userLng) };

    let stores = [];

    try {
        stores = await Store.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [safeOrigin.lng, safeOrigin.lat],
                    },
                    key: 'geo',
                    distanceField: 'distance',
                    maxDistance: radiusMeters,
                    spherical: true,
                    query: {
                        isActive: true,
                        isAvailable: true,
                        deletedAt: null,
                        'location.lat': { $exists: true },
                        'location.lng': { $exists: true },
                    },
                },
            },
            {
                $lookup: {
                    from: 'vendororgs',
                    let: { storeVendorId: '$vendorId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$userId', '$$storeVendorId'] },
                                        { $eq: [{ $toString: '$_id' }, '$$storeVendorId'] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'vendorOrg',
                },
            },
            {
                $unwind: '$vendorOrg',
            },
            {
                $match: {
                    'vendorOrg.isApproved': true,
                    'vendorOrg.isSuspended': { $ne: true },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    address: 1,
                    location: 1,
                    workingHours: 1,
                    supportedFlows: 1,
                    capacity: 1,
                    distance: 1,
                },
            },
            {
                $sort: { distance: 1 },
            },
            {
                $limit: safeLimit,
            },
        ]);
    } catch (error) {
        stores = [];
    }

    if (!stores.length) {
        const [rawStores, approvedVendorOrgs] = await Promise.all([
            Store.find({
                isActive: true,
                isAvailable: true,
                deletedAt: null,
                'location.lat': { $exists: true, $ne: null },
                'location.lng': { $exists: true, $ne: null },
            })
                .select('vendorId name address location workingHours supportedFlows capacity')
                .lean(),
            VendorOrg.find({
                isApproved: true,
                isSuspended: { $ne: true },
                deletedAt: null,
            })
                .select('userId')
                .lean(),
        ]);

        const approvedVendorIds = new Set(
            approvedVendorOrgs.flatMap((vendorOrg) =>
                uniqueStrings([vendorOrg.userId, vendorOrg._id])
            )
        );

        stores = rawStores
            .filter((store) => approvedVendorIds.has(String(store.vendorId || '')))
            .map((store) => {
                const lat = toFiniteNumber(store.location?.lat);
                const lng = toFiniteNumber(store.location?.lng);
                if (lat === null || lng === null) return null;

                return {
                    ...store,
                    distance: haversineDistanceMeters(safeOrigin, { lat, lng }),
                };
            })
            .filter(Boolean)
            .filter((store) => store.distance <= radiusMeters)
            .sort((left, right) => left.distance - right.distance)
            .slice(0, safeLimit);
    }

    return {
        stores,
        totalFound: stores.length,
        searchLocation: { lat: userLat, lng: userLng },
        searchRadius: radiusKm,
    };
};

const getAvailableDeliveryPartners = async (query = {}) => {
    const authConn = await getAuthConn();
    const conn = await getDeliveryConn();
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const search = String(query.search || '').trim();
    const userFilter = {
        role: 'delivery_partner',
        isActive: { $ne: false },
        deletedAt: { $exists: false },
        isBlocked: { $ne: true },
    };

    if (search) {
        userFilter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { 'deliveryDetails.vehicleType': { $regex: search, $options: 'i' } },
        ];
    }

    const authUsers = await authConn.db
        .collection('users')
        .find(userFilter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(limit)
        .project({
            name: 1,
            phone: 1,
            email: 1,
            deliveryDetails: 1,
            isActive: 1,
            isBlocked: 1,
            updatedAt: 1,
        })
        .toArray();

    const userIds = authUsers.map((user) => String(user._id));
    const profiles = await conn.db
        .collection('deliverypartnerprofiles')
        .find({ userId: { $in: userIds } })
        .project({
            userId: 1,
            name: 1,
            phone: 1,
            email: 1,
            vehicleType: 1,
            zoneAssignments: 1,
            rating: 1,
            totalTrips: 1,
            isAvailable: 1,
            isApproved: 1,
            updatedAt: 1,
        })
        .toArray();

    const profileMap = new Map(profiles.map((profile) => [String(profile.userId || ''), profile]));

    return authUsers.map((user) => {
        const userId = String(user._id);
        const profile = profileMap.get(userId) || {};
        const deliveryDetails = user.deliveryDetails || {};

        return {
            id: userId,
            name: profile.name || user.name || '',
            phone: profile.phone || user.phone || '',
            email: profile.email || user.email || '',
            vehicleType: profile.vehicleType || deliveryDetails.vehicleType || '',
            zoneAssignments: Array.isArray(profile.zoneAssignments)
                ? profile.zoneAssignments
                : Array.isArray(deliveryDetails.zoneAssignments)
                  ? deliveryDetails.zoneAssignments
                  : [],
            rating: Number(profile.rating || 0),
            totalTrips: Number(profile.totalTrips || 0),
            isAvailable:
                profile.isAvailable !== undefined
                    ? profile.isAvailable !== false
                    : deliveryDetails.isAvailable === true,
            isApproved:
                profile.isApproved !== undefined
                    ? profile.isApproved === true
                    : deliveryDetails.isApproved === true,
            updatedAt: profile.updatedAt || user.updatedAt || null,
        };
    });
};

// ─── Analytics ────────────────────────────────────────────

const getPerformance = async (vendorId) => {
    const scope = await resolveVendorScope({ vendorId });
    // Basic performance stats — can be enriched later with order-service data
    const [totalStores, activeStores, totalStaff] = await Promise.all([
        Store.countDocuments({ ...buildAliasMatch('vendorId', scope.aliases), deletedAt: null }),
        Store.countDocuments({
            ...buildAliasMatch('vendorId', scope.aliases),
            isActive: true,
            deletedAt: null,
        }),
        VendorStaff.countDocuments({
            ...buildAliasMatch('vendorId', scope.aliases),
            isActive: true,
            deletedAt: null,
        }),
    ]);

    const capacitySnapshot = await Store.find({
        ...buildAliasMatch('vendorId', scope.aliases),
        deletedAt: null,
    })
        .select('name capacity isAvailable availabilityReason')
        .lean();

    return { totalStores, activeStores, totalStaff, capacitySnapshot };
};

const getVendorDashboard = async (vendorId) => {
    const scope = await resolveVendorScope({ vendorId });
    const [org, stores, staff, performance] = await Promise.all([
        getOrCreateOrg(scope.vendorUserId || vendorId),
        Store.find({ ...buildAliasMatch('vendorId', scope.aliases), deletedAt: null }).lean(),
        VendorStaff.find({ ...buildAliasMatch('vendorId', scope.aliases), deletedAt: null }).lean(),
        getPerformance(scope.vendorUserId || vendorId),
    ]);

    const availableStores = stores.filter((store) => store.isAvailable !== false).length;
    const openCapacity = stores.reduce((sum, store) => {
        const dailyLimit = Number(store?.capacity?.dailyLimit || store?.capacity?.maxOrdersPerDay || 0);
        const currentLoad = Number(store?.capacity?.currentLoad || 0);
        return sum + Math.max(dailyLimit - currentLoad, 0);
    }, 0);

    return {
        organization: {
            businessName: org.businessName,
            agreementStatus: org.agreementStatus,
            legalVerified: Boolean(org.legalVerified),
            isApproved: Boolean(org.isApproved),
            isSuspended: Boolean(org.isSuspended),
            healthScore: Number(org.healthScore || 0),
        },
        summary: {
            totalStores: performance.totalStores,
            activeStores: performance.activeStores,
            availableStores,
            totalStaff: performance.totalStaff,
            openCapacity,
        },
        stores: stores.map((store) => ({
            id: String(store._id),
            name: store.name,
            city: store.address?.city || '',
            isActive: Boolean(store.isActive),
            isAvailable: Boolean(store.isAvailable),
            currentLoad: Number(store?.capacity?.currentLoad || 0),
            dailyLimit: Number(store?.capacity?.dailyLimit || store?.capacity?.maxOrdersPerDay || 0),
            supportedFlows: store.supportedFlows || [],
        })),
        staff: staff.slice(0, 10).map((member) => ({
            id: String(member._id),
            name: member.name,
            email: member.email,
            role: member.role || 'operator',
            isActive: Boolean(member.isActive),
            assignedStoreIds: member.assignedStoreIds || [],
        })),
    };
};

module.exports = {
    getOrCreateOrg,
    updateOrg,
    getStores,
    getStoreById,
    createStore,
    updateStore,
    deleteStore,
    updateStoreStatus,
    updateStoreCapacity,
    updateStoreAvailability,
    getNearbyStores,
    getAvailableDeliveryPartners,
    getStaff,
    createStaff,
    updateStaff,
    updateStaffStatus,
    assignStaffStores,
    getPerformance,
    getVendorDashboard,
};
