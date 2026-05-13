const templateConfigService = require('../services/template-config.service');
const { sendSuccess } = require('../../../../shared/utils/response');

const getTemplateConfig = async (req, res, next) => {
    try {
        const data = await templateConfigService.getTemplateConfig(req.params.variantId);
        return sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

module.exports = { getTemplateConfig };
