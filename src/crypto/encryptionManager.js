import crypto from 'crypto';
import forge from 'node-forge';

export class EncryptionManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keySize = 32; // 256 bits
    this.ivSize = 16;  // 128 bits
    this.tagSize = 16; // 128 bits
  }

  generateKey() {
    return crypto.randomBytes(this.keySize);
  }

  generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    return { publicKey, privateKey };
  }

  encryptSymmetric(data, key) {
    try {
      const iv = crypto.randomBytes(this.ivSize);
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decryptSymmetric(encryptedData, key) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, key, Buffer.from(iv, 'hex'));
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  encryptAsymmetric(data, publicKey) {
    try {
      const buffer = Buffer.from(JSON.stringify(data), 'utf8');
      const encrypted = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, buffer);
      
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`Asymmetric encryption failed: ${error.message}`);
    }
  }

  decryptAsymmetric(encryptedData, privateKey) {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = crypto.privateDecrypt({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, buffer);
      
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      throw new Error(`Asymmetric decryption failed: ${error.message}`);
    }
  }

  hashData(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(JSON.stringify(data), actualSalt, 100000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: actualSalt.toString('hex')
    };
  }

  verifyHash(data, storedHash, salt) {
    const { hash } = this.hashData(data, Buffer.from(salt, 'hex'));
    return hash === storedHash;
  }

  securelyDeleteFromMemory(sensitiveData) {
    if (Buffer.isBuffer(sensitiveData)) {
      sensitiveData.fill(0);
    }
  }
}

export default new EncryptionManager();