# Frontend Backend Change Handoff

This document is the frontend handoff for the latest backend completion pass.

Use it together with:

- [FRONTEND_IMPLEMENTATION_GUIDE.md](./FRONTEND_IMPLEMENTATION_GUIDE.md)
- [STAFF_FRONTEND_API_GUIDE.md](./STAFF_FRONTEND_API_GUIDE.md)
- [OVERALL_ROLE_API_PLAN.md](./OVERALL_ROLE_API_PLAN.md)

## Scope

This pass did not rename the main API families.

The backend work focused on:

- completing missing or partial role APIs
- filling real DB-backed behavior behind placeholder endpoints
- preserving existing route families so frontend changes stay small

## Runtime

Normal frontend target:

- gateway base URL: `http://localhost:4000`

Direct local service URLs for backend-only debugging:

- `http://localhost:4101`
- `http://localhost:4102`
- `http://localhost:4103`

Frontend should continue using the gateway in normal development.

## Backend Changes By Area

### Customer App

Completed:

- `GET /api/users/profile/privacy-status`
- `GET /api/users/profile/data-export`
- `POST /api/users/profile/account-deletion-confirm`
- `POST /api/tickets/uploads`
- `POST /api/notifications/tickets/uploads`
- `GET /api/orders/:id/invoice`
- `GET /api/orders/:id/invoice/download`

Important behavior:

- `GET /api/users/profile/data-export` returns a downloadable JSON export
- `POST /api/users/profile/account-deletion-confirm` now completes the deletion workflow if there are no active orders
- customer ticket attachments now support `multipart/form-data`
- reorder now validates design reuse more strictly

#### Customer Ticket Upload

Canonical frontend route:

- `POST /api/tickets/uploads`

Alternate route also supported:

- `POST /api/notifications/tickets/uploads`

Use:

- `multipart/form-data`
- field name: `attachments`
- max count: `10`

Response shape:

```json
{
  "success": true,
  "message": "Attachments uploaded",
  "data": {
    "attachments": [
      "http://localhost:4000/uploads/notifications/tickets/file-name.png"
    ]
  }
}
```

Then pass those returned URLs into:

- `POST /api/tickets`
- `POST /api/tickets/:id/reply`

Example body:

```json
{
  "subject": "Need help with design",
  "description": "Please check attached file",
  "attachments": [
    "http://localhost:4000/uploads/notifications/tickets/file-name.png"
  ]
}
```

#### Privacy Flow

Frontend flow should be:

1. `POST /api/users/profile/data-export-request`
2. `GET /api/users/profile/privacy-status`
3. `GET /api/users/profile/data-export`

And for deletion:

1. `POST /api/users/profile/account-deletion-request`
2. `GET /api/users/profile/privacy-status`
3. `POST /api/users/profile/account-deletion-confirm`

Current behavior notes:

- deletion is blocked if active orders still exist
- export is returned as JSON download

### Printing

Completed:

- `POST /api/printing/upload`
- `POST /api/printing/configure`
- `GET /api/printing/config/:id`
- `POST /api/designs/blank` now accepts `flowType = printing`
- `POST /api/designs` now accepts `flowType = printing`

Important behavior:

- uploaded printing files now return the original file URL and preview aliases
- uploaded PDF files now also return backend-derived `pages`
- service packages now include `eta`
- pickup location payloads now include `eta` and `estimated_ready_time`
- thesis binding now supports `thesisSpineText`
- `thesisSpineText` is required only when `bindingCover` is:
  - `silver_side_strip`
  - `black_gold_side_strip`
- saved print config responses now include `thesisSpineText`

#### Printing Upload Response

Frontend can continue using:

- `POST /api/printing/upload`

Use:

- `multipart/form-data`
- field name: `files`
- accepted types:
  - `pdf`
  - `doc`
  - `docx`
  - `jpg`
  - `jpeg`
  - `png`

Response shape now includes:

```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "files": [
      {
        "originalName": "thesis.pdf",
        "url": "http://localhost:4000/uploads/documents/file.pdf",
        "publicId": "file.pdf",
        "size": 12345,
        "pages": 8,
        "mimeType": "application/pdf",
        "previewImage": "http://localhost:4000/uploads/documents/file.pdf.preview.svg",
        "thumbnailUrl": "http://localhost:4000/uploads/documents/file.pdf.preview.svg",
        "firstPageImage": "http://localhost:4000/uploads/documents/file.pdf.preview.svg"
      }
    ]
  }
}
```

Frontend guidance:

- keep using `url` for the original downloadable file
- use `previewImage` as the primary preview field
- `thumbnailUrl` and `firstPageImage` are returned as compatibility aliases
- use `pages` when present instead of re-estimating PDF page count in the browser

#### Printing Canvas Support

Document-printing flows are no longer blocked at the backend when using the design service.

Allowed values now include:

- `flowType = printing`

This applies to:

- `POST /api/designs/blank`
- `POST /api/designs`
- `PUT /api/designs/:id`

#### Printing Service Package ETA

`GET /api/printing/service-packages` and `GET /api/business-printing/service-packages` now include:

```json
{
  "id": "express",
  "name": "Express",
  "price": 14.5,
  "eta": "Same day"
}
```

#### Pickup ETA

`GET /api/printing/pickup-locations` and `GET /api/business-printing/pickup-locations` now include:

```json
{
  "_id": "shop_id",
  "name": "SpeedCopy CP",
  "eta": "Ready in 2-4 hours",
  "estimated_ready_time": "Ready in 2-4 hours"
}
```

Frontend can optionally send `printType` in the pickup query so the backend can return a more accurate pickup ETA label.

#### Business Printing Upload

`POST /api/business-printing/upload` is available for ready-design uploads in business-printing flows.

Returned file items now include:

- `url`
- `pages`
- `previewImage`
- `thumbnailUrl`
- `firstPageImage`

#### Thesis Binding Save Rule

When frontend sends:

- `printType = thesis_binding`

and:

- `bindingCover = silver_side_strip`
- or `bindingCover = black_gold_side_strip`

then frontend must send:

- `thesisSpineText`

Example:

```json
{
  "printType": "thesis_binding",
  "bindingCover": "silver_side_strip",
  "cdRequired": "need",
  "thesisSpineText": "MTech Thesis 2026"
}
```

If `bindingCover` is `silver` or `black_gold`, `thesisSpineText` may be omitted or sent as an empty string.

#### Invoice

Available routes:

- `GET /api/orders/:id/invoice`
- `GET /api/orders/:id/invoice/download`

Usage:

- use `/invoice` when frontend wants structured invoice data
- use `/invoice/download` when frontend wants browser download behavior

#### Reorder Rule Change

Route stays the same:

- `POST /api/orders/:id/reorder`

New behavior:

- if an old order item references a `designId`, that design must belong to the same user and must already be approved/finalized
- unapproved design reuse now returns `400`

Frontend expectation:

- surface backend message clearly to the user if reorder is blocked

---

### Vendor Panel

Completed:

- `GET /api/vendor/dashboard`
- `GET /api/vendor/finance/wallet/deductions`
- `GET /api/vendor/finance/closure/daily`
- `GET /api/vendor/finance/closure/weekly`
- `GET /api/vendor/finance/closure/monthly`
- `GET /api/vendor/finance/payouts/schedule`
- `GET /api/vendor/finance/payouts/history`
- `POST /api/vendor/tickets/uploads`
- `POST /api/vendor/support/tickets/uploads`
- `PATCH /api/admin/vendors/:id/approve`
- `PATCH /api/admin/vendors/:id/reject`

#### Vendor Dashboard

Route:

- `GET /api/vendor/dashboard`

High-level response shape:

```json
{
  "success": true,
  "data": {
    "organization": {
      "businessName": "Vendor Name",
      "agreementStatus": "active",
      "legalVerified": true,
      "isApproved": true,
      "isSuspended": false,
      "healthScore": 91
    },
    "summary": {
      "totalStores": 3,
      "activeStores": 3,
      "availableStores": 2,
      "totalStaff": 8,
      "openCapacity": 41
    },
    "stores": [],
    "staff": []
  }
}
```

Frontend use:

- single-call dashboard summary for vendor home screen

#### Public Nearby Stores

Customer/client-facing route:

- `GET /api/vendor/stores/nearby?lat=<LAT>&lng=<LNG>&radius=10&limit=20`

Behavior:

- public route, no auth required
- returns only active and available stores from approved, non-suspended vendors
- backend now supports both:
  - newer stores with persisted GeoJSON `geo`
  - older stores that only have `location.lat` and `location.lng`

Frontend note:

- customer apps should use `/api/vendor/stores/nearby`
- vendor panel apps should use protected `/api/vendor/stores`

#### Vendor Ticket Upload

Canonical routes:

- `POST /api/vendor/tickets/uploads`
- `POST /api/vendor/support/tickets/uploads`

Use:

- `multipart/form-data`
- field name: `attachments`
- max count: `10`

Then pass returned attachment URLs into:

- `POST /api/vendor/tickets`
- `POST /api/vendor/tickets/:ticket_id/reply`

#### Admin Vendor Approval

Routes:

- `PATCH /api/admin/vendors/:id/approve`
- `PATCH /api/admin/vendors/:id/reject`

Optional request body:

```json
{
  "reason": "GST and onboarding documents verified"
}
```

Approve response shape:

```json
{
  "success": true,
  "message": "Vendor approved",
  "data": {
    "id": "vendor_id",
    "isApproved": true,
    "approvedAt": "2026-04-30T12:00:00.000Z"
  }
}
```

Reject response shape:

```json
{
  "success": true,
  "message": "Vendor rejected",
  "data": {
    "id": "vendor_id",
    "isApproved": false,
    "rejectedAt": "2026-04-30T12:00:00.000Z",
    "rejectionReason": "Documents incomplete"
  }
}
```

---

### Delivery Partner App

Completed:

- `GET /api/delivery/dashboard`
- `POST /api/delivery/auth/logout`

#### Delivery Dashboard

Route:

- `GET /api/delivery/dashboard`

High-level response includes:

- `profile`
- `availability`
- `currentTask`
- `availableTasks`
- `earnings`
- `taskSummary`
- `recentTasks`

Frontend use:

- single-call delivery home/dashboard screen

#### Delivery Logout

Route:

- `POST /api/delivery/auth/logout`

Behavior:

- backend marks rider unavailable
- returns logout confirmation payload

Frontend action:

- clear local auth/session state after success

---

### Admin Panel

Completed:

- `GET /api/admin/profile`
- `PATCH /api/admin/profile`
- `GET /api/admin/profiles`
- `POST /api/admin/profiles`
- `GET /api/admin/profiles/:id`
- `PATCH /api/admin/profiles/:id`
- `DELETE /api/admin/profiles/:id`
- `GET /api/admin/control/retention-policy`
- `PATCH /api/admin/control/retention-policy`

Use this for compliance/settings screens instead of treating retention policy as missing.

#### Admin Profile

Primary profile screen route:

- `GET /api/admin/profile`

Update current admin profile:

- `PATCH /api/admin/profile`

Admin management CRUD:

- `GET /api/admin/profiles`
- `POST /api/admin/profiles`
- `GET /api/admin/profiles/:id`
- `PATCH /api/admin/profiles/:id`
- `DELETE /api/admin/profiles/:id`

These endpoints read and update the existing admin auth records, so:

- login email stays the same source of truth
- role stays in the same user record
- `lastLogin` is shared with auth usage
- `team`, `permissions`, and `scopes` stay under `staffProfile`

Frontend profile field mapping:

- `fullName`
- `emailAddress`
- `phone`
- `role`
- `team`
- `memberSince`
- `lastLogin`
- `status`

Example response for `GET /api/admin/profile`:

```json
{
  "success": true,
  "data": {
    "id": "680f2b0b7c52d4dcbf1e1234",
    "fullName": "SpeedCopy Admin",
    "emailAddress": "admin@speedcopy.com",
    "phone": "+919999999999",
    "role": "admin",
    "team": "ops",
    "memberSince": "2026-04-23T00:00:00.000Z",
    "lastLogin": "2026-04-29T10:30:00.000Z",
    "status": "active",
    "permissions": [],
    "scopes": [],
    "mfaEnabled": true,
    "createdAt": "2026-04-23T00:00:00.000Z",
    "updatedAt": "2026-04-30T00:00:00.000Z"
  }
}
```

Example patch body for the current profile:

```json
{
  "fullName": "SpeedCopy Admin",
  "emailAddress": "admin@speedcopy.com",
  "phone": "+919999999999",
  "team": "ops"
}
```

Example create body for a new admin profile:

```json
{
  "fullName": "Operations Admin",
  "emailAddress": "ops-admin@speedcopy.com",
  "password": "TempPassword@123",
  "phone": "+919888888888",
  "role": "admin",
  "team": "ops",
  "permissions": [],
  "scopes": []
}
```

Example patch body:

```json
{
  "exportRetentionDays": 45,
  "auditLogRetentionDays": 200,
  "ticketRetentionDays": 365,
  "deleteBlockedWhenOrdersActive": true
}
```

---

### Staff Panel

Already completed in backend and still valid:

- sessions
- customer tickets
- vendor tickets
- refunds
- wallet credit/debit/ledger
- payouts issue flow

Newly improved:

- `GET /api/staff/profile`
- `PATCH /api/staff/profile`
- `GET /api/staff/profiles`
- `POST /api/staff/profiles`
- `GET /api/staff/profiles/:id`
- `PATCH /api/staff/profiles/:id`
- `DELETE /api/staff/profiles/:id`
- `GET /api/staff/dashboard`
- `GET /api/staff/campaigns`
- `GET /api/staff/system/status`

Important note:

- the detailed staff route contract is already documented in [STAFF_FRONTEND_API_GUIDE.md](./STAFF_FRONTEND_API_GUIDE.md)

#### Staff Profile

Self-profile routes for ops, support, finance, and marketing staff:

- `GET /api/staff/profile`
- `PATCH /api/staff/profile`

Admin-managed staff profile CRUD:

- `GET /api/staff/profiles`
- `POST /api/staff/profiles`
- `GET /api/staff/profiles/:id`
- `PATCH /api/staff/profiles/:id`
- `DELETE /api/staff/profiles/:id`

Primary response fields:

- `fullName`
- `emailAddress`
- `role`
- `roleLabel`
- `team`
- `accessLevel`
- `permissions`
- `memberSince`
- `lastLogin`
- `status`
- `mfaEnabled`

Example `GET /api/staff/profile` response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "staff_id",
    "fullName": "Ops Manager",
    "emailAddress": "ops@speedcopy.com",
    "role": "ops",
    "roleLabel": "Operations Staff",
    "team": "ops",
    "accessLevel": "Staff",
    "permissions": ["orders.view", "orders.assign"],
    "memberSince": "2026-04-01T00:00:00.000Z",
    "lastLogin": "2026-04-29T10:30:00.000Z",
    "status": "active",
    "mfaEnabled": true,
    "department": "operations",
    "manager": "ops-lead"
  }
}
```

Example self update body:

```json
{
  "fullName": "Ops Manager",
  "emailAddress": "ops@speedcopy.com",
  "mfaEnabled": true,
  "department": "operations",
  "manager": "ops-lead"
}
```

Example create body for staff CRUD:

```json
{
  "fullName": "Support Lead",
  "emailAddress": "support@speedcopy.com",
  "password": "support123456",
  "role": "support",
  "permissions": [],
  "mfaEnabled": true,
  "status": "active",
  "department": "support"
}
```

#### Staff Attachment Upload

Route:

- `POST /api/staff/uploads/attachments`

Use:

- `multipart/form-data`
- field name: `attachments`
- max count: `10`

---

## Upload Summary

These routes now support attachment upload:

- customer: `POST /api/tickets/uploads`
- customer alt: `POST /api/notifications/tickets/uploads`
- vendor: `POST /api/vendor/tickets/uploads`
- vendor alt: `POST /api/vendor/support/tickets/uploads`
- staff: `POST /api/staff/uploads/attachments`
- admin: `POST /api/admin/tickets/uploads/attachments`

All of them use:

- `multipart/form-data`
- field key: `attachments`

## Important Frontend Notes

### 1. Standard Response Envelope

Most APIs still return:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

### 2. Downloads

These routes return downloadable content instead of plain JSON pages:

- `GET /api/users/profile/data-export`
- `GET /api/orders/:id/invoice/download`

Frontend should handle them as file download endpoints.

### 3. Reorder Validation

Do not assume every delivered order can be reordered blindly anymore.

If backend returns `400` for reorder, show the backend message instead of replacing it with a generic error.

### 4. Gateway vs Direct Service

For frontend work:

- use gateway routes first

For backend-only local troubleshooting:

- direct service calls may be easier for isolated debugging

## What Was Changed In Backend

High-level backend change summary:

- added missing customer invoice and privacy-completion flows
- added customer and vendor ticket attachment upload APIs
- added vendor dashboard and real vendor finance summary endpoints
- added explicit admin vendor approve/reject endpoints
- added delivery dashboard and logout API
- added admin profile CRUD and current-profile endpoints
- added staff self-profile and staff profile CRUD endpoints
- added admin retention-policy routes
- replaced empty staff dashboard reads with real aggregated data
- tightened reorder logic around approved designs
- made reorder more resilient by not failing the whole request on delivery-task side effects

## Still Not Fully Covered

These are still product-policy items, not broken route work:

- bank-refund mode beyond wallet refund
- abandoned-cart / inactivity automation
- dedicated admin session inventory/control module
- dedicated vendor file-download endpoint if payload URLs are not enough

## Suggested Frontend Next Step

Frontend team should update the following screens first:

1. customer support ticket attachment flow
2. customer privacy/download flow
3. order invoice view/download
4. vendor dashboard and vendor finance screens
5. delivery dashboard/logout flow
6. admin profile screen and admin profile management
7. admin retention settings
8. staff profile screen and staff profile management
9. staff dashboard widgets
