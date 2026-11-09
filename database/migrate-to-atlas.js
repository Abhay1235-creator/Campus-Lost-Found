const path = require('node:path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const collections = ['items', 'privateDetails', 'claims', 'foundReports', 'itemImages'];

async function migrate() {
  const sourceUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const sourceName = process.env.MONGODB_DATABASE || 'campus_lost_found';
  const targetUri = process.env.ATLAS_MONGODB_URI;
  const targetName = process.env.ATLAS_MONGODB_DATABASE || sourceName;
  if (!targetUri) throw new Error('Set ATLAS_MONGODB_URI in backend/.env before running the migration.');

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);
  try {
    await Promise.all([sourceClient.connect(), targetClient.connect()]);
    const source = sourceClient.db(sourceName);
    const target = targetClient.db(targetName);
    for (const name of collections) {
      const operations = [];
      const cursor = source.collection(name).find({}).batchSize(20);
      for await (const document of cursor) {
        operations.push({ replaceOne: { filter: { _id: document._id }, replacement: document, upsert: true } });
        if (operations.length === 20) {
          await target.collection(name).bulkWrite(operations, { ordered: false });
          operations.length = 0;
        }
      }
      if (operations.length) await target.collection(name).bulkWrite(operations, { ordered: false });
      console.log(`Migrated collection: ${name}`);
    }
    console.log(`Local data copied to Atlas database: ${targetName}`);
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
}

migrate().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
