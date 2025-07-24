import express from 'express';
import secureAIProcessor from '../services/secureAIProcessor.js';
import keyManagement from '../services/keyManagement.js';
import { authMiddleware, validateRequest, rateLimitMiddleware } from '../middleware/security.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/register-client', rateLimitMiddleware, async (req, res) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        error: 'Client ID is required',
        code: 'MISSING_CLIENT_ID'
      });
    }
    
    const keyPair = await keyManagement.generateClientKeyPair(clientId);
    
    logger.info(`Client registered successfully: ${clientId}`);
    res.status(201).json({
      success: true,
      data: {
        clientId: keyPair.clientId,
        publicKey: keyPair.publicKey,
        keyId: keyPair.keyId
      }
    });
    
  } catch (error) {
    logger.error(`Client registration failed: ${error.message}`);
    res.status(500).json({
      error: 'Client registration failed',
      code: 'REGISTRATION_FAILED'
    });
  }
});

router.post('/process-encrypted', authMiddleware, rateLimitMiddleware, validateRequest, async (req, res) => {
  try {
    const { requestId, encryptedData, processingType, clientPublicKey } = req.body;
    
    if (!requestId || !encryptedData || !processingType || !clientPublicKey) {
      return res.status(400).json({
        error: 'Missing required fields: requestId, encryptedData, processingType, clientPublicKey',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    const supportedTypes = [
      'homomorphic_computation',
      'secure_inference', 
      'privacy_preserving_training',
      'encrypted_analytics'
    ];
    
    if (!supportedTypes.includes(processingType)) {
      return res.status(400).json({
        error: `Unsupported processing type. Supported types: ${supportedTypes.join(', ')}`,
        code: 'UNSUPPORTED_PROCESSING_TYPE'
      });
    }
    
    const result = await secureAIProcessor.processSecureRequest(
      requestId,
      encryptedData,
      processingType,
      clientPublicKey
    );
    
    logger.info(`Secure processing completed for request: ${requestId}`);
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error(`Secure processing failed: ${error.message}`);
    res.status(500).json({
      error: 'Secure processing failed',
      code: 'PROCESSING_FAILED',
      details: error.message
    });
  }
});

router.get('/processing-status/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const status = secureAIProcessor.getProcessingStatus(requestId);
    
    res.status(200).json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error(`Status check failed: ${error.message}`);
    res.status(500).json({
      error: 'Status check failed',
      code: 'STATUS_CHECK_FAILED'
    });
  }
});

router.post('/rotate-keys', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { keyId, keyType } = req.body;
    
    if (!keyId || !keyType) {
      return res.status(400).json({
        error: 'Missing required fields: keyId, keyType',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    if (!['master', 'client'].includes(keyType)) {
      return res.status(400).json({
        error: 'Invalid key type. Must be "master" or "client"',
        code: 'INVALID_KEY_TYPE'
      });
    }
    
    await keyManagement.rotateKey(keyId, keyType);
    
    logger.info(`Key rotation completed for ${keyType} key: ${keyId}`);
    res.status(200).json({
      success: true,
      message: `${keyType} key rotated successfully`,
      keyId
    });
    
  } catch (error) {
    logger.error(`Key rotation failed: ${error.message}`);
    res.status(500).json({
      error: 'Key rotation failed',
      code: 'KEY_ROTATION_FAILED'
    });
  }
});

router.post('/revoke-key', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        error: 'Client ID is required',
        code: 'MISSING_CLIENT_ID'
      });
    }
    
    await keyManagement.revokeClientKey(clientId);
    
    logger.info(`Client key revoked: ${clientId}`);
    res.status(200).json({
      success: true,
      message: 'Client key revoked successfully',
      clientId
    });
    
  } catch (error) {
    logger.error(`Key revocation failed: ${error.message}`);
    res.status(500).json({
      error: 'Key revocation failed',
      code: 'KEY_REVOCATION_FAILED'
    });
  }
});

router.get('/key-status/:keyId', authMiddleware, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { keyType = 'master' } = req.query;
    
    const status = keyManagement.getKeyStatus(keyId, keyType);
    
    res.status(200).json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error(`Key status check failed: ${error.message}`);
    res.status(500).json({
      error: 'Key status check failed',
      code: 'KEY_STATUS_FAILED'
    });
  }
});

router.get('/homomorphic-public-key', async (req, res) => {
  try {
    const { default: homomorphicEncryption } = await import('../crypto/homomorphicEncryption.js');
    const publicKey = homomorphicEncryption.getPublicKey();
    
    res.status(200).json({
      success: true,
      data: {
        publicKey,
        algorithm: 'Paillier',
        keySize: 1024
      }
    });
    
  } catch (error) {
    logger.error(`Public key retrieval failed: ${error.message}`);
    res.status(500).json({
      error: 'Public key retrieval failed',
      code: 'PUBLIC_KEY_FAILED'
    });
  }
});

router.post('/health-check', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        encryption: 'operational',
        keyManagement: 'operational',
        aiProcessor: 'operational'
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
    
    res.status(200).json({
      success: true,
      data: healthData
    });
    
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({
      error: 'Health check failed',
      code: 'HEALTH_CHECK_FAILED'
    });
  }
});

router.use((error, req, res, next) => {
  logger.error(`API Error: ${error.message}`);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.message
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized access',
      code: 'UNAUTHORIZED'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

export default router;