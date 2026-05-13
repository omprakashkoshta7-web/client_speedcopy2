# Deployment Hardening Checklist

This backend now assumes production deployments provide real environment values for secrets, upstream URLs, and database connections.

## Critical production envs

- `NODE_ENV=production`
- `JWT_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `USER_ADMIN_VENDOR_SERVICE_URL`
- `COMMERCE_SERVICE_URL`
- `DESIGN_NOTIFICATION_SERVICE_URL`
- `GATEWAY_PUBLIC_URL`
- `MONGO_URI_*` values for each logical service database

## Recommended gateway envs

- `CORS_ORIGINS=https://your-frontend.example.com,https://your-admin.example.com`
- `PROXY_TIMEOUT_MS=30000`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX=1500`
- `AUTH_RATE_LIMIT_WINDOW_MS=900000`
- `AUTH_RATE_LIMIT_MAX=60`
- `OTP_SEND_RATE_LIMIT_MAX=5`
- `OTP_VERIFY_RATE_LIMIT_MAX=10`
- `HTTP_KEEP_ALIVE_TIMEOUT_MS=65000`
- `HTTP_HEADERS_TIMEOUT_MS=66000`
- `HTTP_REQUEST_TIMEOUT_MS=120000`
- `JSON_BODY_LIMIT=2mb`
- `URLENCODED_BODY_LIMIT=2mb`
- `TRUST_PROXY_HOPS=1`

## Recommended Mongo envs

- `MONGO_SERVER_SELECTION_TIMEOUT_MS=10000`
- `MONGO_CONNECT_TIMEOUT_MS=10000`
- `MONGO_SOCKET_TIMEOUT_MS=45000`
- `MONGO_HEARTBEAT_FREQUENCY_MS=10000`
- `MONGO_MAX_POOL_SIZE=20`
- `MONGO_MIN_POOL_SIZE=2`

Increase `MONGO_MAX_POOL_SIZE` carefully during load testing instead of guessing in production.

## What changed in this hardening pass

- The gateway now uses one hardened proxy wrapper for all upstream services.
- Proxy failures now map more consistently to `503` or `504` instead of noisy generic failures.
- Authenticated gateway routes now forward user context more consistently.
- Production no longer silently falls back to `.env.example` values.
- Production secrets now fail fast if missing instead of using dev defaults.
- Gateway request body limits, keep-alive, headers timeout, request timeout, and request IDs are now configurable.
- Gateway startup/shutdown now includes graceful close behavior and client error handling.

## Before GCP deploy

1. Confirm Atlas network access / IP allowlist is open for the deployment runtime.
2. Confirm all three service URLs point to the merged services, not legacy ports.
3. Confirm `JWT_SECRET` and `INTERNAL_SERVICE_TOKEN` are set identically across services that share them.
4. Confirm CORS origins match the real frontend domains.
5. Smoke-test:
   - `/health`
   - `/ready`
   - login
   - `/api/auth/me`
   - one customer protected API
   - one staff protected API
   - one vendor protected API
   - one order API
   - one notification API

## Important note

This pass improves resilience and removes common deployment traps, but it does not guarantee "never down" behavior. You still need:

- horizontal scaling / multiple instances
- autoscaling tuned for traffic
- MongoDB Atlas connectivity stability
- external monitoring and alerting
- load testing before 10k-50k active-user traffic
