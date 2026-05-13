require('dotenv').config();
const { requireEnv, requireSecret, getEnv } = require('../../../../../../shared/utils/env');

module.exports = {
    port: Number(process.env.PORT || 8080),
    mongoUri: requireEnv('MONGO_URI'),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: requireSecret('JWT_SECRET', 'speedcopy-dev-secret'),
    internalServiceToken: requireSecret('INTERNAL_SERVICE_TOKEN', 'speedcopy-internal-dev-token'),
    adminAllowedEmails: getEnv('ADMIN_ALLOWED_EMAILS', 'admin@speedcopy.com')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    googleClientId: process.env.GC_CLIENT_ID || '',
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
        defaultCountryCode: process.env.TWILIO_DEFAULT_COUNTRY_CODE || '+91',
    },
    publicBaseUrl: process.env.AUTH_SERVICE_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL,
};
