require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getEncryptionKey() {
  const encoded = required('PRIVATE_DATA_KEY');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('PRIVATE_DATA_KEY must be a base64-encoded 32-byte key');
  return key;
}

module.exports = { required, getEncryptionKey };
