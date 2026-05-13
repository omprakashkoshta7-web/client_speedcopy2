# SpeedCopy Backend Service Reduction Brief

## Summary

The backend has been prepared to move from 11 backend runtimes to 3 backend runtimes without changing the public API structure used by the frontend.

The gateway remains the public entrypoint. Behind it, the platform is grouped into:

1. `User Admin Vendor Service`
2. `Commerce Service`
3. `Design Notification Service`

## New Service Grouping

| New service | Included capabilities |
|---|---|
| User Admin Vendor Service | auth, user profile, admin dashboard, staff operations, vendor organization |
| Commerce Service | products, printing, shopping, gifting, cart, orders, payments, delivery, finance |
| Design Notification Service | design editor, notifications, support tickets |

## API Impact

- No public API path changes were introduced.
- Existing gateway routes remain the same.
- Existing service logic remains the same internally.
- The change is a runtime consolidation into 3 actual services, with the copied source now owned under the 3 new service folders.

## Main API Ownership After Consolidation

| Route family | New owner |
|---|---|
| `/api/auth`, `/api/users`, `/api/admin`, `/api/staff`, `/api/vendor` | User Admin Vendor Service |
| `/api/products`, `/api/printing`, `/api/business-printing`, `/api/shop`, `/api/gifting`, `/api/cart`, `/api/orders`, `/api/payments`, `/api/delivery`, `/api/wallet`, `/api/referrals` | Commerce Service |
| `/api/designs`, `/api/notifications`, `/api/tickets` | Design Notification Service |

## Why This Matters

- Lower deployment and coordination overhead than 11 separate services
- Easier environment setup for GCP and AWS
- Lower risk than rewriting APIs into new codebases
- Keeps future development unblocked while the original platform is already live elsewhere

## Rollout Note

Recommended production shape:

- 1 API Gateway
- 3 merged backend services

This gives operational simplification without forcing frontend API changes.

## Current Technical Status

- The 3 merged services boot from `services/user-admin-vendor-service`, `services/commerce-service`, and `services/design-notification-service`.
- The public endpoint inventory remains unchanged.
- Remaining validation is environment-based rather than code-structure-based: database connectivity, Firebase credentials, and staged smoke testing.
