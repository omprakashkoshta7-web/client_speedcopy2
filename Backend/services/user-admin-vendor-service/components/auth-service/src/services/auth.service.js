const { verifyIdToken, getFirebaseAuth } = require('../config/firebase');
const User = require('../models/user.model');

const SELF_SERVICE_ROLES = ['user', 'vendor', 'delivery_partner'];
const PRIVILEGED_ROLES = ['admin', 'staff'];
const VALID_ROLES = [...SELF_SERVICE_ROLES, ...PRIVILEGED_ROLES];
const VALID_STAFF_TEAMS = ['ops', 'support', 'finance', 'marketing'];

const LEGACY_PERMISSION_MAP = {
    view_orders: 'orders.view',
    reassign_vendor: 'orders.assign',
    raise_clarification: 'orders.clarify',
    view_tickets: 'tickets.view',
    reply_ticket: 'tickets.reply',
    close_ticket: 'tickets.close',
    escalate_ticket: 'tickets.escalate',
    view_refunds: 'refunds.view',
    approve_refund: 'refunds.approve',
    credit_wallet: 'wallet.credit',
    debit_wallet: 'wallet.debit',
    create_coupon: 'coupons.create',
    create_targeting: 'targeting.create',
    view_campaigns: 'campaigns.view',
    view_wallet: 'wallet.view',
    view_payouts: 'payouts.view',
    issue_payout_ticket: 'payouts.issue_ticket',
    view_refunds: 'refunds.view',
    approve_refund: 'refunds.approve',
};

const normalizePermission = (permission) => {
    const raw = String(permission || '').trim().toLowerCase();
    if (!raw) return '';
    if (LEGACY_PERMISSION_MAP[raw]) return LEGACY_PERMISSION_MAP[raw];
    if (raw.includes(':')) {
        const [domain, action] = raw.split(':');
        if (action === 'read') return `${domain}.view`;
        if (action === 'write') return `${domain}.manage`;
    }
    return raw;
};

const normalizePermissions = (permissions = []) =>
    [...new Set((Array.isArray(permissions) ? permissions : []).map(normalizePermission).filter(Boolean))];

const STAFF_TEAM_DEFAULTS = {
    ops: {
        permissions: [
            'orders.view',
            'orders.assign',
            'orders.clarify',
            'tasks.view',
            'tasks.assign',
            'tickets.view',
        ],
        scopes: ['orders', 'vendors'],
    },
    support: {
        permissions: ['tickets.view', 'tickets.reply', 'tickets.close', 'tickets.escalate', 'tasks.view'],
        scopes: ['tickets', 'vendor_tickets'],
    },
    finance: {
        permissions: [
            'tasks.view',
            'tickets.view',
            'tickets.reply',
            'tickets.close',
            'tickets.escalate',
            'refunds.view',
            'refunds.approve',
            'refunds.escalate',
            'wallet.credit',
            'wallet.debit',
            'wallet.view',
            'payouts.view',
            'payouts.issue_ticket',
        ],
        scopes: ['refunds', 'wallet', 'payouts'],
    },
    marketing: {
        permissions: [
            'tasks.view',
            'tickets.view',
            'tickets.reply',
            'campaigns.view',
            'coupons.view',
            'coupons.create',
            'targeting.create',
            'analytics.view',
        ],
        scopes: ['campaigns', 'coupons'],
    },
};

const getRoleFromFirebaseClaims = (decoded) => {
    const role = decoded.role || decoded.userRole || decoded.claims?.role;
    return VALID_ROLES.includes(role) ? role : null;
};

const getTeamFromFirebaseClaims = (decoded) => {
    const team = decoded.team || decoded.staffTeam || decoded.claims?.team;
    return VALID_STAFF_TEAMS.includes(team) ? team : null;
};

const buildProfileFromDecodedToken = (decoded, requestedRole = 'user') => {
    const { uid, email, name, picture, email_verified, phone_number, _mockRole } = decoded;
    const claimedRole = _mockRole || getRoleFromFirebaseClaims(decoded);
    const claimedTeam = getTeamFromFirebaseClaims(decoded);
    const safeRequestedRole = SELF_SERVICE_ROLES.includes(requestedRole) ? requestedRole : 'user';
    const role = VALID_ROLES.includes(claimedRole) ? claimedRole : safeRequestedRole;
    const shouldAttachStaffProfile = role === 'staff' || role === 'admin';
    const staffTeam = shouldAttachStaffProfile ? claimedTeam || 'ops' : undefined;
    const staffDefaults = staffTeam
        ? STAFF_TEAM_DEFAULTS[staffTeam] || { permissions: [], scopes: [] }
        : null;

    return {
        firebaseUid: uid,
        email: email || `${uid}@firebase.speedcopy.local`,
        name: name || email?.split('@')[0] || phone_number || 'User',
        phone: phone_number || '',
        photoURL: picture || '',
        role,
        isEmailVerified: !!email_verified,
        ...(shouldAttachStaffProfile
            ? {
                  staffProfile: {
                      team: staffTeam,
                      permissions: normalizePermissions(staffDefaults?.permissions || []),
                      scopes: staffDefaults?.scopes || [],
                  },
              }
            : {}),
    };
};

const setFirebaseRoleClaim = async (firebaseUid, role) => {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth || !firebaseUid) return;

    const firebaseUser = await firebaseAuth.getUser(firebaseUid);
    await firebaseAuth.setCustomUserClaims(firebaseUid, {
        ...(firebaseUser.customClaims || {}),
        role,
    });
};

// Register user with email/password
const registerUser = async (userData) => {
    const { name, email, password, phone, role = 'user' } = userData;
    const safeRole = VALID_ROLES.includes(role) ? role : 'user';
    const normalizedEmail = String(email || '')
        .trim()
        .toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }],
    });

    if (existingUser) {
        const error = new Error('User already exists with this email');
        error.statusCode = 409;
        throw error;
    }

    const firebaseAuth = getFirebaseAuth();
    let firebaseUser = null;
    if (firebaseAuth) {
        firebaseUser = await firebaseAuth.createUser({
            email: normalizedEmail,
            password,
            displayName: name,
            phoneNumber: phone || undefined,
            emailVerified: false,
            disabled: false,
        });
        await setFirebaseRoleClaim(firebaseUser.uid, safeRole);
    }

    const user = await User.create({
        firebaseUid: firebaseUser?.uid,
        name,
        email: normalizedEmail,
        password,
        phone,
        role: safeRole,
        isEmailVerified: false,
    });

    return { user };
};

// Login with email/password
const loginUser = async (email, password) => {
    const normalizedEmail = String(email || '')
        .trim()
        .toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    if (!user.isActive) {
        const error = new Error('Account has been deactivated');
        error.statusCode = 403;
        throw error;
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    return { user };
};

/**
 * Verifies Firebase (or mock) ID token and creates/updates the local profile.
 */
const verifyFirebaseToken = async (idToken, requestedRole = 'user') => {
    let decoded;
    try {
        decoded = await verifyIdToken(idToken);
    } catch (err) {
        const error = new Error(err.message || 'Invalid or expired token');
        error.statusCode = err.statusCode || 401;
        throw error;
    }

    const profile = buildProfileFromDecodedToken(decoded, requestedRole);

    let user = await User.findOne({
        $or: [{ firebaseUid: profile.firebaseUid }, { email: profile.email }],
    });

    if (!user) {
        user = await User.create({
            ...profile,
            lastLogin: new Date(),
        });
    } else {
        const claimedRole = getRoleFromFirebaseClaims(decoded);
        const claimedTeam = getTeamFromFirebaseClaims(decoded);
        user.firebaseUid = user.firebaseUid || profile.firebaseUid;
        user.name = user.name || profile.name;
        user.phone = profile.phone || user.phone;
        user.photoURL = profile.photoURL || user.photoURL;
        user.role =
            claimedRole ||
            (VALID_ROLES.includes(decoded._mockRole) ? decoded._mockRole : user.role);
        if (user.role === 'staff' || user.role === 'admin') {
            const nextTeam =
                claimedTeam || user.staffProfile?.team || profile.staffProfile?.team || 'ops';
            const defaults = STAFF_TEAM_DEFAULTS[nextTeam] || { permissions: [], scopes: [] };
            user.staffProfile = {
                team: nextTeam,
                permissions: normalizePermissions([
                    ...(defaults.permissions || []),
                    ...(user.staffProfile?.permissions || []),
                ]),
                scopes: user.staffProfile?.scopes?.length
                    ? user.staffProfile.scopes
                    : defaults.scopes,
            };
        }
        user.lastLogin = new Date();
        user.isEmailVerified = profile.isEmailVerified || user.isEmailVerified;
        await user.save({ validateBeforeSave: false });
    }

    if (!user.isActive) {
        const error = new Error('Account has been deactivated');
        error.statusCode = 403;
        throw error;
    }

    return { user, decoded };
};

const getMe = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    return user;
};

const updateRole = async (userId, role) => {
    if (!VALID_ROLES.includes(role)) {
        const error = new Error('Invalid role');
        error.statusCode = 400;
        throw error;
    }
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    await setFirebaseRoleClaim(user.firebaseUid, role);
    return user;
};

const setUserStatus = async (userId, isActive) => {
    const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true });
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    return user;
};

const deactivateUserInternal = async (userId, reason = 'Account deleted by user') => {
    const user = await User.findByIdAndUpdate(
        userId,
        {
            isActive: false,
            deletedAt: new Date(),
            isBlocked: false,
            blockedReason: '',
            fcmToken: '',
            phone: '',
            photoURL: '',
            password: undefined,
            $set: {
                email: `deleted+${userId}@speedcopy.local`,
                name: 'Deleted User',
            },
        },
        { new: true }
    );

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    if (user.firebaseUid) {
        const firebaseAuth = getFirebaseAuth();
        if (firebaseAuth) {
            await firebaseAuth
                .updateUser(user.firebaseUid, {
                    disabled: true,
                    displayName: 'Deleted User',
                    phoneNumber: null,
                })
                .catch(() => null);
        }
    }

    user.blockedReason = reason;
    await user.save({ validateBeforeSave: false });
    return user;
};

module.exports = {
    verifyFirebaseToken,
    registerUser,
    loginUser,
    getMe,
    updateRole,
    setUserStatus,
    deactivateUserInternal,
};
