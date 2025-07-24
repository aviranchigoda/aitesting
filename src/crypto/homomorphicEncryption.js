import forge from 'node-forge';
import logger from '../utils/logger';
import crypto from 'crypto';

export class HomomorphicEncryption {
  constructor() {
    this.modulus = null;
    this.publicKey = null;
    this.privateKey = null;
    this.initializePaillier();
  }

  initializePaillier() {
    const keySize = 1024;
    const p = forge.jsbn.BigInteger.probablePrime(keySize / 2, forge.random);
    const q = forge.jsbn.BigInteger.probablePrime(keySize / 2, forge.random);
    
    this.modulus = p.multiply(q);
    this.lambda = this.lcm(p.subtract(forge.jsbn.BigInteger.ONE), q.subtract(forge.jsbn.BigInteger.ONE));
    
    this.publicKey = {
      n: this.modulus,
      g: this.modulus.add(forge.jsbn.BigInteger.ONE)
    };
    
    this.privateKey = {
      lambda: this.lambda,
      mu: this.modInverse(this.lambda, this.modulus)
    };
  }

  lcm(a, b) {
    return a.multiply(b).divide(this.gcd(a, b));
  }

  gcd(a, b) {
    while (!b.equals(forge.jsbn.BigInteger.ZERO)) {
      const temp = b;
      b = a.mod(b);
      a = temp;
    }
    return a;
  }

  modInverse(a, m) {
    return a.modInverse(m);
  }

  encrypt(plaintext) {
    try {
      const m = new forge.jsbn.BigInteger(plaintext.toString());
      const r = new forge.jsbn.BigInteger(forge.util.bytesToHex(forge.random.getBytesSync(32)), 16);
      const n = this.publicKey.n;
      const g = this.publicKey.g;
      const nSquared = n.multiply(n);
      
      const gm = g.modPow(m, nSquared);
      const rn = r.modPow(n, nSquared);
      const ciphertext = gm.multiply(rn).mod(nSquared);
      
      return ciphertext.toString(16);
    } catch (error) {
      throw new Error(`Homomorphic encryption failed: ${error.message}`);
    }
  }

  decrypt(ciphertext) {
    try {
      const c = new forge.jsbn.BigInteger(ciphertext, 16);
      const n = this.publicKey.n;
      const nSquared = n.multiply(n);
      const lambda = this.privateKey.lambda;
      const mu = this.privateKey.mu;
      
      const u = c.modPow(lambda, nSquared);
      const l = u.subtract(forge.jsbn.BigInteger.ONE).divide(n);
      const plaintext = l.multiply(mu).mod(n);
      
      return parseInt(plaintext.toString(10));
    } catch (error) {
      throw new Error(`Homomorphic decryption failed: ${error.message}`);
    }
  }

  addEncrypted(ciphertext1, ciphertext2) {
    try {
      const c1 = new forge.jsbn.BigInteger(ciphertext1, 16);
      const c2 = new forge.jsbn.BigInteger(ciphertext2, 16);
      const n = this.publicKey.n;
      const nSquared = n.multiply(n);
      
      const result = c1.multiply(c2).mod(nSquared);
      return result.toString(16);
    } catch (error) {
      throw new Error(`Homomorphic addition failed: ${error.message}`);
    }
  }

  multiplyByConstant(ciphertext, constant) {
    try {
      const c = new forge.jsbn.BigInteger(ciphertext, 16);
      const k = new forge.jsbn.BigInteger(constant.toString());
      const n = this.publicKey.n;
      const nSquared = n.multiply(n);
      
      const result = c.modPow(k, nSquared);
      return result.toString(16);
    } catch (error) {
      throw new Error(`Homomorphic multiplication failed: ${error.message}`);
    }
  }

  computeOnEncryptedData(encryptedValues, operation) {
    try {
      switch (operation.type) {
        case 'sum':
          return encryptedValues.reduce((acc, val) => this.addEncrypted(acc, val));
        
        case 'average':
          const sum = encryptedValues.reduce((acc, val) => this.addEncrypted(acc, val));
          return this.multiplyByConstant(sum, 1 / encryptedValues.length);
        
        case 'weightedSum':
          return encryptedValues.reduce((acc, val, idx) => {
            const weighted = this.multiplyByConstant(val, operation.weights[idx]);
            return acc ? this.addEncrypted(acc, weighted) : weighted;
          }, null);
        
        default:
          throw new Error(`Unsupported operation: ${operation.type}`);
      }
    } catch (error) {
      throw new Error(`Computation on encrypted data failed: ${error.message}`);
    }
  }

  // New methods for AI Battle Arena
  async encryptDataset(dataset) {
    try {
      logger.info('Encrypting dataset for AI battle arena');
      
      const encryptedDataset = {
        id: crypto.randomUUID(),
        type: dataset.type || 'generic',
        encryptedData: [],
        metadata: {
          originalSize: dataset.size || 1000,
          encryptionTimestamp: Date.now(),
          algorithm: 'PAILLIER_HOMOMORPHIC'
        }
      };
      
      // Simulate encrypting each data point
      for (let i = 0; i < (dataset.size || 1000); i++) {
        const encryptedPoint = this.encrypt(Math.random() * 100);
        encryptedDataset.encryptedData.push(encryptedPoint);
      }
      
      logger.info(`Dataset encrypted: ${encryptedDataset.id}`);
      return encryptedDataset;
      
    } catch (error) {
      logger.error(`Dataset encryption failed: ${error.message}`);
      throw new Error(`Dataset encryption failed: ${error.message}`);
    }
  }

  async performInference(encryptedDataset, modelWeights) {
    try {
      logger.info('Performing homomorphic inference on encrypted dataset');
      
      const predictions = [];
      const weights = modelWeights === 'ENCRYPTED_WEIGHTS' ? 
        [0.3, 0.4, 0.3] : // Default weights
        modelWeights;
      
      // Simulate inference on encrypted data
      for (let i = 0; i < Math.min(encryptedDataset.encryptedData.length, 100); i++) {
        const encryptedInput = encryptedDataset.encryptedData[i];
        
        // Homomorphic computation: prediction = sum(weights * inputs)
        const prediction = this.computeOnEncryptedData([encryptedInput], {
          type: 'weightedSum',
          weights: weights.slice(0, 1)
        });
        
        predictions.push(prediction);
      }
      
      logger.info(`Homomorphic inference completed: ${predictions.length} predictions`);
      return {
        predictions,
        metadata: {
          inferenceTime: Date.now(),
          predictionCount: predictions.length,
          encrypted: true
        }
      };
      
    } catch (error) {
      logger.error(`Homomorphic inference failed: ${error.message}`);
      throw new Error(`Homomorphic inference failed: ${error.message}`);
    }
  }

  getPublicKey() {
    return {
      n: this.publicKey.n.toString(16),
      g: this.publicKey.g.toString(16)
    };
  }
}

export default new HomomorphicEncryption();