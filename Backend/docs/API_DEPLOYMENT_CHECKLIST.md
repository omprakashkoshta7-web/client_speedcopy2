# API Deployment Checklist

Last verified: `2026-05-06`

This checklist separates three things clearly:

- `Exists in code`: route is present in the current repository
- `Live status`: what the deployed Cloud Run endpoints returned during verification
- `Needs deploy`: whether you still need to deploy a service for the latest repo code to become live

## Design Customization APIs

| API | Service owner | Exists in code | Live status | Needs deploy |
| --- | --- | --- | --- | --- |
| `GET /api/designs/templates` | `design-notification-service` via `gateway` | Yes | `200` from gateway, returns `success: true` | No |
| `GET /api/designs/templates/premium` | `design-notification-service` via `gateway` | Yes | Previously verified `200`; route still present in code | No immediate deploy needed |
| `GET /api/designs/template-config/:variantId` | `design-notification-service` via `gateway` | Yes | `400 Invalid variantId` from gateway and direct service, which confirms route is deployed and validating | No |
| `GET /api/designs/admin/template-definitions` | `design-notification-service` via `gateway` | Yes | `403 Admin access required` from direct service and `401/403` via gateway when unauthenticated, which confirms mount + protection | No |
| `POST /api/designs/admin/template-definitions` | `design-notification-service` | Yes | Auth-protected route; code present | No immediate deploy needed |
| `PATCH /api/designs/admin/template-definitions/:id` | `design-notification-service` | Yes | Auth-protected route; code present | No immediate deploy needed |
| `POST /api/designs/admin/template-definitions/:id/publish` | `design-notification-service` | Yes | Auth-protected route; code present | No immediate deploy needed |
| `POST /api/designs/customizations` | `design-notification-service` via `gateway` | Yes | Direct service returned `422 Validation failed` for empty body, which confirms route is deployed | No |
| `GET /api/designs/customizations/:id` | `design-notification-service` via `gateway` | Yes | Direct service returned ObjectId cast error for invalid id, which confirms route is deployed | No |
| `PATCH /api/designs/customizations/:id/slots/:slotId` | `design-notification-service` | Yes | Route exists in code; not runtime-checked with a valid payload | No immediate deploy needed |
| `POST /api/designs/customizations/:id/assets` | `design-notification-service` via `gateway` | Yes | Route exists in code; gateway upload path is mounted | No immediate deploy needed |
| `POST /api/designs/customizations/:id/render-preview` | `design-notification-service` | Yes | Direct service returned ObjectId cast error for invalid id, which confirms route is deployed | No |
| `POST /api/designs/customizations/:id/finalize` | `design-notification-service` | Yes | Direct service returned ObjectId cast error for invalid id, which confirms route is deployed | No |

## Product Catalog APIs

| API | Service owner | Exists in code | Live status | Needs deploy |
| --- | --- | --- | --- | --- |
| `GET /api/products/categories` | `commerce-service` via `gateway` | Yes | `200` from gateway with category data | No |
| `GET /api/products/categories/:slug` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `GET /api/products/categories/:id/subcategories` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `POST /api/products/categories` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `PUT /api/products/categories/:id` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `DELETE /api/products/categories/:id` | `commerce-service` via `gateway` | Yes | `403 Admin access required` from gateway, which confirms live protected delete route | No |
| `POST /api/products/categories/subcategories` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `PUT /api/products/categories/subcategories/:id` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `GET /api/products/product-types` | `commerce-service` via `gateway` | Yes | `200` from gateway | No |
| `POST /api/admin/product-types` | `commerce-service` via `gateway` | Yes | `401 No token provided` from gateway, which confirms mount + auth | No |
| `PATCH /api/admin/product-types/:id` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `DELETE /api/admin/product-types/:id` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `GET /api/products/variants` | `commerce-service` via `gateway` | Yes | `200` from gateway | No |
| `GET /api/products/variants/product/:productId` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `POST /api/admin/variants` | `commerce-service` via `gateway` | Yes | `401 No token provided` previously verified, which confirms mount + auth | No |
| `PATCH /api/admin/variants/:id` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `DELETE /api/admin/variants/:id` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `GET /api/products` | `commerce-service` via `gateway` | Yes | Route exists in code | No immediate deploy needed |
| `GET /api/products/slug/:slug` | `commerce-service` via `gateway` | Yes | Previously verified as returning `404 Product not found` for a missing slug, which confirms mount | No |
| `GET /api/products/:id` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `POST /api/products` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `PUT /api/products/:id` | `commerce-service` | Yes | Auth-protected route in code | No immediate deploy needed |
| `DELETE /api/products/:id` | `commerce-service` via `gateway` | Yes | `403 Admin access required` from gateway, which confirms live protected delete route | No |

## Shopping and Gifting APIs

| API | Service owner | Exists in code | Live status | Needs deploy |
| --- | --- | --- | --- | --- |
| `GET /api/shop/products` | `commerce-service` via `gateway` | Yes | `200` from gateway; payload includes `mrp`, `sale_price`, `discount_pct`, `badge` | No |
| `GET /api/shop/products/:slug` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `GET /api/gifting/products` | `commerce-service` via `gateway` | Yes | `200` from gateway; payload includes `mrp`, `sale_price`, `discount_pct`, `badge` | No |
| `GET /api/gifting/products/:identifier` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `GET /api/admin/shop/products` | `commerce-service` via `gateway` | Yes | Route is mounted in code; runtime check requires auth | No immediate deploy needed |
| `POST /api/admin/shop/products` | `commerce-service` | Yes | Route exists in code; accepts `discount_pct` on create/update in latest repo | **Yes - deploy `commerce-service`** |
| `PUT /api/admin/shop/products/:id` | `commerce-service` | Yes | Route exists in code; accepts `discount_pct` on create/update in latest repo | **Yes - deploy `commerce-service`** |
| `DELETE /api/admin/shop/products/:id` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `PATCH /api/admin/shop/products/:id/deal` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `PATCH /api/admin/shop/products/:id/discount` | `commerce-service` | Yes | Route exists in code, but latest discount normalization and badge cleanup are local changes | **Yes - deploy `commerce-service`** |
| `GET /api/admin/gifting/products` | `commerce-service` via `gateway` | Yes | Route is mounted in code; runtime check requires auth | No immediate deploy needed |
| `POST /api/admin/gifting/products` | `commerce-service` | Yes | Route exists in code; accepts `discount_pct` on create/update in latest repo | **Yes - deploy `commerce-service`** |
| `PUT /api/admin/gifting/products/:id` | `commerce-service` | Yes | Route exists in code; accepts `discount_pct` on create/update in latest repo | **Yes - deploy `commerce-service`** |
| `DELETE /api/admin/gifting/products/:id` | `commerce-service` | Yes | Route exists in code | No immediate deploy needed |
| `PATCH /api/admin/gifting/products/:id/discount` | `commerce-service` | Yes | Route exists in code, but latest discount normalization and badge cleanup are local changes | **Yes - deploy `commerce-service`** |

## What You Need To Deploy Right Now

If your goal is only the new discount workflow:

- Deploy `commerce-service`

If your goal is the full dynamic customization stack too:

- `design-notification-service` is already serving the core customization routes
- `gateway` is already exposing `GET /api/designs/template-config/:variantId`
- You only need fresh deploys there when you make additional design-side changes

## Suggested Smoke Tests After Commerce Deploy

Run these with a valid admin token after deploying `commerce-service`:

```bash
curl.exe -sS -i -X POST https://gateway-202671058278.asia-east1.run.app/api/admin-shop/shop/products ^
  -H "Authorization: Bearer <ADMIN_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Discount Test Product\",\"category\":\"<CATEGORY_ID>\",\"mrp\":1000,\"discount_pct\":15}"
```

```bash
curl.exe -sS -i -X PATCH https://gateway-202671058278.asia-east1.run.app/api/admin-shop/shop/products/<PRODUCT_ID>/discount ^
  -H "Authorization: Bearer <ADMIN_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"discount_pct\":25}"
```

```bash
curl.exe -sS -i "https://gateway-202671058278.asia-east1.run.app/api/shop/products?limit=5"
```

Expected public payload fields per product:

```json
{
  "mrp": 1000,
  "sale_price": 750,
  "discount_pct": 25,
  "badge": "sale"
}
```
