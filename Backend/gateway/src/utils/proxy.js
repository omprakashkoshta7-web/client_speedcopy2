const proxy = require('express-http-proxy');
const { parsePositiveInt } = require('../../../shared/utils/env');

const HOP_BY_HOP_HEADERS = [
    'connection',
    'proxy-connection',
    'keep-alive',
    'transfer-encoding',
    'upgrade',
    'te',
    'trailer',
];

const proxyTimeoutMs = parsePositiveInt(process.env.PROXY_TIMEOUT_MS, 30000);

const normalizeProxyErrorStatus = (error) => {
    if (!error) return 502;
    if (['ETIMEDOUT', 'ECONNABORTED'].includes(error.code)) return 504;
    if (['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN'].includes(error.code)) {
        return 503;
    }
    return 502;
};

const buildProxyErrorHandler =
    (targetUrl, customMessage) =>
    (err, res, next) => {
        const status = normalizeProxyErrorStatus(err);
        if (res.headersSent) {
            return next(err);
        }

        const requestId = res.locals?.requestId || res.getHeader('x-request-id') || '';
        return res.status(status).json({
            success: false,
            message:
                customMessage ||
                `Upstream service is unavailable for ${targetUrl}. Please try again shortly.`,
            ...(requestId ? { requestId } : {}),
        });
    };

const buildProxyReqOptDecorator = (targetUrl, decorateHeaders) => {
    const targetHost = new URL(targetUrl).host;

    return (proxyReqOpts, srcReq) => {
        const headers = { ...(proxyReqOpts.headers || {}) };

        for (const header of HOP_BY_HOP_HEADERS) {
            delete headers[header];
            delete headers[header.toLowerCase()];
        }

        headers.host = targetHost;
        headers['x-forwarded-host'] = srcReq.headers['x-forwarded-host'] || srcReq.headers.host;
        headers['x-forwarded-proto'] =
            srcReq.headers['x-forwarded-proto'] || srcReq.protocol || 'http';
        if (srcReq.headers['x-forwarded-port']) {
            headers['x-forwarded-port'] = srcReq.headers['x-forwarded-port'];
        }
        if (srcReq.headers['x-request-id']) {
            headers['x-request-id'] = srcReq.headers['x-request-id'];
        }

        if (srcReq.method === 'GET' || srcReq.method === 'HEAD') {
            delete headers['content-length'];
            delete headers['Content-Length'];
        }

        if (typeof decorateHeaders === 'function') {
            decorateHeaders(headers, srcReq);
        }

        return {
            ...proxyReqOpts,
            headers,
        };
    };
};

const buildProxyReqBodyDecorator = () => (bodyContent, srcReq) => {
    const method = String(srcReq.method || '').toUpperCase();

    if (method === 'GET' || method === 'HEAD') {
        return '';
    }

    return bodyContent;
};

const decorateAuthHeaders = (headers, srcReq) => {
    if (srcReq.headers['x-user-id']) {
        headers['x-user-id'] = srcReq.headers['x-user-id'];
    }
    if (srcReq.headers['x-user-role']) {
        headers['x-user-role'] = srcReq.headers['x-user-role'];
    }
    if (srcReq.headers['x-user-email']) {
        headers['x-user-email'] = srcReq.headers['x-user-email'];
    }
    if (srcReq.headers['x-user-portal-role']) {
        headers['x-user-portal-role'] = srcReq.headers['x-user-portal-role'];
    }
    if (srcReq.headers['x-user-team']) {
        headers['x-user-team'] = srcReq.headers['x-user-team'];
    }
    if (srcReq.headers['x-user-store-scope']) {
        headers['x-user-store-scope'] = srcReq.headers['x-user-store-scope'];
    }
    if (srcReq.headers['x-firebase-uid']) {
        headers['x-firebase-uid'] = srcReq.headers['x-firebase-uid'];
    }
    if (srcReq.headers['x-user-permissions']) {
        headers['x-user-permissions'] = srcReq.headers['x-user-permissions'];
    }
    if (srcReq.headers['x-vendor-user-id']) {
        headers['x-vendor-user-id'] = srcReq.headers['x-vendor-user-id'];
    }
    if (srcReq.headers['x-vendor-org-id']) {
        headers['x-vendor-org-id'] = srcReq.headers['x-vendor-org-id'];
    }
    if (srcReq.headers['x-vendor-aliases']) {
        headers['x-vendor-aliases'] = srcReq.headers['x-vendor-aliases'];
    }
};

const buildAuthedProxyReqOptDecorator = (targetUrl, decorateHeaders) =>
    buildProxyReqOptDecorator(targetUrl, (headers, srcReq) => {
        decorateAuthHeaders(headers, srcReq);
        if (typeof decorateHeaders === 'function') {
            decorateHeaders(headers, srcReq);
        }
    });

const createServiceProxy = (targetUrl, options = {}) =>
    proxy(targetUrl, {
        timeout: proxyTimeoutMs,
        proxyErrorHandler: buildProxyErrorHandler(targetUrl, options.proxyErrorMessage),
        ...options,
    });

module.exports = {
    buildProxyReqOptDecorator,
    buildProxyReqBodyDecorator,
    buildAuthedProxyReqOptDecorator,
    createServiceProxy,
};
