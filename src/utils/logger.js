import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const securityLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...extra } = info;
    return `${timestamp} [${level.toUpperCase()}] ${message} ${
      Object.keys(extra).length ? JSON.stringify(extra, null, 2) : ''
    }`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'secureai-bridge' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      level: 'warn',
      format: securityLogFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log') 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(info => {
        const { timestamp, level, message, ...extra } = info;
        return `${timestamp} [${level}] ${message} ${
          Object.keys(extra).length ? JSON.stringify(extra, null, 2) : ''
        }`;
      })
    )
  }));
}

logger.logSecurity = function(event, details = {}) {
  this.warn(`SECURITY_EVENT: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logEncryption = function(operation, success, details = {}) {
  const level = success ? 'info' : 'error';
  this[level](`ENCRYPTION_OPERATION: ${operation}`, {
    operation,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logKeyManagement = function(operation, keyId, success, details = {}) {
  const level = success ? 'info' : 'error';
  this[level](`KEY_MANAGEMENT: ${operation}`, {
    operation,
    keyId,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logAIProcessing = function(requestId, operation, success, processingTime, details = {}) {
  const level = success ? 'info' : 'error';
  this[level](`AI_PROCESSING: ${operation}`, {
    requestId,
    operation,
    success,
    processingTime,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logPerformance = function(operation, duration, metadata = {}) {
  this.info(`PERFORMANCE: ${operation}`, {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

export default logger;