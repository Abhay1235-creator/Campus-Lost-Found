const path = require('node:path');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
require('../../backend/src/config');
const { MongoClient } = backendRequire('mongodb');
const { required } = require('../../backend/src/config');
const { encryptPrivatePayload } = require('../../backend/src/services/private-data');

const DAY_MS = 24 * 60 * 60 * 1000;
const samples = [
  {
    demoKey: 'demo-found-bottle',
    kind: 'found',
    title: 'Green water bottle',
    description: 'Reusable green bottle with a silver lid.',
    category: 'Bottle',
    imageUrl: '/images/demo/green-water-bottle.webp',
    location: 'Main Library',
    daysAgo: 2,
    privateDetails: 'Demo verification clue: there is a small mountain sticker on the underside.',
  },
  {
    demoKey: 'demo-found-umbrella',
    kind: 'found',
    title: 'Black folding umbrella',
    description: 'Compact black umbrella found after the afternoon rain.',
    category: 'Umbrella',
    imageUrl: '/images/demo/black-folding-umbrella.webp',
    location: 'Student Centre',
    daysAgo: 1,
    privateDetails: 'Demo verification clue: the strap has a blue thread repair.',
  },
  {
    demoKey: 'demo-lost-notebook',
    kind: 'lost',
    title: 'Blue lecture notebook',
    description: 'Medium blue notebook with handwritten lecture notes.',
    category: 'Notebook',
    imageUrl: '/images/demo/blue-lecture-notebook.webp',
    location: 'Science Building',
    daysAgo: 3,
    privateDetails: 'Demo private detail: the inside cover has a fictional demo label.',
  },
];

async function seed() {
  const client = new MongoClient(required('MONGODB_URI'));
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'campus_lost_found');
    const items = db.collection('items');
    const privateDetails = db.collection('privateDetails');
    await privateDetails.createIndex({ itemId: 1 }, { unique: true });
    const now = new Date();

    for (const sample of samples) {
      const { demoKey, daysAgo, privateDetails: clue, ...publicFields } = sample;
      const itemFields = {
        ...publicFields,
        status: 'open',
        occurredAt: new Date(now.getTime() - daysAgo * DAY_MS),
        updatedAt: now,
      };
      let item = await items.findOne({ demoKey });
      if (!item) {
        const result = await items.insertOne({ ...itemFields, demoKey, createdAt: now });
        item = { _id: result.insertedId };
      } else {
        await items.updateOne({ _id: item._id }, { $set: itemFields });
      }

      const encrypted = encryptPrivatePayload({
        reporter: { name: 'Demo Reporter', contact: 'demo@example.invalid' },
        privateDetails: clue,
      });
      await privateDetails.updateOne(
        { itemId: item._id },
        { $set: { ...encrypted, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
    }
    console.log(`Seeded ${samples.length} demo reports (safe to run again).`);
  } finally {
    await client.close();
  }
}

seed().catch((error) => {
  console.error(`Demo seed failed: ${error.message}`);
  process.exitCode = 1;
});
