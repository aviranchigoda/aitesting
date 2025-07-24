import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';

describe('API Security Tests', () => {
  describe('Authentication', () => {
    test('should reject requests without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/secure/process-encrypted')
        .send({
          requestId: 'test-123',
          encryptedData: {},
          processingType: 'homomorphic_computation',
          clientPublicKey: 'test-key'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('MISSING_AUTH');
    });
    
    test('should accept valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/secure/register-client')
        .set('X-API-Key', 'demo_key_123')
        .send({
          clientId: 'test-client-001'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
    
    test('should reject invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/secure/register-client')
        .set('X-API-Key', 'invalid-key')
        .send({
          clientId: 'test-client-001'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_API_KEY');
    });
  });
  
  describe('Input Validation', () => {
    test('should reject requests with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/secure/process-encrypted')
        .set('X-API-Key', 'demo_key_123')
        .send({
          requestId: 'test-123'
          // Missing other required fields
        });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_REQUIRED_FIELDS');
    });
    
    test('should reject unsupported processing types', async () => {
      const response = await request(app)
        .post('/api/v1/secure/process-encrypted')
        .set('X-API-Key', 'demo_key_123')
        .send({
          requestId: 'test-123',
          encryptedData: { test: 'data' },
          processingType: 'unsupported_type',
          clientPublicKey: 'test-key'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('UNSUPPORTED_PROCESSING_TYPE');
    });
    
    test('should reject non-JSON content', async () => {
      const response = await request(app)
        .post('/api/v1/secure/process-encrypted')
        .set('X-API-Key', 'demo_key_123')
        .set('Content-Type', 'text/plain')
        .send('not json');
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_CONTENT_TYPE');
    });
    
    test('should detect suspicious content', async () => {
      const response = await request(app)
        .post('/api/v1/secure/register-client')
        .set('X-API-Key', 'demo_key_123')
        .send({
          clientId: '<script>alert("xss")</script>'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SUSPICIOUS_CONTENT');
    });
  });
  
  describe('Rate Limiting', () => {
    test('should apply rate limiting to sensitive endpoints', async () => {
      const promises = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/v1/secure/register-client')
            .set('X-API-Key', 'demo_key_123')
            .send({
              clientId: `test-client-${i}`
            })
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
  
  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });
  
  describe('CORS Configuration', () => {
    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/secure/process-encrypted')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');
      
      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });
});

describe('API Functionality Tests', () => {
  describe('Client Registration', () => {
    test('should register new client successfully', async () => {
      const clientId = `test-client-${Date.now()}`;
      
      const response = await request(app)
        .post('/api/v1/secure/register-client')
        .set('X-API-Key', 'demo_key_123')
        .send({ clientId });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.clientId).toBe(clientId);
      expect(response.body.data).toHaveProperty('publicKey');
      expect(response.body.data).toHaveProperty('keyId');
    });
  });
  
  describe('Encrypted Processing', () => {
    test('should process homomorphic computation request', async () => {
      const response = await request(app)
        .post('/api/v1/secure/process-encrypted')
        .set('X-API-Key', 'demo_key_123')
        .send({
          requestId: 'hm-test-001',
          encryptedData: {
            operations: [{
              type: 'statistical_analysis',
              data: ['encrypted_value_1', 'encrypted_value_2']
            }]
          },
          processingType: 'homomorphic_computation',
          clientPublicKey: '-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA...\n-----END PUBLIC KEY-----'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestId');
      expect(response.body.data).toHaveProperty('result');
      expect(response.body.data.processingType).toBe('homomorphic_computation');
    });
    
    test('should process secure inference request', async () => {
      const response = await request(app)
        .post('/api/v1/secure/process-encrypted')
        .set('X-API-Key', 'demo_key_123')
        .send({
          requestId: 'si-test-001',
          encryptedData: {
            encrypted: 'test_encrypted_data',
            iv: 'test_iv',
            authTag: 'test_auth_tag'
          },
          processingType: 'secure_inference',
          clientPublicKey: '-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA...\n-----END PUBLIC KEY-----'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.processingType).toBe('secure_inference');
    });
  });
  
  describe('Key Management', () => {
    test('should rotate client keys', async () => {
      const response = await request(app)
        .post('/api/v1/secure/rotate-keys')
        .set('X-API-Key', 'demo_key_123')
        .send({
          keyId: 'test-client-key',
          keyType: 'client'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rotated successfully');
    });
    
    test('should revoke client keys', async () => {
      const response = await request(app)
        .post('/api/v1/secure/revoke-key')
        .set('X-API-Key', 'demo_key_123')
        .send({
          clientId: 'test-client-revoke'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('revoked successfully');
    });
    
    test('should check key status', async () => {
      const response = await request(app)
        .get('/api/v1/secure/key-status/test-key?keyType=master')
        .set('X-API-Key', 'demo_key_123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('exists');
    });
  });
  
  describe('Processing Status', () => {
    test('should return processing status', async () => {
      const response = await request(app)
        .get('/api/v1/secure/processing-status/test-request-001')
        .set('X-API-Key', 'demo_key_123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requestId');
      expect(response.body.data).toHaveProperty('status');
    });
  });
  
  describe('Health Check', () => {
    test('should return system health status', async () => {
      const response = await request(app)
        .post('/api/v1/secure/health-check')
        .set('X-API-Key', 'demo_key_123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.services).toHaveProperty('encryption');
      expect(response.body.data.services).toHaveProperty('keyManagement');
      expect(response.body.data.services).toHaveProperty('aiProcessor');
    });
  });
});

describe('Error Handling', () => {
  test('should handle 404 for non-existent endpoints', async () => {
    const response = await request(app)
      .get('/api/v1/secure/non-existent-endpoint')
      .set('X-API-Key', 'demo_key_123');
    
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });
  
  test('should handle internal server errors gracefully', async () => {
    // Test with malformed encrypted data that would cause processing errors
    const response = await request(app)
      .post('/api/v1/secure/process-encrypted')
      .set('X-API-Key', 'demo_key_123')
      .send({
        requestId: 'error-test-001',
        encryptedData: null,
        processingType: 'homomorphic_computation',
        clientPublicKey: 'invalid-key-format'
      });
    
    expect(response.status).toBe(500);
    expect(response.body.code).toBe('PROCESSING_FAILED');
  });
});