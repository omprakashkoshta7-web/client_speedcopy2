# Design Service Build and Deploy

This guide deploys the standalone `design-service` to Cloud Run using the same pattern as your existing services.

## Files Added

Dockerfile:

```txt
Backend/services/design-notification-service/components/design-service/Dockerfile
```

Env file:

```txt
Backend/deploy-env/design-service-asia-east1.yaml
```

## Required Environment Variables

The standalone `design-service` requires:

```txt
MONGO_URI
PRODUCT_DB_URI
DESIGN_SERVICE_PUBLIC_URL
NODE_ENV
```

Meaning:

```txt
MONGO_URI = primary design database, usually speedcopy_designs
PRODUCT_DB_URI = product catalog database, used for variant/template-config lookup
DESIGN_SERVICE_PUBLIC_URL = public Cloud Run URL for returned upload/render asset links
```

## Build Command

Run from:

```txt
Backend
```

Build:

```bash
gcloud builds submit . --project=project-ac781843-c65b-42b0-9f4 --config=cloudbuild.artifact-registry.yaml --substitutions=_DOCKERFILE=services/design-notification-service/components/design-service/Dockerfile,_IMAGE_NAME=design-service,_AR_LOCATION=asia-east1,_AR_REPOSITORY=microservices-repo
```

## Deploy Command

Deploy:

```bash
gcloud run deploy design-service --project=project-ac781843-c65b-42b0-9f4 --image=asia-east1-docker.pkg.dev/project-ac781843-c65b-42b0-9f4/microservices-repo/design-service --region=asia-east1 --platform=managed --allow-unauthenticated --min-instances=1 --max-instances=10 --env-vars-file=deploy-env/design-service-asia-east1.yaml
```

## Notes

If you deploy standalone `design-service`, make sure gateway points `config.services.design` to the standalone Cloud Run URL instead of the bundled `design-notification-service` URL.

If you want returned upload/render URLs to be correct, update:

```txt
DESIGN_SERVICE_PUBLIC_URL
```

to the final Cloud Run service URL after the first deploy.
