# Staff Roles API Guide

This document is the backend contract for the Staff Portal.

It is organized by staff role:

- `ops`
- `support`
- `finance`
- `marketing`

Frontend should build role-specific screens from this file.

---

## Auth And Session

### Login Flow

1. Firebase login in frontend
2. Exchange Firebase token:
   - `POST /api/auth/verify`
3. Backend returns:
   - `token`
   - `user`
4. Use returned backend JWT for all staff API calls

### Staff User Shape

Backend now returns the real synced user object with:

- `role`
- `staffProfile.team`
- `staffProfile.permissions`
- `staffProfile.scopes`

---

## Common Staff APIs

These can be used across multiple staff roles depending on permissions.

- `GET /api/staff/dashboard?role=ops|support|finance|marketing`
- `GET /api/staff/tasks`
- `GET /api/staff/tasks/:id`
- `POST /api/staff/tasks/:id/complete`
- `GET /api/staff/profile`
- `PATCH /api/staff/profile`
- `GET /api/staff/auth/session`
- `GET /api/staff/activity`
- `GET /api/staff/performance`

### Admin-Assigned Ticket Rules

When admin assigns a support ticket to a staff member, backend now stores:

- `assignedTo`
- `assignedRole`
- `assignedTeam`
- `assignedAt`
- `assignedBy`

Frontend must use these queue rules:

- `support`
  - load assigned ticket work from `GET /api/staff/tickets`
  - load assigned vendor support work from `GET /api/staff/vendor-tickets`
  - load mixed assigned support work from `GET /api/staff/tasks`
- `finance`
  - assigned support/payment/refund-related ticket work can appear in `GET /api/staff/tasks`
  - finance-specific refund work still comes from `GET /api/staff/refunds`
- `marketing`
  - assigned ticket work can appear in `GET /api/staff/tasks`
- `ops`
  - ops can continue to use `GET /api/staff/tasks` and `GET /api/staff/orders`

If admin assigns a ticket to a non-support role, frontend should not assume it will appear only inside `/tickets`. For `finance` and `marketing`, the safest assigned-work source is `GET /api/staff/tasks`.

---

## Ops Staff

### Role Purpose

Ops staff handles order execution and vendor assignment.

### Main APIs

- `GET /api/staff/dashboard?role=ops`
- `GET /api/staff/tasks`
- `GET /api/staff/orders`
- `GET /api/staff/orders/:id`
- `GET /api/staff/vendors`
- `POST /api/staff/orders/:id/reassign-vendor`
- `POST /api/staff/orders/:id/clarification`

### Main Permissions

- `orders.view`
- `orders.assign`
- `orders.clarify`
- `tasks.view`
- `tasks.assign`
- `tickets.view`

### Frontend Notes

- Use `GET /api/staff/vendors` for vendor dropdowns during assignment/reassignment.
- Use `newVendorId` in `POST /api/staff/orders/:id/reassign-vendor`.
- Order queue includes real vendor display info where available.

---

## Support Staff

### Role Purpose

Support staff handles customer tickets, vendor tickets, and escalations.

### Main APIs

- `GET /api/staff/dashboard?role=support`
- `GET /api/staff/tasks`
- `GET /api/staff/tickets`
- `GET /api/staff/vendor-tickets`
- `POST /api/staff/tickets/:id/reply`
- `POST /api/staff/tickets/:id/close`
- `POST /api/staff/tickets/:id/escalate`
- `POST /api/staff/vendor-tickets/:id/reply`
- `POST /api/staff/vendor-tickets/:id/escalate`
- `POST /api/staff/uploads/attachments`

### Main Permissions

- `tickets.view`
- `tickets.reply`
- `tickets.close`
- `tickets.escalate`
- `tasks.view`

### Frontend Notes

- Customer tickets and vendor tickets should stay separate in UI.
- Delivery incidents may appear in task flow as `delivery_ticket`.
- Never expose vendor identity to customer-facing support screens.
- Admin-assigned support tickets should appear for support staff in:
  - `GET /api/staff/tickets`
  - `GET /api/staff/vendor-tickets`
  - `GET /api/staff/tasks`

---

## Finance Staff

### Role Purpose

Finance staff handles refunds, wallet actions, and payout support.

### Main APIs

- `GET /api/staff/dashboard?role=finance`
- `GET /api/staff/tasks`
- `GET /api/staff/refunds`
- `POST /api/staff/refunds/:id/approve`
- `POST /api/staff/refunds/:id/escalate`
- `POST /api/staff/wallet/credit`
- `POST /api/staff/wallet/debit`
- `GET /api/staff/wallet/ledger`
- `GET /api/staff/payouts`
- `POST /api/staff/payouts/issue-ticket`

### Main Permissions

- `tasks.view`
- `tickets.view`
- `tickets.reply`
- `tickets.close`
- `tickets.escalate`
- `refunds.view`
- `refunds.approve`
- `refunds.escalate`
- `wallet.credit`
- `wallet.debit`
- `wallet.view`
- `payouts.view`
- `payouts.issue_ticket`

### Frontend Notes

- Refund queue may be empty if no live refund records exist.
- Payout queue may be empty if no live payout records exist.
- Empty-state handling is required.
- If admin assigns a ticket to finance staff, frontend should load it from `GET /api/staff/tasks`.

---

## Marketing Staff

### Role Purpose

Marketing staff handles campaigns, coupon/growth work, and analytics support.

### Main APIs

- `GET /api/staff/dashboard?role=marketing`
- `GET /api/staff/tasks`
- `GET /api/staff/campaigns`
- `POST /api/staff/campaigns`
- `PATCH /api/staff/campaigns/:id`
- `GET /api/staff/analytics`

### Main Permissions

- `tasks.view`
- `tickets.view`
- `tickets.reply`
- `campaigns.view`
- `coupons.create`
- `targeting.create`
- `analytics.view`

### Frontend Notes

- Campaign and targeting screens should be separated from ops/finance/support modules.
- Marketing users should not see ops assignment actions by default.
- If admin assigns a ticket to marketing staff, frontend should load it from `GET /api/staff/tasks`.

---

## Staff Role Matrix

### Ops

- Can view orders
- Can assign vendors
- Can raise clarification
- Cannot process refunds
- Cannot manage campaigns

### Support

- Can view and reply to tickets
- Can escalate support issues
- Cannot assign vendors
- Cannot process payouts

### Finance

- Can view refunds and payouts
- Can do wallet actions
- Can receive assigned ticket work in task queue
- Cannot manage vendor assignment
- Cannot manage support closures unless separately granted

### Marketing

- Can manage campaigns/coupons/analytics
- Can receive assigned ticket work in task queue
- Cannot touch order operations
- Cannot process finance actions

---

## Important Integration Rules

1. Frontend must use backend JWT after `/api/auth/verify`
2. Do not use Firebase token directly for `/api/staff/*`
3. Role/team must come from backend user payload, not only local UI selection
4. Permissions now use backend-compatible names such as:
   - `orders.view`
   - `orders.assign`
   - `tickets.view`
   - `refunds.view`
   - `campaigns.view`

---

## Known Role Entry Routes

- `ops` -> `/ops/orders`
- `support` -> `/support/tickets`
- `finance` -> `/finance/refunds`
- `marketing` -> `/marketing/campaigns`

---

## Recommended Frontend Build Order

1. Ops
2. Support
3. Finance
4. Marketing

Ops and support are the most critical for live workflow testing.
