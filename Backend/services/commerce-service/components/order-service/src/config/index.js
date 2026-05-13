require('dotenv').config();
const { requireEnv, requireSecret } = require('../../../../../../shared/utils/env');

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    internalServiceToken: requireSecret('INTERNAL_SERVICE_TOKEN', 'speedcopy-internal-dev-token'),
    productServiceUrl: process.env.PRODUCT_SERVICE_URL,
    userServiceUrl: process.env.USER_SERVICE_URL,
    deliveryServiceUrl: process.env.DELIVERY_SERVICE_URL || process.env.DELIVERY_SERVICE_PUBLIC_URL,
    notificationServiceUrl:
        process.env.NOTIFICATION_SERVICE_URL || process.env.NOTIFICATION_SERVICE_PUBLIC_URL,
    publicBaseUrl: process.env.ORDER_SERVICE_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL,
};
