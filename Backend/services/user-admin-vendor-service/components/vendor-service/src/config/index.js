require('dotenv').config();
const { requireEnv, requireSecret } = require('../../../../../../shared/utils/env');

const mongoUri = requireEnv('MONGO_URI');

const DB_NAMES = {
    auth: 'speedcopy_auth',
    order: 'speedcopy_orders',
    finance: 'speedcopy_finance',
    notification: 'speedcopy_notifications',
    delivery: 'speedcopy_delivery',
};

const deriveDbUri = (dbName) => mongoUri.replace(/\/([^/?]+)(\?.*)?$/, `/${dbName}$2`);

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri,
    orderServiceUrl: process.env.ORDER_SERVICE_URL,
    authDbUri: process.env.AUTH_DB_URI || deriveDbUri(DB_NAMES.auth),
    orderDbUri: process.env.ORDER_DB_URI || deriveDbUri(DB_NAMES.order),
    financeDbUri: process.env.FINANCE_DB_URI || deriveDbUri(DB_NAMES.finance),
    notificationDbUri: process.env.NOTIFICATION_DB_URI || deriveDbUri(DB_NAMES.notification),
    deliveryDbUri: process.env.DELIVERY_DB_URI || deriveDbUri(DB_NAMES.delivery),
    internalServiceToken: requireSecret('INTERNAL_SERVICE_TOKEN', 'speedcopy-internal-dev-token'),
    publicBaseUrl: process.env.VENDOR_SERVICE_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL,
};
