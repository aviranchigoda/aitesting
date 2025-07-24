import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import helmet from 'helmet';
import cors from 'cors';
import logger from '../utils/logger.js';

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip || 'unknown',
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900, // 15 minutes
});

const strictRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip || 'unknown',
  points: 10,
  duration: 900, // 15 minutes
});

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
});

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const apiKey = req.headers['x-api-key'];
    
    if (!token && !apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'MISSING_AUTH'
      });
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.authMethod = 'jwt';
      } catch (jwtError) {
        logger.warn(`JWT verification failed: ${jwtError.message}`);
        return res.status(401).json({
          error: 'Invalid JWT token',
          code: 'INVALID_JWT'
        });
      }
    }
    
    if (apiKey) {
      const validApiKey = await validateApiKey(apiKey);
      if (!validApiKey) {
        logger.warn(`Invalid API key attempt from IP: ${req.ip}`);
        return res.status(401).json({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        });
      }
      req.apiKeyData = validApiKey;
      req.authMethod = 'apikey';
    }
    
    req.requestId = req.headers['x-request-id'] || generateRequestId();
    logger.info(`Authenticated request: ${req.requestId} from ${req.ip}`);
    
    next();
  } catch (error) {
    logger.error(`Authentication middleware error: ${error.message}`);
    res.status(500).json({
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

export const rateLimitMiddleware = async (req, res, next) => {
  try {
    const key = req.ip || 'unknown';
    
    // Use strict rate limiting for sensitive endpoints
    const isSensitiveEndpoint = [
      '/process-encrypted',
      '/rotate-keys',
      '/register-client'
    ].some(path => req.path.includes(path));
    
    const limiter = isSensitiveEndpoint ? strictRateLimiter : rateLimiter;
    
    await limiter.consume(key);
    next();
  } catch (rateLimiterError) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(rateLimiterError.msBeforeNext / 1000)
    });
  }
};

export const validateRequest = (req, res, next) => {
  try {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Content-Type must be application/json',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
    
    if (req.body && typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'Request body must be valid JSON',
        code: 'INVALID_JSON'
      });
    }
    
    const maxRequestSize = 10 * 1024 * 1024; // 10MB
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxRequestSize) {
      return res.status(413).json({
        error: 'Request body too large',
        code: 'REQUEST_TOO_LARGE'
      });
    }
    
    if (req.body) {
      const suspiciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /setTimeout\s*\(/gi,
        /setInterval\s*\(/gi
      ];
      
      const bodyString = JSON.stringify(req.body);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bodyString)) {
          logger.warn(`Suspicious request detected from IP: ${req.ip}`);
          return res.status(400).json({
            error: 'Request contains suspicious content',
            code: 'SUSPICIOUS_CONTENT'
          });
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error(`Request validation error: ${error.message}`);
    res.status(500).json({
      error: 'Request validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
};

export const auditMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const auditLog = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      duration,
      authMethod: req.authMethod,
      userId: req.user?.userId || req.apiKeyData?.clientId
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Audit log (error):', auditLog);
    } else {
      logger.info('Audit log:', auditLog);
    }
  });
  
  next();
};

export const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method
  });
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'UNAUTHORIZED'
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      code: 'FILE_TOO_LARGE'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: req.requestId
  });
};

async function validateApiKey(apiKey) {
  try {
    // In production, this would validate against a secure database
    const validKeys = new Map([
      ['demo_key_123', { clientId: 'demo_client', permissions: ['read', 'write'] }],
      ['test_key_456', { clientId: 'test_client', permissions: ['read'] }]
    ]);
    
    return validKeys.get(apiKey) || null;
  } catch (error) {
    logger.error(`API key validation error: ${error.message}`);
    return null;
  }
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn(`IP not whitelisted: ${clientIP}`);
      return res.status(403).json({
        error: 'IP address not allowed',
        code: 'IP_NOT_ALLOWED'
      });
    }
    
    next();
  };
};