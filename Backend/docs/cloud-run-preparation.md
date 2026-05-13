# Cloud Run Preparation Summary

## Deployment Shape

Deploy these services:

- `user-admin-vendor-service`
- `commerce-service`
- `design-notification-service`
- optional `gateway`

The old 11-service deployment layout has been removed from the active repo.

## Required Environment Variables

### Gateway

- `JWT_SECRET`
- `USER_ADMIN_VENDOR_SERVICE_URL`
- `COMMERCE_SERVICE_URL`
- `DESIGN_NOTIFICATION_SERVICE_URL`

### User Admin Vendor Service

- `JWT_SECRET`
- `MONGO_URI_AUTH`
- `MONGO_URI_USERS`
- `MONGO_URI_ADMIN`
- `MONGO_URI_VENDORS`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Commerce Service

- `MONGO_URI_PRODUCTS`
- `MONGO_URI_ORDERS`
- `MONGO_URI_PAYMENTS`
- `MONGO_URI_DELIVERY`
- `MONGO_URI_FINANCE`
- `INTERNAL_SERVICE_TOKEN`
- optional provider vars like `RAZORPAY_*`, `GOOGLE_MAPS_API_KEY`, `TWILIO_*`, `CLOUDINARY_*`

### Design Notification Service

- `MONGO_URI_DESIGNS`
- `MONGO_URI_NOTIFICATIONS`
- `INTERNAL_SERVICE_TOKEN`
- optional provider vars like `SMTP_*`, `TWILIO_*`

## Build And Deploy

Run these from `Backend/`.

```bash
PROJECT_ID="your-gcp-project-id"
REGION="asia-south1"
SERVICE_NAME="user-admin-vendor-service"

gcloud builds submit . \
  --config cloudbuild.service.yaml \
  --substitutions "_DOCKERFILE=services/${SERVICE_NAME}/Dockerfile,_IMAGE_NAME=${SERVICE_NAME}"

gcloud run deploy "${SERVICE_NAME}" \
  --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production"
```

The reusable script is `scripts/deploy-cloud-run.sh`.

## Checklist

- Each merged service listens on `PORT`
- Gateway points at the 3 merged service URLs
- Mongo/Atlas allows the production connections
- `INTERNAL_SERVICE_TOKEN` matches across trusted internal services
- Optional providers are configured for the features you use
- Health endpoints respond after deployment
