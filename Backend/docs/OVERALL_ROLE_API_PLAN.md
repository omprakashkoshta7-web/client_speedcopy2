# Speedcopy Overall Backend Role/API Plan

## Scope

This document connects the five role-based feature-plan PDFs to the current backend implementation after the 3-service consolidation.

Reviewed inputs:

- `docs/input/Speedcopy - Feature Plan  - Customer (1).pdf`
- `docs/input/Speedcopy - Feature Plan  - Delivery Partner.pdf`
- `docs/input/Speedcopy - Feature Plan  - Speed Copy Admin.pdf`
- `docs/input/Speedcopy - Feature Plan  - Speed Copy Staff.pdf`
- `docs/input/Speedcopy - Feature Plan  - Vendor Organization.pdf`

Important note:

- The PDFs appear to have a non-standard text encoding, so some extracted lines are partially garbled.
- The role intent, screen/module titles, and most backend expectations were still readable enough to map to the current APIs.
- This is a backend-only assessment. No frontend assumptions are used unless the backend route contract already exposes them.

## Current Runtime Structure

The platform currently runs as three backend services behind the gateway:

1. `user-admin-vendor-service`
2. `commerce-service`
3. `design-notification-service`
4. `gateway`

## Service Ownership

| Domain | Runtime Owner | Main Public Prefixes |
|---|---|---|
| Auth and session | `user-admin-vendor-service` | `/api/auth` |
| Customer profile and addresses | `user-admin-vendor-service` | `/api/users` |
| Admin operations | `user-admin-vendor-service` | `/api/admin` |
| Staff operations | `user-admin-vendor-service` | `/api/staff` |
| Vendor organization | `user-admin-vendor-service` | `/api/vendor` |
| Product discovery | `commerce-service` | `/api/products`, `/api/shopping`, `/api/gifting`, `/api/printing`, `/api/business-printing`, `/api/shop` |
| Cart and order lifecycle | `commerce-service` | `/api/cart`, `/api/orders`, `/api/gifting/cart`, `/api/gifting/orders`, `/api/shop/orders` |
| Payments | `commerce-service` | `/api/payments` |
| Finance | `commerce-service` | `/api/wallet`, `/api/referrals`, `/api/admin/finance`, `/api/admin/refunds`, `/api/vendor/finance`, `/api/delivery/earnings` |
| Delivery partner | `commerce-service` | `/api/delivery` |
| Designs and templates | `design-notification-service` | `/api/designs` |
| Notifications and support tickets | `design-notification-service` | `/api/notifications`, `/api/tickets` |

## Cross-Role Flow Map

### 1. Customer to Order

- Customer authenticates through `/api/auth/*`
- Customer profile and addresses live under `/api/users/*`
- Customer browses products via `/api/shopping/*`, `/api/gifting/*`, `/api/printing/*`, `/api/business-printing/*`, `/api/products/*`
- Customer saves customization/design state under `/api/designs/*`
- Customer builds cart through `/api/cart/*` or flow-specific order/cart APIs
- Customer places order through `/api/orders` or flow-specific order endpoints
- Customer pays through `/api/payments/*` and wallet/referral flows through `/api/wallet/*` and `/api/referrals/*`

### 2. Order to Vendor

- Once created, the order is stored in `commerce-service`
- Vendor-facing queue is exposed through `/api/vendor/orders/*`
- Staff can intervene through `/api/staff/orders/*`
- Admin can intervene through `/api/admin/orders/*`

### 3. Vendor to Delivery

- Vendor accepts, rejects, updates production state, uploads QC, and marks ready through `/api/vendor/orders/*`
- Order service creates delivery tasks internally through `POST /api/delivery/internal/tasks`
- Delivery partner works the task through `/api/delivery/tasks/*`

### 4. Support, Notifications, and Escalations

- Customer notifications are exposed through `/api/notifications/*`
- Customer tickets are exposed through `/api/tickets/*` and `/api/notifications/tickets/*`
- Vendor tickets are exposed through `/api/vendor/tickets/*`
- Admin ticket operations are exposed through `/api/admin/tickets/*`
- Staff ticket operations are exposed through `/api/staff/tickets/*`

## API Inventory By Role

### Customer APIs

Authentication and account:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `POST /api/auth/google-verify`
- `POST /api/auth/phone/send-otp`
- `POST /api/auth/phone/verify-otp`
- `GET /api/auth/me`

Profile and addresses:

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `POST /api/users/profile/avatar`
- `PATCH /api/users/profile/notifications`
- `POST /api/users/profile/data-export-request`
- `POST /api/users/profile/account-deletion-request`
- `GET /api/users/addresses`
- `POST /api/users/addresses`
- `PUT /api/users/addresses/:id`
- `PATCH /api/users/addresses/:id/location`
- `DELETE /api/users/addresses/:id`
- `GET /api/users/wishlist`
- `POST /api/users/wishlist`
- `DELETE /api/users/wishlist`
- `DELETE /api/users/wishlist/:productId`

Discovery and product selection:

- `GET /api/app/home`
- `GET /api/shopping`
- `GET /api/shopping/home`
- `GET /api/shopping/categories`
- `GET /api/shopping/products`
- `GET /api/shopping/products/:slug`
- `GET /api/shopping/deals`
- `GET /api/shopping/trending`
- `GET /api/shopping/search`
- `GET /api/gifting`
- `GET /api/gifting/home`
- `GET /api/gifting/categories`
- `GET /api/gifting/products`
- `GET /api/gifting/products/:identifier`
- `GET /api/gifting/search`
- `GET /api/printing`
- `GET /api/printing/home`
- `GET /api/printing/document-types`
- `GET /api/printing/service-packages`
- `GET /api/printing/pickup-locations`
- `POST /api/printing/upload`
- `POST /api/printing/configure`
- `GET /api/printing/config/:id`
- `GET /api/business-printing`
- `GET /api/business-printing/home`
- `GET /api/business-printing/types`
- `GET /api/business-printing/products`
- `GET /api/business-printing/products/:id`
- `GET /api/business-printing/service-packages`
- `GET /api/business-printing/pickup-locations`
- `POST /api/business-printing/upload`
- `POST /api/business-printing/configure`
- `GET /api/business-printing/config/:id`
- `GET /api/products`
- `GET /api/products/slug/:slug`
- `GET /api/products/:id`
- `GET /api/vendor/stores/nearby`

Design and customization:

- `GET /api/designs/templates`
- `GET /api/designs/templates/premium`
- `GET /api/designs/product/:productId/frames`
- `POST /api/designs/blank`
- `POST /api/designs/from-template`
- `POST /api/designs`
- `GET /api/designs`
- `GET /api/designs/:id`
- `PUT /api/designs/:id`
- `PATCH /api/designs/:id/approve`

Cart, checkout, and orders:

- `GET /api/cart`
- `POST /api/cart/add`
- `DELETE /api/cart/:itemId`
- `GET /api/orders/cart`
- `POST /api/orders/cart`
- `PATCH /api/orders/cart/:itemId`
- `DELETE /api/orders/cart/:itemId`
- `DELETE /api/orders/cart/clear`
- `POST /api/orders/cart/apply-coupon`
- `GET /api/gifting/cart`
- `POST /api/gifting/cart/add`
- `DELETE /api/gifting/cart/:itemId`
- `POST /api/gifting/orders`
- `POST /api/shop/orders`
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/summary`
- `GET /api/orders/my-orders`
- `GET /api/orders/:id`
- `GET /api/orders/:id/edit-window`
- `PATCH /api/orders/:id/before-production`
- `POST /api/orders/:id/clarification/respond`
- `GET /api/orders/:id/track`
- `POST /api/orders/:id/reorder`

Payment, wallet, referrals:

- `POST /api/payments/create`
- `POST /api/payments/verify`
- `GET /api/wallet`
- `GET /api/wallet/overview`
- `GET /api/wallet/topup-config`
- `POST /api/wallet/topup-preview`
- `POST /api/wallet/add-funds`
- `POST /api/wallet/razorpay/initiate`
- `POST /api/wallet/razorpay/verify`
- `GET /api/wallet/ledger`
- `GET /api/referrals`
- `GET /api/referrals/summary`
- `POST /api/referrals/apply`

Notifications and support:

- `GET /api/notifications`
- `GET /api/notifications/summary`
- `PATCH /api/notifications/read-all`
- `PATCH /api/notifications/:id/read`
- `GET /api/notifications/help-center`
- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/summary`
- `GET /api/tickets/:id`
- `POST /api/tickets/:id/reply`

### Vendor Organization APIs

Authentication and session:

- `POST /api/vendor/auth/login`
- `POST /api/vendor/auth/mfa/verify`
- `POST /api/vendor/auth/logout`
- `GET /api/vendor/auth/session`

Organization and legal:

- `GET /api/vendor/org/profile`
- `PUT /api/vendor/org/profile`
- `GET /api/vendor/org/legal`
- `POST /api/vendor/org/legal`
- `GET /api/vendor/org/agreement`
- `GET /api/vendor/vendor-org/legal`
- `POST /api/vendor/vendor-org/legal`
- `GET /api/vendor/vendor-org/agreement`

Stores and capabilities:

- `GET /api/vendor/stores`
- `POST /api/vendor/stores`
- `GET /api/vendor/stores/:id`
- `PUT /api/vendor/stores/:id`
- `PATCH /api/vendor/stores/:id/status`
- `PUT /api/vendor/stores/:id/capacity`
- `PATCH /api/vendor/stores/:id/availability`
- `GET /api/vendor/stores/:id/capabilities`

Vendor staff:

- `GET /api/vendor/staff`
- `POST /api/vendor/staff`
- `PUT /api/vendor/staff/:id`
- `PATCH /api/vendor/staff/:id/assign-stores`
- `PATCH /api/vendor/staff/:id/status`

Vendor order operations:

- `GET /api/vendor/orders/assigned`
- `GET /api/vendor/orders/:order_id`
- `POST /api/vendor/orders/:order_id/accept`
- `POST /api/vendor/orders/:order_id/reject`
- `POST /api/vendor/orders/:order_id/status`
- `POST /api/vendor/orders/:order_id/qc-upload`
- `POST /api/vendor/orders/:order_id/ready`

Vendor analytics, finance, scoring, support:

- `GET /api/vendor/analytics/performance`
- `GET /api/vendor/finance/wallet/summary`
- `GET /api/vendor/wallet/summary`
- `GET /api/vendor/finance/wallet/store-wise`
- `GET /api/vendor/wallet/store-wise`
- `GET /api/vendor/finance/wallet/deductions`
- `GET /api/vendor/wallet/deductions`
- `GET /api/vendor/finance/closure/daily`
- `GET /api/vendor/closure/daily`
- `GET /api/vendor/finance/closure/weekly`
- `GET /api/vendor/closure/weekly`
- `GET /api/vendor/finance/closure/monthly`
- `GET /api/vendor/closure/monthly`
- `GET /api/vendor/finance/payouts/schedule`
- `GET /api/vendor/payouts/schedule`
- `GET /api/vendor/finance/payouts/history`
- `GET /api/vendor/payouts/history`
- `GET /api/vendor/scoring/rejections/history`
- `GET /api/vendor/rejections/history`
- `GET /api/vendor/scoring/performance-score`
- `GET /api/vendor/vendor/performance-score`
- `GET /api/vendor/performance-score`
- `GET /api/vendor/support/tickets`
- `POST /api/vendor/support/tickets`
- `GET /api/vendor/tickets`
- `POST /api/vendor/tickets`
- `GET /api/vendor/support/tickets/summary`
- `GET /api/vendor/tickets/summary`
- `GET /api/vendor/support/tickets/:ticket_id`
- `GET /api/vendor/tickets/:ticket_id`
- `POST /api/vendor/support/tickets/:ticket_id/reply`
- `POST /api/vendor/tickets/:ticket_id/reply`

### Delivery Partner APIs

Authentication and profile:

- `POST /api/delivery/auth/send-otp`
- `POST /api/delivery/auth/verify-otp`
- `GET /api/delivery/me/profile`
- `PATCH /api/delivery/me/profile`
- `GET /api/delivery/me/availability`
- `PATCH /api/delivery/me/availability`
- `POST /api/delivery/me/identity-verification`

Tasks and execution:

- `GET /api/delivery/tasks/available`
- `GET /api/delivery/tasks/current`
- `GET /api/delivery/tasks/mine`
- `POST /api/delivery/tasks/accept`
- `POST /api/delivery/tasks/:taskId/accept`
- `POST /api/delivery/tasks/:taskId/reject`
- `GET /api/delivery/tasks/:taskId`
- `POST /api/delivery/tasks/:taskId/arrived-pickup`
- `POST /api/delivery/tasks/:taskId/confirm-pickup`
- `POST /api/delivery/tasks/:taskId/location`
- `POST /api/delivery/tasks/:taskId/mark-delivered`
- `POST /api/delivery/tasks/:taskId/proof`
- `POST /api/delivery/tasks/:taskId/failure`
- `POST /api/delivery/tasks/:taskId/sos`
- `GET /api/delivery/track/:orderId`

Support and earnings:

- `POST /api/delivery/support/incident/uploads`
- `POST /api/delivery/support/incident`
- `GET /api/delivery/earnings/summary`

Internal:

- `POST /api/delivery/internal/tasks`

### Admin APIs

Platform and operations:

- `GET /api/admin/dashboard`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/reassign-vendor`
- `PATCH /api/admin/orders/:id/cancel`
- `PATCH /api/admin/orders/:id/refund`

Vendor and customer governance:

- `GET /api/admin/vendors`
- `POST /api/admin/vendors`
- `GET /api/admin/vendors/:id`
- `PATCH /api/admin/vendors/:id/suspend`
- `PATCH /api/admin/vendors/:id/priority`
- `GET /api/admin/customers`
- `GET /api/admin/customers/:id`
- `PATCH /api/admin/customers/:id/restrict`

Staff, control, and reports:

- `GET /api/admin/staff`
- `POST /api/admin/staff`
- `PATCH /api/admin/staff/:id/status`
- `DELETE /api/admin/staff/:id`
- `PATCH /api/admin/staff/:id/role`
- `GET /api/admin/control`
- `PATCH /api/admin/control/order-intake`
- `PATCH /api/admin/control/vendor-intake`
- `PATCH /api/admin/control/kill-switch`
- `PATCH /api/admin/control/city-pause`
- `PATCH /api/admin/control/feature-flags`
- `GET /api/admin/reports`
- `GET /api/admin/audit-logs`

SLA and support:

- `GET /api/admin/sla/risks`
- `GET /api/admin/sla/policies`
- `POST /api/admin/sla/policies`
- `GET /api/admin/sla/metrics`
- `GET /api/admin/sla/breaches`
- `POST /api/admin/sla/:orderId/escalate`
- `POST /api/admin/sla/:orderId/compensate`
- `GET /api/admin/tickets`
- `GET /api/admin/tickets/stats`
- `GET /api/admin/tickets/agents/performance`
- `GET /api/admin/tickets/:ticketId`
- `PATCH /api/admin/tickets/:ticketId/assign`
- `PATCH /api/admin/tickets/:ticketId/escalate`
- `PATCH /api/admin/tickets/:ticketId/resolve`
- `POST /api/admin/tickets/:ticketId/messages`
- `POST /api/admin/tickets/uploads/attachments`

Delivery ops, coupons, finance:

- `GET /api/admin/delivery/partners`
- `POST /api/admin/delivery/partners`
- `GET /api/admin/delivery/sla-metrics`
- `GET /api/admin/delivery/partners/:partnerId`
- `PUT /api/admin/delivery/partners/:partnerId`
- `DELETE /api/admin/delivery/partners/:partnerId`
- `PATCH /api/admin/delivery/partners/:partnerId/suspend`
- `PATCH /api/admin/delivery/partners/:partnerId/resume`
- `POST /api/admin/delivery/partners/:partnerId/zones`
- `PATCH /api/admin/delivery/partners/:partnerId/payout-rate`
- `GET /api/admin/delivery/partners/:partnerId/analytics`
- `GET /api/admin/coupons`
- `POST /api/admin/coupons`
- `PUT /api/admin/coupons/:id`
- `DELETE /api/admin/coupons/:id`
- `GET /api/admin/coupons/:id/usage`
- `GET /api/admin/finance/summary`
- `POST /api/admin/refunds/:orderId`

### Staff APIs

Staff auth and session:

- `POST /api/staff/auth/login`
- `POST /api/staff/auth/mfa/verify`
- `POST /api/staff/auth/logout`
- `GET /api/staff/auth/session`
- `GET /api/staff/auth/sessions`
- `DELETE /api/staff/auth/session/:id`

Dashboard, roles, tasks:

- `GET /api/staff/dashboard`
- `GET /api/staff/roles/:userId`
- `GET /api/staff/permissions/:role`
- `POST /api/staff/roles/assign`
- `GET /api/staff/tasks`
- `GET /api/staff/tasks/:id`
- `POST /api/staff/tasks/:id/complete`
- `POST /api/staff/tasks/:id/assign`

Order ops:

- `GET /api/staff/vendors`
- `GET /api/staff/orders`
- `GET /api/staff/orders/:id`
- `POST /api/staff/orders/:id/reassign-vendor`
- `POST /api/staff/orders/:id/clarification`

Support, refunds, wallets, campaigns, audit:

- `GET /api/staff/tickets`
- `GET /api/staff/tickets/:id`
- `POST /api/staff/tickets/:id/reply`
- `POST /api/staff/tickets/:id/close`
- `POST /api/staff/tickets/:id/escalate`
- `GET /api/staff/vendor-tickets`
- `POST /api/staff/vendor-tickets/:id/reply`
- `POST /api/staff/uploads/attachments`
- `GET /api/staff/refunds`
- `POST /api/staff/refunds/:id/approve`
- `POST /api/staff/refunds/:id/escalate`
- `POST /api/staff/wallet/credit`
- `POST /api/staff/wallet/debit`
- `GET /api/staff/wallet/ledger`
- `GET /api/staff/payouts`
- `POST /api/staff/payouts/issue-ticket`
- `GET /api/staff/campaigns`
- `POST /api/staff/coupons`
- `POST /api/staff/targeting`
- `GET /api/staff/analytics/reports`
- `POST /api/staff/escalation`
- `GET /api/staff/escalations`
- `GET /api/staff/audit/logs`
- `GET /api/staff/activity`
- `GET /api/staff/performance`
- `GET /api/staff/system/status`
- `GET /api/staff/permissions/check`
- `POST /api/staff/conflict/lock`

## PDF-to-Backend Assessment

### Customer

Strongly matched:

- Auth, OTP, profile, addresses
- Shopping, gifting, printing, business-printing discovery
- Product detail, price slabs, cart, checkout, order tracking
- Notifications, support tickets, wallet, referrals
- Saved designs, templates, reorder entry point

Partial:

- Bank-refund path is still not visible; current refund flow is wallet-oriented
- Inactivity / abandoned-checkout reminder automation is still not visible as a backend workflow

Missing:

- No additional customer-facing route gaps identified from the current PDF mapping

### Delivery Partner

Strongly matched:

- OTP login
- Identity verification
- Availability toggle
- Assigned/current task views
- Accept, reject, pickup, live location, proof, failure, SOS
- Incident reporting with upload
- Earnings summary
- Public tracking route by order

Partial:

- Support is incident-based; explicit “call/chat support” APIs are not visible
- Proof flow supports OTP/photo fields, but the PDF’s exact retry and mandatory-proof rules still need behavioral verification

Missing:

- No additional delivery route gaps identified from the current PDF mapping

### Vendor Organization

Strongly matched:

- Auth and session
- Org profile, legal docs, agreement views
- Multi-store CRUD
- Capacity and availability controls
- Store staff management
- Assigned order queue, accept/reject, production status, QC upload, ready handoff
- Performance, rejections, payouts, closure, wallet summaries
- Vendor support tickets

Partial:

- The PDF mentions “download files” in job detail; file references may be embedded in order payloads, but there is no clearly named vendor file-download endpoint

Missing:

- No additional vendor-facing route gaps identified from the current PDF mapping

### Admin

Strongly matched:

- Platform dashboard
- Orders, reassign, cancel, refund
- Vendor and customer governance
- Staff management
- Control switches and city pauses
- Reports, audit, SLA policies/metrics/breaches
- Ticket oversight
- Delivery partner administration
- Coupons
- Finance summary and refunds

Partial:

- Admin authentication/session control is not exposed as a dedicated admin auth module; it is handled through shared auth flows
- Export/report/invoice management appears implied in the plan, but the route surface does not expose a dedicated invoice export API

Missing:

- No clear admin session inventory/control API outside the generic/shared auth pattern
- No additional compliance-control route gaps identified from the current PDF mapping

### Staff

Important implementation note:

- The staff route surface is broad.
- The support and finance flows are fully backed by DB operations.
- Dashboard, campaigns, permissions, system status, and audit-style read endpoints now return real data instead of empty shells.

Staff APIs with real implementation observed:

- `POST /api/staff/auth/login`
- `POST /api/staff/auth/logout`
- `GET /api/staff/auth/session`
- `GET /api/staff/auth/sessions`
- `DELETE /api/staff/auth/session/:id`
- `GET /api/staff/vendors`
- `GET /api/staff/orders`
- `GET /api/staff/orders/:id`
- `POST /api/staff/orders/:id/reassign-vendor`
- `POST /api/staff/orders/:id/clarification`
- `GET /api/staff/tickets`
- `GET /api/staff/tickets/:id`
- `POST /api/staff/tickets/:id/reply`
- `POST /api/staff/tickets/:id/close`
- `POST /api/staff/tickets/:id/escalate`
- `GET /api/staff/vendor-tickets`
- `POST /api/staff/vendor-tickets/:id/reply`
- `POST /api/staff/uploads/attachments`
- `GET /api/staff/refunds`
- `POST /api/staff/refunds/:id/approve`
- `POST /api/staff/refunds/:id/escalate`
- `POST /api/staff/wallet/credit`
- `POST /api/staff/wallet/debit`
- `GET /api/staff/wallet/ledger`
- `GET /api/staff/payouts`
- `POST /api/staff/payouts/issue-ticket`

Staff APIs that still need deeper product-level behavior review:

- `POST /api/staff/auth/mfa/verify`
- `GET /api/staff/roles/:userId`
- `GET /api/staff/permissions/:role`
- `POST /api/staff/roles/assign`
- `GET /api/staff/tasks`
- `GET /api/staff/tasks/:id`
- `POST /api/staff/tasks/:id/complete`
- `POST /api/staff/tasks/:id/assign`
- `POST /api/staff/coupons`
- `POST /api/staff/targeting`
- `GET /api/staff/analytics/reports`
- `POST /api/staff/escalation`
- `GET /api/staff/escalations`
- `GET /api/staff/audit/logs`
- `GET /api/staff/activity`
- `GET /api/staff/performance`
- `GET /api/staff/permissions/check`
- `POST /api/staff/conflict/lock`

Assessment:

- Staff role design in the PDFs is now strongly implemented for support, refunds, wallet, payout handling, dashboard, and basic governance reads
- Route coverage exists for the broader role
- Functional depth still needs product validation for RBAC, task engine, marketing, and escalation workflows

## Highest-Risk Gaps Across All Roles

1. Refunds are still clearly wallet-oriented; bank-refund support is not visible.
2. Customer lifecycle automation for inactivity / abandoned checkout is not visible.
3. Admin session inventory/control is still not exposed as a dedicated module.
4. Some staff flows now return real data, but RBAC/task/governance behavior still needs product-level validation beyond route presence.
5. Vendor file-download semantics still depend on payload-embedded URLs rather than a dedicated endpoint.

## Recommended Backend Plan

### Phase 1: Close remaining customer/business-rule gaps

- Decide whether refunds must support wallet-only or wallet-plus-bank
- Decide whether inactivity / abandoned-checkout automation is required in backend scope

### Phase 2: Validate advanced operational workflows

- Validate staff RBAC/task/governance behavior with real seeded scenarios
- Validate vendor file-download expectations and add a dedicated endpoint only if payload URLs are insufficient

### Phase 3: Optional admin/platform additions

- Add dedicated admin session inventory/control if the product team needs it
- Add bank-refund support if finance policy requires it

## Bottom Line

The 3-service backend structure already covers most of the intended platform surface across customer, vendor, delivery, and admin roles.

The biggest mismatch is not the 3-service architecture itself. The biggest mismatch is feature depth in a few areas:

- refund mode variations
- lifecycle automation
- product-level validation of some staff governance flows

If these gaps are closed without changing the existing route families, the current backend can stay aligned with the PDF plans while preserving the consolidated 3-service deployment model.
