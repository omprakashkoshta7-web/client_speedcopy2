require('dotenv').config();
const { requireEnv, requireSecret } = require('../../../../../../shared/utils/env');

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    razorpay: {
        keyId: isProduction
            ? process.env.RAZORPAY_KEY_ID
            : process.env.RAZORPAY_KEY_ID_TEST || process.env.RAZORPAY_KEY_ID,
        keySecret: isProduction
            ? process.env.RAZORPAY_KEY_SECRET
            : process.env.RAZORPAY_KEY_SECRET_TEST || process.env.RAZORPAY_KEY_SECRET,
    },
    orderServiceUrl: process.env.ORDER_SERVICE_URL,
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
    internalServiceToken: requireSecret('INTERNAL_SERVICE_TOKEN', 'speedcopy-internal-dev-token'),
    publicBaseUrl: process.env.PAYMENT_SERVICE_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL,
};
