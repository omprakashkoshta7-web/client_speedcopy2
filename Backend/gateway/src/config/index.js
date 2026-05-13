require('dotenv').config();
const { isProduction, parsePositiveInt, getEnv } = require('../../../shared/utils/env');
const resolveServiceUrl = (envName, fallback) => {
  const value = process.env[envName];
  if (value) return value;
  if (isProduction()) {
    throw new Error(`${envName} is required in production`);
  }

  return fallback;
};

module.exports = {
  port: parsePositiveInt(process.env.PORT, 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  services: {
    commerce:
      process.env.COMMERCE_SERVICE_URL ||
      resolveServiceUrl('COMMERCE_SERVICE_URL', 'http://127.0.0.1:4102'),
    auth:
      process.env.AUTH_SERVICE_URL ||
      process.env.USER_ADMIN_VENDOR_SERVICE_URL ||
      resolveServiceUrl('AUTH_SERVICE_URL', 'http://127.0.0.1:4101'),
    user:
      process.env.USER_SERVICE_URL ||
      process.env.USER_ADMIN_VENDOR_SERVICE_URL ||
      resolveServiceUrl('USER_SERVICE_URL', 'http://127.0.0.1:4101'),
    product:
      process.env.PRODUCT_SERVICE_URL ||
      process.env.COMMERCE_SERVICE_URL ||
      resolveServiceUrl('PRODUCT_SERVICE_URL', 'http://127.0.0.1:4102'),
    design:
      process.env.DESIGN_SERVICE_URL ||
      process.env.DESIGN_NOTIFICATION_SERVICE_URL ||
      resolveServiceUrl('DESIGN_SERVICE_URL', 'http://127.0.0.1:4103'),
    order:
      process.env.ORDER_SERVICE_URL ||
      process.env.COMMERCE_SERVICE_URL ||
      resolveServiceUrl('ORDER_SERVICE_URL', 'http://127.0.0.1:4102'),
    payment:
      process.env.PAYMENT_SERVICE_URL ||
      process.env.COMMERCE_SERVICE_URL ||
      resolveServiceUrl('PAYMENT_SERVICE_URL', 'http://127.0.0.1:4102'),
    notification:
      process.env.NOTIFICATION_SERVICE_URL ||
      process.env.DESIGN_NOTIFICATION_SERVICE_URL ||
      resolveServiceUrl('NOTIFICATION_SERVICE_URL', 'http://127.0.0.1:4103'),
    admin:
      process.env.ADMIN_SERVICE_URL ||
      process.env.USER_ADMIN_VENDOR_SERVICE_URL ||
      resolveServiceUrl('ADMIN_SERVICE_URL', 'http://127.0.0.1:4101'),
    delivery:
      process.env.DELIVERY_SERVICE_URL ||
      process.env.COMMERCE_SERVICE_URL ||
      resolveServiceUrl('DELIVERY_SERVICE_URL', 'http://127.0.0.1:4102'),
    vendor:
      process.env.VENDOR_SERVICE_URL ||
      process.env.USER_ADMIN_VENDOR_SERVICE_URL ||
      resolveServiceUrl('VENDOR_SERVICE_URL', 'http://127.0.0.1:4101'),
    finance:
      process.env.FINANCE_SERVICE_URL ||
      process.env.COMMERCE_SERVICE_URL ||
      resolveServiceUrl('FINANCE_SERVICE_URL', 'http://127.0.0.1:4102'),
  },
  publicBaseUrl: process.env.GATEWAY_PUBLIC_URL || process.env.SERVICE_PUBLIC_URL || `http://127.0.0.1:${process.env.PORT || 8080}`,
  corsOrigins: getEnv('CORS_ORIGINS', getEnv('CORS_ORIGIN', '*')),
  jsonBodyLimit: getEnv('JSON_BODY_LIMIT', '2mb'),
  urlEncodedBodyLimit: getEnv('URLENCODED_BODY_LIMIT', '2mb'),
  trustProxyHops: parsePositiveInt(process.env.TRUST_PROXY_HOPS, 1),
  keepAliveTimeoutMs: parsePositiveInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 65000),
  headersTimeoutMs: parsePositiveInt(process.env.HTTP_HEADERS_TIMEOUT_MS, 66000),
  requestTimeoutMs: parsePositiveInt(process.env.HTTP_REQUEST_TIMEOUT_MS, 120000),
};
