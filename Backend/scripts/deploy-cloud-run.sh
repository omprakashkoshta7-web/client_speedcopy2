#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-your-gcp-project-id}"
REGION="${REGION:-asia-east1}"
REPOSITORY="${REPOSITORY:-microservices-repo}"

if [[ "${PROJECT_ID}" == "your-gcp-project-id" ]]; then
  echo "Set PROJECT_ID before running this script."
  exit 1
fi

build_image() {
  local dockerfile="$1"
  local image_name="$2"

  gcloud builds submit . \
    --config cloudbuild.artifact-registry.yaml \
    --substitutions "_DOCKERFILE=${dockerfile},_IMAGE_NAME=${image_name},_AR_LOCATION=${REGION},_AR_REPOSITORY=${REPOSITORY}"
}

deploy_service() {
  local service_name="$1"
  local image_name="$2"
  local env_file="$3"

  gcloud run deploy "${service_name}" \
    --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${image_name}" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 1 \
    --max-instances 10 \
    --env-vars-file "${env_file}"
}

# Merged backend services + gateway
build_image "services/design-notification-service/Dockerfile" "design-notification-service"
deploy_service "design-notification-service" "design-notification-service" "deploy-env/design-notification-service-${REGION}.yaml"

build_image "services/commerce-service/Dockerfile" "commerce-service"
deploy_service "commerce-service" "commerce-service" "deploy-env/commerce-service-${REGION}.yaml"

build_image "services/user-admin-vendor-service/Dockerfile" "user-admin-vendor-service"
deploy_service "user-admin-vendor-service" "user-admin-vendor-service" "deploy-env/user-admin-vendor-service-${REGION}.yaml"

build_image "gateway/Dockerfile" "gateway"
deploy_service "gateway" "gateway" "deploy-env/gateway-${REGION}.yaml"
