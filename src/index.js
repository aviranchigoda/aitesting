import express from 'express';
import dotenv from 'dotenv';
import { securityHeaders, corsConfig, auditMiddleware, errorHandler } from './middleware/security.js';
import secureRoutes from './api/secureRoutes.js';
import playgroundRoutes from './api/playgroundRoutes.js';
import enterpriseRoutes from './api/enterpriseRoutes.js';
import keyManagement from './services/keyManagement.js';
import logger from './utils/logger.js';
import metricsCollector, { metricsMiddleware } from './utils/metrics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(securityHeaders);
app.use(corsConfig);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(auditMiddleware);
app.use(metricsMiddleware(metricsCollector));

// API Routes
app.use('/api/v1/secure', secureRoutes);
app.use('/api/v1/playground', playgroundRoutes);
app.use('/api/v1/enterprise', enterpriseRoutes);

// Static files for both playground and enterprise vault
app.use('/playground', express.static('public'));
app.use('/enterprise', express.static('public'));

app.get('/health', (req, res) => {
  const healthReport = metricsCollector.generateHealthReport();
  res.status(healthReport.status === 'healthy' ? 200 : 503).json({
    ...healthReport,
    service: 'SecureAI Bridge',
    version: '1.0.0',
    features: {
      aiPlayground: 'ACTIVE',
      quantumEncryption: 'ENABLED',
      zkProofs: 'ENABLED',
      realTimeBattles: 'ENABLED',
      enterpriseVault: 'ACTIVE',
      governmentGrade: 'ENABLED',
      zeroTrustAccess: 'ENABLED',
      quantumResistant: 'ENABLED',
      multiJurisdiction: 'ENABLED',
      hsmIntegration: 'ENABLED',
      immutableAudit: 'ENABLED'
    }
  });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsCollector.getPrometheusMetrics());
});

app.get('/health/detailed', (req, res) => {
  const metrics = metricsCollector.getMetrics();
  res.status(200).json({
    status: 'healthy',
    service: 'SecureAI Bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      nodeVersion: process.version
    },
    metrics
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'SecureAI Bridge - Encrypted AI Data Processing System',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1/secure',
      documentation: '/docs'
    },
    features: [
      'Homomorphic Encryption',
      'Secure Multi-party Computation',
      'Privacy-preserving AI',
      'Zero-knowledge Proofs',
      'Hardware Security Module Integration'
    ]
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    message: 'The requested endpoint does not exist'
  });
});

app.use(errorHandler);

async function initializeSystem() {
  try {
    logger.info('Initializing SecureAI Bridge system...');
    
    const requiredEnvVars = [
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'API_KEY_SALT'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
    
    await keyManagement.generateMasterKey('system_master_key');
    logger.info('System master key generated successfully');
    
    setInterval(async () => {
      try {
        await keyManagement.cleanupExpiredKeys();
      } catch (error) {
        logger.error(`Key cleanup error: ${error.message}`);
      }
    }, 60 * 60 * 1000); // Every hour
    
    logger.info('SecureAI Bridge system initialized successfully');
    
  } catch (error) {
    logger.error(`System initialization failed: ${error.message}`);
    process.exit(1);
  }
}

function setupGracefulShutdown() {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    server.close((err) => {
      if (err) {
        logger.error(`Error during shutdown: ${err.message}`);
        process.exit(1);
      }
      
      logger.info('Server closed successfully');
      process.exit(0);
    });
    
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const server = app.listen(PORT, async () => {
  await initializeSystem();
  
  logger.info(`SecureAI Bridge server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Process ID: ${process.pid}`);
  
  setupGracefulShutdown();
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;