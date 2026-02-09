#!/bin/bash
# Script to set up Google Cloud Secret Manager secrets for VOXNTRY
# Usage: ./scripts/setup-secrets.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if gcloud is installed
if ! command -v gcloud >/dev/null 2>&1; then
    print_error "gcloud CLI is not installed"
    exit 1
fi

print_info "Google Cloud Secret Manager Setup for VOXNTRY"
echo ""

# Get project ID
read -p "Google Cloud Project ID: " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    print_error "Project ID is required"
    exit 1
fi

# Set project
gcloud config set project ${PROJECT_ID}
print_success "Project set to ${PROJECT_ID}"

# Enable Secret Manager API
print_info "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --quiet
print_success "Secret Manager API enabled"

echo ""
print_info "Setting up secrets..."
echo ""

# Setup JWT Secret
print_info "1. JWT Secret"
echo ""
echo "Generate a JWT secret with one of these commands:"
echo "  openssl rand -base64 32"
echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
echo ""
read -p "Enter JWT Secret (or press Enter to generate): " JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    print_info "Generated JWT Secret: ${JWT_SECRET}"
fi

# Create or update JWT secret
if gcloud secrets describe jwt-secret --project=${PROJECT_ID} >/dev/null 2>&1; then
    print_warning "Secret 'jwt-secret' already exists. Updating..."
    echo -n "${JWT_SECRET}" | gcloud secrets versions add jwt-secret --data-file=-
else
    echo -n "${JWT_SECRET}" | gcloud secrets create jwt-secret \
        --data-file=- \
        --replication-policy="automatic"
fi
print_success "JWT Secret configured"

echo ""

# Setup Conference Password
print_info "2. Conference Password"
echo ""
print_warning "IMPORTANT: Use bcrypt hash for production!"
echo ""
echo "Generate bcrypt hash with:"
echo "  npm run hash-password \"yourPassword\""
echo ""
read -p "Enter Conference Password (bcrypt hash): " CONF_PASSWORD

if [ -z "$CONF_PASSWORD" ]; then
    print_error "Conference password is required"
    exit 1
fi

# Validate bcrypt format (should start with $2b$ or $2a$ or $2y$)
if [[ ! $CONF_PASSWORD =~ ^\$2[aby]\$ ]]; then
    print_warning "This doesn't look like a bcrypt hash. Are you sure?"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        print_warning "Setup cancelled"
        exit 0
    fi
fi

# Create or update conference password secret
if gcloud secrets describe conference-password --project=${PROJECT_ID} >/dev/null 2>&1; then
    print_warning "Secret 'conference-password' already exists. Updating..."
    echo -n "${CONF_PASSWORD}" | gcloud secrets versions add conference-password --data-file=-
else
    echo -n "${CONF_PASSWORD}" | gcloud secrets create conference-password \
        --data-file=- \
        --replication-policy="automatic"
fi
print_success "Conference Password configured"

echo ""

# Optional: Setup conferences.json as secret
print_info "3. Conferences Configuration (Optional)"
echo ""
read -p "Do you want to store config/conferences.json as a secret? (y/N): " STORE_CONFIG

if [[ $STORE_CONFIG =~ ^[Yy]$ ]]; then
    if [ ! -f "config/conferences.json" ]; then
        print_error "config/conferences.json not found"
        print_info "Please create it first from config/conferences.example.json"
    else
        if gcloud secrets describe conferences-config --project=${PROJECT_ID} >/dev/null 2>&1; then
            print_warning "Secret 'conferences-config' already exists. Updating..."
            gcloud secrets versions add conferences-config --data-file=config/conferences.json
        else
            gcloud secrets create conferences-config \
                --data-file=config/conferences.json \
                --replication-policy="automatic"
        fi
        print_success "Conferences Configuration stored as secret"
    fi
fi

echo ""

# Grant access to service account
print_info "4. Service Account Access"
echo ""
read -p "Service Account Email (leave empty to skip): " SERVICE_ACCOUNT

if [ -n "$SERVICE_ACCOUNT" ]; then
    print_info "Granting Secret Accessor role to ${SERVICE_ACCOUNT}..."

    gcloud secrets add-iam-policy-binding jwt-secret \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet

    gcloud secrets add-iam-policy-binding conference-password \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet

    if [[ $STORE_CONFIG =~ ^[Yy]$ ]]; then
        gcloud secrets add-iam-policy-binding conferences-config \
            --member="serviceAccount:${SERVICE_ACCOUNT}" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet
    fi

    print_success "Service account access granted"
fi

echo ""
print_success "Secret Manager setup completed!"
echo ""
print_info "Summary:"
echo "  ✓ jwt-secret"
echo "  ✓ conference-password"
if [[ $STORE_CONFIG =~ ^[Yy]$ ]]; then
    echo "  ✓ conferences-config"
fi
echo ""
print_info "Next steps:"
echo "  1. Deploy to Cloud Run: ./scripts/deploy-cloud-run.sh"
echo "  2. Grant Google Sheets access to your service account"
echo ""
print_info "View secrets:"
echo "  gcloud secrets list --project=${PROJECT_ID}"
echo ""
