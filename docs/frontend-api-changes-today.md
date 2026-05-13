# SpeedCopy Backend API Changes For Frontend

This document lists the APIs that were:

- newly added
- corrected
- behavior-changed

Frontend teams should use this as the short integration update for the latest backend pass.

---

## Admin

### New APIs

- `GET /api/admin/reports/referrals`
  - New referral analytics endpoint for admin reporting.

- `GET /api/admin/reports/export?type=orders|invoices|audit_logs|referrals&format=json|csv`
  - New admin export endpoint.
  - Use this for report downloads and CSV export.

- `GET /api/admin/control/compliance-summary`
  - New compliance/platform-control summary endpoint.

- `GET /api/admin/risk/cases`
  - New risk/abuse case list.

- `GET /api/admin/risk/cases/summary`
  - New risk summary endpoint.

- `GET /api/admin/risk/cases/:id`
  - New risk case detail endpoint.

- `POST /api/admin/risk/cases`
  - New create risk/abuse case endpoint.

- `PATCH /api/admin/risk/cases/:id`
  - New update risk/abuse case endpoint.

- `POST /api/admin/risk/cases/:id/actions`
  - New action-history endpoint for risk/abuse cases.

### Existing APIs Corrected / Improved

- `PATCH /api/admin/vendors/:id/approve`
  - Backward compatibility added.
  - If older frontend sends `{ approved: false }` to the approve endpoint, backend now treats it as a reject action.
  - Preferred route is still:
    - `PATCH /api/admin/vendors/:id/reject`

- `GET /api/admin/staff`
  - Response now returns frontend-friendly role labels again:
    - `Operations`
    - `Support`
    - `Finance`
    - `Marketing`
    - `Admin`
    - `SuperAdmin`
  - Backend still stores canonical auth roles internally.

- `GET /api/admin/staff/options`
  - New helper endpoint for admin staff-create forms.
  - Returns supported:
    - teams
    - role labels
    - permission options
    - scope options

- `POST /api/admin/staff`
- `PATCH /api/admin/staff/:id/role`
  - Backend now normalizes older frontend role/permission formats.
  - Examples supported:
    - `Operations` -> internal `staff + ops team`
    - `orders:read` -> `orders.view`
    - `vendors:write` -> `vendors.manage`

- `GET /api/admin/control`
  - Platform control state is richer now.
  - Returns:
    - `pausedCities`
    - `pausedCityDetails`
    - `featureFlags`
    - `retentionPolicy`
    - `metrics`

- `PATCH /api/admin/control/city-pause`
  - Real pause reason/details are now preserved.
  - Body can include:
    - `city`
    - `paused`
    - `reason`

- `PATCH /api/admin/control/feature-flags`
- `PATCH /api/admin/control/city-pause`
- `PATCH /api/admin/control/kill-switch`
  - Permission compatibility improved for older admin tokens/claims.

- `DELETE /api/admin/delivery/partners/:partnerId`
  - Delivery partner delete is now allowed for delivery-manage admins instead of being blocked only by super-admin middleware.
  - Backend behavior is soft-delete/deactivate.

- `GET /api/admin/reports`
  - Reports payload now also includes:
    - `summary`
    - `revenueByStore`

- `GET /api/admin/reports/export?type=revenue|orders|orders_report|invoices|audit|audit_logs|referrals&format=json|csv|excel|xlsx|pdf`
  - Export API expanded.
  - Invoice export now supports a simple backend PDF response.
  - Excel/xlsx requests currently return CSV content for compatibility.

- `GET /api/admin/tickets`
  - Admin continues to see customer/vendor tickets and their attachments.

- `PATCH /api/admin/tickets/:ticketId/assign`
  - Assignment now properly reaches staff from backend side:
    - saves `assignedTo`
    - creates internal notification
    - staff queue can resolve assigned tickets correctly

### Existing Upload APIs Added Earlier In This Pass

- `POST /api/admin/catalog/uploads`
- `POST /api/admin/catalog/uploads/images`
- `POST /api/admin/shop/uploads`
- `POST /api/admin/gifting/uploads`
- `POST /api/admin/banners/uploads`
- `POST /api/admin/categories/uploads`
- `POST /api/products/categories/uploads`

Use these for admin-side image uploads for:

- products
- categories
- gifting
- banners

---

## Staff

### New / Updated Auth Behavior

- `POST /api/auth/verify`
  - Staff Firebase token exchange now returns:
    - `token`
    - `user`
  - Frontend should store and use the returned backend JWT for all `/api/staff/*` calls.
  - Staff user payload now carries the real backend team/permission shape instead of requiring frontend fallback guesses.

### Existing APIs Corrected / Improved

- Staff permission defaults from auth-service are now aligned to the real staff backend contract.
  - Example:
    - `orders.view`
    - `orders.assign`
    - `tickets.view`
    - `refunds.view`
    - `campaigns.view`

- `GET /api/staff/tasks`
  - Now includes delivery incidents as `delivery_ticket`.
  - Support frontend should handle:
    - `customer_ticket`
    - `vendor_ticket`
    - `delivery_ticket`

- `GET /api/staff/tasks/:id`
  - Now returns `delivery_ticket` task type correctly for delivery incidents.

- `GET /api/staff/tickets`
  - Support staff queue is correctly scoped to assigned staff when applicable.

- `GET /api/staff/vendor-tickets`
  - Vendor support flow is now connected to the real backend support data.

- `POST /api/staff/vendor-tickets/:id/escalate`
  - Real escalation route exists and is connected.

- `POST /api/staff/tickets/:id/reply`
- `POST /api/staff/vendor-tickets/:id/reply`
  - Ticket reply flows are connected to the stored ticket records.

- `POST /api/staff/uploads/attachments`
  - Attachment upload now returns usable URLs for frontend use.

- `GET /api/staff/refunds`
- `GET /api/staff/wallet/ledger`
- `GET /api/staff/payouts`
  - These finance flows now match real backend response shapes better than before.

### Existing APIs Added Earlier In This Pass

- `POST /api/staff/orders/:id/reassign-vendor`
  - Vendor reassignment now normalizes vendor identity correctly.

- `GET /api/staff/vendors`
  - Assignable vendors endpoint aligned for reassignment flow.

### New Documentation

- See [staff-roles-api-guide.md](</s:/My Codes/speedcopy-new/docs/staff-roles-api-guide.md:1>)
  - Separate role-by-role staff API guide for:
    - ops
    - support
    - finance
    - marketing

---

## Vendor

### New APIs

- `POST /api/vendor/orders/:order_id/handover-complete`
  - New explicit handover step.
  - Use this after vendor marks order ready and physically hands the package to rider.
  - Body can include:
    - `riderId`
    - `note`

### Existing APIs Corrected / Improved

- `GET /api/vendor/orders/queue`
- `GET /api/vendor/orders/assigned`
- `GET /api/vendor/orders/:id`
  - Vendor queue/order access is now aligned with vendor identity aliases so assigned orders are more likely to appear correctly.

- `POST /api/vendor/orders/:id/accept`
- `POST /api/vendor/orders/:id/reject`
- `PATCH /api/vendor/orders/:id/start-production`
- `PATCH /api/vendor/orders/:id/qc-pending`
- `PATCH /api/vendor/orders/:id/ready-for-pickup`
- `POST /api/vendor/orders/:id/ready`
  - These lifecycle transitions are connected to the real order-service flow.

- `POST /api/vendor/orders/:id/qc-upload`
  - QC evidence upload flow is connected.

- `GET /api/vendor/finance/wallet/summary`
- `GET /api/vendor/finance/wallet/store-wise`
- `GET /api/vendor/finance/closure/daily`
- `GET /api/vendor/finance/closure/weekly`
- `GET /api/vendor/finance/closure/monthly`
- `GET /api/vendor/finance/payouts/schedule`
- `GET /api/vendor/finance/payouts/history`
  - Finance/closure/payout APIs are aligned better with vendor identity aliases.

- `GET /api/vendor/analytics/performance`
- `GET /api/vendor/scoring/performance-score`
- `GET /api/vendor/scoring/rejections/history`
  - Performance review APIs are present and connected.

- `GET /api/vendor/support/tickets`
- `POST /api/vendor/support/tickets`
- `POST /api/vendor/support/tickets/:ticket_id/reply`
  - Vendor support ticket flows now accept and preserve attachments properly.

---

## Customer

### Existing APIs Corrected / Improved

- `GET /api/orders`
- `GET /api/orders/:id`
- `GET /api/orders/:id/track`
  - Customer payloads remain customer-safe.
  - Vendor/store internal identities are not exposed in customer order responses.

- `GET /api/orders/:id/edit-window`
- `POST /api/orders/:id/clarification/respond`
- `POST /api/orders/:id/reorder`
  - These lifecycle APIs are available for edit/clarification/reorder flows.

- `GET /api/orders/:id/invoice`
- `GET /api/orders/:id/invoice/download`
  - Invoice endpoints are available for frontend consumption.

### Privacy / Exit APIs Corrected Or Expanded

- `GET /api/users/profile/data-export`
  - Expanded significantly.
  - Now includes:
    - profile
    - addresses
    - orders
    - wallet
    - ledger
    - referrals
    - tickets
    - designs
    - payments

- `POST /api/users/profile/account-deletion-confirm`
  - Corrected behavior.
  - It now deactivates the actual auth account, not only anonymizes profile data.

### Support APIs Corrected

- `POST /api/tickets`
- `POST /api/tickets/:id/reply`
  - Customer ticket create/reply now support real attachments on the main endpoints.

Frontend note:

- Customer UI must still display only SpeedCopy-facing statuses and never expose vendor/store identities.

---

## Delivery Partner

### Delivery Partner App Integration

Use this section for the delivery partner app only.

### Auth APIs

- `POST /api/delivery/auth/send-otp`
  - Start rider login by sending OTP.

- `POST /api/delivery/auth/verify-otp`
  - Verify OTP and receive rider session/JWT.

- `POST /api/delivery/auth/logout`
  - Logout current rider.

### Dashboard / Profile APIs

- `GET /api/delivery/dashboard`
  - Delivery home/dashboard summary.

- `GET /api/delivery/me/profile`
  - Current rider profile.

- `PATCH /api/delivery/me/profile`
  - Update editable profile fields.

- `GET /api/delivery/me/availability`
  - Read current availability state.

- `PATCH /api/delivery/me/availability`
  - Toggle rider availability on/off.

- `POST /api/delivery/me/identity-verification`
  - Submit rider verification details if app supports onboarding/compliance flow.

- `GET /api/delivery/earnings/summary`
  - Earnings summary card data.

### Task Queue APIs

- `GET /api/delivery/tasks/available`
  - Available delivery jobs.

- `GET /api/delivery/tasks/current`
  - Current active delivery task.

- `GET /api/delivery/tasks/mine`
  - Task history / rider task list.

- `GET /api/delivery/tasks/:taskId`
  - Single task detail.

### Task Lifecycle APIs

- `POST /api/delivery/tasks/:taskId/accept`
  - Delivery assignment now syncs back to order lifecycle more accurately.

- `POST /api/delivery/tasks/:taskId/reject`
  - Reject assigned delivery task.

- `POST /api/delivery/tasks/:taskId/arrived-pickup`
- `POST /api/delivery/tasks/:taskId/confirm-pickup`
- `POST /api/delivery/tasks/:taskId/location`
- `POST /api/delivery/tasks/:taskId/mark-delivered`
- `POST /api/delivery/tasks/:taskId/proof`
  - Delivery state syncing to orders is improved:
    - rider assignment maps to `delivery_assigned`
    - route movement maps to `out_for_delivery`
    - delivered maps to `delivered`

- `POST /api/delivery/tasks/:taskId/failure`
  - Mark failed attempt / unsuccessful delivery.

- `POST /api/delivery/tasks/:taskId/sos`
  - Emergency/SOS flow.

### Support / Incident APIs

- `POST /api/delivery/support/incident/uploads`
- `POST /api/delivery/support/incident`
  - Delivery incident support is connected to backend support handling.
  - Staff task queue can now see these as `delivery_ticket`.

### Tracking API

- `GET /api/delivery/track/:orderId`
  - Public tracking endpoint for order-linked delivery state.

### Frontend Notes

- Delivery app should treat the main lifecycle as:
  - availability on
  - available task list
  - accept
  - arrived at pickup
  - confirm pickup
  - location updates while in transit
  - proof
  - delivered

- `POST /api/delivery/tasks/:taskId/location` should be called periodically during transit if live tracking is enabled.

- After `accept`, backend order state should align with `delivery_assigned`.

- After pickup/movement, backend order state should align with `out_for_delivery`.

- After proof + delivery completion, backend order state should align with `delivered`.

- Incident uploads should send files using the `photos` field.

- Delivery incident create should pass the URLs returned by `/support/incident/uploads`.

- Delivery support incidents are now visible to staff support/backend task flow as `delivery_ticket`.

---

## Important Frontend Action Items

### Vendor Frontend

Implement this new step in vendor lifecycle:

1. `ready_for_pickup`
2. `handover-complete`
3. rider continues delivery

New API to call:

- `POST /api/vendor/orders/:order_id/handover-complete`

### Staff Frontend

Update task rendering to support:

- `delivery_ticket`

### Admin Frontend

New screens can now be connected:

- referral reporting
- report export
- compliance summary
- risk / abuse case management

### Customer Frontend

Update privacy/data export UI because export payload is now larger.

### Delivery Frontend

Delivery status UI can now rely more safely on:

- `delivery_assigned`
- `out_for_delivery`
- `delivered`

---

## Recommended Frontend Testing Order

1. Staff assigns vendor to order
2. Vendor receives order in queue
3. Vendor accepts -> production -> qc -> ready
4. Vendor calls `handover-complete`
5. Delivery partner accepts task
6. Delivery moves to transit and delivery proof
7. Customer sees tracking without vendor visibility
8. Customer ticket with attachment
9. Vendor ticket with attachment
10. Admin assigns ticket to staff
11. Customer data export
12. Customer account deletion confirm
13. Admin risk case workflow
14. Admin CSV export
