# Vendor Frontend Handover Note

## Required Changes

### 1. Handover To Rider UI
- Do not ask the vendor to type a raw rider ID manually.
- Replace the free-text rider field with a rider dropdown/search.
- Use:
  - `GET /api/vendor/delivery-partners/available`
- Optional query params:
  - `search`
  - `limit`

### 2. Handover API
- Use:
  - `POST /api/vendor/orders/:order_id/handover-complete`
- Request body:

```json
{
  "riderId": "optional-selected-rider-id",
  "note": "optional handover note"
}
```

- `riderId` is optional now.
- If vendor does not choose a rider, handover should still work.

### 3. Rider Dropdown Fields
- Show these fields in the rider picker:
  - `name`
  - `phone`
  - `vehicleType`
  - `zoneAssignments`
  - `rating`
  - `totalTrips`

### 4. Vendor Gateway Base URL
- Vendor frontend should use the updated gateway base URL.
- If it is still using the old gateway, some requests like summary/notifications may keep failing.

Recommended base:

```txt
https://gateway-202671058278.asia-east1.run.app/api
```

## Finance / Earnings Notes

### 5. Empty Earnings Is Not Always A Bug
- Vendor wallet/closure data is based on delivered orders.
- If orders are only in:
  - `assigned_vendor`
  - `vendor_accepted`
  - `in_production`
  - `qc_pending`
  - `ready_for_pickup`
- then earnings can still show `0`.

### 6. Empty Payout History Is Not Always A Bug
- Payout history depends on payout records existing in the backend.
- If no payout records are created yet, the page should show:
  - `No payout records yet`
- Do not show a generic failure message for this case.

## Recommended Frontend Behavior

### Handover Modal
- Order number visible
- Rider dropdown/search
- Optional note box
- Confirm button

### Empty States
- Earnings:
  - `No delivered orders yet`
- Payouts:
  - `No payout records yet`

## Backend APIs Used
- `GET /api/vendor/delivery-partners/available`
- `POST /api/vendor/orders/:order_id/handover-complete`
- `GET /api/vendor/finance/wallet/summary`
- `GET /api/vendor/finance/closure/daily`
- `GET /api/vendor/finance/closure/weekly`
- `GET /api/vendor/finance/closure/monthly`
- `GET /api/vendor/finance/payouts/schedule`
- `GET /api/vendor/finance/payouts/history`
