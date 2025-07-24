#!/bin/bash

set -e

echo "🚀 SecureAI Bridge Deployment Script"
echo "====================================="

# Check if platform is specified
if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy.sh [railway|render|docker|local]"
    exit 1
fi

PLATFORM=$1
PROJECT_NAME="secureai-bridge"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi

# Run tests
log_info "Running security tests..."
npm test || {
    log_error "Tests failed. Deployment aborted."
    exit 1
}

# Security audit
log_info "Running security audit..."
npm audit --audit-level high || {
    log_warn "Security vulnerabilities found. Review before deploying to production."
}

case $PLATFORM in
    "railway")
        log_info "Deploying to Railway..."
        
        # Check if Railway CLI is installed
        if ! command -v railway &> /dev/null; then
            log_error "Railway CLI is not installed. Install it with: npm install -g @railway/cli"
            exit 1
        fi
        
        # Login to Railway (if not already logged in)
        railway login
        
        # Deploy
        railway up --detach
        
        log_info "✅ Deployed to Railway successfully!"
        railway status
        ;;
        
    "render")
        log_info "Deploying to Render..."
        
        if [ -z "$RENDER_API_KEY" ]; then
            log_error "RENDER_API_KEY environment variable is required"
            exit 1
        fi
        
        if [ -z "$RENDER_SERVICE_ID" ]; then
            log_error "RENDER_SERVICE_ID environment variable is required"
            exit 1
        fi
        
        # Trigger deployment via API
        curl -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json"
        
        log_info "✅ Deployment triggered on Render!"
        ;;
        
    "docker")
        log_info "Building and running Docker container..."
        
        # Build Docker image
        docker build -t $PROJECT_NAME .
        
        # Stop existing container if running
        docker stop $PROJECT_NAME 2>/dev/null || true
        docker rm $PROJECT_NAME 2>/dev/null || true
        
        # Run new container
        docker run -d \
            --name $PROJECT_NAME \
            -p 3000:3000 \
            -e NODE_ENV=production \
            -e JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}" \
            -e ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(openssl rand -hex 32)}" \
            -e API_KEY_SALT="${API_KEY_SALT:-$(openssl rand -hex 16)}" \
            $PROJECT_NAME
        
        log_info "✅ Docker container started successfully!"
        log_info "Container logs:"
        docker logs $PROJECT_NAME
        ;;
        
    "local")
        log_info "Starting local development server..."
        
        # Generate secrets if not set
        if [ -z "$JWT_SECRET" ]; then
            export JWT_SECRET=$(openssl rand -hex 32)
            log_info "Generated JWT_SECRET"
        fi
        
        if [ -z "$ENCRYPTION_KEY" ]; then
            export ENCRYPTION_KEY=$(openssl rand -hex 32)
            log_info "Generated ENCRYPTION_KEY"
        fi
        
        if [ -z "$API_KEY_SALT" ]; then
            export API_KEY_SALT=$(openssl rand -hex 16)
            log_info "Generated API_KEY_SALT"
        fi
        
        # Start the server
        npm start
        ;;
        
    *)
        log_error "Unknown platform: $PLATFORM"
        log_info "Supported platforms: railway, render, docker, local"
        exit 1
        ;;
esac

echo ""
log_info "🎉 Deployment completed!"
log_info "Health check: curl http://localhost:3000/health"
log_info "API docs: http://localhost:3000/"