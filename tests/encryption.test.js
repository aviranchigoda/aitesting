import { jest } from '@jest/globals';
import encryptionManager from '../src/crypto/encryptionManager.js';
import homomorphicEncryption from '../src/crypto/homomorphicEncryption.js';

describe('Encryption Manager', () => {
  describe('Symmetric Encryption', () => {
    test('should encrypt and decrypt data successfully', () => {
      const testData = { message: 'sensitive data', value: 12345 };
      const key = encryptionManager.generateKey();
      
      const encrypted = encryptionManager.encryptSymmetric(testData, key);
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      
      const decrypted = encryptionManager.decryptSymmetric(encrypted, key);
      expect(decrypted).toEqual(testData);
    });
    
    test('should fail with wrong key', () => {
      const testData = { message: 'sensitive data' };
      const key1 = encryptionManager.generateKey();
      const key2 = encryptionManager.generateKey();
      
      const encrypted = encryptionManager.encryptSymmetric(testData, key1);
      
      expect(() => {
        encryptionManager.decryptSymmetric(encrypted, key2);
      }).toThrow();
    });
  });
  
  describe('Asymmetric Encryption', () => {
    test('should encrypt and decrypt with key pair', () => {
      const testData = { confidential: 'financial data' };
      const { publicKey, privateKey } = encryptionManager.generateKeyPair();
      
      const encrypted = encryptionManager.encryptAsymmetric(testData, publicKey);
      expect(typeof encrypted).toBe('string');
      
      const decrypted = encryptionManager.decryptAsymmetric(encrypted, privateKey);
      expect(decrypted).toEqual(testData);
    });
  });
  
  describe('Hashing', () => {
    test('should hash data consistently', () => {
      const testData = { id: 123, name: 'test' };
      
      const hash1 = encryptionManager.hashData(testData);
      const hash2 = encryptionManager.hashData(testData, Buffer.from(hash1.salt, 'hex'));
      
      expect(hash1.hash).toBe(hash2.hash);
    });
    
    test('should verify hash correctly', () => {
      const testData = { id: 123, name: 'test' };
      const { hash, salt } = encryptionManager.hashData(testData);
      
      const isValid = encryptionManager.verifyHash(testData, hash, salt);
      expect(isValid).toBe(true);
      
      const isInvalid = encryptionManager.verifyHash({ id: 456 }, hash, salt);
      expect(isInvalid).toBe(false);
    });
  });
});

describe('Homomorphic Encryption', () => {
  test('should encrypt and decrypt numbers', () => {
    const testValue = 42;
    
    const encrypted = homomorphicEncryption.encrypt(testValue);
    expect(typeof encrypted).toBe('string');
    
    const decrypted = homomorphicEncryption.decrypt(encrypted);
    expect(decrypted).toBe(testValue);
  });
  
  test('should perform addition on encrypted values', () => {
    const value1 = 10;
    const value2 = 20;
    
    const encrypted1 = homomorphicEncryption.encrypt(value1);
    const encrypted2 = homomorphicEncryption.encrypt(value2);
    
    const encryptedSum = homomorphicEncryption.addEncrypted(encrypted1, encrypted2);
    const decryptedSum = homomorphicEncryption.decrypt(encryptedSum);
    
    expect(decryptedSum).toBe(value1 + value2);
  });
  
  test('should multiply encrypted value by constant', () => {
    const value = 15;
    const constant = 3;
    
    const encrypted = homomorphicEncryption.encrypt(value);
    const encryptedProduct = homomorphicEncryption.multiplyByConstant(encrypted, constant);
    const decryptedProduct = homomorphicEncryption.decrypt(encryptedProduct);
    
    expect(decryptedProduct).toBe(value * constant);
  });
  
  test('should compute sum operation on multiple encrypted values', () => {
    const values = [5, 10, 15, 20];
    const encryptedValues = values.map(v => homomorphicEncryption.encrypt(v));
    
    const encryptedSum = homomorphicEncryption.computeOnEncryptedData(
      encryptedValues, 
      { type: 'sum' }
    );
    
    const decryptedSum = homomorphicEncryption.decrypt(encryptedSum);
    const expectedSum = values.reduce((a, b) => a + b, 0);
    
    expect(decryptedSum).toBe(expectedSum);
  });
});

describe('Security Validation', () => {
  test('should generate unique keys', () => {
    const key1 = encryptionManager.generateKey();
    const key2 = encryptionManager.generateKey();
    
    expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
  });
  
  test('should generate different IVs for same data', () => {
    const testData = { test: 'data' };
    const key = encryptionManager.generateKey();
    
    const encrypted1 = encryptionManager.encryptSymmetric(testData, key);
    const encrypted2 = encryptionManager.encryptSymmetric(testData, key);
    
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
  });
  
  test('should handle large data sets', () => {
    const largeData = {
      records: Array(1000).fill(0).map((_, i) => ({
        id: i,
        value: Math.random() * 1000,
        timestamp: Date.now()
      }))
    };
    
    const key = encryptionManager.generateKey();
    const encrypted = encryptionManager.encryptSymmetric(largeData, key);
    const decrypted = encryptionManager.decryptSymmetric(encrypted, key);
    
    expect(decrypted.records).toHaveLength(1000);
    expect(decrypted).toEqual(largeData);
  });
  
  test('should handle special characters and unicode', () => {
    const unicodeData = {
      message: 'Special chars: !@#$%^&*()_+{}|:"<>?[]\\;\',./',
      unicode: '测试数据 🔐 العربية русский',
      emoji: '🚀🔒💻🌍🎯'
    };
    
    const key = encryptionManager.generateKey();
    const encrypted = encryptionManager.encryptSymmetric(unicodeData, key);
    const decrypted = encryptionManager.decryptSymmetric(encrypted, key);
    
    expect(decrypted).toEqual(unicodeData);
  });
});

describe('Error Handling', () => {
  test('should throw error for invalid encrypted data', () => {
    const key = encryptionManager.generateKey();
    const invalidEncrypted = {
      encrypted: 'invalid',
      iv: 'invalid',
      authTag: 'invalid'
    };
    
    expect(() => {
      encryptionManager.decryptSymmetric(invalidEncrypted, key);
    }).toThrow();
  });
  
  test('should throw error for invalid homomorphic operations', () => {
    expect(() => {
      homomorphicEncryption.computeOnEncryptedData(['invalid'], { type: 'invalid_operation' });
    }).toThrow();
  });
  
  test('should handle memory cleanup', () => {
    const sensitiveBuffer = Buffer.from('sensitive data');
    encryptionManager.securelyDeleteFromMemory(sensitiveBuffer);
    
    // Buffer should be zeroed out
    expect(sensitiveBuffer.every(byte => byte === 0)).toBe(true);
  });
});