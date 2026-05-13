const mongoose = require('mongoose');
const Profile = require('../models/profile.model');
const Address = require('../models/address.model');
const config = require('../config');

const getNamedConn = async (name) => {
    const existing = mongoose.connections.find((conn) => conn.name === name && conn.readyState === 1);
    if (existing) return existing;

    return mongoose
        .createConnection(config.getDbUri(name), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const getOrCreateProfile = async (userId) => {
    return Profile.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
};

const updateProfile = async (userId, data) => {
    return Profile.findOneAndUpdate({ userId }, data, {
        new: true,
        upsert: true,
        runValidators: true,
    });
};

const getAddresses = async (userId) => {
    return Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
};

const addAddress = async (userId, data) => {
    // If new address is default, unset others
    if (data.isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
    }
    return Address.create({ ...data, userId });
};

const updateAddress = async (userId, addressId, data) => {
    if (data.isDefault) {
        await Address.updateMany({ userId }, { isDefault: false });
    }
    const address = await Address.findOneAndUpdate({ _id: addressId, userId }, data, {
        new: true,
        runValidators: true,
    });
    if (!address) {
        const err = new Error('Address not found');
        err.statusCode = 404;
        throw err;
    }
    return address;
};

const updateAddressLocation = async (userId, addressId, location) => {
    const address = await Address.findOneAndUpdate(
        { _id: addressId, userId },
        {
            $set: {
                location: {
                    lat: Number(location.lat),
                    lng: Number(location.lng),
                    ...(location.accuracyMeters !== undefined
                        ? { accuracyMeters: Number(location.accuracyMeters) }
                        : {}),
                    ...(location.source ? { source: String(location.source).trim() } : {}),
                    capturedAt: location.capturedAt ? new Date(location.capturedAt) : new Date(),
                },
            },
        },
        { new: true, runValidators: true }
    );

    if (!address) {
        const err = new Error('Address not found');
        err.statusCode = 404;
        throw err;
    }

    return address;
};

const deleteAddress = async (userId, addressId) => {
    const address = await Address.findOneAndDelete({ _id: addressId, userId });
    if (!address) {
        const err = new Error('Address not found');
        err.statusCode = 404;
        throw err;
    }
    return address;
};

const updateNotificationPreferences = async (userId, preferences) => {
    const profile = await getOrCreateProfile(userId);
    profile.preferences = {
        ...profile.preferences?.toObject?.(),
        ...profile.preferences,
        ...preferences,
        criticalAlerts:
            preferences.criticalAlerts === false
                ? true
                : (profile.preferences?.criticalAlerts ?? true),
    };
    await profile.save();
    return profile;
};

const getPrivacyStatus = async (userId) => {
    const profile = await getOrCreateProfile(userId);
    return profile.privacyRequests;
};

const requestDataExport = async (userId) => {
    const profile = await getOrCreateProfile(userId);
    profile.privacyRequests = {
        ...profile.privacyRequests?.toObject?.(),
        dataExportRequestedAt: new Date(),
        dataExportStatus: 'requested',
        dataExportCompletedAt: null,
    };
    await profile.save();
    return profile.privacyRequests;
};

const requestAccountDeletion = async (userId, reason = '') => {
    const profile = await getOrCreateProfile(userId);
    const summary = await fetch(`${config.orderServiceUrl}/api/orders/summary`, {
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
        },
    })
        .then((response) => response.json().catch(() => null))
        .catch(() => null);

    const activeOrders = Number(summary?.data?.active_orders || 0);
    const blocked = activeOrders > 0;
    profile.privacyRequests = {
        ...profile.privacyRequests?.toObject?.(),
        accountDeletionRequestedAt: new Date(),
        accountDeletionStatus: blocked ? 'blocked_active_orders' : 'requested',
        accountDeletionReason: reason,
        accountDeletionCompletedAt: null,
    };
    await profile.save();
    return profile.privacyRequests;
};

const fetchUserOrderData = async (userId, path) => {
    if (!config.orderServiceUrl) return null;

    return fetch(`${config.orderServiceUrl}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
        },
    })
        .then((response) => response.json().catch(() => null))
        .catch(() => null);
};

const deactivateAuthAccount = async (userId, reason) => {
    if (!config.authServiceUrl || !config.internalServiceToken) return null;

    return fetch(`${config.authServiceUrl}/internal/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-token': config.internalServiceToken,
        },
        body: JSON.stringify({ reason }),
    })
        .then(async (response) => ({
            ok: response.ok,
            status: response.status,
            payload: await response.json().catch(() => null),
        }))
        .catch(() => null);
};

const getExportCollections = async () => {
    const [financeConn, notificationConn, designConn, paymentConn] = await Promise.all([
        getNamedConn('finance'),
        getNamedConn('notification'),
        getNamedConn('design'),
        getNamedConn('payment'),
    ]);

    return {
        wallets: financeConn.db.collection('wallets'),
        ledgers: financeConn.db.collection('ledgers'),
        referrals: financeConn.db.collection('referrals'),
        tickets: notificationConn.db.collection('tickets'),
        designs: designConn.db.collection('designs'),
        payments: paymentConn.db.collection('payments'),
    };
};

const generateDataExport = async (userId) => {
    const [profile, addresses, orderSummary, ordersPayload, collections] = await Promise.all([
        getOrCreateProfile(userId),
        getAddresses(userId),
        fetchUserOrderData(userId, '/api/orders/summary'),
        fetchUserOrderData(userId, '/api/orders?limit=100'),
        getExportCollections(),
    ]);

    const [wallet, ledgerEntries, referrals, tickets, designs, payments] = await Promise.all([
        collections.wallets.findOne({ userId }),
        collections.ledgers.find({ userId }).sort({ createdAt: -1 }).limit(500).toArray(),
        collections.referrals
            .find({ $or: [{ referrerId: userId }, { referredId: userId }] })
            .sort({ createdAt: -1 })
            .limit(200)
            .toArray(),
        collections.tickets
            .find({
                userId,
                $or: [{ createdForRole: 'user' }, { visibilityScope: 'customer' }],
            })
            .sort({ createdAt: -1 })
            .limit(200)
            .toArray(),
        collections.designs.find({ userId }).sort({ createdAt: -1 }).limit(200).toArray(),
        collections.payments.find({ userId }).sort({ createdAt: -1 }).limit(200).toArray(),
    ]);

    profile.privacyRequests = {
        ...profile.privacyRequests?.toObject?.(),
        dataExportRequestedAt:
            profile.privacyRequests?.dataExportRequestedAt || new Date(),
        dataExportStatus: 'completed',
        dataExportCompletedAt: new Date(),
    };
    await profile.save();

    return {
        generatedAt: new Date(),
        userId,
        profile,
        addresses,
        orderSummary: orderSummary?.data || null,
        orders: ordersPayload?.data?.orders || ordersPayload?.data || [],
        wallet: wallet || null,
        ledger: ledgerEntries,
        referrals,
        tickets,
        designs,
        payments,
    };
};

const completeAccountDeletion = async (userId) => {
    const profile = await getOrCreateProfile(userId);
    const summary = await fetchUserOrderData(userId, '/api/orders/summary');
    const activeOrders = Number(summary?.data?.active_orders || 0);
    if (activeOrders > 0) {
        const err = new Error('Account deletion is blocked while active orders exist');
        err.statusCode = 400;
        throw err;
    }

    const authDeactivation = await deactivateAuthAccount(
        userId,
        profile.privacyRequests?.accountDeletionReason || 'Self-service deletion completed'
    );
    if (!authDeactivation?.ok) {
        const err = new Error('Auth account deactivation failed');
        err.statusCode = 502;
        err.details = authDeactivation?.payload || null;
        throw err;
    }

    await Address.deleteMany({ userId });
    profile.name = 'Deleted User';
    profile.phone = '';
    profile.avatar = '';
    profile.dateOfBirth = null;
    profile.gender = undefined;
    profile.preferences = {
        notifications: false,
        newsletter: false,
        push: false,
        whatsapp: false,
        criticalAlerts: true,
        quietHours: { start: '', end: '' },
    };
    profile.wishlist = [];
    profile.privacyRequests = {
        ...profile.privacyRequests?.toObject?.(),
        accountDeletionRequestedAt:
            profile.privacyRequests?.accountDeletionRequestedAt || new Date(),
        accountDeletionStatus: 'completed',
        accountDeletionCompletedAt: new Date(),
        accountDeletionReason:
            profile.privacyRequests?.accountDeletionReason || 'Self-service deletion completed',
    };
    await profile.save();

    return profile.privacyRequests;
};

const getWishlist = async (userId) => {
    const profile = await getOrCreateProfile(userId);
    return profile.wishlist || [];
};

const addToWishlist = async (userId, productId, productType = 'gifting') => {
    await getOrCreateProfile(userId);

    const updatedProfile = await Profile.findOneAndUpdate(
        {
            userId,
            wishlist: {
                $not: {
                    $elemMatch: { productId },
                },
            },
        },
        {
            $push: {
                wishlist: {
                    productId,
                    productType,
                    addedAt: new Date(),
                },
            },
        },
        { new: true }
    );

    if (!updatedProfile) {
        const err = new Error('Product already in wishlist');
        err.statusCode = 409;
        throw err;
    }

    return updatedProfile.wishlist || [];
};

const removeFromWishlist = async (userId, productId) => {
    const updatedProfile = await Profile.findOneAndUpdate(
        {
            userId,
            'wishlist.productId': productId,
        },
        {
            $pull: {
                wishlist: { productId },
            },
        },
        { new: true }
    );

    if (!updatedProfile) {
        const err = new Error('Product not found in wishlist');
        err.statusCode = 404;
        throw err;
    }

    return updatedProfile.wishlist || [];
};

const clearWishlist = async (userId) => {
    await Profile.findOneAndUpdate(
        { userId },
        {
            $set: { wishlist: [] },
            $setOnInsert: { userId },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );

    return [];
};

module.exports = {
    getOrCreateProfile,
    updateProfile,
    getAddresses,
    addAddress,
    updateAddress,
    updateAddressLocation,
    deleteAddress,
    updateNotificationPreferences,
    getPrivacyStatus,
    requestDataExport,
    requestAccountDeletion,
    generateDataExport,
    completeAccountDeletion,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
};
