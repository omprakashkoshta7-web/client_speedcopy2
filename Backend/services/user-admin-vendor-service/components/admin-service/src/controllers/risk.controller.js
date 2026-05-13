const AbuseCase = require('../models/abuse-case.model');
const AuditLog = require('../models/audit-log.model');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');
const { paginate, paginateMeta } = require('../../../../shared/utils/pagination');

const getActor = (req) => ({
    userId: String(req.headers['x-user-id'] || req.user?.id || '').trim(),
    role: String(req.headers['x-user-role'] || req.user?.role || 'admin').trim(),
});

const pushAction = (doc, req, action, note = '', metadata = null) => {
    const actor = getActor(req);
    doc.actions.push({
        action,
        note,
        actorId: actor.userId,
        actorRole: actor.role,
        metadata,
        createdAt: new Date(),
    });
    doc.updatedBy = actor.userId;
};

const logAudit = async (req, action, targetId, metadata = {}, reason = '') => {
    const actor = getActor(req);
    await AuditLog.create({
        actorId: actor.userId,
        actorRole: actor.role || 'admin',
        action,
        targetType: 'abuse_case',
        targetId,
        reason,
        metadata,
    }).catch(() => null);
};

const getCases = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const filter = {};
        if (req.query.status) filter.status = String(req.query.status).trim();
        if (req.query.severity) filter.severity = String(req.query.severity).trim();
        if (req.query.category) filter.category = String(req.query.category).trim();
        if (req.query.entityType) filter.entityType = String(req.query.entityType).trim();
        if (req.query.assignedTo) filter.assignedTo = String(req.query.assignedTo).trim();
        if (req.query.entityId) filter.entityId = String(req.query.entityId).trim();
        if (req.query.search) {
            const pattern = new RegExp(String(req.query.search).trim(), 'i');
            filter.$or = [{ subject: pattern }, { description: pattern }, { entityId: pattern }];
        }

        const [rows, total] = await Promise.all([
            AbuseCase.find(filter).sort({ updatedAt: -1, severity: -1 }).skip(skip).limit(limit),
            AbuseCase.countDocuments(filter),
        ]);

        return sendSuccess(res, { cases: rows, meta: paginateMeta(total, page, limit) });
    } catch (err) {
        next(err);
    }
};

const getCase = async (req, res, next) => {
    try {
        const row = await AbuseCase.findById(req.params.id);
        if (!row) return sendError(res, 'Risk case not found', 404);
        return sendSuccess(res, row);
    } catch (err) {
        next(err);
    }
};

const createCase = async (req, res, next) => {
    try {
        const actor = getActor(req);
        const doc = new AbuseCase({
            subject: req.body.subject,
            entityType: req.body.entityType || 'other',
            entityId: String(req.body.entityId || '').trim(),
            category: req.body.category || 'other',
            severity: req.body.severity || 'medium',
            status: req.body.status || 'open',
            description: req.body.description || '',
            evidence: Array.isArray(req.body.evidence) ? req.body.evidence : [],
            assignedTo: String(req.body.assignedTo || '').trim(),
            tags: Array.isArray(req.body.tags) ? req.body.tags : [],
            resolution: '',
            actions: [],
            createdBy: actor.userId,
            updatedBy: actor.userId,
        });
        pushAction(doc, req, 'case_created', req.body.description || '', {
            assignedTo: doc.assignedTo,
            severity: doc.severity,
        });
        await doc.save();
        await logAudit(req, 'admin.risk.case.create', String(doc._id), {
            entityType: doc.entityType,
            entityId: doc.entityId,
            category: doc.category,
            severity: doc.severity,
        });
        return sendCreated(res, doc, 'Risk case created');
    } catch (err) {
        next(err);
    }
};

const updateCase = async (req, res, next) => {
    try {
        const doc = await AbuseCase.findById(req.params.id);
        if (!doc) return sendError(res, 'Risk case not found', 404);

        const allowed = [
            'subject',
            'entityType',
            'entityId',
            'category',
            'severity',
            'status',
            'description',
            'assignedTo',
            'tags',
            'resolution',
        ];
        for (const key of allowed) {
            if (req.body[key] !== undefined) doc[key] = req.body[key];
        }
        if (Array.isArray(req.body.evidence)) doc.evidence = req.body.evidence;
        if (doc.status === 'resolved' && !doc.resolvedAt) doc.resolvedAt = new Date();
        if (doc.status === 'closed' && !doc.closedAt) doc.closedAt = new Date();
        pushAction(doc, req, 'case_updated', req.body.note || '', {
            status: doc.status,
            assignedTo: doc.assignedTo,
            severity: doc.severity,
        });
        await doc.save();
        await logAudit(req, 'admin.risk.case.update', String(doc._id), {
            status: doc.status,
            assignedTo: doc.assignedTo,
            severity: doc.severity,
        });
        return sendSuccess(res, doc, 'Risk case updated');
    } catch (err) {
        next(err);
    }
};

const addCaseAction = async (req, res, next) => {
    try {
        const doc = await AbuseCase.findById(req.params.id);
        if (!doc) return sendError(res, 'Risk case not found', 404);
        pushAction(
            doc,
            req,
            String(req.body.action || 'note_added').trim(),
            String(req.body.note || '').trim(),
            req.body.metadata || null
        );
        await doc.save();
        await logAudit(req, 'admin.risk.case.action', String(doc._id), {
            action: req.body.action || 'note_added',
        });
        return sendSuccess(res, doc, 'Risk case action added');
    } catch (err) {
        next(err);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const [statusRows, severityRows, categoryRows, assignedOpenCases] = await Promise.all([
            AbuseCase.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            AbuseCase.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
            AbuseCase.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
            AbuseCase.find({ status: { $in: ['open', 'investigating', 'restricted'] } })
                .sort({ updatedAt: -1 })
                .limit(20),
        ]);

        return sendSuccess(res, {
            statuses: statusRows,
            severities: severityRows,
            categories: categoryRows,
            openCases: assignedOpenCases,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getCases,
    getCase,
    createCase,
    updateCase,
    addCaseAction,
    getSummary,
};
