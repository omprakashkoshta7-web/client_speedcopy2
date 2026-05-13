const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { requireEnv, parsePositiveInt } = require('../utils/env');

const connectDB = async (uri) => {
    const mongoUri = uri || requireEnv('MONGO_URI', { developmentFallback: 'mongodb://127.0.0.1:27017/speedcopy' });

    const options = {
        family: 4,
        serverSelectionTimeoutMS: parsePositiveInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10000),
        socketTimeoutMS: parsePositiveInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
        connectTimeoutMS: parsePositiveInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10000),
        heartbeatFrequencyMS: parsePositiveInt(process.env.MONGO_HEARTBEAT_FREQUENCY_MS, 10000),
        maxPoolSize: parsePositiveInt(process.env.MONGO_MAX_POOL_SIZE, 20),
        minPoolSize: parsePositiveInt(process.env.MONGO_MIN_POOL_SIZE, 2),
        retryWrites: true,
        retryReads: true,
    };

    try {
        await mongoose.connect(mongoUri, options);
        logger.info(`MongoDB connected: ${mongoose.connection.host} → ${mongoose.connection.name}`);

        mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
        mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
        mongoose.connection.on('error', (err) => logger.error('MongoDB error: ' + err.message));
    } catch (err) {
        logger.error('MongoDB connection failed: ' + err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
