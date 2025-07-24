FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for cryptographic operations
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S secureai -u 1001

# Copy application code
COPY --chown=secureai:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown secureai:nodejs logs

# Switch to non-root user
USER secureai

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]