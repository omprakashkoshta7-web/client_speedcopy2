const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const trustedProxyHops = parsePositiveInt(process.env.TRUST_PROXY_HOPS, 1);

const normalizeIp = (value) =>
  String(value || '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .replace(/:\d+[^:]*$/, '');

const normalizePhone = (value) =>
  String(value || '')
    .replace(/\D/g, '')
    .trim();

const getClientIpKey = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((value) => normalizeIp(value))
    .filter(Boolean);

  if (forwardedFor.length) {
    const index = Math.max(0, forwardedFor.length - trustedProxyHops);
    return forwardedFor[index];
  }

  return normalizeIp(req.ip) || normalizeIp(req.socket?.remoteAddress) || 'unknown-client';
};

const getUserKey = (req) =>
  String(
    req.headers['x-user-id'] ||
      req.headers['x-firebase-uid'] ||
      ''
  ).trim();

const getActorKey = (req) => getUserKey(req) || getClientIpKey(req);

const baseValidate = {
  xForwardedForHeader: false,
  default: true,
};

const skipPreflight = (req) => req.method === 'OPTIONS';

const createLimiter = ({
  windowMs,
  max,
  keyGenerator,
  message,
  skip,
  skipSuccessfulRequests = false,
}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator,
    skip: skip || skipPreflight,
    validate: baseValidate,
    message,
  });

const defaultWindowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const defaultMax = parsePositiveInt(
  process.env.RATE_LIMIT_MAX,
  isProduction ? 1500 : 5000
);

const authWindowMs = parsePositiveInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  isProduction ? 15 * 60 * 1000 : 60 * 1000
);
const authMax = parsePositiveInt(
  process.env.AUTH_RATE_LIMIT_MAX,
  isProduction ? 60 : 500
);

const otpSendWindowMs = parsePositiveInt(
  process.env.OTP_SEND_RATE_LIMIT_WINDOW_MS,
  10 * 60 * 1000
);
const otpSendMax = parsePositiveInt(
  process.env.OTP_SEND_RATE_LIMIT_MAX,
  isProduction ? 5 : 50
);

const otpVerifyWindowMs = parsePositiveInt(
  process.env.OTP_VERIFY_RATE_LIMIT_WINDOW_MS,
  10 * 60 * 1000
);
const otpVerifyMax = parsePositiveInt(
  process.env.OTP_VERIFY_RATE_LIMIT_MAX,
  isProduction ? 10 : 100
);

const meWindowMs = parsePositiveInt(
  process.env.AUTH_ME_RATE_LIMIT_WINDOW_MS,
  5 * 60 * 1000
);
const meMax = parsePositiveInt(
  process.env.AUTH_ME_RATE_LIMIT_MAX,
  isProduction ? 300 : 2000
);

const notificationReadWindowMs = parsePositiveInt(
  process.env.NOTIFICATION_READ_RATE_LIMIT_WINDOW_MS,
  5 * 60 * 1000
);
const notificationReadMax = parsePositiveInt(
  process.env.NOTIFICATION_READ_RATE_LIMIT_MAX,
  isProduction ? 600 : 5000
);

const notificationWriteWindowMs = parsePositiveInt(
  process.env.NOTIFICATION_WRITE_RATE_LIMIT_WINDOW_MS,
  5 * 60 * 1000
);
const notificationWriteMax = parsePositiveInt(
  process.env.NOTIFICATION_WRITE_RATE_LIMIT_MAX,
  isProduction ? 120 : 1000
);

const shouldSkipDefaultLimiter = (req) =>
  skipPreflight(req) ||
  req.path.startsWith('/api/auth/phone/send-otp') ||
  req.path.startsWith('/api/auth/phone/verify-otp') ||
  req.path.startsWith('/api/auth/me') ||
  req.path.startsWith('/api/notifications');

const defaultLimiter = createLimiter({
  windowMs: defaultWindowMs,
  max: defaultMax,
  keyGenerator: getActorKey,
  skip: shouldSkipDefaultLimiter,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = createLimiter({
  windowMs: authWindowMs,
  max: authMax,
  keyGenerator: getClientIpKey,
  skipSuccessfulRequests: !isProduction,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

const otpSendLimiter = createLimiter({
  windowMs: otpSendWindowMs,
  max: otpSendMax,
  keyGenerator: (req) => {
    const phone = normalizePhone(req.body?.phone || req.body?.phoneNumber || req.body?.mobile);
    return phone ? `otp-send:${phone}:${getClientIpKey(req)}` : `otp-send:${getClientIpKey(req)}`;
  },
  message: { success: false, message: 'Too many OTP requests, please try again later.' },
});

const otpVerifyLimiter = createLimiter({
  windowMs: otpVerifyWindowMs,
  max: otpVerifyMax,
  keyGenerator: (req) => {
    const phone = normalizePhone(req.body?.phone || req.body?.phoneNumber || req.body?.mobile);
    return phone ? `otp-verify:${phone}:${getClientIpKey(req)}` : `otp-verify:${getClientIpKey(req)}`;
  },
  message: { success: false, message: 'Too many OTP verification attempts, please try again later.' },
});

const authMeLimiter = createLimiter({
  windowMs: meWindowMs,
  max: meMax,
  keyGenerator: getActorKey,
  message: { success: false, message: 'Too many session refresh requests, please try again later.' },
});

const notificationReadLimiter = createLimiter({
  windowMs: notificationReadWindowMs,
  max: notificationReadMax,
  keyGenerator: getActorKey,
  message: { success: false, message: 'Too many notification refresh requests, please try again later.' },
});

const notificationWriteLimiter = createLimiter({
  windowMs: notificationWriteWindowMs,
  max: notificationWriteMax,
  keyGenerator: getActorKey,
  message: { success: false, message: 'Too many notification actions, please try again later.' },
});

module.exports = {
  defaultLimiter,
  authLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  authMeLimiter,
  notificationReadLimiter,
  notificationWriteLimiter,
};
