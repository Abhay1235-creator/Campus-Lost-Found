const express = require('express');
const path = require('node:path');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const foundReportRoutes = require('./routes/found-reports');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use((req, _res, next) => {
    req.db = db;
    next();
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(itemRoutes);
  app.use(claimRoutes);
  app.use(foundReportRoutes);
  app.use(express.static(path.resolve(__dirname, '../../ui')));
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: { code: 'IMAGE_TOO_LARGE', message: 'Image must be 8 MB or smaller' } });
    }
    if (error.code?.startsWith('LIMIT_')) {
      return res.status(400).json({ error: { code: 'INVALID_UPLOAD', message: 'Upload one image file in the item photo field' } });
    }
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    return res.status(status).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: status >= 500 ? 'An unexpected error occurred' : error.message,
      },
    });
  });
  return app;
}

module.exports = { createApp };
