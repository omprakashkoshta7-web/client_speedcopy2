const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    sendSuccess,
    sendCreated,
    sendNotFound,
    sendError,
} = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');
const AuditLog = require('../models/audit-log.model');
const config = require('../config');

const ADMIN_ROLES = ['admin', 'super_admin'];

const getAuthConn = async () => {
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;

    return mongoose
        .createConnection(config.getDbUri('auth'), { family: 4, serverSelectionTimeoutMS: 5000 })
        .asPromise();
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || '').trim());

const normalizeTeam = (value) => String(value || '').trim().toLowerCase();

const sanitizeProfile = (user) => {
    if (!user) return null;

    return {
        id: String(user._id),
        fullName: user.name || '',
        emailAddress: user.email || '',
        phone: user.phone || '',
        role: user.role || 'admin',
        team: user.staffProfile?.team || '',
        memberSince: user.createdAt || null,
        lastLogin: user.lastLogin || null,
        status: user.status || (user.isActive === false ? 'inactive' : 'active'),
        permissions: Array.isArray(user.staffProfile?.permissions)
            ? user.staffProfile.permissions
            : [],
        scopes: Array.isArray(user.staffProfile?.scopes) ? user.staffProfile.scopes : [],
        mfaEnabled: Boolean(user.mfaEnabled),
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null,
    };
};

const buildProfileUpdate = (body = {}) => {
    const update = {
        updatedAt: new Date(),
    };

    if (body.fullName !== undefined || body.name !== undefined) {
        update.name = String(body.fullName ?? body.name ?? '').trim();
    }

    if (body.emailAddress !== undefined || body.email !== undefined) {
        update.email = String(body.emailAddress ?? body.email ?? '')
            .trim()
            .toLowerCase();
    }

    if (body.phone !== undefined) {
        update.phone = String(body.phone || '').trim();
    }

    if (body.role !== undefined) {
        update.role = String(body.role || '').trim();
    }

    if (body.status !== undefined) {
        update.status = String(body.status || '').trim();
        update.isActive = update.status === 'active';
    }

    if (
        body.team !== undefined ||
        body.permissions !== undefined ||
        body.scopes !== undefined
    ) {
        if (body.team !== undefined) update['staffProfile.team'] = normalizeTeam(body.team);
        if (body.permissions !== undefined) {
            update['staffProfile.permissions'] = Array.isArray(body.permissions)
                ? body.permissions
                : [];
        }
        if (body.scopes !== undefined) {
            update['staffProfile.scopes'] = Array.isArray(body.scopes) ? body.scopes : [];
        }
    }

    return update;
};

const findAdminById = async (conn, id) =>
    conn.db.collection('users').findOne({
        _id: new mongoose.Types.ObjectId(id),
        role: { $in: ADMIN_ROLES },
    });

const getMyProfile = async (req, res, next) => {
    try {
        const userId = String(req.headers['x-user-id'] || '').trim();
        if (!isValidObjectId(userId)) {
            return sendError(res, 'Invalid admin user id', 400);
        }

        const conn = await getAuthConn();
        const admin = await findAdminById(conn, userId);
        if (!admin) return sendNotFound(res, 'Admin profile not found');

        return sendSuccess(res, sanitizeProfile(admin));
    } catch (err) {
        next(err);
    }
};

const updateMyProfile = async (req, res, next) => {
    try {
        const userId = String(req.headers['x-user-id'] || '').trim();
        if (!isValidObjectId(userId)) {
            return sendError(res, 'Invalid admin user id', 400);
        }

        const update = buildProfileUpdate(req.body);
        if (update.name !== undefined && !update.name) {
            return sendError(res, 'Full name is required', 400);
        }
        if (update.email !== undefined && !update.email) {
            return sendError(res, 'Email address is required', 400);
        }
        if (update.role !== undefined && !ADMIN_ROLES.includes(update.role)) {
            return sendError(res, 'Role must be admin or super_admin', 400);
        }

        const conn = await getAuthConn();
        if (update.email) {
            const existing = await conn.db.collection('users').findOne({
                email: update.email,
                _id: { $ne: new mongoose.Types.ObjectId(userId) },
            });
            if (existing) return sendError(res, 'A user already exists with this email', 409);
        }

        const result = await conn.db.collection('users').findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(userId),
                role: { $in: ADMIN_ROLES },
            },
            { $set: update },
            { returnDocument: 'after' }
        );

        if (!result) return sendNotFound(res, 'Admin profile not found');

        await AuditLog.create({
            actorId: userId,
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.profile.update_self',
            targetType: 'admin_profile',
            targetId: userId,
            metadata: {
                updatedFields: Object.keys(update).filter((key) => key !== 'updatedAt'),
            },
        });

        return sendSuccess(res, sanitizeProfile(result), 'Profile updated');
    } catch (err) {
        next(err);
    }
};

const changeMyPassword = async (req, res, next) => {
    try {
        const userId = String(req.headers['x-user-id'] || '').trim();
        if (!isValidObjectId(userId)) {
            return sendError(res, 'Invalid admin user id', 400);
        }

        const currentPassword = String(req.body?.currentPassword || req.body?.oldPassword || '').trim();
        const newPassword = String(req.body?.newPassword || req.body?.password || '').trim();
        const confirmPassword = String(
            req.body?.confirmNewPassword || req.body?.confirmPassword || req.body?.passwordConfirmation || ''
        ).trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            return sendError(
                res,
                'Current password, new password, and confirm password are required',
                400
            );
        }

        if (newPassword.length < 6) {
            return sendError(res, 'New password must be at least 6 characters long', 400);
        }

        if (newPassword !== confirmPassword) {
            return sendError(res, 'New password and confirm password do not match', 400);
        }

        const conn = await getAuthConn();
        const admin = await findAdminById(conn, userId);
        if (!admin) return sendNotFound(res, 'Admin profile not found');

        const storedPassword = String(admin.password || '');
        const isMatch =
            storedPassword.startsWith('$2')
                ? await bcrypt.compare(currentPassword, storedPassword)
                : storedPassword === currentPassword;

        if (!isMatch) {
            return sendError(res, 'Current password is incorrect', 401);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await conn.db.collection('users').updateOne(
            {
                _id: new mongoose.Types.ObjectId(userId),
                role: { $in: ADMIN_ROLES },
            },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date(),
                },
            }
        );

        await AuditLog.create({
            actorId: userId,
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.profile.change_password',
            targetType: 'admin_profile',
            targetId: userId,
        });

        return sendSuccess(res, null, 'Password updated successfully');
    } catch (err) {
        next(err);
    }
};

const listProfiles = async (req, res, next) => {
    try {
        const conn = await getAuthConn();
        const { page, limit, skip } = paginate(req.query);
        const filter = { role: { $in: ADMIN_ROLES } };

        if (req.query.status) filter.status = String(req.query.status).trim();
        if (req.query.team) filter['staffProfile.team'] = normalizeTeam(req.query.team);
        if (req.query.search) {
            const pattern = new RegExp(String(req.query.search).trim(), 'i');
            filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
        }

        const [profiles, total] = await Promise.all([
            conn.db
                .collection('users')
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            conn.db.collection('users').countDocuments(filter),
        ]);

        return sendSuccess(res, {
            profiles: profiles.map(sanitizeProfile),
            meta: paginateMeta(total, page, limit),
        });
    } catch (err) {
        next(err);
    }
};

const getProfileById = async (req, res, next) => {
    try {
        const profileId = String(req.params.id || '').trim();
        if (!isValidObjectId(profileId)) {
            return sendError(res, 'Invalid admin profile id', 400);
        }

        const conn = await getAuthConn();
        const profile = await findAdminById(conn, profileId);
        if (!profile) return sendNotFound(res, 'Admin profile not found');

        return sendSuccess(res, sanitizeProfile(profile));
    } catch (err) {
        next(err);
    }
};

const createProfile = async (req, res, next) => {
    try {
        const {
            fullName,
            name,
            emailAddress,
            email,
            password,
            phone = '',
            role = 'admin',
            team = 'ops',
            permissions = [],
            scopes = [],
            mfaEnabled = true,
        } = req.body;

        const normalizedName = String(fullName ?? name ?? '').trim();
        const normalizedEmail = String(emailAddress ?? email ?? '')
            .trim()
            .toLowerCase();
        const normalizedRole = String(role || 'admin').trim();

        if (!normalizedName || !normalizedEmail || !password) {
            return sendError(res, 'Full name, email address, and password are required', 400);
        }
        if (!ADMIN_ROLES.includes(normalizedRole)) {
            return sendError(res, 'Role must be admin or super_admin', 400);
        }

        const conn = await getAuthConn();
        const existing = await conn.db.collection('users').findOne({ email: normalizedEmail });
        if (existing) return sendError(res, 'A user already exists with this email', 409);

        const hashedPassword = await bcrypt.hash(password, 12);
        const now = new Date();
        const doc = {
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            phone: String(phone || '').trim(),
            role: normalizedRole,
            isActive: true,
            status: 'active',
            mfaEnabled: Boolean(mfaEnabled),
            lastLogin: null,
            staffProfile: {
                team: normalizeTeam(team || 'ops') || 'ops',
                permissions: Array.isArray(permissions) ? permissions : [],
                scopes: Array.isArray(scopes) ? scopes : [],
            },
            createdAt: now,
            updatedAt: now,
        };

        const result = await conn.db.collection('users').insertOne(doc);
        const created = await conn.db.collection('users').findOne({ _id: result.insertedId });

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.profile.create',
            targetType: 'admin_profile',
            targetId: String(result.insertedId),
            metadata: {
                role: normalizedRole,
                team: doc.staffProfile.team,
            },
        });

        return sendCreated(
            res,
            {
                ...sanitizeProfile(created),
                loginCredentials: {
                    email: normalizedEmail,
                    password,
                },
            },
            'Admin profile created'
        );
    } catch (err) {
        next(err);
    }
};

const updateProfileById = async (req, res, next) => {
    try {
        const profileId = String(req.params.id || '').trim();
        if (!isValidObjectId(profileId)) {
            return sendError(res, 'Invalid admin profile id', 400);
        }

        const update = buildProfileUpdate(req.body);
        if (update.name !== undefined && !update.name) {
            return sendError(res, 'Full name is required', 400);
        }
        if (update.email !== undefined && !update.email) {
            return sendError(res, 'Email address is required', 400);
        }
        if (update.role !== undefined && !ADMIN_ROLES.includes(update.role)) {
            return sendError(res, 'Role must be admin or super_admin', 400);
        }

        const conn = await getAuthConn();
        if (update.email) {
            const existing = await conn.db.collection('users').findOne({
                email: update.email,
                _id: { $ne: new mongoose.Types.ObjectId(profileId) },
            });
            if (existing) return sendError(res, 'A user already exists with this email', 409);
        }

        const updated = await conn.db.collection('users').findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(profileId),
                role: { $in: ADMIN_ROLES },
            },
            { $set: update },
            { returnDocument: 'after' }
        );

        if (!updated) return sendNotFound(res, 'Admin profile not found');

        await AuditLog.create({
            actorId: req.headers['x-user-id'] || '',
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.profile.update',
            targetType: 'admin_profile',
            targetId: profileId,
            metadata: {
                updatedFields: Object.keys(update).filter((key) => key !== 'updatedAt'),
            },
        });

        return sendSuccess(res, sanitizeProfile(updated), 'Admin profile updated');
    } catch (err) {
        next(err);
    }
};

const deleteProfileById = async (req, res, next) => {
    try {
        const profileId = String(req.params.id || '').trim();
        const actorId = String(req.headers['x-user-id'] || '').trim();

        if (!isValidObjectId(profileId)) {
            return sendError(res, 'Invalid admin profile id', 400);
        }
        if (profileId === actorId) {
            return sendError(res, 'You cannot delete your own admin profile', 400);
        }

        const conn = await getAuthConn();
        const result = await conn.db.collection('users').deleteOne({
            _id: new mongoose.Types.ObjectId(profileId),
            role: { $in: ADMIN_ROLES },
        });

        if (!result.deletedCount) return sendNotFound(res, 'Admin profile not found');

        await AuditLog.create({
            actorId,
            actorRole: req.headers['x-user-role'] || 'admin',
            action: 'admin.profile.delete',
            targetType: 'admin_profile',
            targetId: profileId,
        });

        return sendSuccess(res, { id: profileId }, 'Admin profile deleted');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
    listProfiles,
    getProfileById,
    createProfile,
    updateProfileById,
    deleteProfileById,
};
