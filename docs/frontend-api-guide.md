# SpeedCopy Frontend API Guide

This guide maps frontend modules to backend APIs for:

- `admin`
- `staff`
- `vendor`
- `customer`
- `delivery partner`

Use this as the frontend integration source of truth.

## Conventions

- Base gateway prefixes:
  - `admin`: `/api/admin`
  - `staff`: `/api/staff`
  - `vendor`: `/api/vendor`
  - `customer auth/user`: `/api/auth`, `/api/users`
  - `customer orders`: `/api/orders`
  - `customer finance`: `/api/wallet`, `/api/referrals`
  - `customer tickets`: `/api/tickets`
  - `delivery`: `/api/delivery`
- Auth:
  - Most routes require Bearer JWT unless explicitly public or internal.
- Visibility rule:
  - Customer-facing UIs must never expose vendor/store/delivery internals.

---

## Admin

### Dashboard

- `GET /api/admin/dashboard`

### Orders

- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/reassign-vendor`
- `PATCH /api/admin/orders/:id/refund`

Frontend modules:

- order list
- order detail
- vendor reassignment
- refund control

### Vendors

- `GET /api/admin/vendors`
- `POST /api/admin/vendors`
- `GET /api/admin/vendors/:id`
- `PATCH /api/admin/vendors/:id/approve`
- `PATCH /api/admin/vendors/:id/reject`
- `PATCH /api/admin/vendors/:id/suspend`
- `PATCH /api/admin/vendors/:id/priority`

Frontend modules:

- vendor list
- vendor onboarding
- vendor approval/rejection
- vendor suspension
- vendor priority/routing control

### Customers

- `GET /api/admin/customers`
- `GET /api/admin/customers/:id`
- `PATCH /api/admin/customers/:id/restrict`

Frontend modules:

- customer list
- customer detail
- customer restriction/risk action

### Staff

- `GET /api/admin/staff`
- `POST /api/admin/staff`
- `PATCH /api/admin/staff/:id/role`
- `PATCH /api/admin/staff/:id/status`
- destructive delete routes are permission-restricted

Frontend modules:

- staff directory
- staff create
- role assignment
- activate/deactivate

### SLA And Escalation

- `GET /api/admin/sla/risks`
- `GET /api/admin/sla/policies`
- `POST /api/admin/sla/policies`
- `GET /api/admin/sla/metrics`
- `GET /api/admin/sla/breaches`
- `POST /api/admin/sla/:orderId/escalate`
- `POST /api/admin/sla/:orderId/compensate`

Frontend modules:

- SLA risk board
- policy management
- breach list
- escalation action
- compensation action

### Support

- `GET /api/admin/tickets`
- `GET /api/admin/tickets/stats`
- `GET /api/admin/tickets/agents/performance`
- `GET /api/admin/tickets/:ticketId`
- `PATCH /api/admin/tickets/:ticketId/assign`
- `PATCH /api/admin/tickets/:ticketId/escalate`
- `PATCH /api/admin/tickets/:ticketId/resolve`
- `POST /api/admin/tickets/:ticketId/messages`
- `POST /api/admin/tickets/uploads`

Frontend modules:

- support queue
- urgent tickets
- ticket detail
- assign to staff
- escalate
- resolve
- internal replies with attachments

### Delivery Oversight

- `GET /api/admin/delivery/partners`
- `GET /api/admin/delivery/partners/:id`
- `PATCH /api/admin/delivery/partners/:id/status`
- `GET /api/admin/delivery/sla-metrics`

Frontend modules:

- delivery partner operations
- delivery monitoring

### Control

- `PATCH /api/admin/control/order-intake`
- `PATCH /api/admin/control/vendor-intake`
- `PATCH /api/admin/control/kill-switch`
- `PATCH /api/admin/control/city-pause`
- `PATCH /api/admin/control/feature-flags`
- `GET /api/admin/control/retention-policy`
- `PATCH /api/admin/control/retention-policy`
- `GET /api/admin/control/compliance-summary`

Frontend modules:

- platform controls
- feature flags
- city pause
- compliance summary

### Reports

- `GET /api/admin/reports`
- `GET /api/admin/reports/referrals`
- `GET /api/admin/reports/export?type=orders|invoices|audit_logs|referrals&format=json|csv`
- `GET /api/admin/audit-logs`

Frontend modules:

- reports dashboard
- referral analytics
- CSV export
- audit log viewer

### Risk And Abuse

- `GET /api/admin/risk/cases`
- `GET /api/admin/risk/cases/summary`
- `GET /api/admin/risk/cases/:id`
- `POST /api/admin/risk/cases`
- `PATCH /api/admin/risk/cases/:id`
- `POST /api/admin/risk/cases/:id/actions`

Frontend modules:

- abuse/risk queue
- case detail
- investigation workflow
- action history

### Catalog And Media

- `POST /api/admin/catalog/uploads`
- `POST /api/admin/catalog/uploads/images`
- `POST /api/admin/shop/uploads`
- `POST /api/admin/gifting/uploads`
- `POST /api/admin/banners/uploads`
- `POST /api/admin/categories/uploads`
- `POST /api/products/categories/uploads`

Frontend modules:

- product image upload
- category image upload
- banner upload

---

## Staff

### Auth

- `POST /api/staff/auth/login`
- `POST /api/staff/auth/logout`

### Dashboard And Work Queue

- `GET /api/staff/dashboard`
- `GET /api/staff/tasks`
- `GET /api/staff/tasks/:id`
- `POST /api/staff/tasks/:id/complete`
- `POST /api/staff/tasks/:id/assign`

Frontend modules:

- staff dashboard
- assigned queue
- task detail
- task assignment
- task completion

### Orders Ops

- `GET /api/staff/vendors`
- `GET /api/staff/orders`
- `GET /api/staff/orders/:id`
- `POST /api/staff/orders/:id/reassign-vendor`
- `POST /api/staff/orders/:id/clarification`

Frontend modules:

- ops queue
- order detail
- vendor assignment
- clarification requests

### Customer Tickets

- `GET /api/staff/tickets`
- `GET /api/staff/tickets/:id`
- `POST /api/staff/tickets/:id/reply`
- `POST /api/staff/tickets/:id/close`
- `POST /api/staff/tickets/:id/escalate`
- `POST /api/staff/uploads/attachments`

Frontend modules:

- support ticket queue
- ticket detail
- reply
- close
- escalate
- attachment upload

### Vendor Tickets

- `GET /api/staff/vendor-tickets`
- `POST /api/staff/vendor-tickets/:id/reply`
- `POST /api/staff/vendor-tickets/:id/escalate`

Frontend modules:

- vendor support queue
- vendor support resolution

### Delivery Incidents In Staff Queue

- visible through `GET /api/staff/tasks`

Frontend note:

- support queue should handle `delivery_ticket` task type

### Refunds

- `GET /api/staff/refunds`
- `POST /api/staff/refunds/:id/approve`
- `POST /api/staff/refunds/:id/escalate`

Frontend modules:

- refunds review
- refund approval
- refund escalation

### Wallet

- `POST /api/staff/wallet/credit`
- `POST /api/staff/wallet/debit`
- `GET /api/staff/wallet/ledger`

Frontend modules:

- wallet adjustment
- ledger viewer

### Payouts

- `GET /api/staff/payouts`
- `POST /api/staff/payouts/issue-ticket`

Frontend modules:

- vendor payouts review
- payout issue ticket

### Marketing

- `GET /api/staff/campaigns`
- `POST /api/staff/coupons`

Frontend modules:

- campaigns
- coupon creation

### Escalation And Audit

- `POST /api/staff/escalation`
- `GET /api/staff/escalations`
- `GET /api/staff/audit/logs`
- `GET /api/staff/activity`
- `GET /api/staff/performance`

Frontend modules:

- escalations
- audit logs
- activity feed
- staff performance

---

## Vendor

### Auth

- `POST /api/vendor/auth/login`
- `POST /api/vendor/auth/logout`
- `GET /api/vendor/auth/session`

### Org Overview

- `GET /api/vendor/dashboard`
- `GET /api/vendor/profile`
- `PATCH /api/vendor/profile`

Frontend modules:

- vendor dashboard
- org profile

### Stores

- `GET /api/vendor/stores`
- `POST /api/vendor/stores`
- `GET /api/vendor/stores/:id`
- `PATCH /api/vendor/stores/:id`
- `PATCH /api/vendor/stores/:id/status`
- `PATCH /api/vendor/stores/:id/capacity`
- `PATCH /api/vendor/stores/:id/availability`

Frontend modules:

- store list
- create store
- update store
- capacity setup
- availability setup

### Staff

- `GET /api/vendor/staff`
- `POST /api/vendor/staff`
- `PATCH /api/vendor/staff/:id`
- `PATCH /api/vendor/staff/:id/status`
- `PATCH /api/vendor/staff/:id/assign-store`

Frontend modules:

- vendor staff list
- staff creation
- role assignment
- store assignment

### Orders

- `GET /api/vendor/orders/queue`
- `GET /api/vendor/orders/assigned`
- `GET /api/vendor/orders/:id`
- `POST /api/vendor/orders/:id/accept`
- `POST /api/vendor/orders/:id/reject`
- `PATCH /api/vendor/orders/:id/start-production`
- `PATCH /api/vendor/orders/:id/qc-pending`
- `POST /api/vendor/orders/:id/qc-upload`
- `PATCH /api/vendor/orders/:id/ready-for-pickup`
- `POST /api/vendor/orders/:id/ready`
- `POST /api/vendor/orders/:id/handover-complete`

Frontend modules:

- order queue
- order detail
- accept / reject
- start production
- QC
- ready for pickup
- vendor handover to rider

Important lifecycle:

1. `assigned_vendor`
2. `vendor_accepted`
3. `in_production`
4. `qc_pending`
5. `ready_for_pickup`
6. `handover completed`

### Finance

- `GET /api/vendor/finance/wallet/summary`
- `GET /api/vendor/finance/wallet/store-wise`
- `GET /api/vendor/finance/deductions`
- `GET /api/vendor/finance/closure/daily`
- `GET /api/vendor/finance/closure/weekly`
- `GET /api/vendor/finance/closure/monthly`
- `GET /api/vendor/finance/payouts/schedule`
- `GET /api/vendor/finance/payouts/history`

Frontend modules:

- wallet summary
- store-wise earnings
- deductions
- daily/weekly/monthly closure
- payouts

### Performance

- `GET /api/vendor/analytics/performance`
- `GET /api/vendor/scoring/performance-score`
- `GET /api/vendor/scoring/rejections/history`

Frontend modules:

- performance dashboard
- rejection history

### Support

- `GET /api/vendor/support/tickets`
- `GET /api/vendor/support/tickets/:ticket_id`
- `GET /api/vendor/support/tickets/summary`
- `POST /api/vendor/support/tickets`
- `POST /api/vendor/support/tickets/:ticket_id/reply`
- `POST /api/vendor/support/tickets/uploads`

Frontend modules:

- support queue
- create vendor ticket
- reply with attachments

### Legal

- `POST /api/vendor/legal/upload`

Frontend modules:

- legal docs upload

---

## Customer

### Auth And Account

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `GET /api/auth/me`
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `POST /api/users/profile/avatar`
- `PATCH /api/users/profile/notifications`

Frontend modules:

- login
- profile
- avatar upload
- notification settings

### Privacy And Exit

- `GET /api/users/profile/privacy-status`
- `POST /api/users/profile/data-export-request`
- `GET /api/users/profile/data-export`
- `POST /api/users/profile/account-deletion-request`
- `POST /api/users/profile/account-deletion-confirm`

Frontend modules:

- privacy center
- data export
- account deletion

### Addresses

- `GET /api/users/addresses`
- `POST /api/users/addresses`
- `PUT /api/users/addresses/:id`
- `PATCH /api/users/addresses/:id/location`
- `DELETE /api/users/addresses/:id`

Frontend modules:

- address book
- address add/edit/delete

### Wishlist

- `GET /api/users/wishlist`
- `POST /api/users/wishlist`
- `DELETE /api/users/wishlist/:productId`
- `DELETE /api/users/wishlist`

Frontend modules:

- wishlist

### Orders

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/summary`
- `GET /api/orders/:id`
- `GET /api/orders/:id/track`
- `GET /api/orders/:id/edit-window`
- `PATCH /api/orders/:id/before-production`
- `POST /api/orders/:id/clarification/respond`
- `POST /api/orders/:id/reorder`
- `GET /api/orders/:id/invoice`
- `GET /api/orders/:id/invoice/download`

Frontend modules:

- checkout
- order history
- order detail
- live tracking
- edit window
- clarification response
- reorder
- invoice

Visibility rule:

- show only `customerFacingStatus`
- never show `vendorId`, `storeId`, internal staffing, or delivery internals

### Wallet And Referrals

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

Frontend modules:

- wallet
- top-up
- ledger
- referrals

### Support

- `GET /api/tickets`
- `GET /api/tickets/:id`
- `GET /api/tickets/summary`
- `GET /api/tickets/help-center`
- `POST /api/tickets`
- `POST /api/tickets/:id/reply`
- `POST /api/tickets/uploads`

Frontend modules:

- help center
- support tickets
- ticket detail
- reply with attachments

### Product Discovery And Customization

This is spread across product/order/design services.

Frontend teams should validate product-specific browsing and configuration against:

- shopping product APIs
- gifting product APIs
- printing config APIs
- design save/finalize APIs

This part should be verified module-by-module with the product/design frontend.

---

## Delivery Partner

### Auth

- `POST /api/delivery/auth/send-otp`
- `POST /api/delivery/auth/verify-otp`
- `POST /api/delivery/auth/logout`

### Dashboard And Profile

- `GET /api/delivery/dashboard`
- `GET /api/delivery/me/profile`
- `PATCH /api/delivery/me/profile`

Frontend modules:

- dashboard
- profile

### Availability

- `GET /api/delivery/me/availability`
- `PATCH /api/delivery/me/availability`

Frontend modules:

- availability toggle

### Identity Verification

- `POST /api/delivery/me/identity-verification`

Frontend modules:

- KYC / identity verification

### Tasks

- `GET /api/delivery/tasks/available`
- `GET /api/delivery/tasks/current`
- `GET /api/delivery/tasks/mine`
- `GET /api/delivery/tasks/:taskId`
- `POST /api/delivery/tasks/accept`
- `POST /api/delivery/tasks/:taskId/accept`
- `POST /api/delivery/tasks/:taskId/reject`
- `POST /api/delivery/tasks/:taskId/arrived-pickup`
- `POST /api/delivery/tasks/:taskId/confirm-pickup`
- `POST /api/delivery/tasks/:taskId/location`
- `POST /api/delivery/tasks/:taskId/mark-delivered`
- `POST /api/delivery/tasks/:taskId/proof`
- `POST /api/delivery/tasks/:taskId/failure`
- `POST /api/delivery/tasks/:taskId/sos`

Frontend modules:

- available jobs
- active task
- pickup
- in transit
- delivery completion
- proof capture
- failure / SOS

### Tracking

- `GET /api/delivery/track/:orderId`

Frontend modules:

- public/live delivery tracking

### Support

- `POST /api/delivery/support/incident/uploads`
- `POST /api/delivery/support/incident`

Frontend modules:

- rider support incident
- rider photo evidence

### Earnings

- `GET /api/delivery/earnings/summary`

Frontend modules:

- earnings summary

---

## Frontend Integration Rules

### Customer Apps

- Must use only customer-safe order fields.
- Must never display vendor/store/staff/delivery internals.
- Prefer `customerFacingStatus` over raw internal `status`.

### Vendor Apps

- Must follow role/permission-based rendering:
  - `owner`
  - `manager`
  - `operator`
  - `qc`
- Handover should be shown only after order is `ready_for_pickup`.

### Staff Apps

- Support role should consume:
  - `customer_ticket`
  - `vendor_ticket`
  - `delivery_ticket`
- Finance role should consume:
  - refunds
  - wallet
  - payouts
- Ops role should consume:
  - orders
  - reassignment
  - clarification

### Admin Apps

- Show destructive actions only when the logged-in admin has permission.
- `super_admin` only:
  - kill switch
  - city pause
  - feature flags
  - destructive high-risk deletes

---

## Recommended QA Order

1. `staff assigns vendor -> vendor queue receives order`
2. `vendor accepts -> production -> qc -> ready -> handover`
3. `delivery assigned -> pickup -> in transit -> proof -> delivered`
4. `customer track order without vendor visibility`
5. `admin assigns ticket -> staff sees assigned ticket`
6. `customer ticket attachments visible to admin/staff only`
7. `vendor ticket attachments visible to admin/staff/vendor only`
8. `customer data export`
9. `customer account deletion`
10. `admin risk case workflow`

