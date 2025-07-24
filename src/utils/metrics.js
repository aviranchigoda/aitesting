import logger from './logger.js';

class MetricsCollector {
  constructor() {
    this.metrics = {
      requestsTotal: 0,
      encryptionOperations: 0,
      decryptionOperations: 0,
      keyRotations: 0,
      processingTime: [],
      errorCount: 0,
      activeConnections: 0
    };
    
    this.startTime = Date.now();
  }

  incrementRequests(endpoint, method, statusCode) {
    this.metrics.requestsTotal++;
    
    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }
    
    logger.info('Request metric recorded', {
      endpoint,
      method,
      statusCode,
      totalRequests: this.metrics.requestsTotal
    });
  }

  recordEncryptionOperation(operation, duration) {
    if (operation === 'encrypt') {
      this.metrics.encryptionOperations++;
    } else if (operation === 'decrypt') {
      this.metrics.decryptionOperations++;
    }
    
    this.metrics.processingTime.push(duration);
    
    // Keep only last 1000 processing times
    if (this.metrics.processingTime.length > 1000) {
      this.metrics.processingTime = this.metrics.processingTime.slice(-1000);
    }
    
    logger.info('Encryption metric recorded', {
      operation,
      duration,
      totalEncryptions: this.metrics.encryptionOperations,
      totalDecryptions: this.metrics.decryptionOperations
    });
  }

  recordKeyRotation() {
    this.metrics.keyRotations++;
    logger.info('Key rotation metric recorded', {
      totalRotations: this.metrics.keyRotations
    });
  }

  setActiveConnections(count) {
    this.metrics.activeConnections = count;
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const avgProcessingTime = this.metrics.processingTime.length > 0 
      ? this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length 
      : 0;

    return {
      ...this.metrics,
      uptime,
      avgProcessingTime,
      requestsPerSecond: this.metrics.requestsTotal / (uptime / 1000),
      errorRate: this.metrics.requestsTotal > 0 ? (this.metrics.errorCount / this.metrics.requestsTotal) : 0
    };
  }

  getPrometheusMetrics() {
    const metrics = this.getMetrics();
    
    return `
# HELP secureai_requests_total Total number of HTTP requests
# TYPE secureai_requests_total counter
secureai_requests_total ${metrics.requestsTotal}

# HELP secureai_encryption_operations_total Total number of encryption operations
# TYPE secureai_encryption_operations_total counter
secureai_encryption_operations_total ${metrics.encryptionOperations}

# HELP secureai_decryption_operations_total Total number of decryption operations
# TYPE secureai_decryption_operations_total counter
secureai_decryption_operations_total ${metrics.decryptionOperations}

# HELP secureai_key_rotations_total Total number of key rotations
# TYPE secureai_key_rotations_total counter
secureai_key_rotations_total ${metrics.keyRotations}

# HELP secureai_errors_total Total number of errors
# TYPE secureai_errors_total counter
secureai_errors_total ${metrics.errorCount}

# HELP secureai_active_connections Current number of active connections
# TYPE secureai_active_connections gauge
secureai_active_connections ${metrics.activeConnections}

# HELP secureai_uptime_seconds Application uptime in seconds
# TYPE secureai_uptime_seconds gauge
secureai_uptime_seconds ${Math.floor(metrics.uptime / 1000)}

# HELP secureai_avg_processing_time_ms Average processing time in milliseconds
# TYPE secureai_avg_processing_time_ms gauge
secureai_avg_processing_time_ms ${metrics.avgProcessingTime}

# HELP secureai_requests_per_second Request rate per second
# TYPE secureai_requests_per_second gauge
secureai_requests_per_second ${metrics.requestsPerSecond}

# HELP secureai_error_rate Error rate as percentage
# TYPE secureai_error_rate gauge
secureai_error_rate ${metrics.errorRate}
`.trim();
  }

  generateHealthReport() {
    const metrics = this.getMetrics();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        uptime: Math.floor(metrics.uptime / 1000),
        totalRequests: metrics.requestsTotal,
        errorRate: metrics.errorRate,
        avgProcessingTime: metrics.avgProcessingTime,
        encryptionOps: metrics.encryptionOperations,
        decryptionOps: metrics.decryptionOperations,
        keyRotations: metrics.keyRotations,
        activeConnections: metrics.activeConnections
      }
    };

    // Determine health status based on metrics
    if (metrics.errorRate > 0.1) { // More than 10% error rate
      health.status = 'unhealthy';
      health.reason = 'High error rate';
    } else if (metrics.avgProcessingTime > 5000) { // More than 5 seconds average
      health.status = 'degraded';
      health.reason = 'High processing time';
    } else if (metrics.activeConnections > 1000) { // Too many connections
      health.status = 'degraded';
      health.reason = 'High connection count';
    }

    return health;
  }

  reset() {
    this.metrics = {
      requestsTotal: 0,
      encryptionOperations: 0,
      decryptionOperations: 0,
      keyRotations: 0,
      processingTime: [],
      errorCount: 0,
      activeConnections: 0
    };
    this.startTime = Date.now();
    
    logger.info('Metrics reset');
  }
}

export const metricsMiddleware = (metricsCollector) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      metricsCollector.incrementRequests(req.path, req.method, res.statusCode);
      
      // Record processing time for API endpoints
      if (req.path.includes('/api/')) {
        metricsCollector.recordEncryptionOperation('processing', duration);
      }
    });
    
    next();
  };
};

export default new MetricsCollector();