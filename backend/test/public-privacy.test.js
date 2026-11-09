const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { ObjectId } = require('mongodb');
const { createApp } = require('../src/app');

const privateSentinels = [
  'PRIVATE_REPORTER_NAME_7fd1',
  'PRIVATE_EMAIL_7fd1@example.invalid',
  'PRIVATE_PHONE_7fd1',
  'PRIVATE_VERIFICATION_CLUE_7fd1',
  'PRIVATE_CLAIMANT_7fd1',
];

function fixture(status, title) {
  return {
    _id: new ObjectId(),
    kind: 'found',
    status,
    title,
    description: 'A green notebook was found near the library.',
    category: 'Notebook',
    location: 'Library',
    occurredAt: new Date('2026-11-01T10:00:00.000Z'),
    imageUrl: null,
    createdAt: new Date('2026-11-01T11:00:00.000Z'),
    updatedAt: new Date('2026-11-01T11:00:00.000Z'),
    reporter: { name: privateSentinels[0], email: privateSentinels[1], phone: privateSentinels[2] },
    privateDetails: privateSentinels[3],
    claimantName: privateSentinels[4],
    moderationNotes: 'PRIVATE_MODERATION_NOTE_7fd1',
  };
}

function matches(document, filter) {
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      if (!value.some((branch) => matches(document, branch))) return false;
    } else if (value instanceof ObjectId) {
      if (!document[key]?.equals(value)) return false;
    } else if (document[key] !== value) {
      return false;
    }
  }
  return true;
}

function createMemoryDb(items) {
  const collection = {
    find(filter) {
      let results = items.filter((item) => matches(item, filter));
      const cursor = {
        sort() { return cursor; },
        skip(count) { results = results.slice(count); return cursor; },
        limit(count) { results = results.slice(0, count); return cursor; },
        // Return the whole fixture intentionally, as a defensive check that the
        // public serializer does not rely only on MongoDB projection behavior.
        async toArray() { return results; },
      };
      return cursor;
    },
    async countDocuments(filter) { return items.filter((item) => matches(item, filter)).length; },
    async findOne(filter) { return items.find((item) => matches(item, filter)) || null; },
  };
  return { collection: (name) => {
    assert.equal(name, 'items');
    return collection;
  } };
}

async function withServer(handler) {
  const items = [
    fixture('open', 'Open item'),
    fixture('pending_review', 'Pending item'),
    fixture('returned', 'Returned item'),
  ];
  const server = createApp(createMemoryDb(items)).listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await handler(baseUrl, items);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function assertNoPrivateData(responseBody) {
  const serialized = JSON.stringify(responseBody);
  for (const sentinel of privateSentinels) assert.equal(serialized.includes(sentinel), false, `${sentinel} leaked`);
  for (const field of ['reporter', 'privateDetails', 'claimantName', 'moderationNotes', 'updatedAt']) {
    assert.equal(Object.hasOwn(responseBody, field), false, `${field} leaked at response root`);
  }
}

test('public board is allowlisted and only returns open items across lifecycle states', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/board`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].title, 'Open item');
    assertNoPrivateData(body);
    assertNoPrivateData(body.items[0]);
    assert.deepEqual(Object.keys(body.items[0]).sort(), [
      'category', 'createdAt', 'description', 'id', 'imageUrl', 'kind', 'location', 'occurredAt', 'title',
    ].sort());
  });
});

test('public item detail hides private fields and conceals non-open lifecycle states', async () => {
  await withServer(async (baseUrl, items) => {
    for (const item of items) {
      const response = await fetch(`${baseUrl}/items/${item._id.toString()}`);
      if (item.status === 'open') {
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.item.title, item.title);
        assertNoPrivateData(body);
        assertNoPrivateData(body.item);
      } else {
        assert.equal(response.status, 404, `${item.status} item should not be publicly retrievable`);
        const body = await response.json();
        assertNoPrivateData(body);
      }
    }
  });
});
