require('dotenv').config();
const { requireSecret } = require('../../../../../../shared/utils/env');

const requireEnv = (envName) => {
    const value = process.env[envName];
    if (!value) {
        throw new Error(`${envName} is not set`);
    }

    return value;
};

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    orderServiceUrl: process.env.ORDER_SERVICE_URL,
    authServiceUrl: process.env.AUTH_SERVICE_URL,
    internalServiceToken: requireSecret('INTERNAL_SERVICE_TOKEN', 'speedcopy-internal-dev-token'),
    dbUris: {
        finance: process.env.FINANCE_DB_URI,
        notification: process.env.NOTIFICATION_DB_URI,
        design: process.env.DESIGN_DB_URI,
        payment: process.env.PAYMENT_DB_URI,
    },
    dbNames: {
        finance: 'speedcopy_finance',
        notification: 'speedcopy_notifications',
        design: 'speedcopy_designs',
        payment: 'speedcopy_payments',
    },
    deriveDbUri(name) {
        const dbName = this.dbNames[name];
        if (!dbName) {
            throw new Error(`Unknown database name for service: ${name}`);
        }

        return this.mongoUri.replace(/\/([^/?]+)(\?.*)?$/, `/${dbName}$2`);
    },
    getDbUri(name) {
        return this.dbUris[name] || this.deriveDbUri(name);
    },
    publicBaseUrl: process.env.USER_SERVICE_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL,
};
