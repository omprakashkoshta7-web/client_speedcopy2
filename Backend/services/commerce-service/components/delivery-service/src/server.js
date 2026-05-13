require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../../../shared/utils/logger');

const app = require('./app');
const { config } = require('./config/index');

(async () => {
    await mongoose.connect(config.MONGO_URI, {
        family: 4,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        retryWrites: true,
        retryReads: true,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host} → ${mongoose.connection.name}`);

    const server = app.listen(config.PORT, () => {
        logger.info(`Delivery Service listening on port ${config.PORT}`);
        logger.info(
            `Delivery Service Swagger docs available at ${config.PUBLIC_BASE_URL}/api-docs`
        );
    });

    process.on('unhandledRejection', (err) => {
        logger.error(err);
        server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
        logger.error(err);
        process.exit(1);
    });
})();
