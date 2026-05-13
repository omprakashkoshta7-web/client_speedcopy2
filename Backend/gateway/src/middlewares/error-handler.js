const logger = require('../../../shared/utils/logger');
const config = require('../config');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const requestId = req.id || res.locals?.requestId;

  logger.error(
    `[Gateway Error] ${req.method} ${req.originalUrl} -> ${status} ${err.message || 'Unknown error'}${
      requestId ? ` [requestId=${requestId}]` : ''
    }`
  );

  res.status(status).json({
    success: false,
    message:
      status >= 500 && config.nodeEnv === 'production'
        ? 'Gateway error'
        : err.message || 'Gateway error',
    ...(requestId ? { requestId } : {}),
  });
};

module.exports = errorHandler;
