const app = require('./app');
const config = require('./config');
const logger = require('../../shared/utils/logger');

const server = app.listen(config.port, () => {
  logger.info(`Gateway listening on port ${config.port}`);
  logger.info(`Gateway Swagger docs available at ${config.publicBaseUrl}/api-docs`);
});

server.keepAliveTimeout = config.keepAliveTimeoutMs;
server.headersTimeout = config.headersTimeoutMs;
server.requestTimeout = config.requestTimeoutMs;
server.on('clientError', (err, socket) => {
  logger.warn(`Gateway client error: ${err.message}`);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info(`Received ${signal}. Shutting down gateway...`);
  server.close((closeError) => {
    if (closeError) {
      logger.error(closeError);
      process.exit(1);
      return;
    }

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Gateway shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
};

process.on('unhandledRejection', (err) => {
  logger.error(err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(err);
  process.exit(1);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
