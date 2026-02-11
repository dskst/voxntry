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

# Always use Cloud Build for Cloud Run deployments to ensure correct architecture
# (Local builds on ARM Macs would create incompatible images)
USE_CLOUD_BUILD=true
print_info "Using Cloud Build to ensure correct architecture for Cloud Run"

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
print_info "Building Docker image with Cloud Build..."

gcloud builds submit \
    --tag ${IMAGE_NAME} \
    --timeout=20m \
    --quiet

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

# Conference password environment variable name
echo ""
print_info "Conference configuration:"

# Try to read conference info from conferences.json
if [ -f "config/conferences.json" ] && command -v jq >/dev/null 2>&1; then
    # Read conference IDs and passwordEnvVars as pairs
    CONFERENCE_DATA=$(jq -r '.conferences[] | "\(.id)|\(.passwordEnvVar)"' config/conferences.json 2>/dev/null | grep -v '^|' | grep -v '|null$')

    if [ -n "$CONFERENCE_DATA" ]; then
        print_info "Detected conferences from conferences.json:"
        echo "$CONFERENCE_DATA" | while IFS='|' read -r CONF_ID CONF_VAR; do
            print_info "  - ${CONF_ID}: ${CONF_VAR} -> ${CONF_ID}-password:latest"
        done
        CONFERENCES_DETECTED=true
    else
        CONFERENCES_DETECTED=false
    fi
else
    CONFERENCES_DETECTED=false
fi

# Service account configuration
echo ""
print_info "Service account configuration:"
echo "  Leave empty to use default Compute Engine service account"
echo "  Or enter custom service account email (e.g., your-sa@${PROJECT_ID}.iam.gserviceaccount.com)"
read -p "Service account email [default]: " SERVICE_ACCOUNT_EMAIL

if [ -n "$SERVICE_ACCOUNT_EMAIL" ]; then
    print_info "Using custom service account: ${SERVICE_ACCOUNT_EMAIL}"
else
    print_info "Using default service account"
fi

# Build deployment command
DEPLOY_CMD="gcloud run deploy ${SERVICE_NAME}"
DEPLOY_CMD="${DEPLOY_CMD} --image ${IMAGE_NAME}"
DEPLOY_CMD="${DEPLOY_CMD} --region ${REGION}"
DEPLOY_CMD="${DEPLOY_CMD} --platform managed"

# Add service account only if specified
if [ -n "$SERVICE_ACCOUNT_EMAIL" ]; then
    DEPLOY_CMD="${DEPLOY_CMD} --service-account ${SERVICE_ACCOUNT_EMAIL}"
fi

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

    # Add secrets for all detected conferences
    if [ "$CONFERENCES_DETECTED" = true ]; then
        print_info "Mapping conference password environment variables to individual secrets:"
        while IFS='|' read -r CONF_ID CONF_VAR; do
            SECRET_NAME="${CONF_ID}-password"
            DEPLOY_CMD="${DEPLOY_CMD} --set-secrets ${CONF_VAR}=${SECRET_NAME}:latest"
            print_info "  - ${CONF_VAR} -> ${SECRET_NAME}:latest"
        done <<< "$CONFERENCE_DATA"
    fi

    # Check if secrets exist
    print_info "Checking if secrets exist in Secret Manager..."
    JWT_EXISTS=$(gcloud secrets list --filter="name:jwt-secret" --format="value(name)" 2>/dev/null || echo "")

    MISSING_SECRETS=()
    [ -z "$JWT_EXISTS" ] && MISSING_SECRETS+=("jwt-secret")

    # Check each conference secret
    CONF_SECRETS_MISSING=false
    if [ "$CONFERENCES_DETECTED" = true ]; then
        while IFS='|' read -r CONF_ID CONF_VAR; do
            SECRET_NAME="${CONF_ID}-password"
            SECRET_EXISTS=$(gcloud secrets list --filter="name:${SECRET_NAME}" --format="value(name)" 2>/dev/null || echo "")
            if [ -z "$SECRET_EXISTS" ]; then
                CONF_SECRETS_MISSING=true
            fi
        done <<< "$CONFERENCE_DATA"
    fi

    if [ -z "$JWT_EXISTS" ] || [ "$CONF_SECRETS_MISSING" = true ]; then
        print_warning "Some secrets are missing in Secret Manager:"
        [ -z "$JWT_EXISTS" ] && echo "  ❌ jwt-secret - NOT FOUND"
        [ -n "$JWT_EXISTS" ] && echo "  ✅ jwt-secret - exists"

        if [ "$CONFERENCES_DETECTED" = true ]; then
            while IFS='|' read -r CONF_ID CONF_VAR; do
                SECRET_NAME="${CONF_ID}-password"
                SECRET_EXISTS=$(gcloud secrets list --filter="name:${SECRET_NAME}" --format="value(name)" 2>/dev/null || echo "")
                if [ -z "$SECRET_EXISTS" ]; then
                    echo "  ❌ ${SECRET_NAME} - NOT FOUND"
                else
                    echo "  ✅ ${SECRET_NAME} - exists"
                fi
            done <<< "$CONFERENCE_DATA"
        fi
        echo ""

        read -p "Create missing secrets now? (Y/n): " CREATE_SECRETS
        if [[ $CREATE_SECRETS =~ ^[Yy]$|^$ ]]; then
            # Create JWT secret if missing
            if [ -z "$JWT_EXISTS" ]; then
                print_info "Generating and creating JWT secret..."
                JWT_VALUE=$(openssl rand -base64 32)
                echo -n "$JWT_VALUE" | gcloud secrets create jwt-secret --data-file=-
                print_success "JWT secret created"
            fi

            # Create conference password secrets if missing
            if [ "$CONFERENCES_DETECTED" = true ]; then
                while IFS='|' read -r CONF_ID CONF_VAR; do
                    SECRET_NAME="${CONF_ID}-password"
                    SECRET_EXISTS=$(gcloud secrets list --filter="name:${SECRET_NAME}" --format="value(name)" 2>/dev/null || echo "")

                    if [ -z "$SECRET_EXISTS" ]; then
                        echo ""
                        print_warning "Create password for conference: ${CONF_ID} (secret: ${SECRET_NAME})"
                        print_info "Generate one using: npm run hash-password \"your-password\""
                        read -p "Password hash for ${CONF_ID}: " CONF_HASH < /dev/tty
                        if [ -z "$CONF_HASH" ]; then
                            print_error "Password hash is required"
                            exit 1
                        fi
                        echo -n "$CONF_HASH" | gcloud secrets create "${SECRET_NAME}" --data-file=-
                        print_success "${SECRET_NAME} created"
                    fi
                done <<< "$CONFERENCE_DATA"
            fi
        else
            print_warning "Please create secrets manually. For each conference:"
            echo ""
            if [ "$CONFERENCES_DETECTED" = true ]; then
                while IFS='|' read -r CONF_ID CONF_VAR; do
                    echo "  # For conference: ${CONF_ID}"
                    echo "  npm run hash-password \"your-password-for-${CONF_ID}\""
                    echo "  echo -n '\$2b\$12\$YOUR_HASH_HERE' | gcloud secrets create ${CONF_ID}-password --data-file=-"
                    echo ""
                done <<< "$CONFERENCE_DATA"
            fi
            exit 1
        fi
    else
        print_success "All required secrets exist in Secret Manager"
        echo ""
        read -p "Do you want to update any existing secrets? (y/N): " UPDATE_SECRETS
        if [[ $UPDATE_SECRETS =~ ^[Yy]$ ]]; then
            # Update JWT secret
            read -p "Update JWT secret? (y/N): " UPDATE_JWT
            if [[ $UPDATE_JWT =~ ^[Yy]$ ]]; then
                print_info "Generating new JWT secret..."
                JWT_VALUE=$(openssl rand -base64 32)
                echo -n "$JWT_VALUE" | gcloud secrets versions add jwt-secret --data-file=-
                print_success "JWT secret updated (new version created)"
            fi

            # Update conference password secrets
            if [ "$CONFERENCES_DETECTED" = true ]; then
                while IFS='|' read -r CONF_ID CONF_VAR; do
                    SECRET_NAME="${CONF_ID}-password"
                    read -p "Update password for ${CONF_ID}? (y/N): " UPDATE_THIS < /dev/tty
                    if [[ $UPDATE_THIS =~ ^[Yy]$ ]]; then
                        print_info "Generate hash using: npm run hash-password \"your-new-password\""
                        read -p "New password hash for ${CONF_ID}: " NEW_HASH < /dev/tty
                        if [ -n "$NEW_HASH" ]; then
                            echo -n "$NEW_HASH" | gcloud secrets versions add "${SECRET_NAME}" --data-file=-
                            print_success "${SECRET_NAME} updated (new version created)"
                        else
                            print_warning "Empty hash provided, skipping update for ${CONF_ID}"
                        fi
                    fi
                done <<< "$CONFERENCE_DATA"
            fi
        fi
    fi
else
    print_warning "Environment variables will be set directly (not recommended for production)"
    read -p "JWT_SECRET: " JWT_SECRET
    read -p "CONFERENCE_PASSWORD (bcrypt hash): " CONF_PASSWORD

    DEPLOY_CMD="${DEPLOY_CMD} --set-env-vars JWT_SECRET=${JWT_SECRET}"
    DEPLOY_CMD="${DEPLOY_CMD} --set-env-vars ${CONF_PASSWORD_VAR}=${CONF_PASSWORD}"
fi

# Deploy to Cloud Run
echo ""
print_info "Deploying to Cloud Run..."
echo ""
print_info "Command: ${DEPLOY_CMD}"
echo ""

eval ${DEPLOY_CMD}

# Ensure traffic is routed to the latest revision
if [ $? -eq 0 ]; then
    print_info "Routing 100% traffic to latest revision..."
    gcloud run services update-traffic ${SERVICE_NAME} \
        --region ${REGION} \
        --to-latest \
        --quiet

    if [ $? -eq 0 ]; then
        print_success "Traffic successfully routed to latest revision"
    else
        print_warning "Failed to update traffic routing, but deployment succeeded"
    fi
fi

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
