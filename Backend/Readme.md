# SpeedCopy Backend

Backend for SpeedCopy, now consolidated into `gateway + 3 merged backend services`.

## Runtime Shape

```text
Gateway (4000)
    ├── user-admin-vendor-service     (4101)
    ├── commerce-service              (4102)
    └── design-notification-service   (4103)
```

Each merged service keeps separate Mongo connections for its child domains:

- `user-admin-vendor-service`: auth, user, admin, vendor
- `commerce-service`: product, order, payment, delivery, finance
- `design-notification-service`: design, notification

## Setup

1. Install dependencies

```bash
npm run install:all
```

2. Create a root `.env`

```bash
cp .env.example .env
```

3. Fill the important values in `.env`

- `JWT_SECRET`
- `MONGO_URI_AUTH`, `MONGO_URI_USERS`, `MONGO_URI_ADMIN`, `MONGO_URI_VENDORS`
- `MONGO_URI_PRODUCTS`, `MONGO_URI_ORDERS`, `MONGO_URI_PAYMENTS`, `MONGO_URI_DELIVERY`, `MONGO_URI_FINANCE`
- `MONGO_URI_DESIGNS`, `MONGO_URI_NOTIFICATIONS`
- optional provider keys such as `RAZORPAY_*`, `SMTP_*`, `TWILIO_*`, `CLOUDINARY_*`, `GOOGLE_MAPS_API_KEY`

4. Start MongoDB locally

5. Start the backend

```bash
npm run dev
```

## Local URLs

- Gateway: `http://localhost:4000`
- User Admin Vendor: `http://localhost:4101`
- Commerce: `http://localhost:4102`
- Design Notification: `http://localhost:4103`

## Swagger

Main docs:

- `http://localhost:4000/api-docs`
- `http://localhost:4101/api-docs`
- `http://localhost:4102/api-docs`
- `http://localhost:4103/api-docs`

Child docs:

- `http://localhost:4101/api-docs/auth/`
- `http://localhost:4101/api-docs/user/`
- `http://localhost:4101/api-docs/admin/`
- `http://localhost:4101/api-docs/vendor/`
- `http://localhost:4102/api-docs/product/`
- `http://localhost:4102/api-docs/order/`
- `http://localhost:4102/api-docs/payment/`
- `http://localhost:4102/api-docs/delivery/`
- `http://localhost:4102/api-docs/finance/`
- `http://localhost:4103/api-docs/design/`
- `http://localhost:4103/api-docs/notification/`

## Health Checks

```bash
npm run health
```

Direct endpoints:

- `http://localhost:4101/health`
- `http://localhost:4102/health`
- `http://localhost:4103/health`

## Project Structure

```text
Backend/
├── gateway/
├── services/
│   ├── user-admin-vendor-service/
│   ├── commerce-service/
│   └── design-notification-service/
├── shared/
├── scripts/
└── uploads/
```
