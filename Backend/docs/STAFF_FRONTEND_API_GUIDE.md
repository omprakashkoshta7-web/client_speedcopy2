# Staff Frontend API Guide

This document covers the staff APIs implemented for the frontend dashboard in the consolidated 3-service backend.

## Base URL

- Gateway: `http://localhost:4000/api/staff`
- Direct service in local dev: `http://localhost:4101/api/staff`

Frontend should normally call the gateway path. Direct service URLs are only for local backend testing.

## Auth Context

In production, staff routes should come through the normal auth/gateway flow.

In local backend-only testing, these routes currently read staff context from request headers:

- `x-user-id`
- `x-user-role`
- `x-user-email`

Example local headers:

```http
x-user-id: staff_123
x-user-role: staff
x-user-email: ops@speedcopy.test
```

## Response Envelope

All routes use the standard backend envelope:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Sessions

### `GET /api/staff/auth/sessions`

Returns the active sessions visible for the current staff user.

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "session_abc123",
      "device": "Chrome on Windows",
      "ip": "192.168.1.1",
      "location": "Delhi, India",
      "lastActive": "2026-04-29T10:30:00.000Z",
      "createdAt": "2026-04-29T08:00:00.000Z",
      "current": true
    }
  ]
}
```

### `DELETE /api/staff/auth/session/:id`

Kills a specific session owned by the current staff user.

```json
{
  "success": true,
  "message": "Session killed",
  "data": null
}
```

## Customer Tickets

### `GET /api/staff/tickets`

Supported query params:

- `page`
- `limit`
- `status`
- `priority`
- `assignedTo`
- `search`

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "tickets": [
      {
        "_id": "ticket_id_here",
        "subject": "Order not delivered",
        "description": "My order was supposed to arrive yesterday",
        "category": "order_issue",
        "status": "open",
        "priority": "high",
        "orderId": "order_id_here",
        "userId": "user_id_here",
        "assignedTo": "staff_id_here",
        "replies": [
          {
            "authorId": "staff_id",
            "authorRole": "staff",
            "message": "We are looking into this",
            "attachments": [],
            "createdAt": "2026-04-29T10:00:00.000Z"
          }
        ],
        "createdAt": "2026-04-28T09:00:00.000Z",
        "updatedAt": "2026-04-29T10:00:00.000Z",
        "resolvedAt": null
      }
    ],
    "meta": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### `GET /api/staff/tickets/:id`

Returns the ticket detail using the same ticket shape.

### `POST /api/staff/tickets/:id/reply`

Request:

```json
{
  "message": "We have resolved your issue",
  "attachments": []
}
```

Behavior:

- pushes a staff reply into `replies`
- sets `status` to `in_progress`
- sets `assignedTo` to the acting staff user

### `POST /api/staff/tickets/:id/close`

Behavior:

- sets `status` to `resolved`
- sets `resolvedAt`

### `POST /api/staff/tickets/:id/escalate`

Request:

```json
{
  "reason": "Customer is very upset, needs senior attention"
}
```

Behavior:

- sets `status` to `in_progress`
- sets `priority` to `urgent`
- appends the escalation reason as a reply

## Vendor Tickets

### `GET /api/staff/vendor-tickets`

Supported query params:

- `page`
- `limit`
- `status`

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "tickets": [
      {
        "id": "vticket_id",
        "issue": "Payment not received",
        "vendor": "Print Hub Delhi",
        "status": "open",
        "sla": "2h ago",
        "priority": "high"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### `POST /api/staff/vendor-tickets/:id/reply`

Request:

```json
{
  "message": "We will process your payment by EOD",
  "attachments": []
}
```

Response:

```json
{
  "success": true,
  "message": "Reply sent",
  "data": {
    "id": "vticket_id",
    "status": "in_progress"
  }
}
```

## Refunds

### `GET /api/staff/refunds`

Supported query params:

- `status`

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "refund_id_here",
      "order": "ORD-2026-001",
      "customer": "Rahul Kumar",
      "amount": 450,
      "reason": "Product damaged",
      "status": "pending"
    }
  ]
}
```

Implementation note:

- refund queue is backed by `staffrefundrequests`
- cancelled paid orders are auto-added into the review queue if a request does not already exist

### `POST /api/staff/refunds/:id/approve`

Behavior:

- credits the customer wallet
- writes a ledger entry in finance DB
- updates order status to `refunded`

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "refund_id",
    "status": "approved",
    "approvedAt": "2026-04-29T11:00:00.000Z",
    "approvedBy": "staff_id"
  }
}
```

### `POST /api/staff/refunds/:id/escalate`

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "refund_id",
    "status": "escalated",
    "escalatedAt": "2026-04-29T11:00:00.000Z"
  }
}
```

## Wallet Ledger

### `GET /api/staff/wallet/ledger`

Supported query params:

- `userId`
- `category`
- `page`
- `limit`

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "ledger_entry_id",
      "type": "order_payment",
      "ref": "ORD-2026-001",
      "amount": "+₹450",
      "date": "29 Apr 2026",
      "note": "Payment received for order"
    }
  ]
}
```

### `POST /api/staff/wallet/credit`

Request:

```json
{
  "userId": "user_id_here",
  "amount": 100,
  "reason": "Compensation for delay"
}
```

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "userId": "user_id_here",
    "amount": 100,
    "newBalance": 350,
    "transactionId": "txn_id"
  }
}
```

### `POST /api/staff/wallet/debit`

Same contract as credit, with a reduced balance.

## Payouts

### `GET /api/staff/payouts`

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "payout_id_here",
      "vendor": "Print Hub Delhi",
      "amount": "12500",
      "period": "Apr 2026",
      "status": "scheduled",
      "date": "30 Apr 2026"
    }
  ]
}
```

Status mapping used by backend:

- `pending` -> `scheduled`
- `failed` -> `issue`
- `processing` -> `processing`
- `paid` -> `paid`

### `POST /api/staff/payouts/issue-ticket`

Request:

```json
{
  "payoutId": "payout_id_here",
  "issueDetails": "Bank account details mismatch"
}
```

Response:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "ticketId": "ticket_id",
    "payoutId": "payout_id",
    "status": "ticket_raised"
  }
}
```

## Frontend Notes

- `replies` on tickets are append-only from the frontend perspective.
- Ticket attachments in reply bodies are currently URL/string arrays, not multipart objects.
- Refund approval is currently wallet-based.
- The staff endpoints now work against the real notification, finance, vendor, order, and admin databases in the merged 3-service runtime.
