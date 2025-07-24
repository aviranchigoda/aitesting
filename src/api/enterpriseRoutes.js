import express from 'express';
import enterpriseVault from '../services/enterpriseVault.js';
import logger from '../utils/logger.js';
import { authMiddleware, rateLimitMiddleware } from '../middleware/security.js';

const router = express.Router();

// Create government-grade secure vault
router.post('/vault/create', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const {
      organizationId,
      classificationLevel,
      jurisdiction,
      complianceRequirements,
      dataResidency,
      accessLevel,
      retentionPolicy,
      keyManagementLevel
    } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required',
        code: 'MISSING_ORGANIZATION_ID'
      });
    }
    
    const config = {
      organizationId,
      classificationLevel: classificationLevel || 'CONFIDENTIAL',
      jurisdiction: jurisdiction || 'US',
      complianceRequirements: complianceRequirements || ['SOC2', 'ISO27001'],
      dataResidency: dataResidency || 'US',
      accessLevel: accessLevel || 'GOVERNMENT_GRADE',
      retentionPolicy: retentionPolicy || { 
        defaultRetention: '7_YEARS',
        autoDestruction: true 
      },
      keyManagementLevel: keyManagementLevel || 'HSM_BACKED'
    };
    
    const result = await enterpriseVault.createSecureVault(config);
    
    logger.info(`Enterprise vault created: ${result.vaultId} for org: ${organizationId}`);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Government-grade secure vault created successfully'
    });
    
  } catch (error) {
    logger.error(`Vault creation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Vault creation failed',
      details: error.message,
      code: 'VAULT_CREATION_FAILED'
    });
  }
});

// Encrypt data with automatic classification
router.post('/vault/:vaultId/encrypt', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { data, metadata } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for encryption',
        code: 'MISSING_DATA'
      });
    }
    
    const defaultMetadata = {
      userContext: req.user || 'system',
      purpose: 'DATA_PROTECTION',
      classification: 'AUTO_DETECT',
      geolocation: req.headers['x-geolocation'] || 'UNKNOWN',
      timestamp: Date.now()
    };
    
    const result = await enterpriseVault.encryptData(
      vaultId,
      data,
      { ...defaultMetadata, ...metadata }
    );
    
    logger.info(`Data encrypted in vault: ${vaultId}, encryption ID: ${result.encryptionId}`);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Data encrypted with government-grade security'
    });
    
  } catch (error) {
    logger.error(`Data encryption failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Data encryption failed',
      details: error.message,
      code: 'ENCRYPTION_FAILED'
    });
  }
});

// Secure data sharing with advanced controls
router.post('/vault/:vaultId/share', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { encryptionId, recipientConfig, sharingPolicy } = req.body;
    
    if (!encryptionId || !recipientConfig) {
      return res.status(400).json({
        success: false,
        error: 'Encryption ID and recipient configuration are required',
        code: 'MISSING_SHARING_CONFIG'
      });
    }
    
    const defaultSharingPolicy = {
      auditRequired: true,
      purposeLimitation: true,
      timeBoxed: true,
      revocable: true,
      immutableLog: true
    };
    
    const result = await enterpriseVault.shareData(
      encryptionId,
      recipientConfig,
      { ...defaultSharingPolicy, ...sharingPolicy }
    );
    
    logger.info(`Secure data sharing configured: ${result.shareId}`);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Secure data sharing configured successfully'
    });
    
  } catch (error) {
    logger.error(`Data sharing failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Data sharing configuration failed',
      details: error.message,
      code: 'SHARING_FAILED'
    });
  }
});

// Multi-jurisdiction compliance check
router.post('/vault/:vaultId/compliance/check', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { targetJurisdictions } = req.body;
    
    if (!targetJurisdictions || !Array.isArray(targetJurisdictions)) {
      return res.status(400).json({
        success: false,
        error: 'Target jurisdictions array is required',
        supportedJurisdictions: ['US', 'EU', 'UK', 'CA', 'AU', 'SG', 'JP'],
        code: 'MISSING_JURISDICTIONS'
      });
    }
    
    const result = await enterpriseVault.ensureComplianceAcrossJurisdictions(
      vaultId,
      targetJurisdictions
    );
    
    logger.info(`Multi-jurisdiction compliance checked: ${result.complianceId}`);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Multi-jurisdiction compliance analysis completed'
    });
    
  } catch (error) {
    logger.error(`Compliance check failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Compliance check failed',
      details: error.message,
      code: 'COMPLIANCE_CHECK_FAILED'
    });
  }
});

// Advanced key rotation
router.post('/vault/:vaultId/keys/rotate', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { rotationPolicy } = req.body;
    
    const defaultRotationPolicy = {
      type: 'SCHEDULED',
      frequency: 'ANNUALLY',
      retainOldKeys: true,
      retentionPeriod: '1_YEAR',
      notificationRequired: true,
      hsmBacked: true
    };
    
    const policy = { ...defaultRotationPolicy, ...rotationPolicy };
    
    const result = await enterpriseVault.rotateKeys(vaultId, policy);
    
    logger.info(`Key rotation completed: ${result.rotationId} for vault: ${vaultId}`);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Key rotation completed successfully'
    });
    
  } catch (error) {
    logger.error(`Key rotation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Key rotation failed',
      details: error.message,
      code: 'KEY_ROTATION_FAILED'
    });
  }
});

// Zero-trust access verification
router.post('/vault/:vaultId/access/verify', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const accessRequest = req.body;
    
    const requiredFields = ['userId', 'action', 'credentials', 'deviceFingerprint'];
    for (const field of requiredFields) {
      if (!accessRequest[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`,
          code: 'MISSING_ACCESS_REQUEST_FIELD'
        });
      }
    }
    
    const result = await enterpriseVault.verifyZeroTrustAccess(vaultId, accessRequest);
    
    logger.info(`Zero-trust access verification: ${result.verificationId}, Access: ${result.accessGranted}`);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Zero-trust access verification completed'
    });
    
  } catch (error) {
    logger.error(`Access verification failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Access verification failed',
      details: error.message,
      code: 'ACCESS_VERIFICATION_FAILED'
    });
  }
});

// Generate comprehensive audit report
router.post('/vault/:vaultId/audit/report', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { reportConfig } = req.body;
    
    const defaultConfig = {
      timeRange: {
        start: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days ago
        end: Date.now()
      },
      auditTypes: [
        'ACCESS_LOGS',
        'DATA_OPERATIONS',
        'KEY_MANAGEMENT',
        'COMPLIANCE_EVENTS',
        'SECURITY_INCIDENTS'
      ],
      complianceFrameworks: ['SOC2', 'ISO27001', 'GDPR'],
      includeMetrics: true,
      outputFormat: 'JSON'
    };
    
    const config = { ...defaultConfig, ...reportConfig };
    
    const result = await enterpriseVault.generateAuditReport(vaultId, config);
    
    logger.info(`Audit report generated: ${result.reportId} for vault: ${vaultId}`);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Comprehensive audit report generated successfully'
    });
    
  } catch (error) {
    logger.error(`Audit report generation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Audit report generation failed',
      details: error.message,
      code: 'AUDIT_REPORT_FAILED'
    });
  }
});

// Generate quantum-resistant keys
router.post('/vault/:vaultId/keys/quantum', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    const { keyConfig } = req.body;
    
    const defaultConfig = {
      keyType: 'ASYMMETRIC',
      keyPurpose: 'ENCRYPTION',
      keyStrength: 256,
      algorithm: 'CRYSTALS_KYBER_1024',
      validityPeriod: 31536000000, // 1 year
      escrowRequired: false
    };
    
    const config = { ...defaultConfig, ...keyConfig };
    
    const result = await enterpriseVault.generateQuantumResistantKeys(vaultId, config);
    
    logger.info(`Quantum-resistant key generated: ${result.keyId} for vault: ${vaultId}`);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Quantum-resistant key generated successfully'
    });
    
  } catch (error) {
    logger.error(`Quantum key generation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Quantum key generation failed',
      details: error.message,
      code: 'QUANTUM_KEY_FAILED'
    });
  }
});

// Get vault status and metrics
router.get('/vault/:vaultId/status', authMiddleware, async (req, res) => {
  try {
    const { vaultId } = req.params;
    
    const status = enterpriseVault.getVaultStatus(vaultId);
    
    res.status(200).json({
      success: true,
      data: status,
      message: 'Vault status retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Vault status retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vault status',
      details: error.message,
      code: 'VAULT_STATUS_FAILED'
    });
  }
});

// Get all vaults for organization
router.get('/organization/:orgId/vaults', authMiddleware, async (req, res) => {
  try {
    const { orgId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const vaults = enterpriseVault.getAllVaults(orgId);
    const limitedVaults = vaults.slice(0, limit);
    
    res.status(200).json({
      success: true,
      data: {
        vaults: limitedVaults,
        total: vaults.length,
        organizationId: orgId
      },
      message: 'Organization vaults retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Organization vaults retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve organization vaults',
      details: error.message,
      code: 'ORG_VAULTS_FAILED'
    });
  }
});

// Get supported classification levels
router.get('/classification-levels', async (req, res) => {
  try {
    const classificationLevels = [
      {
        level: 'TOP_SECRET',
        description: 'Exceptionally grave damage to national security',
        encryptionStandard: 'AES_256_XTS_QUANTUM_RESISTANT',
        keyManagement: 'HSM_REQUIRED',
        auditLevel: 'CONTINUOUS',
        retentionRequirement: 'PERMANENT_UNTIL_DECLASSIFIED',
        accessControls: ['BIOMETRIC', 'MULTI_FACTOR', 'COMPARTMENTALIZED']
      },
      {
        level: 'SECRET',
        description: 'Serious damage to national security',
        encryptionStandard: 'AES_256_GCM',
        keyManagement: 'HSM_RECOMMENDED',
        auditLevel: 'COMPREHENSIVE',
        retentionRequirement: '25_YEARS',
        accessControls: ['MULTI_FACTOR', 'NEED_TO_KNOW']
      },
      {
        level: 'CONFIDENTIAL',
        description: 'Damage to national security',
        encryptionStandard: 'AES_256_CBC',
        keyManagement: 'ENTERPRISE_GRADE',
        auditLevel: 'STANDARD',
        retentionRequirement: '10_YEARS',
        accessControls: ['MULTI_FACTOR', 'ROLE_BASED']
      },
      {
        level: 'UNCLASSIFIED',
        description: 'No damage to national security',
        encryptionStandard: 'AES_256',
        keyManagement: 'STANDARD',
        auditLevel: 'BASIC',
        retentionRequirement: '7_YEARS',
        accessControls: ['AUTHENTICATION_REQUIRED']
      }
    ];
    
    res.status(200).json({
      success: true,
      data: {
        classificationLevels,
        totalLevels: classificationLevels.length
      },
      message: 'Classification levels retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Classification levels retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve classification levels',
      details: error.message,
      code: 'CLASSIFICATION_LEVELS_FAILED'
    });
  }
});

// Get supported compliance frameworks
router.get('/compliance/frameworks', async (req, res) => {
  try {
    const frameworks = [
      {
        id: 'SOC2_TYPE_II',
        name: 'SOC 2 Type II',
        jurisdiction: 'US',
        description: 'Security, availability, processing integrity, confidentiality, and privacy',
        auditFrequency: 'ANNUAL',
        keyRequirements: ['ACCESS_CONTROLS', 'AUDIT_LOGGING', 'ENCRYPTION', 'INCIDENT_RESPONSE']
      },
      {
        id: 'ISO27001',
        name: 'ISO/IEC 27001',
        jurisdiction: 'INTERNATIONAL',
        description: 'Information security management systems',
        auditFrequency: 'TRIENNIAL',
        keyRequirements: ['RISK_MANAGEMENT', 'SECURITY_CONTROLS', 'CONTINUOUS_IMPROVEMENT']
      },
      {
        id: 'GDPR',
        name: 'General Data Protection Regulation',
        jurisdiction: 'EU',
        description: 'Data protection and privacy for EU individuals',
        auditFrequency: 'CONTINUOUS',
        keyRequirements: ['CONSENT_MANAGEMENT', 'DATA_PROTECTION_BY_DESIGN', 'BREACH_NOTIFICATION']
      },
      {
        id: 'FISMA',
        name: 'Federal Information Security Management Act',
        jurisdiction: 'US_FEDERAL',
        description: 'Federal information and information systems protection',
        auditFrequency: 'ANNUAL',
        keyRequirements: ['NIST_CONTROLS', 'CONTINUOUS_MONITORING', 'INCIDENT_RESPONSE']
      },
      {
        id: 'FEDRAMP',
        name: 'Federal Risk and Authorization Management Program',
        jurisdiction: 'US_FEDERAL',
        description: 'Cloud services security for federal agencies',
        auditFrequency: 'ANNUAL',
        keyRequirements: ['NIST_800_53', 'CONTINUOUS_MONITORING', 'BOUNDARY_PROTECTION']
      }
    ];
    
    res.status(200).json({
      success: true,
      data: {
        frameworks,
        totalFrameworks: frameworks.length
      },
      message: 'Compliance frameworks retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Compliance frameworks retrieval failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve compliance frameworks',
      details: error.message,
      code: 'FRAMEWORKS_FAILED'
    });
  }
});

// Get enterprise capabilities overview
router.get('/capabilities', async (req, res) => {
  try {
    const capabilities = {
      encryption: {
        algorithms: ['AES_256_XTS', 'AES_256_GCM', 'AES_256_CBC', 'ChaCha20_Poly1305'],
        quantumResistant: ['CRYSTALS_KYBER', 'CRYSTALS_DILITHIUM', 'SPHINCS_PLUS'],
        keyManagement: ['HSM_BACKED', 'SOFTWARE_BASED', 'HYBRID'],
        keyRotation: 'AUTOMATED',
        keyEscrow: 'SUPPORTED'
      },
      compliance: {
        frameworks: ['SOC2', 'ISO27001', 'GDPR', 'FISMA', 'FEDRAMP', 'HIPAA', 'PCI_DSS'],
        auditReporting: 'AUTOMATED',
        continuousMonitoring: 'ENABLED',
        immutableLogs: 'BLOCKCHAIN_BACKED'
      },
      accessControl: {
        zeroTrust: 'NATIVE',
        multiFactorAuth: 'REQUIRED',
        biometricAuth: 'SUPPORTED',
        contextualAccess: 'AI_POWERED',
        geofencing: 'ENABLED'
      },
      dataGovernance: {
        classification: 'AUTOMATIC',
        retention: 'POLICY_BASED',
        disposition: 'SECURE_DELETION',
        lineage: 'TRACKED',
        privacy: 'PRIVACY_BY_DESIGN'
      },
      infrastructure: {
        deployment: ['CLOUD', 'ON_PREMISES', 'HYBRID'],
        scalability: 'ENTERPRISE_GRADE',
        availability: '99.99%_SLA',
        disasterRecovery: 'MULTI_REGION',
        backups: 'ENCRYPTED_AUTOMATED'
      }
    };
    
    res.status(200).json({
      success: true,
      data: capabilities,
      message: 'Enterprise capabilities overview retrieved successfully'
    });
    
  } catch (error) {
    logger.error(`Capabilities overview failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve capabilities overview',
      details: error.message,
      code: 'CAPABILITIES_FAILED'
    });
  }
});

export default router;