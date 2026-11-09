const { ObjectId } = require('mongodb');

function equal(left, right) {
  if (left instanceof ObjectId && right instanceof ObjectId) return left.equals(right);
  if (left instanceof ObjectId || right instanceof ObjectId) return String(left) === String(right);
  if (right instanceof RegExp) return typeof left === 'string' && right.test(left);
  return left === right;
}

function matches(document, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some((branch) => matches(document, branch));
    return equal(document[key], expected);
  });
}

function createMemoryDatabase() {
  const collections = new Map();

  function collection(name) {
    if (!collections.has(name)) collections.set(name, []);
    const records = collections.get(name);
    return {
      async createIndex() { return 'memory-index'; },
      async insertOne(document) {
        const insertedId = document._id || new ObjectId();
        records.push({ ...document, _id: insertedId });
        return { insertedId, acknowledged: true };
      },
      async deleteOne(filter) {
        const index = records.findIndex((record) => matches(record, filter));
        if (index === -1) return { deletedCount: 0 };
        records.splice(index, 1);
        return { deletedCount: 1 };
      },
      async countDocuments(filter) { return records.filter((record) => matches(record, filter)).length; },
      find(filter) {
        let results = records.filter((record) => matches(record, filter));
        let skipCount = 0;
        let limitCount = Infinity;
        const sortOrder = [];
        const cursor = {
          sort(order) { sortOrder.push(order); return cursor; },
          skip(count) { skipCount = count; return cursor; },
          limit(count) { limitCount = count; return cursor; },
          async toArray() {
            for (const order of sortOrder) {
              const entries = Object.entries(order);
              results = [...results].sort((a, b) => {
                for (const [field, direction] of entries) {
                  const av = a[field] instanceof Date ? a[field].getTime() : a[field];
                  const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
                  if (av < bv) return -direction;
                  if (av > bv) return direction;
                }
                return 0;
              });
            }
            return results.slice(skipCount, skipCount + limitCount);
          },
        };
        return cursor;
      },
      async findOne(filter) { return records.find((record) => matches(record, filter)) || null; },
      async updateOne(filter, update) {
        const record = records.find((entry) => matches(entry, filter));
        if (!record) return { matchedCount: 0, modifiedCount: 0 };
        Object.assign(record, update.$set || {});
        return { matchedCount: 1, modifiedCount: 1 };
      },
      async findOneAndUpdate(filter, update) {
        const record = records.find((entry) => matches(entry, filter));
        if (!record) return null;
        Object.assign(record, update.$set || {});
        return { ...record };
      },
    };
  }

  return { collection };
}

module.exports = { createMemoryDatabase };
