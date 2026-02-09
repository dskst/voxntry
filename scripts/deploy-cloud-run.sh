#!/bin/bash
# VOXNTRY Cloud Run Deployment Script
# Usage: ./scripts/deploy-cloud-run.sh [environment]
# Example: ./scripts/deploy-cloud-run.sh production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists gcloud; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

if ! command_exists docker; then
    print_warning "docker is not installed. Cloud Build will be used instead."
    USE_CLOUD_BUILD=true
else
    USE_CLOUD_BUILD=false
fi

print_success "Prerequisites check passed"

# Get environment from argument or default to production
ENVIRONMENT=${1:-production}
print_info "Deployment environment: ${ENVIRONMENT}"

# Load configuration
print_info "Loading configuration..."

# Check if .env file exists
if [ ! -f ".env.${ENVIRONMENT}" ] && [ ! -f ".env.local" ]; then
    print_warning "No .env file found. Environment variables should be set manually."
fi

# Prompt for required configuration
echo ""
print_info "Please provide the following configuration:"

# Project ID
read -p "Google Cloud Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID is required"
    exit 1
fi

# Region
echo ""
print_info "Available regions:"
echo "  1) asia-northeast1 (Tokyo)"
echo "  2) us-central1 (Iowa)"
echo "  3) europe-west1 (Belgium)"
read -p "Select region [1]: " REGION_CHOICE
case ${REGION_CHOICE:-1} in
    1) REGION="asia-northeast1" ;;
    2) REGION="us-central1" ;;
    3) REGION="europe-west1" ;;
    *) REGION="asia-northeast1" ;;
esac
print_info "Selected region: ${REGION}"

# Service name
read -p "Service name [voxntry]: " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-voxntry}

# Image name
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo ""
print_info "Configuration summary:"
echo "  Project ID: ${PROJECT_ID}"
echo "  Region: ${REGION}"
echo "  Service Name: ${SERVICE_NAME}"
echo "  Image: ${IMAGE_NAME}"
echo ""

read -p "Continue with deployment? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

# Set project
print_info "Setting up Google Cloud project..."
gcloud config set project ${PROJECT_ID}
print_success "Project set to ${PROJECT_ID}"

# Enable required APIs
print_info "Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sheets.googleapis.com \
    secretmanager.googleapis.com \
    --quiet || true
print_success "APIs enabled"

# Build and push Docker image
echo ""
print_info "Building Docker image..."

if [ "$USE_CLOUD_BUILD" = true ]; then
    print_info "Using Cloud Build..."
    gcloud builds submit \
        --tag ${IMAGE_NAME} \
        --timeout=20m
else
    print_info "Building locally..."
    docker build -t ${IMAGE_NAME} .

    print_info "Pushing image to GCR..."
    gcloud auth configure-docker --quiet
    docker push ${IMAGE_NAME}
fi

print_success "Docker image built and pushed: ${IMAGE_NAME}"

# Ask for deployment options
echo ""
print_info "Deployment options:"

read -p "Use Secret Manager for sensitive data? (Y/n): " USE_SECRETS
USE_SECRETS=${USE_SECRETS:-Y}

read -p "Allow unauthenticated access? (Y/n): " ALLOW_UNAUTH
ALLOW_UNAUTH=${ALLOW_UNAUTH:-Y}

read -p "Memory limit [512Mi]: " MEMORY
MEMORY=${MEMORY:-512Mi}

read -p "CPU allocation [1]: " CPU
CPU=${CPU:-1}

read -p "Max instances [10]: " MAX_INSTANCES
MAX_INSTANCES=${MAX_INSTANCES:-10}

read -p "Min instances [0]: " MIN_INSTANCES
MIN_INSTANCES=${MIN_INSTANCES:-0}

# Build deployment command
DEPLOY_CMD="gcloud run deploy ${SERVICE_NAME}"
DEPLOY_CMD="${DEPLOY_CMD} --image ${IMAGE_NAME}"
DEPLOY_CMD="${DEPLOY_CMD} --region ${REGION}"
DEPLOY_CMD="${DEPLOY_CMD} --platform managed"
DEPLOY_CMD="${DEPLOY_CMD} --port 8080"
DEPLOY_CMD="${DEPLOY_CMD} --memory ${MEMORY}"
DEPLOY_CMD="${DEPLOY_CMD} --cpu ${CPU}"
DEPLOY_CMD="${DEPLOY_CMD} --timeout 60s"
DEPLOY_CMD="${DEPLOY_CMD} --max-instances ${MAX_INSTANCES}"
DEPLOY_CMD="${DEPLOY_CMD} --min-instances ${MIN_INSTANCES}"

if [[ $ALLOW_UNAUTH =~ ^[Yy]$ ]]; then
    DEPLOY_CMD="${DEPLOY_CMD} --allow-unauthenticated"
else
    DEPLOY_CMD="${DEPLOY_CMD} --no-allow-unauthenticated"
fi

# Add environment variables
DEPLOY_CMD="${DEPLOY_CMD} --set-env-vars NODE_ENV=production"

# Add secrets or environment variables
if [[ $USE_SECRETS =~ ^[Yy]$ ]]; then
    print_info "Using Secret Manager for sensitive data"
    DEPLOY_CMD="${DEPLOY_CMD} --set-secrets JWT_SECRET=jwt-secret:latest"
    DEPLOY_CMD="${DEPLOY_CMD} --set-secrets CONFERENCE_YOUR_CONF_PASSWORD=conference-password:latest"

    print_warning "Make sure the following secrets exist in Secret Manager:"
    echo "  - jwt-secret"
    echo "  - conference-password"
    echo ""
    read -p "Secrets are configured? (y/N): " SECRETS_OK
    if [[ ! $SECRETS_OK =~ ^[Yy]$ ]]; then
        print_warning "Please create secrets first using:"
        echo ""
        echo "  echo -n 'your-jwt-secret' | gcloud secrets create jwt-secret --data-file=-"
        echo "  echo -n 'your-password-hash' | gcloud secrets create conference-password --data-file=-"
        echo ""
        exit 1
    fi
else
    print_warning "Environment variables will be set directly (not recommended for production)"
    read -p "JWT_SECRET: " JWT_SECRET
    read -p "CONFERENCE_PASSWORD (bcrypt hash): " CONF_PASSWORD

    DEPLOY_CMD="${DEPLOY_CMD} --set-env-vars JWT_SECRET=${JWT_SECRET}"
    DEPLOY_CMD="${DEPLOY_CMD} --set-env-vars CONFERENCE_YOUR_CONF_PASSWORD=${CONF_PASSWORD}"
fi

# Deploy to Cloud Run
echo ""
print_info "Deploying to Cloud Run..."
echo ""
print_info "Command: ${DEPLOY_CMD}"
echo ""

eval ${DEPLOY_CMD}

if [ $? -eq 0 ]; then
    print_success "Deployment completed successfully!"

    # Get service URL
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
        --region ${REGION} \
        --format='value(status.url)')

    echo ""
    print_success "Service deployed at: ${SERVICE_URL}"
    echo ""
    print_info "Next steps:"
    echo "  1. Check health: curl ${SERVICE_URL}/api/health"
    echo "  2. View logs: gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
    echo "  3. Configure Google Sheets access for the service account"
    echo ""

    # Display service account
    SERVICE_ACCOUNT=$(gcloud run services describe ${SERVICE_NAME} \
        --region ${REGION} \
        --format='value(spec.template.spec.serviceAccountName)')

    if [ -n "$SERVICE_ACCOUNT" ]; then
        print_info "Service Account: ${SERVICE_ACCOUNT}"
        print_warning "Grant this service account 'Editor' access to your Google Spreadsheet"
    fi

else
    print_error "Deployment failed"
    exit 1
fi
