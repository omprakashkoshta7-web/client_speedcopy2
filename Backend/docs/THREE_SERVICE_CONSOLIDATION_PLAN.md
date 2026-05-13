# SpeedCopy 3-Service Consolidation Plan

## Objective

Reduce the current 11 backend microservices into 3 actual runtime service domains while preserving the existing API paths and business behavior.

Important boundary:

- The API gateway remains the public edge entrypoint.
- The reduction applies to the backend domain services behind the gateway.
- Resulting runtime shape: `gateway + 3 merged backend services`.

## Target Service Domains

### 1. User Admin Vendor Service

This merged service owns identity, customer profile, admin operations, and vendor organization flows.

Included legacy services:

- `auth-service`
- `user-service`
- `admin-service`
- `vendor-service`

Main public route ownership:

- `/api/auth/*`
- `/api/users/*`
- `/api/admin/*`
- `/api/staff/*`
- `/api/vendor/*`
- `/uploads/users/*`
- `/uploads/admin/*`
- `/uploads/vendors/*`

### 2. Commerce Service

This merged service owns catalog, cart, checkout, orders, delivery, payments, and finance flows.

Included legacy services:

- `product-service`
- `order-service`
- `payment-service`
- `delivery-service`
- `finance-service`

Main public route ownership:

- `/api/products/*`
- `/api/printing/*`
- `/api/business-printing/*`
- `/api/shop/*`
- `/api/shopping/*`
- `/api/gifting/*`
- `/api/cart/*`
- `/api/orders/*`
- `/api/payments/*`
- `/api/delivery/*`
- `/api/wallet/*`
- `/api/referrals/*`
- `/api/admin/shop/*`
- `/api/admin/gifting/*`
- `/api/admin/banners/*`
- `/api/admin/finance/*`
- `/api/admin/refunds/*`
- `/uploads/*`
- `/uploads/delivery/*`

### 3. Design Notification Service

This merged service owns design creation, notifications, and support-ticket interactions.

Included legacy services:

- `design-service`
- `notification-service`

Main public route ownership:

- `/api/designs/*`
- `/api/notifications/*`
- `/api/tickets/*`
- `/ws/status`
- `/socket.io/*`

## Legacy to Target Mapping

| Current service | New deployment domain | Notes |
|---|---|---|
| `auth-service` | User Admin Vendor | Mounted internally inside merged runtime |
| `user-service` | User Admin Vendor | No API path changes |
| `admin-service` | User Admin Vendor | No API path changes |
| `vendor-service` | User Admin Vendor | No API path changes |
| `product-service` | Commerce | No API path changes |
| `order-service` | Commerce | No API path changes |
| `payment-service` | Commerce | No API path changes |
| `delivery-service` | Commerce | No API path changes |
| `finance-service` | Commerce | No API path changes |
| `design-service` | Design Notification | No API path changes |
| `notification-service` | Design Notification | No API path changes |

## Why This Approach Is Safe

The implementation does not rewrite hundreds of controllers by hand.

Instead:

1. Each new merged runtime loads the relevant legacy Express apps in-process.
2. Each legacy app keeps its own models, middleware, and database connection.
3. Each merged service exposes one public port and dispatches the original route families internally.
4. The gateway is reconfigured to point route groups to the new 3 service URLs.

This keeps:

- current request and response shapes
- current JWT and internal token behavior
- current database separation
- current inter-service HTTP logic
- current upload/static route behavior

## Feature-Plan Validation

The attached feature-plan PDFs were used to validate the bundled boundaries.

Validated flow families found in the plan set:

- customer access, session, profile, privacy, wallet, referrals, support
- product discovery, upload/customization, address, delivery mode, checkout, payment
- order edit window, tracking, delivery confirmation, reorder
- vendor organization, stores, staff, queue, scoring, finance, payouts, support
- delivery partner auth, tasks, earnings, proof, incidents
- admin and staff dashboard, controls, reports, SLA, tickets, delivery partner management
- design editor, preview approval, notification, support ticket handling

These flows align with the current backend route inventory in `docs/BACKEND_API_AUDIT.md`.

## Deployment Notes

Current merged runtime service owners in code:

- `services/user-admin-vendor-service`
- `services/commerce-service`
- `services/design-notification-service`

New local commands:

- `npm run start:bundles`
- `npm run dev:bundles`
- `npm run health:bundles`

New bundle URL environment variables:

- `USER_ADMIN_VENDOR_SERVICE_URL`
- `COMMERCE_SERVICE_URL`
- `DESIGN_NOTIFICATION_SERVICE_URL`

Implementation notes:

- runtime dependencies are now installed from the repo root
- copied component source lives under the 3 new owning service folders
- the gateway still supports the old service-specific URLs, so rollout can happen gradually

## Legacy Folder Retirement

The merged runtime no longer imports the old top-level service folders to boot the 3-service topology.

Current state:

- runtime is reduced to 3 actual services
- merged runtime source is owned by the 3 new service folders
- root `node_modules` now provides shared runtime dependencies for the copied components
- endpoint behavior is preserved through in-process mounting

Retired during cleanup:

1. `services/access-bundle`
2. `services/commerce-bundle`
3. `services/engagement-bundle`
4. the old top-level legacy service folders such as `services/auth-service`, `services/order-service`, and `services/notification-service`
5. obsolete component-local Dockerfiles and Cloud Build files that still pointed at the old folder names

Recommended deletion gate:

1. run the 3 merged services in staging
2. validate auth, user profile, vendor portal, admin finance, checkout, delivery, design save, notifications, and tickets
3. confirm Cloud Run or AWS images are using the new 3 Dockerfiles
4. keep version control and deployment history as the rollback path

## Recommended Rollout

1. Deploy the 3 merged services to GCP or AWS.
2. Point the gateway service URLs to the 3 new bundle URLs.
3. Run smoke tests for auth, catalog, checkout, vendor queue, admin dashboard, design save, notifications, and support tickets.
4. Use version control and deployment history as the rollback path.

## Follow-Up Validation

These items should be verified in the target cloud environment after deployment:

- direct Socket.IO or websocket notification connectivity, if the frontend uses it directly
- large file upload flows for printing and QC uploads
- Cloud Run memory sizing, because one service now owns multiple backend domains
- per-service autoscaling thresholds and container concurrency
