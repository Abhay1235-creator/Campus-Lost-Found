const express = require('express');
const { ObjectId } = require('mongodb');
const { encryptPrivatePayload, decryptPrivatePayload } = require('../services/private-data');
const { requireAdmin } = require('../middleware/require-admin');

const router = express.Router();
const admin = express.Router();
admin.use(requireAdmin);

function requiredText(value, field, max) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > max) {
    const error = new Error(`${field} must be a non-empty string of at most ${max} characters`);
    error.status = 400;
    error.code = 'INVALID_FIELD';
    throw error;
  }
  return value.trim();
}

function notFound(res) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item or found report not found' } });
}

router.post('/found-reports', async (req, res, next) => {
  let reservedItemId;
  try {
    const body = req.body || {};
    if (typeof body.itemId !== 'string' || !ObjectId.isValid(body.itemId)) {
      return res.status(400).json({ error: { code: 'INVALID_ITEM_ID', message: 'itemId must be a valid item ID' } });
    }
    const finderName = requiredText(body.finderName, 'finderName', 120);
    const finderContact = requiredText(body.finderContact, 'finderContact', 320);
    const foundLocation = requiredText(body.foundLocation, 'foundLocation', 120);
    const message = body.message === undefined || body.message === ''
      ? ''
      : requiredText(body.message, 'message', 2000);
    const itemId = new ObjectId(body.itemId);
    const now = new Date();
    const reservation = await req.db.collection('items').updateOne(
      { _id: itemId, kind: 'lost', status: 'open' },
      { $set: { status: 'pending_review', updatedAt: now } },
    );
    if (reservation.modifiedCount !== 1) return notFound(res);
    reservedItemId = itemId;

    const encrypted = encryptPrivatePayload({ finderName, finderContact, foundLocation, message });
    const report = {
      itemId,
      ...encrypted,
      status: 'pending',
      createdAt: now,
      reviewedAt: null,
    };
    const result = await req.db.collection('foundReports').insertOne(report);
    return res.status(201).json({
      foundReport: { id: result.insertedId.toString(), status: 'pending', createdAt: now.toISOString() },
    });
  } catch (error) {
    if (reservedItemId) {
      await req.db.collection('items').updateOne(
        { _id: reservedItemId, status: 'pending_review' },
        { $set: { status: 'open', updatedAt: new Date() } },
      ).catch(() => {});
    }
    next(error);
  }
});

admin.get('/found-reports', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Unsupported found-report status' } });
    }
    const reports = await req.db.collection('foundReports')
      .find({ status }, { projection: { itemId: 1, ciphertext: 1, iv: 1, algorithm: 1, keyVersion: 1, status: 1, createdAt: 1, reviewedAt: 1 } })
      .sort({ createdAt: 1, _id: 1 })
      .limit(100)
      .toArray();
    return res.json({ foundReports: reports.map((report) => ({
      id: report._id.toString(),
      itemId: report.itemId.toString(),
      ...decryptPrivatePayload(report),
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      reviewedAt: report.reviewedAt?.toISOString() || null,
    })) });
  } catch (error) {
    next(error);
  }
});

admin.patch('/found-reports/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return notFound(res);
    const decision = req.body?.decision;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: { code: 'INVALID_DECISION', message: 'decision must be approved or rejected' } });
    }
    const report = await req.db.collection('foundReports').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), status: 'pending' },
      { $set: { status: decision, reviewedAt: new Date() } },
      { returnDocument: 'after', projection: { itemId: 1, status: 1, reviewedAt: 1 } },
    );
    if (!report) return notFound(res);
    await req.db.collection('items').updateOne(
      { _id: report.itemId, status: 'pending_review', kind: 'lost' },
      { $set: { status: decision === 'approved' ? 'returned' : 'open', updatedAt: new Date() } },
    );
    return res.json({ foundReport: { id: report._id.toString(), status: report.status, reviewedAt: report.reviewedAt.toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.use('/admin', admin);

module.exports = router;
