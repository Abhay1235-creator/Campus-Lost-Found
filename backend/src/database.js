const { MongoClient } = require('mongodb');
const { required } = require('./config');

let client;

async function connectDatabase() {
  client = new MongoClient(required('MONGODB_URI'));
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE || 'campus_lost_found');
  await Promise.all([
    db.collection('items').createIndex({ status: 1, createdAt: -1, _id: -1 }),
    db.collection('items').createIndex({ kind: 1, status: 1, createdAt: -1 }),
    db.collection('privateDetails').createIndex({ itemId: 1 }, { unique: true }),
    db.collection('claims').createIndex({ status: 1, createdAt: 1 }),
    db.collection('claims').createIndex(
      { itemId: 1 },
      { unique: true, partialFilterExpression: { status: 'pending' } },
    ),
    db.collection('foundReports').createIndex({ status: 1, createdAt: 1 }),
    db.collection('foundReports').createIndex(
      { itemId: 1 },
      { unique: true, partialFilterExpression: { status: 'pending' } },
    ),
  ]);
  return db;
}

async function closeDatabase() {
  if (client) await client.close();
}

module.exports = { connectDatabase, closeDatabase };
