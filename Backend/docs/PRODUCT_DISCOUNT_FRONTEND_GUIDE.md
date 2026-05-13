# Product Discount Frontend Guide

This guide is for the mobile/frontend team implementing the product price card with discount badges like:

- `Rs 895`
- `0% OFF`
- `25% OFF`

The backend now supports an admin-driven discount flow for both `shop` and `gifting` products.

## What The Frontend Gets

These public product APIs already return discount-friendly fields:

- `GET /api/shop/products`
- `GET /api/shop/products/:slug`
- `GET /api/gifting/products`
- `GET /api/gifting/products/:identifier`

Each product card payload includes:

```json
{
  "_id": "productId",
  "name": "Best Photo Frame",
  "thumbnail": "https://cdn.example.com/frame.jpg",
  "mrp": 1000,
  "sale_price": 850,
  "discount_pct": 15,
  "badge": "sale"
}
```

## Frontend Display Rules

Use these fields exactly:

- Show current price from `sale_price`
- If `mrp > sale_price`, show the old crossed price from `mrp`
- Show discount badge from `discount_pct`
- If `discount_pct` is `0`, show `0% OFF` only if product design requires it visually; otherwise you can hide the badge

Suggested UI logic:

```ts
const hasDiscount = Number(product.discount_pct || 0) > 0;
const currentPrice = product.sale_price ?? product.mrp ?? 0;
const originalPrice = product.mrp ?? currentPrice;
const discountLabel = `${product.discount_pct || 0}% OFF`;
```

## Admin APIs For Discount

These are the admin APIs your admin panel can use.

### Shopping Products

Create product:

`POST /api/admin-shop/shop/products`

Update product:

`PUT /api/admin-shop/shop/products/:id`

Patch only discount:

`PATCH /api/admin-shop/shop/products/:id/discount`

### Gifting Products

Create product:

`POST /api/admin-shop/gifting/products`

Update product:

`PUT /api/admin-shop/gifting/products/:id`

Patch only discount:

`PATCH /api/admin-shop/gifting/products/:id/discount`

## Admin Request Payload Options

Admin can now manage discount in two valid ways.

### Option 1: Send `mrp` and `sale_price`

```json
{
  "mrp": 1000,
  "sale_price": 850
}
```

Backend derives:

- `discount_pct = 15`

### Option 2: Send `mrp` and `discount_pct`

```json
{
  "mrp": 1000,
  "discount_pct": 15
}
```

Backend derives:

- `sale_price = 850`

This is the recommended admin-panel workflow.

## Dedicated Discount Update API

Use this when admin changes only pricing/discount without editing the rest of the product.

Example:

```http
PATCH /api/admin-shop/shop/products/PRODUCT_ID/discount
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>
```

```json
{
  "discount_pct": 20
}
```

Or:

```json
{
  "mrp": 1000,
  "sale_price": 800
}
```

Optional badge override is also supported:

```json
{
  "discount_pct": 20,
  "badge": "sale"
}
```

Allowed `badge` values:

- `sale`
- `new`
- `trending`
- `bestseller`
- `deal`
- `null` or `""` to clear it

## Backend Behavior

The backend automatically does this:

- if `mrp + discount_pct` is provided, it calculates `sale_price`
- if `mrp + sale_price` is provided, it calculates `discount_pct`
- if discount is greater than `0` and no badge is supplied, it defaults badge to `sale`
- if discount becomes `0` and the old badge was `sale`, it clears that badge automatically

That last rule matters for mobile, because it prevents stale sale badges after the admin removes a discount.

## Example Product Card Response

```json
{
  "_id": "abc123",
  "name": "Family Photo Frame",
  "thumbnail": "https://cdn.example.com/frame.jpg",
  "mrp": 1200,
  "sale_price": 900,
  "discount_pct": 25,
  "badge": "sale",
  "in_stock": true
}
```

## Suggested Mobile Rendering

1. Render `sale_price` as the main price
2. Render `mrp` as struck-through only when `mrp > sale_price`
3. Render badge text using `discount_pct`
4. Do not calculate discount on the app unless you need a fallback
5. Prefer backend values directly so admin pricing stays the source of truth

## Deploy Needed

The public product APIs already expose `discount_pct`.

The latest admin discount improvements in this repo still need:

- `commerce-service` deploy

After that deploy, the admin panel can safely create and update discounts end to end.
