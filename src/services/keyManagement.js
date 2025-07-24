import crypto from 'crypto';
import encryptionManager from '../crypto/encryptionManager.js';
import logger from '../utils/logger.js';

export class KeyManagementService {
  constructor() {
    this.masterKeys = new Map();
    this.clientKeys = new Map();
    this.keyRotationSchedule = new Map();
    this.keyDerivationIterations = 100000;
  }

  async generateMasterKey(keyId, passphrase = null) {
    try {
      const masterKey = crypto.randomBytes(32);
      const salt = crypto.randomBytes(16);
      
      let encryptedMasterKey;
      if (passphrase) {
        const derivedKey = crypto.pbkdf2Sync(passphrase, salt, this.keyDerivationIterations, 32, 'sha512');
        encryptedMasterKey = encryptionManager.encryptSymmetric(masterKey, derivedKey);
        encryptionManager.securelyDeleteFromMemory(derivedKey);
      } else {
        encryptedMasterKey = masterKey;
      }
      
      this.masterKeys.set(keyId, {
        encryptedKey: encryptedMasterKey,
        salt: salt.toString('hex'),
        createdAt: new Date().toISOString(),
        lastRotated: new Date().toISOString(),
        usageCount: 0
      });
      
      this.scheduleKeyRotation(keyId, 30 * 24 * 60 * 60 * 1000); // 30 days
      
      encryptionManager.securelyDeleteFromMemory(masterKey);
      logger.info(`Master key generated for keyId: ${keyId}`);
      
      return keyId;
    } catch (error) {
      logger.error(`Master key generation failed: ${error.message}`);
      throw new Error(`Master key generation failed: ${error.message}`);
    }
  }

  async getMasterKey(keyId, passphrase = null) {
    try {
      const keyData = this.masterKeys.get(keyId);
      if (!keyData) {
        throw new Error(`Master key not found: ${keyId}`);
      }
      
      let masterKey;
      if (passphrase) {
        const derivedKey = crypto.pbkdf2Sync(
          passphrase, 
          Buffer.from(keyData.salt, 'hex'), 
          this.keyDerivationIterations, 
          32, 
          'sha512'
        );
        masterKey = encryptionManager.decryptSymmetric(keyData.encryptedKey, derivedKey);
        encryptionManager.securelyDeleteFromMemory(derivedKey);
      } else {
        masterKey = keyData.encryptedKey;
      }
      
      keyData.usageCount++;
      keyData.lastUsed = new Date().toISOString();
      
      return masterKey;
    } catch (error) {
      logger.error(`Master key retrieval failed for ${keyId}: ${error.message}`);
      throw new Error(`Master key retrieval failed: ${error.message}`);
    }
  }

  async generateClientKeyPair(clientId) {
    try {
      const { publicKey, privateKey } = encryptionManager.generateKeyPair();
      const sessionKey = encryptionManager.generateKey();
      
      const keyPairData = {
        clientId,
        publicKey,
        privateKey: encryptionManager.encryptSymmetric(privateKey, sessionKey),
        sessionKey: sessionKey.toString('hex'),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        isActive: true
      };
      
      this.clientKeys.set(clientId, keyPairData);
      
      logger.info(`Client key pair generated for clientId: ${clientId}`);
      return {
        clientId,
        publicKey,
        keyId: clientId
      };
    } catch (error) {
      logger.error(`Client key pair generation failed for ${clientId}: ${error.message}`);
      throw new Error(`Client key pair generation failed: ${error.message}`);
    }
  }

  async getClientPrivateKey(clientId) {
    try {
      const keyData = this.clientKeys.get(clientId);
      if (!keyData) {
        throw new Error(`Client key not found: ${clientId}`);
      }
      
      if (!keyData.isActive) {
        throw new Error(`Client key is inactive: ${clientId}`);
      }
      
      if (new Date() > new Date(keyData.expiresAt)) {
        throw new Error(`Client key has expired: ${clientId}`);
      }
      
      const sessionKey = Buffer.from(keyData.sessionKey, 'hex');
      const privateKey = encryptionManager.decryptSymmetric(keyData.privateKey, sessionKey);
      
      return privateKey;
    } catch (error) {
      logger.error(`Client private key retrieval failed for ${clientId}: ${error.message}`);
      throw new Error(`Client private key retrieval failed: ${error.message}`);
    }
  }

  async rotateKey(keyId, keyType = 'master') {
    try {
      if (keyType === 'master') {
        const oldKeyData = this.masterKeys.get(keyId);
        if (!oldKeyData) {
          throw new Error(`Master key not found for rotation: ${keyId}`);
        }
        
        const newMasterKey = crypto.randomBytes(32);
        const salt = crypto.randomBytes(16);
        
        const rotatedKeyData = {
          ...oldKeyData,
          encryptedKey: newMasterKey,
          salt: salt.toString('hex'),
          lastRotated: new Date().toISOString(),
          rotationCount: (oldKeyData.rotationCount || 0) + 1
        };
        
        this.masterKeys.set(keyId, rotatedKeyData);
        this.scheduleKeyRotation(keyId, 30 * 24 * 60 * 60 * 1000);
        
        encryptionManager.securelyDeleteFromMemory(newMasterKey);
        logger.info(`Master key rotated for keyId: ${keyId}`);
        
      } else if (keyType === 'client') {
        await this.revokeClientKey(keyId);
        await this.generateClientKeyPair(keyId);
        logger.info(`Client key rotated for clientId: ${keyId}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Key rotation failed for ${keyId}: ${error.message}`);
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  scheduleKeyRotation(keyId, intervalMs) {
    if (this.keyRotationSchedule.has(keyId)) {
      clearTimeout(this.keyRotationSchedule.get(keyId));
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        await this.rotateKey(keyId, 'master');
        logger.info(`Automatic key rotation completed for keyId: ${keyId}`);
      } catch (error) {
        logger.error(`Automatic key rotation failed for ${keyId}: ${error.message}`);
      }
    }, intervalMs);
    
    this.keyRotationSchedule.set(keyId, timeoutId);
  }

  async revokeClientKey(clientId) {
    try {
      const keyData = this.clientKeys.get(clientId);
      if (keyData) {
        keyData.isActive = false;
        keyData.revokedAt = new Date().toISOString();
        
        const sessionKey = Buffer.from(keyData.sessionKey, 'hex');
        encryptionManager.securelyDeleteFromMemory(sessionKey);
        
        logger.info(`Client key revoked for clientId: ${clientId}`);
      }
      return true;
    } catch (error) {
      logger.error(`Client key revocation failed for ${clientId}: ${error.message}`);
      throw new Error(`Client key revocation failed: ${error.message}`);
    }
  }

  async deriveKeyFromMaster(masterKeyId, purpose, salt = null) {
    try {
      const masterKey = await this.getMasterKey(masterKeyId);
      const actualSalt = salt || crypto.randomBytes(16);
      const purposeBuffer = Buffer.from(purpose, 'utf8');
      
      const derivedKey = crypto.pbkdf2Sync(
        Buffer.concat([masterKey, purposeBuffer]),
        actualSalt,
        this.keyDerivationIterations,
        32,
        'sha512'
      );
      
      encryptionManager.securelyDeleteFromMemory(masterKey);
      
      return {
        derivedKey,
        salt: actualSalt.toString('hex'),
        purpose
      };
    } catch (error) {
      logger.error(`Key derivation failed: ${error.message}`);
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }

  getKeyStatus(keyId, keyType = 'master') {
    try {
      if (keyType === 'master') {
        const keyData = this.masterKeys.get(keyId);
        if (!keyData) return { exists: false };
        
        return {
          exists: true,
          createdAt: keyData.createdAt,
          lastRotated: keyData.lastRotated,
          lastUsed: keyData.lastUsed,
          usageCount: keyData.usageCount,
          rotationCount: keyData.rotationCount || 0
        };
      } else if (keyType === 'client') {
        const keyData = this.clientKeys.get(keyId);
        if (!keyData) return { exists: false };
        
        return {
          exists: true,
          clientId: keyData.clientId,
          createdAt: keyData.createdAt,
          expiresAt: keyData.expiresAt,
          isActive: keyData.isActive,
          revokedAt: keyData.revokedAt
        };
      }
    } catch (error) {
      logger.error(`Key status check failed for ${keyId}: ${error.message}`);
      return { exists: false, error: error.message };
    }
  }

  async cleanupExpiredKeys() {
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [clientId, keyData] of this.clientKeys.entries()) {
        if (new Date(keyData.expiresAt) < now) {
          await this.revokeClientKey(clientId);
          this.clientKeys.delete(clientId);
          cleanedCount++;
        }
      }
      
      logger.info(`Cleaned up ${cleanedCount} expired client keys`);
      return cleanedCount;
    } catch (error) {
      logger.error(`Key cleanup failed: ${error.message}`);
      throw new Error(`Key cleanup failed: ${error.message}`);
    }
  }
}

export default new KeyManagementService();