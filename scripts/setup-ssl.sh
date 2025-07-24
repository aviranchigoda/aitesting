#!/bin/bash

set -e

echo "🔒 SSL Certificate Setup for SecureAI Bridge"
echo "============================================"

DOMAIN=${1:-localhost}
SSL_DIR="./ssl"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create SSL directory
mkdir -p $SSL_DIR

if [ "$DOMAIN" = "localhost" ]; then
    log_info "Generating self-signed certificate for localhost..."
    
    # Generate private key
    openssl genrsa -out $SSL_DIR/server.key 2048
    
    # Generate certificate signing request
    openssl req -new -key $SSL_DIR/server.key -out $SSL_DIR/server.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in $SSL_DIR/server.csr -signkey $SSL_DIR/server.key -out $SSL_DIR/server.crt
    
    # Set proper permissions
    chmod 600 $SSL_DIR/server.key
    chmod 644 $SSL_DIR/server.crt
    
    log_info "✅ Self-signed certificate generated for localhost"
    log_warn "⚠️  This certificate is for development only!"
    
else
    log_info "Setting up Let's Encrypt certificate for domain: $DOMAIN"
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot is not installed. Installing..."
        
        # Install certbot based on OS
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update
            sudo apt-get install -y certbot
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install certbot
        else
            log_error "Please install certbot manually for your OS"
            exit 1
        fi
    fi
    
    # Generate Let's Encrypt certificate
    log_info "Generating Let's Encrypt certificate..."
    log_warn "Make sure your domain points to this server!"
    
    read -p "Continue with Let's Encrypt certificate generation? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Stop nginx if running
        docker-compose down nginx 2>/dev/null || true
        
        # Generate certificate
        sudo certbot certonly --standalone \
            --preferred-challenges http \
            --email admin@$DOMAIN \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN
        
        # Copy certificates to SSL directory
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/server.crt
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/server.key
        
        # Set proper ownership and permissions
        sudo chown $USER:$USER $SSL_DIR/server.*
        chmod 600 $SSL_DIR/server.key
        chmod 644 $SSL_DIR/server.crt
        
        log_info "✅ Let's Encrypt certificate generated successfully!"
        
        # Set up auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
        log_info "✅ Auto-renewal cron job set up"
        
    else
        log_info "Certificate generation cancelled"
        exit 0
    fi
fi

# Verify certificate
log_info "Verifying certificate..."
openssl x509 -in $SSL_DIR/server.crt -text -noout | grep -E "(Subject|Issuer|Not After)"

# Test certificate
log_info "Testing certificate validity..."
openssl verify $SSL_DIR/server.crt 2>/dev/null && log_info "✅ Certificate is valid" || log_warn "⚠️  Certificate verification failed (expected for self-signed)"

echo ""
log_info "🎉 SSL setup completed!"
log_info "Certificate files:"
log_info "  - Certificate: $SSL_DIR/server.crt"
log_info "  - Private key: $SSL_DIR/server.key"
echo ""

if [ "$DOMAIN" != "localhost" ]; then
    log_info "Next steps:"
    log_info "1. Update docker-compose.yml with your domain"
    log_info "2. Configure DNS to point to your server"
    log_info "3. Start the application with: docker-compose up -d"
    log_info "4. Test HTTPS: https://$DOMAIN/health"
else
    log_info "For development:"
    log_info "1. Start the application: docker-compose up -d"
    log_info "2. Test HTTPS: https://localhost/health"
    log_info "3. Accept the self-signed certificate warning in your browser"
fi