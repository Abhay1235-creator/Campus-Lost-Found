const express = require('express');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const { encryptPrivatePayload } = require('../services/private-data');
const { toPublicItem } = require('../serializers/public-item');
const { processItemImage } = require('../services/item-image');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
const publicProjection = {
  _id: 1, kind: 1, title: 1, description: 1, category: 1,
  location: 1, occurredAt: 1, imageUrl: 1, createdAt: 1,
};
const statuses = new Set(['open', 'pending_review', 'returned']);
const kinds = new Set(['lost', 'found']);

function cleanString(value, name, maxLength, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    const error = new Error(`${name} must be a non-empty string of at most ${maxLength} characters`);
    error.status = 400;
    error.code = 'INVALID_FIELD';
    throw error;
  }
  return value.trim();
}

router.post('/items', upload.single('image'), async (req, res, next) => {
  let imageId;
  let itemId;
  try {
    const body = req.body || {};
    if (!req.file) {
      return res.status(400).json({ error: { code: 'IMAGE_REQUIRED', message: 'Please upload an item image' } });
    }
    if (!kinds.has(body.kind)) {
      return res.status(400).json({ error: { code: 'INVALID_KIND', message: 'kind must be lost or found' } });
    }
    const title = cleanString(body.title, 'title', 120);
    const description = cleanString(body.description, 'description', 2000);
    const category = cleanString(body.category, 'category', 80);
    const location = cleanString(body.location, 'location', 120);
    const occurredAt = new Date(body.occurredAt);
    if (!body.occurredAt || Number.isNaN(occurredAt.getTime())) {
      return res.status(400).json({ error: { code: 'INVALID_DATE', message: 'occurredAt must be a valid date' } });
    }
    const processedImage = await processItemImage(req.file.buffer);
    const now = new Date();
    imageId = new ObjectId();
    await req.db.collection('itemImages').insertOne({
      _id: imageId,
      data: processedImage.data,
      contentType: 'image/webp',
      width: processedImage.width,
      height: processedImage.height,
      createdAt: now,
    });
    const item = {
      kind: body.kind,
      status: 'open',
      title,
      description,
      category,
      location,
      occurredAt,
      imageUrl: `/images/${imageId.toString()}`,
      createdAt: now,
      updatedAt: now,
    };
    const reporterName = cleanString(body.reporterName, 'reporterName', 120, { optional: true });
    const reporterContact = cleanString(body.reporterContact, 'reporterContact', 320, { optional: true });
    const privateDetails = cleanString(body.privateDetails, 'privateDetails', 1500, { optional: true });
    const hasPrivateData = Boolean(reporterName || reporterContact || privateDetails);
    const privateRecord = hasPrivateData ? encryptPrivatePayload({
      reporter: { name: reporterName || '', contact: reporterContact || '' },
      privateDetails: privateDetails || '',
    }) : null;

    try {
      const result = await req.db.collection('items').insertOne(item);
      item._id = result.insertedId;
      itemId = result.insertedId;
      if (privateRecord) {
        await req.db.collection('privateDetails').insertOne({
          itemId: item._id,
          ...privateRecord,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error) {
      if (itemId) await req.db.collection('items').deleteOne({ _id: itemId }).catch(() => {});
      if (itemId) await req.db.collection('privateDetails').deleteOne({ itemId }).catch(() => {});
      await req.db.collection('itemImages').deleteOne({ _id: imageId }).catch(() => {});
      throw error;
    }
    return res.status(201).json({ item: toPublicItem(item) });
  } catch (error) {
    if (imageId && !itemId) await req.db.collection('itemImages').deleteOne({ _id: imageId }).catch(() => {});
    next(error);
  }
});

router.get('/images/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image not found' } });
    }
    const imageUrl = `/images/${req.params.id}`;
    const publicItem = await req.db.collection('items').findOne({ imageUrl, status: 'open' }, { projection: { _id: 1 } });
    if (!publicItem) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image not found' } });
    const image = await req.db.collection('itemImages').findOne({ _id: new ObjectId(req.params.id) });
    if (!image) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image not found' } });
    const data = Buffer.isBuffer(image.data) ? image.data : image.data.value(true);
    res.set({
      'Content-Type': image.contentType,
      'Content-Length': data.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(data);
  } catch (error) {
    next(error);
  }
});

router.get('/board', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { status: 'open' };
    if (req.query.kind && kinds.has(req.query.kind)) filter.kind = req.query.kind;
    for (const field of ['category', 'location']) {
      if (typeof req.query[field] === 'string' && req.query[field].trim()) {
        filter[field] = req.query[field].trim().slice(0, 120);
      }
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const escaped = req.query.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const search = new RegExp(escaped, 'i');
      filter.$or = [{ title: search }, { description: search }, { category: search }, { location: search }];
    }
    const collection = req.db.collection('items');
    const [items, total] = await Promise.all([
      collection.find(filter, { projection: publicProjection })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    return res.json({ items: items.map(toPublicItem), page, limit, total });
  } catch (error) {
    next(error);
  }
});

router.get('/items/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item not found' } });
    }
    const item = await req.db.collection('items').findOne(
      { _id: new ObjectId(req.params.id), status: 'open' },
      { projection: publicProjection },
    );
    if (!item) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item not found' } });
    return res.json({ item: toPublicItem(item) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
