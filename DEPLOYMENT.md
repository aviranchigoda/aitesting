# 🚀 SecureAI Bridge Deployment Guide

Deploy your SecureAI Bridge system to production with multiple cloud platform options.

## Quick Deploy Options

### 1. 🚄 Railway (Recommended)
**Easiest deployment with automatic SSL**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy instantly
./scripts/deploy.sh railway
```

**Live URL**: Your app will be available at `https://your-app.railway.app`

### 2. 🎨 Render
**Free tier available, great for production**

```bash
# Set environment variables
export RENDER_API_KEY=your_render_api_key
export RENDER_SERVICE_ID=your_service_id

# Deploy
./scripts/deploy.sh render
```

### 3. 🐳 Docker (Any VPS)
**Deploy to any cloud provider**

```bash
# Build and run
./scripts/deploy.sh docker

# Or with docker-compose
docker-compose up -d
```

### 4. ⚡ Vercel (Serverless)
**Instant global deployment**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 📋 Pre-Deployment Checklist

### 1. Generate Production Secrets
```bash
./scripts/generate-secrets.sh
```

### 2. Security Configuration
- [ ] Strong JWT secret (32+ characters)
- [ ] Unique encryption keys
- [ ] Configure CORS origins
- [ ] Set rate limits for production
- [ ] Enable audit logging

### 3. Environment Variables
Required for all deployments:
```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=your-256-bit-encryption-key
API_KEY_SALT=your-api-key-salt
PORT=3000
```

## 🌐 Platform-Specific Instructions

### Railway Deployment

1. **Connect Repository**
   ```bash
   railway login
   railway link
   railway up
   ```

2. **Set Environment Variables** (Railway Dashboard)
   - `JWT_SECRET` - Your secure JWT secret
   - `ENCRYPTION_KEY` - 256-bit encryption key
   - `API_KEY_SALT` - API key salt
   - `ALLOWED_ORIGINS` - Your domain URLs

3. **Custom Domain** (Optional)
   - Go to Railway dashboard
   - Add your custom domain
   - Configure DNS settings

### Render Deployment

1. **Connect GitHub Repository**
   - Go to Render dashboard
   - Connect your GitHub repo
   - Choose "Web Service"

2. **Build Configuration**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Docker: Use Dockerfile

3. **Environment Variables**
   - Add all required environment variables
   - Use "Generate Value" for secrets

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t secureai-bridge .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name secureai-bridge \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e JWT_SECRET=your-secret \
     -e ENCRYPTION_KEY=your-key \
     -e API_KEY_SALT=your-salt \
     secureai-bridge
   ```

3. **With Docker Compose**
   ```bash
   docker-compose up -d
   ```

### DigitalOcean App Platform

1. **Create App**
   - Connect GitHub repository
   - Choose Node.js buildpack

2. **App Spec Configuration**
   ```yaml
   name: secureai-bridge
   services:
   - name: api
     source_dir: /
     github:
       repo: your-username/secureai-bridge
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     env:
     - key: NODE_ENV
       value: production
     - key: JWT_SECRET
       value: your-secret
     ```

### Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Deploy**
   ```bash
   heroku create secureai-bridge
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secret
   git push heroku main
   ```

## 🔒 SSL/TLS Configuration

### Automatic SSL (Recommended)
Most platforms provide automatic SSL:
- ✅ Railway - Automatic
- ✅ Render - Automatic  
- ✅ Vercel - Automatic
- ✅ Heroku - Automatic

### Custom SSL Certificate
For VPS/Docker deployments:

```bash
# Generate Let's Encrypt certificate
certbot certonly --standalone -d yourdomain.com

# Configure in environment
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

## 📊 Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "SecureAI Bridge",
  "version": "1.0.0",
  "uptime": 123.45
}
```

### 2. API Endpoints Test
```bash
# Register client
curl -X POST https://your-domain.com/api/v1/secure/register-client \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo_key_123" \
  -d '{"clientId": "test-client-001"}'

# Process encrypted data
curl -X POST https://your-domain.com/api/v1/secure/process-encrypted \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo_key_123" \
  -d '{
    "requestId": "test-001",
    "encryptedData": {"test": "data"},
    "processingType": "homomorphic_computation",
    "clientPublicKey": "test-key"
  }'
```

### 3. Security Verification
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] CORS configured correctly
- [ ] API authentication working

## 🔍 Monitoring & Maintenance

### Application Logs
```bash
# Railway
railway logs

# Render  
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/logs"

# Docker
docker logs secureai-bridge
```

### Performance Monitoring
- Monitor response times
- Track error rates
- Watch memory usage
- Monitor encryption operations

### Security Monitoring
- Failed authentication attempts
- Rate limit violations
- Suspicious request patterns
- Key rotation events

## 🆘 Troubleshooting

### Common Issues

**Deployment Failed**
```bash
# Check build logs
# Verify environment variables
# Test locally first
npm start
```

**SSL Certificate Issues**
```bash
# Verify domain DNS
# Check certificate expiration
# Ensure proper certificate path
```

**High Memory Usage**
```bash
# Monitor encryption operations
# Check for memory leaks
# Scale instance size if needed
```

**Rate Limit Errors**
```bash
# Adjust RATE_LIMIT_MAX_REQUESTS
# Implement API key management
# Monitor usage patterns
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Session state management
- Database connection pooling
- Cache implementation

### Vertical Scaling
- Memory optimization
- CPU-intensive encryption
- Storage requirements
- Network bandwidth

## 🔄 CI/CD Pipeline

GitHub Actions automatically:
- ✅ Runs security tests
- ✅ Performs dependency audit
- ✅ Builds Docker images
- ✅ Deploys to production

Configure secrets in GitHub:
- `RAILWAY_TOKEN`
- `RENDER_API_KEY`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

---

**Your SecureAI Bridge is now ready for production! 🎉**

Choose your preferred platform and deploy with confidence knowing your encrypted AI system is enterprise-ready.