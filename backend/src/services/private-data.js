const { randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
const { getEncryptionKey } = require('../config');

function encryptPrivatePayload(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    ciphertext: Buffer.concat([ciphertext, cipher.getAuthTag()]).toString('base64'),
    iv: iv.toString('base64'),
    keyVersion: process.env.PRIVATE_DATA_KEY_VERSION || 'v1',
    algorithm: 'aes-256-gcm',
  };
}

function decryptPrivatePayload(record) {
  if (record.algorithm !== 'aes-256-gcm') throw new Error('Unsupported private-data encryption algorithm');
  const encoded = Buffer.from(record.ciphertext, 'base64');
  if (encoded.length < 16) throw new Error('Encrypted private-data payload is invalid');
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(encoded.subarray(encoded.length - 16));
  const plaintext = Buffer.concat([decipher.update(encoded.subarray(0, -16)), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

module.exports = { encryptPrivatePayload, decryptPrivatePayload };
