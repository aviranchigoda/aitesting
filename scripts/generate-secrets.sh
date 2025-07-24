#!/bin/bash

echo "🔐 SecureAI Bridge - Secret Generation"
echo "====================================="

# Generate strong secrets for production deployment
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
API_KEY_SALT=$(openssl rand -hex 16)

echo ""
echo "Generated secrets for production deployment:"
echo "===========================================" 
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "API_KEY_SALT=$API_KEY_SALT"
echo ""
echo "⚠️  IMPORTANT: Store these secrets securely!"
echo "   - Never commit them to version control"
echo "   - Use environment variables in production"
echo "   - Rotate them regularly"
echo ""

# Optionally write to .env.local file
read -p "Save to .env.local file? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat > .env.local << EOF
# Generated secrets for SecureAI Bridge
# Generated on: $(date)
# WARNING: Do not commit this file to version control

NODE_ENV=production
PORT=3000

# Security Configuration
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
API_KEY_SALT=$API_KEY_SALT

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS (Update with your domains)
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
EOF
    echo "✅ Secrets saved to .env.local"
    echo "🔒 Remember to add .env.local to your .gitignore"
fi