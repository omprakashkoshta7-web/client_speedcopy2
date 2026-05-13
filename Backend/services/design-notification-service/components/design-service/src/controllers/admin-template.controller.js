const templateDefinitionService = require('../services/template-definition.service');
const { sendSuccess, sendCreated } = require('../../../../shared/utils/response');

const getAdminId = (req) =>
    req.headers['x-admin-id'] || req.headers['x-user-id'] || req.headers['x-staff-id'] || '';

const listTemplates = async (req, res, next) => {
    try {
        const data = await templateDefinitionService.listTemplates(req.query);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

const createTemplate = async (req, res, next) => {
    try {
        const data = await templateDefinitionService.createTemplate(getAdminId(req), req.body);
        return sendCreated(res, data, 'Template definition created');
    } catch (err) {
        next(err);
    }
};

const updateTemplate = async (req, res, next) => {
    try {
        const data = await templateDefinitionService.updateTemplate(
            getAdminId(req),
            req.params.id,
            req.body
        );
        return sendSuccess(res, data, 'Template definition updated');
    } catch (err) {
        next(err);
    }
};

const publishTemplate = async (req, res, next) => {
    try {
        const data = await templateDefinitionService.publishTemplate(getAdminId(req), req.params.id);
        return sendSuccess(res, data, 'Template definition published');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listTemplates,
    createTemplate,
    updateTemplate,
    publishTemplate,
};
