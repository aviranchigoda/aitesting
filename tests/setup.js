import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-256-bit-for-testing';
process.env.API_KEY_SALT = 'test-api-key-salt-for-testing';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error';

// Mock console methods during tests to reduce noise
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test helpers
global.testHelpers = {
  generateTestData: (size = 10) => {
    return Array(size).fill(0).map((_, i) => ({
      id: i,
      value: Math.random() * 1000,
      timestamp: Date.now()
    }));
  },
  
  createTestClientData: () => ({
    clientId: `test-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    data: {
      sensitive: 'financial data',
      records: Array(5).fill(0).map((_, i) => ({
        id: i,
        amount: Math.random() * 10000,
        type: ['credit', 'debit'][Math.floor(Math.random() * 2)]
      }))
    }
  }),
  
  createTestKeyPair: () => {
    const crypto = require('crypto');
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  }
};

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after tests
afterEach(() => {
  // Clear any test data or reset state if needed
  jest.clearAllMocks();
});