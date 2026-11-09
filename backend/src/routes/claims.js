const express = require('express');
const { ObjectId } = require('mongodb');
const { encryptPrivatePayload, decryptPrivatePayload } = require('../services/private-data');
const { requireAdmin } = require('../middleware/require-admin');

const router = express.Router();
const admin = express.Router();
admin.use(requireAdmin);

function requiredText(value, field, max = 500) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > max) {
    const error = new Error(`${field} must be a non-empty string of at most ${max} characters`);
    error.status = 400;
    error.code = 'INVALID_FIELD';
    throw error;
  }
  return value.trim();
}

function notFound(res) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item or claim not found' } });
}

router.post('/claims', async (req, res, next) => {
  let reservedItemId;
  try {
    const { itemId } = req.body || {};
    if (typeof itemId !== 'string' || !ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: { code: 'INVALID_ITEM_ID', message: 'itemId must be a valid item ID' } });
    }
    const claimantName = requiredText(req.body.claimantName, 'claimantName', 120);
    const claimantContact = requiredText(req.body.claimantContact, 'claimantContact', 320);
    let message;
    if (req.body.message !== undefined && req.body.message !== '') {
      message = requiredText(req.body.message, 'message', 2000);
    }
    const id = new ObjectId(itemId);
    const now = new Date();
    const reservation = await req.db.collection('items').updateOne(
      { _id: id, kind: 'found', status: 'open' },
      { $set: { status: 'pending_review', updatedAt: now } },
    );
    if (reservation.modifiedCount !== 1) return notFound(res);
    reservedItemId = id;

    const encrypted = encryptPrivatePayload({ claimantName, claimantContact, message });
    const claim = {
      itemId: id,
      ...encrypted,
      status: 'pending',
      createdAt: now,
      reviewedAt: null,
    };
    const result = await req.db.collection('claims').insertOne(claim);
    return res.status(201).json({
      claim: { id: result.insertedId.toString(), status: 'pending', createdAt: now.toISOString() },
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

admin.get('/claims', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Unsupported claim status' } });
    }
    const claims = await req.db.collection('claims')
      .find({ status }, { projection: { itemId: 1, ciphertext: 1, iv: 1, algorithm: 1, keyVersion: 1, status: 1, createdAt: 1, reviewedAt: 1 } })
      .sort({ createdAt: 1, _id: 1 })
      .limit(100)
      .toArray();
    return res.json({ claims: claims.map((claim) => ({
      id: claim._id.toString(),
      itemId: claim.itemId.toString(),
      ...decryptPrivatePayload(claim),
      status: claim.status,
      createdAt: claim.createdAt.toISOString(),
      reviewedAt: claim.reviewedAt?.toISOString() || null,
    })) });
  } catch (error) {
    next(error);
  }
});

admin.patch('/claims/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return notFound(res);
    const decision = req.body?.decision;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: { code: 'INVALID_DECISION', message: 'decision must be approved or rejected' } });
    }
    const claimId = new ObjectId(req.params.id);
    const claim = await req.db.collection('claims').findOneAndUpdate(
      { _id: claimId, status: 'pending' },
      { $set: { status: decision, reviewedAt: new Date() } },
      { returnDocument: 'after', projection: { itemId: 1, status: 1, reviewedAt: 1 } },
    );
    if (!claim) return notFound(res);
    await req.db.collection('items').updateOne(
      { _id: claim.itemId, status: 'pending_review' },
      { $set: { status: decision === 'approved' ? 'returned' : 'open', updatedAt: new Date() } },
    );
    return res.json({ claim: { id: claim._id.toString(), status: claim.status, reviewedAt: claim.reviewedAt.toISOString() } });
  } catch (error) {
    next(error);
  }
});

router.use('/admin', admin);

module.exports = router;
